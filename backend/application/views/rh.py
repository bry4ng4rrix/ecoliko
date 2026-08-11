from rest_framework import permissions, viewsets

from ..models import DossierEnseignant, PaiementSalaire, User
from ..permissions import CanAccessDossierEnseignant, EcoleScopedQuerysetMixin
from ..serializers import DossierEnseignantSerializer, PaiementSalaireSerializer


class DossierEnseignantViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Dossier RH d'un enseignant (contrat, diplômes, salaire...). Écriture admin-only ;

    un enseignant ne voit que son propre dossier.
    """
    queryset = DossierEnseignant.objects.select_related('enseignant')
    serializer_class = DossierEnseignantSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessDossierEnseignant]
    ecole_field = 'enseignant__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        if getattr(user, 'role', None) == User.Role.ENSEIGNANT:
            return qs.filter(enseignant=user)
        return qs  # ADMIN


class PaiementSalaireViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Suivi des paiements de salaire du personnel (carte de paiement mensuelle).

    Sensible comme le dossier RH : écriture admin-only, lecture ouverte au membre concerné.
    """
    queryset = PaiementSalaire.objects.select_related('membre', 'annee_scolaire', 'cree_par')
    serializer_class = PaiementSalaireSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessDossierEnseignant]
    ecole_field = 'membre__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        if getattr(user, 'role', None) == User.Role.ENSEIGNANT:
            return qs.filter(membre=user)
        return qs  # ADMIN
