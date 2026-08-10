from rest_framework import serializers

from ..models import DossierEnseignant
from .base import ValidatedModelSerializer


class DossierEnseignantSerializer(ValidatedModelSerializer):
    enseignant_nom = serializers.CharField(source='enseignant.get_full_name', read_only=True)

    class Meta:
        model = DossierEnseignant
        fields = (
            'id', 'enseignant', 'enseignant_nom', 'type_contrat', 'date_embauche', 'diplomes',
            'salaire', 'volume_horaire_hebdo', 'documents_rh', 'date_creation', 'date_modification',
        )
        read_only_fields = ('date_creation', 'date_modification')
