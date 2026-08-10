from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Matiere, Note, Trimestre
from ..permissions import CanManageMatiere, CanManageNote, EcoleScopedQuerysetMixin
from ..serializers import MatiereSerializer, NoteSerializer
from ..services import moyenne as moyenne_service


class MatiereViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Matiere.objects.select_related('ecole', 'filiere', 'niveau', 'enseignant')
    serializer_class = MatiereSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageMatiere]
    ecole_field = 'ecole_id'


class NoteViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Un enseignant ne voit/gère que les notes de ses propres matières.

    Un étudiant/parent ne voit que ses propres notes (lecture seule).
    """
    queryset = Note.objects.select_related('etudiant', 'matiere', 'trimestre', 'saisie_par')
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'etudiant__ecole_id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), CanManageNote()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        role = getattr(user, 'role', None)
        if role == 'ENSEIGNANT':
            return qs.filter(matiere__enseignant=user)
        if role == 'ETUDIANT':
            return qs.filter(etudiant__utilisateur=user)
        if role == 'PARENT':
            return qs.filter(etudiant__tuteurs__parent=user).distinct()
        return qs  # ADMIN / RESPONSABLE / SECRETARIAT

    @action(detail=False, methods=['get'], url_path='moyenne')
    def moyenne(self, request):
        """Moyenne pondérée d'un étudiant pour un trimestre (?etudiant=<id>&trimestre=<id>)."""
        etudiant_id = request.query_params.get('etudiant')
        trimestre_id = request.query_params.get('trimestre')
        if not etudiant_id or not trimestre_id:
            return Response({'detail': "Paramètres 'etudiant' et 'trimestre' requis."}, status=400)

        etudiant = self._etudiant_visible(etudiant_id)
        if etudiant is None:
            return Response({'detail': 'Étudiant introuvable.'}, status=404)

        trimestre = Trimestre.objects.filter(pk=trimestre_id).first()
        if trimestre is None:
            return Response({'detail': 'Trimestre introuvable.'}, status=404)

        resultat = moyenne_service.moyenne_trimestre(etudiant, trimestre)
        return Response({'etudiant': etudiant.id, 'trimestre': trimestre.id, 'moyenne': resultat})

    def _etudiant_visible(self, etudiant_id):
        """Résout l'étudiant en réutilisant le même périmètre d'accès que le queryset des notes."""
        from ..models import Etudiant
        visibles_ids = self.filter_queryset(self.get_queryset()).values_list('etudiant_id', flat=True)
        return Etudiant.objects.filter(pk=etudiant_id, pk__in=visibles_ids).first() \
            or Etudiant.objects.filter(pk=etudiant_id, utilisateur=self.request.user).first()
