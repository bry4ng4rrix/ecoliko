from rest_framework import permissions, viewsets

from ..models import PieceJointeInscription
from ..permissions import EcoleScopedQuerysetMixin, IsAdminOrSecretariat
from ..serializers import PieceJointeInscriptionSerializer


class PieceJointeInscriptionViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Documents versés au dossier d'une demande d'inscription en attente (voir

    `DemandeInscriptionViewSet`). Réservé à l'admin/bureau : la demande n'est pas
    encore un compte actif, ce n'est donc jamais le demandeur lui-même qui gère ceci.
    """
    queryset = PieceJointeInscription.objects.select_related('demandeur', 'ajoute_par')
    serializer_class = PieceJointeInscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSecretariat]
    ecole_field = 'demandeur__ecole_id'
