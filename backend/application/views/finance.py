from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import AnneeScolaire, FraisScolarite, PaiementEcolage, User
from ..permissions import EcoleScopedQuerysetMixin, IsAdminOrSecretariat, ReadOnlyOrAdmin
from ..serializers import (
    DossierFinancierSerializer, FraisScolariteSerializer, PaiementEcolageSerializer, SyntheseFinanciereSerializer,
)
from ..services.finance import dossier_financier, synthese_ecole


class FraisScolariteViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = FraisScolarite.objects.select_related('niveau', 'filiere', 'annee_scolaire')
    serializer_class = FraisScolariteSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdmin]
    ecole_field = 'annee_scolaire__ecole_id'


class PaiementEcolageViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Lecture élargie au personnel + à l'étudiant/parent concernés ; écriture réservée admin/secrétariat."""
    queryset = PaiementEcolage.objects.select_related('etudiant', 'annee_scolaire', 'secretaire')
    serializer_class = PaiementEcolageSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'etudiant__ecole_id'

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
        return qs  # ADMIN / RESPONSABLE / SECRETARIAT

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'synthese'):
            return [permissions.IsAuthenticated(), IsAdminOrSecretariat()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='dossier')
    def dossier(self, request):
        """Dossier financier (total dû/payé/reste) d'un étudiant pour une année (?etudiant=&annee_scolaire=)."""
        from ..models import Etudiant

        etudiant_id = request.query_params.get('etudiant')
        annee_id = request.query_params.get('annee_scolaire')
        if not etudiant_id or not annee_id:
            return Response({'detail': "Paramètres 'etudiant' et 'annee_scolaire' requis."}, status=400)

        user = request.user
        role = getattr(user, 'role', None)
        if user.is_superuser:
            etudiant = Etudiant.objects.filter(pk=etudiant_id).first()
        elif role in (User.Role.ADMIN, User.Role.RESPONSABLE, User.Role.SECRETARIAT):
            etudiant = Etudiant.objects.filter(pk=etudiant_id, ecole_id=user.ecole_id).first()
        elif role == User.Role.ETUDIANT:
            etudiant = Etudiant.objects.filter(pk=etudiant_id, utilisateur=user).first()
        elif role == User.Role.PARENT:
            etudiant = Etudiant.objects.filter(pk=etudiant_id, tuteurs__parent=user).first()
        else:
            etudiant = None

        if etudiant is None:
            return Response({'detail': 'Étudiant introuvable.'}, status=404)

        annee = AnneeScolaire.objects.filter(pk=annee_id, ecole_id=etudiant.ecole_id).first()
        if annee is None:
            return Response({'detail': 'Année scolaire introuvable.'}, status=404)

        return Response(DossierFinancierSerializer(dossier_financier(etudiant, annee)).data)

    @action(detail=False, methods=['get'], url_path='synthese')
    def synthese(self, request):
        """Synthèse financière de l'établissement pour une année (?annee_scolaire=) : réservé au personnel."""
        annee_id = request.query_params.get('annee_scolaire')
        if not annee_id:
            return Response({'detail': "Paramètre 'annee_scolaire' requis."}, status=400)

        user = request.user
        annees = AnneeScolaire.objects.all() if user.is_superuser else AnneeScolaire.objects.filter(ecole_id=user.ecole_id)
        annee = annees.filter(pk=annee_id).first()
        if annee is None:
            return Response({'detail': 'Année scolaire introuvable.'}, status=404)

        return Response(SyntheseFinanciereSerializer(synthese_ecole(annee.ecole, annee)).data)
