from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Annonce, Classe, DiscussionClasse, Message, MessageGroupeClasse, Notification, User
from ..permissions import CanAccessMessageGroupeClasse, EcoleScopedQuerysetMixin, IsStaffPedagogique
from ..serializers import (
    AnnonceSerializer, DiscussionClasseSerializer, MessageGroupeClasseSerializer, MessageSerializer,
    NotificationSerializer,
)


class MessageViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Un utilisateur ne voit que les messages où il est expéditeur ou destinataire."""
    queryset = Message.objects.select_related('expediteur', 'destinataire')
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'expediteur__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        return qs.filter(Q(expediteur=user) | Q(destinataire=user))

    @action(detail=True, methods=['post'], url_path='marquer-lu')
    def marquer_lu(self, request, pk=None):
        message = self.get_object()
        if message.destinataire_id != request.user.id:
            return Response({'detail': 'Seul le destinataire peut marquer ce message comme lu.'}, status=403)
        message.est_lu = True
        message.save(update_fields=['est_lu'])
        return Response(MessageSerializer(message).data)


class MessageGroupeClasseViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Chat de groupe classe + enseignant : chaque professeur a son propre fil de discussion

    avec chacune de ses classes (élèves + parents). Pas de modification/suppression de
    message une fois envoyé — uniquement liste et envoi.
    """
    http_method_names = ['get', 'post', 'head', 'options']
    queryset = MessageGroupeClasse.objects.select_related('classe', 'enseignant', 'auteur')
    serializer_class = MessageGroupeClasseSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessMessageGroupeClasse]
    ecole_field = 'classe__annee_scolaire__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_superuser:
            role = getattr(user, 'role', None)
            if role == User.Role.ENSEIGNANT:
                qs = qs.filter(enseignant=user)
            elif role == User.Role.ETUDIANT:
                qs = qs.filter(classe__inscriptions__etudiant__utilisateur=user).distinct()
            elif role == User.Role.PARENT:
                qs = qs.filter(classe__inscriptions__etudiant__tuteurs__parent=user).distinct()
            # ADMIN / RESPONSABLE / SECRETARIAT : tout l'établissement (supervision)

        classe_id = self.request.query_params.get('classe')
        if classe_id:
            qs = qs.filter(classe_id=classe_id)
        enseignant_id = self.request.query_params.get('enseignant')
        if enseignant_id:
            qs = qs.filter(enseignant_id=enseignant_id)
        return qs


class DiscussionClasseViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """État ouverte/fermée du chat de groupe d'une classe. Consultation par les mêmes personnes

    que le chat lui-même ; seul l'enseignant concerné (ou un admin) peut basculer l'état, via
    l'action `definir` (upsert — pas de création/modification directe pour éviter les conflits
    d'unicité (classe, enseignant)).
    """
    http_method_names = ['get', 'post', 'head', 'options']
    queryset = DiscussionClasse.objects.select_related('classe', 'enseignant')
    serializer_class = DiscussionClasseSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'classe__annee_scolaire__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_superuser:
            role = getattr(user, 'role', None)
            if role == User.Role.ENSEIGNANT:
                qs = qs.filter(enseignant=user)
            elif role == User.Role.ETUDIANT:
                qs = qs.filter(classe__inscriptions__etudiant__utilisateur=user).distinct()
            elif role == User.Role.PARENT:
                qs = qs.filter(classe__inscriptions__etudiant__tuteurs__parent=user).distinct()

        classe_id = self.request.query_params.get('classe')
        if classe_id:
            qs = qs.filter(classe_id=classe_id)
        enseignant_id = self.request.query_params.get('enseignant')
        if enseignant_id:
            qs = qs.filter(enseignant_id=enseignant_id)
        return qs

    @action(detail=False, methods=['post'], url_path='definir')
    def definir(self, request):
        user = request.user
        classe_id = request.data.get('classe')
        enseignant_id = request.data.get('enseignant')
        est_ouverte = request.data.get('est_ouverte', True)

        role = getattr(user, 'role', None)
        autorise = user.is_superuser or (role == User.Role.ENSEIGNANT and str(user.id) == str(enseignant_id))
        if not autorise:
            return Response({'detail': 'Seul le professeur concerné peut modifier cette discussion.'}, status=403)

        discussion, _ = DiscussionClasse.objects.update_or_create(
            classe_id=classe_id, enseignant_id=enseignant_id, defaults={'est_ouverte': bool(est_ouverte)},
        )
        return Response(DiscussionClasseSerializer(discussion).data)


class AnnonceViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Visibilité par rôle : le personnel voit tout, chacun des autres rôles ne voit que ce qui le concerne."""
    queryset = Annonce.objects.select_related('classe', 'auteur')
    serializer_class = AnnonceSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'ecole_id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsStaffPedagogique()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, 'role', None)

        if user.is_superuser or role in (User.Role.ADMIN, User.Role.RESPONSABLE, User.Role.SECRETARIAT):
            return qs

        if role == User.Role.ENSEIGNANT:
            return qs.filter(Q(portee=Annonce.Portee.ETABLISSEMENT) | Q(portee=Annonce.Portee.ENSEIGNANTS))
        if role == User.Role.PARENT:
            classes_enfants = Classe.objects.filter(inscriptions__etudiant__tuteurs__parent=user)
            return qs.filter(
                Q(portee=Annonce.Portee.ETABLISSEMENT)
                | Q(portee=Annonce.Portee.PARENTS)
                | Q(portee=Annonce.Portee.CLASSE, classe__in=classes_enfants)
            ).distinct()
        if role == User.Role.ETUDIANT:
            ma_classe = Classe.objects.filter(inscriptions__etudiant__utilisateur=user)
            return qs.filter(
                Q(portee=Annonce.Portee.ETABLISSEMENT) | Q(portee=Annonce.Portee.CLASSE, classe__in=ma_classe)
            ).distinct()
        return qs.none()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Toujours strictement scopé à l'utilisateur connecté : jamais besoin du mixin établissement."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user)

    @action(detail=True, methods=['post'], url_path='marquer-lue')
    def marquer_lue(self, request, pk=None):
        notification = self.get_object()
        notification.est_lue = True
        notification.save(update_fields=['est_lue'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'], url_path='tout-marquer-lu')
    def tout_marquer_lu(self, request):
        self.get_queryset().filter(est_lue=False).update(est_lue=True)
        return Response({'detail': 'ok'})
