from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Annonce, Classe, Message, Notification, User
from ..permissions import EcoleScopedQuerysetMixin, IsStaffPedagogique
from ..serializers import AnnonceSerializer, MessageSerializer, NotificationSerializer


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
