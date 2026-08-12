from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import CahierTexte, EmploiDuTemps, Matiere, PresenceCours, User
from ..permissions import (
    CanManageCahierTexte, CanManagePresence, EcoleScopedQuerysetMixin, IsStaffPedagogique,
    ReadOnlyOrAdminOrSecretariat,
)
from ..serializers import AppelDuJourSerializer, CahierTexteSerializer, EmploiDuTempsSerializer, PresenceCoursSerializer
from ..services.devoirs import envoyer_rappels_devoirs
from ..services.vie_scolaire import enregistrer_appel


class PresenceCoursViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Un enseignant ne gère que les présences de ses propres matières.

    Un étudiant/parent ne voit que ses propres présences (lecture seule).
    """
    queryset = PresenceCours.objects.select_related('etudiant', 'matiere', 'cree_par')
    serializer_class = PresenceCoursSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'etudiant__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        role = getattr(user, 'role', None)
        if role == User.Role.ENSEIGNANT:
            return qs.filter(matiere__enseignant=user)
        if role == User.Role.ETUDIANT:
            return qs.filter(etudiant__utilisateur=user)
        if role == User.Role.PARENT:
            return qs.filter(etudiant__tuteurs__parent=user).distinct()
        return qs  # ADMIN / RESPONSABLE / SECRETARIAT

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'appel'):
            return [permissions.IsAuthenticated(), CanManagePresence()]
        if self.action in ('valider_justification', 'refuser_justification'):
            return [permissions.IsAuthenticated(), IsStaffPedagogique()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def justifier(self, request, pk=None):
        """L'étudiant concerné (ou son parent) soumet un justificatif d'absence/retard."""
        presence = self.get_object()
        if presence.statut not in (PresenceCours.StatutPresence.ABSENT, PresenceCours.StatutPresence.RETARD):
            return Response({'detail': "Seules les absences et retards peuvent être justifiés."}, status=400)
        presence.justificatif = request.data.get('justificatif', '')
        presence.justification_statut = PresenceCours.StatutJustification.EN_ATTENTE
        presence.save(update_fields=['justificatif', 'justification_statut'])
        return Response(PresenceCoursSerializer(presence).data)

    @action(detail=True, methods=['post'], url_path='valider-justification')
    def valider_justification(self, request, pk=None):
        presence = self.get_object()
        presence.justification_statut = PresenceCours.StatutJustification.ACCEPTEE
        presence.statut = PresenceCours.StatutPresence.EXCUSE
        presence.save(update_fields=['justification_statut', 'statut'])
        return Response(PresenceCoursSerializer(presence).data)

    @action(detail=True, methods=['post'], url_path='refuser-justification')
    def refuser_justification(self, request, pk=None):
        presence = self.get_object()
        presence.justification_statut = PresenceCours.StatutJustification.REFUSEE
        presence.save(update_fields=['justification_statut'])
        return Response(PresenceCoursSerializer(presence).data)

    @action(detail=False, methods=['post'])
    def appel(self, request):
        """Saisie groupée de l'appel pour un cours entier (?matiere, date_cours, heure_debut/fin, entrees[])."""
        serializer = AppelDuJourSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        # CanManagePresence a déjà vérifié que cette matière appartient à l'enseignant (ou que l'appelant est admin).
        matiere = Matiere.objects.filter(pk=payload['matiere']).first()
        if matiere is None:
            return Response({'detail': 'Matière introuvable.'}, status=404)

        presences = enregistrer_appel(
            matiere=matiere,
            date_cours=payload['date_cours'],
            heure_debut=payload['heure_debut'],
            heure_fin=payload['heure_fin'],
            entrees=payload['entrees'],
            cree_par=request.user,
        )
        return Response(PresenceCoursSerializer(presences, many=True).data, status=201)


class EmploiDuTempsViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Un enseignant voit son propre planning ; un étudiant/parent voit celui de sa classe."""
    queryset = EmploiDuTemps.objects.select_related('classe', 'matiere', 'enseignant', 'salle')
    serializer_class = EmploiDuTempsSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdminOrSecretariat]
    ecole_field = 'classe__annee_scolaire__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        role = getattr(user, 'role', None)
        if role == User.Role.ENSEIGNANT:
            return qs.filter(enseignant=user)
        if role == User.Role.ETUDIANT:
            return qs.filter(classe__inscriptions__etudiant__utilisateur=user).distinct()
        if role == User.Role.PARENT:
            return qs.filter(classe__inscriptions__etudiant__tuteurs__parent=user).distinct()
        return qs  # ADMIN / RESPONSABLE / SECRETARIAT


class CahierTexteViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Cahier de textes numérique : un enseignant ne gère que ses propres matières ;

    un étudiant/parent voit celui de sa classe (lecture seule).
    """
    queryset = CahierTexte.objects.select_related('classe', 'matiere', 'enseignant')
    serializer_class = CahierTexteSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'classe__annee_scolaire__ecole_id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), CanManageCahierTexte()]
        if self.action == 'envoyer_rappels':
            return [permissions.IsAuthenticated(), IsStaffPedagogique()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        role = getattr(user, 'role', None)
        if role == User.Role.ENSEIGNANT:
            return qs.filter(matiere__enseignant=user)
        if role == User.Role.ETUDIANT:
            return qs.filter(classe__inscriptions__etudiant__utilisateur=user).distinct()
        if role == User.Role.PARENT:
            return qs.filter(classe__inscriptions__etudiant__tuteurs__parent=user).distinct()
        return qs  # ADMIN / RESPONSABLE / SECRETARIAT

    @action(detail=False, methods=['post'], url_path='envoyer-rappels')
    def envoyer_rappels(self, request):
        """Déclenche manuellement l'envoi des rappels de devoirs à échéance proche — utile en

        l'absence d'un ordonnanceur système (cron) déjà configuré ; voir la commande
        `envoyer_rappels_devoirs` pour l'automatiser réellement au quotidien.
        """
        jours_avant = int(request.data.get('jours_avant', 3))
        resultat = envoyer_rappels_devoirs(jours_avant=jours_avant)
        return Response(resultat)
