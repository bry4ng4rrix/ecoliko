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
        role = getattr(user, 'role', None)
        if not user.is_superuser:
            if role == 'ENSEIGNANT':
                qs = qs.filter(matiere__enseignant=user)
            elif role == 'ETUDIANT':
                qs = qs.filter(etudiant__utilisateur=user)
            elif role == 'PARENT':
                qs = qs.filter(etudiant__tuteurs__parent=user).distinct()
            # ADMIN / RESPONSABLE / SECRETARIAT : tout l'établissement

        # `?etudiant=`/`?trimestre=`/`?matiere=` restreignent la liste (voir historique de bug
        # similaire sur PaiementEcolageViewSet : sans ce filtre, un appelant demandant les notes
        # d'un élève précis recevait celles de tout l'établissement).
        etudiant_id = self.request.query_params.get('etudiant')
        if etudiant_id:
            qs = qs.filter(etudiant_id=etudiant_id)
        trimestre_id = self.request.query_params.get('trimestre')
        if trimestre_id:
            qs = qs.filter(trimestre_id=trimestre_id)
        matiere_id = self.request.query_params.get('matiere')
        if matiere_id:
            qs = qs.filter(matiere_id=matiere_id)
        return qs

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
