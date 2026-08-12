from ..models import EvenementCalendrier
from .base import ValidatedModelSerializer


class EvenementCalendrierSerializer(ValidatedModelSerializer):
    class Meta:
        model = EvenementCalendrier
        fields = (
            'id', 'ecole', 'titre', 'type_evenement', 'date_debut', 'date_fin', 'description',
            'source_externe', 'cree_par', 'date_creation',
        )
        read_only_fields = ('ecole', 'source_externe', 'cree_par', 'date_creation')

    def create(self, validated_data):
        request = self.context['request']
        validated_data['ecole'] = request.user.ecole
        validated_data['cree_par'] = request.user
        return super().create(validated_data)
