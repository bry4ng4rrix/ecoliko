from rest_framework import serializers

from ..models import DemandeInscriptionSuivi, PieceJointeInscription
from .base import ValidatedModelSerializer


class PieceJointeInscriptionSerializer(ValidatedModelSerializer):
    ajoute_par_nom = serializers.CharField(source='ajoute_par.get_full_name', read_only=True, default=None)

    class Meta:
        model = PieceJointeInscription
        fields = ('id', 'demandeur', 'type_document', 'fichier', 'ajoute_par', 'ajoute_par_nom', 'date_ajout')
        read_only_fields = ('ajoute_par', 'date_ajout')

    def create(self, validated_data):
        validated_data['ajoute_par'] = self.context['request'].user
        return super().create(validated_data)


class DemandeInscriptionSuiviSerializer(ValidatedModelSerializer):
    class Meta:
        model = DemandeInscriptionSuivi
        fields = ('id', 'utilisateur', 'frais_inscription_paye', 'notes', 'date_modification')
        read_only_fields = ('utilisateur', 'date_modification')
