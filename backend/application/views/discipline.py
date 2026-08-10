from rest_framework import permissions, viewsets

from ..models import EvenementDisciplinaire, User
from ..permissions import EcoleScopedQuerysetMixin, IsStaffPedagogique
from ..serializers import EvenementDisciplinaireSerializer


class EvenementDisciplinaireViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Vie scolaire : observations/sanctions/avertissements/exclusions/convocations/retenues.

    Écriture réservée au personnel ; un étudiant/parent ne voit que les événements le concernant.
    """
    queryset = EvenementDisciplinaire.objects.select_related('etudiant', 'cree_par')
    serializer_class = EvenementDisciplinaireSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'etudiant__ecole_id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsStaffPedagogique()]
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
