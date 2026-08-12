from rest_framework import serializers

from ..models import EvenementCalendrier
from .base import ValidatedModelSerializer


class EvenementCalendrierSerializer(ValidatedModelSerializer):
    classe_nom = serializers.CharField(source='classe.nom', read_only=True, default=None)

    class Meta:
        model = EvenementCalendrier
        fields = (
            'id', 'ecole', 'classe', 'classe_nom', 'titre', 'type_evenement', 'date_debut', 'date_fin',
            'description', 'source_externe', 'cahier_texte', 'cree_par', 'date_creation',
        )
        read_only_fields = ('ecole', 'source_externe', 'cahier_texte', 'cree_par', 'date_creation')

    def create(self, validated_data):
        request = self.context['request']
        validated_data['ecole'] = request.user.ecole
        validated_data['cree_par'] = request.user
        return super().create(validated_data)
