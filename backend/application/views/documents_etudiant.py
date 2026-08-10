from rest_framework import permissions, viewsets

from ..models import DocumentJustificatifEtudiant, User
from ..permissions import EcoleScopedQuerysetMixin, IsAdminOrSecretariat
from ..serializers import DocumentJustificatifEtudiantSerializer


class DocumentJustificatifEtudiantViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Documents versés au dossier d'un étudiant (acte de naissance, CIN parent...).

    Écriture réservée à l'admin/bureau ; l'étudiant concerné et ses parents peuvent
    consulter la liste (pas la modifier).
    """
    queryset = DocumentJustificatifEtudiant.objects.select_related('etudiant', 'ajoute_par')
    serializer_class = DocumentJustificatifEtudiantSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'etudiant__ecole_id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminOrSecretariat()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        role = getattr(user, 'role', None)
        if role == User.Role.ETUDIANT:
            return qs.filter(etudiant__utilisateur=user)
        if role == User.Role.PARENT:
            return qs.filter(etudiant__tuteurs__parent=user).distinct()
        return qs  # ADMIN / RESPONSABLE / ENSEIGNANT / SECRETARIAT
