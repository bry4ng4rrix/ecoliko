from rest_framework import serializers

from ..models import DemandeDocument
from .base import ValidatedModelSerializer


class DemandeDocumentSerializer(ValidatedModelSerializer):
    etudiant_nom = serializers.CharField(source='etudiant.get_full_name', read_only=True)

    class Meta:
        model = DemandeDocument
        fields = (
            'id', 'etudiant', 'etudiant_nom', 'annee_scolaire', 'type_document', 'statut',
            'motif_refus', 'demande_par', 'traite_par', 'date_demande', 'date_traitement',
        )
        read_only_fields = ('statut', 'motif_refus', 'demande_par', 'traite_par', 'date_traitement', 'date_demande')

    def create(self, validated_data):
        validated_data['demande_par'] = self.context['request'].user
        return super().create(validated_data)


class RefuserDemandeSerializer(serializers.Serializer):
    motif = serializers.CharField(allow_blank=True, required=False, default='')
