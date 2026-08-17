from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import AnneeScolaire, Classe, Ecole, Filiere, Niveau, Salle, Trimestre
from ..permissions import (
    EcoleScopedQuerysetMixin, IsAdmin, IsPlatformSuperUser, ReadOnlyOrAdmin, ReadOnlyOrAdminOrSecretariat,
)
from ..serializers import (
    AnneeScolaireSerializer, ClasseSerializer, EcolePubliqueSerializer, EcoleSerializer, FiliereSerializer,
    NiveauSerializer, SalleSerializer, TrimestreSerializer,
)
from ..services import gestion_scolaire, scoping
from ..services import moyenne as moyenne_service


class EcoleViewSet(viewsets.ModelViewSet):
    """Un établissement ne voit que sa propre fiche (sauf super-utilisateur plateforme)."""
    serializer_class = EcoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Ecole.objects.all()
        if not user.ecole_id:
            return Ecole.objects.none()
        return Ecole.objects.filter(id=user.ecole_id)

    def get_permissions(self):
        if self.action == 'publiques':
            return [permissions.AllowAny()]
        if self.action in ('create', 'destroy'):
            return [permissions.IsAuthenticated(), IsPlatformSuperUser()]
        if self.action in ('update', 'partial_update'):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def publiques(self, request):
        """Liste minimale (id/nom/code) des établissements actifs, pour le formulaire d'inscription."""
        ecoles = Ecole.objects.filter(est_active=True).order_by('nom')
        return Response(EcolePubliqueSerializer(ecoles, many=True).data)


class AnneeScolaireViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = AnneeScolaire.objects.select_related('ecole')
    serializer_class = AnneeScolaireSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdmin]
    ecole_field = 'ecole_id'

    @action(detail=True, methods=['post'])
    def activer(self, request, pk=None):
        """Active cette année scolaire et désactive automatiquement l'ancienne."""
        annee = self.get_object()
        gestion_scolaire.activer_annee_scolaire(annee)
        return Response(self.get_serializer(annee).data)


class TrimestreViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Trimestre.objects.select_related('annee_scolaire')
    serializer_class = TrimestreSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdmin]
    ecole_field = 'annee_scolaire__ecole_id'

    @action(detail=True, methods=['post'])
    def activer(self, request, pk=None):
        """Active ce trimestre et désactive automatiquement le précédent."""
        trimestre = self.get_object()
        gestion_scolaire.activer_trimestre(trimestre)
        return Response(self.get_serializer(trimestre).data)


class NiveauViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Niveau.objects.all()
    serializer_class = NiveauSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdmin]
    ecole_field = 'ecole_id'


class FiliereViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Filiere.objects.select_related('responsable')
    serializer_class = FiliereSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdmin]
    ecole_field = 'ecole_id'


class SalleViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Salle.objects.all()
    serializer_class = SalleSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdminOrSecretariat]
    ecole_field = 'ecole_id'


class ClasseViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Classe.objects.select_related(
        'annee_scolaire', 'niveau', 'filiere', 'titulaire', 'salle'
    ).prefetch_related('enseignants')
    serializer_class = ClasseSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdminOrSecretariat]
    ecole_field = 'annee_scolaire__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_superuser and getattr(user, 'role', None) == 'ENSEIGNANT':
            qs = qs.filter(pk__in=scoping.classes_du_professeur(user).values('pk'))
        return qs

    @action(detail=True, methods=['get'])
    def classement(self, request, pk=None):
        """Classement des étudiants de la classe pour un trimestre (?trimestre=<id>)."""
        classe = self.get_object()
        trimestre_id = request.query_params.get('trimestre')
        trimestre = Trimestre.objects.filter(pk=trimestre_id, annee_scolaire=classe.annee_scolaire).first()
        if trimestre is None:
            return Response({'detail': "Paramètre 'trimestre' requis et doit appartenir à cette classe."}, status=400)

        resultats = moyenne_service.classement(classe, trimestre)
        return Response([
            {'rang': rang, 'etudiant': etudiant.id, 'nom_complet': etudiant.get_full_name(), 'moyenne': moy}
            for rang, etudiant, moy in resultats
        ])

    @action(detail=True, methods=['get'], url_path='classement-annuel')
    def classement_annuel(self, request, pk=None):
        """Bilan annuel de la classe (moyenne générale des 3 trimestres) et décision de passage.

        Moyenne générale < 10 ⇒ redouble, sinon admis (passe en classe supérieure).
        """
        classe = self.get_object()
        resultats = moyenne_service.classement_annuel(classe, classe.annee_scolaire)
        return Response([
            {
                'rang': rang,
                'etudiant': etudiant.id,
                'nom_complet': etudiant.get_full_name(),
                'moyenne': moy,
                'decision': 'ADMIS' if moy is not None and moy >= 10 else ('REDOUBLE' if moy is not None else None),
            }
            for rang, etudiant, moy in resultats
        ])
