from rest_framework import serializers

from ..models import EvenementDisciplinaire
from .base import ValidatedModelSerializer


class EvenementDisciplinaireSerializer(ValidatedModelSerializer):
    etudiant_nom = serializers.CharField(source='etudiant.get_full_name', read_only=True)
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = EvenementDisciplinaire
        fields = (
            'id', 'etudiant', 'etudiant_nom', 'type_evenement', 'gravite', 'description',
            'date_evenement', 'cree_par', 'cree_par_nom', 'date_creation',
        )
        read_only_fields = ('cree_par', 'date_creation')

    def get_cree_par_nom(self, obj):
        return obj.cree_par.get_full_name() if obj.cree_par else None

    def create(self, validated_data):
        validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)
