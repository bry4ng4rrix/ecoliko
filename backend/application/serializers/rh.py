from rest_framework import serializers

from ..models import DossierEnseignant, PaiementSalaire
from .base import ValidatedModelSerializer


class DossierEnseignantSerializer(ValidatedModelSerializer):
    enseignant_nom = serializers.CharField(source='enseignant.get_full_name', read_only=True)
    enseignant_photo = serializers.ImageField(source='enseignant.photo', read_only=True, default=None)

    class Meta:
        model = DossierEnseignant
        fields = (
            'id', 'enseignant', 'enseignant_nom', 'enseignant_photo', 'type_contrat', 'date_embauche', 'diplomes',
            'salaire', 'volume_horaire_hebdo', 'documents_rh', 'date_creation', 'date_modification',
        )
        read_only_fields = ('date_creation', 'date_modification')


class PaiementSalaireSerializer(ValidatedModelSerializer):
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)

    class Meta:
        model = PaiementSalaire
        fields = (
            'id', 'membre', 'membre_nom', 'annee_scolaire', 'montant', 'mois_couvert', 'date_paiement',
            'mode_paiement', 'statut', 'reference', 'commentaire', 'cree_par', 'date_creation',
        )
        read_only_fields = ('cree_par', 'date_creation')

    def create(self, validated_data):
        validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)
