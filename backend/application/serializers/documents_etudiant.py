from rest_framework import serializers

from ..models import DocumentJustificatifEtudiant
from .base import ValidatedModelSerializer


class DocumentJustificatifEtudiantSerializer(ValidatedModelSerializer):
    ajoute_par_nom = serializers.CharField(source='ajoute_par.get_full_name', read_only=True, default=None)

    class Meta:
        model = DocumentJustificatifEtudiant
        fields = (
            'id', 'etudiant', 'type_document', 'fichier', 'libelle',
            'ajoute_par', 'ajoute_par_nom', 'date_ajout',
        )
        read_only_fields = ('ajoute_par', 'date_ajout')

    def create(self, validated_data):
        validated_data['ajoute_par'] = self.context['request'].user
        return super().create(validated_data)
