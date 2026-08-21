from rest_framework import serializers

from ..models import FraisScolarite, PaiementEcolage
from .base import ValidatedModelSerializer


class FraisScolariteSerializer(ValidatedModelSerializer):
    niveau_intitule = serializers.CharField(source='niveau.intitule', read_only=True)
    filiere_intitule = serializers.CharField(source='filiere.intitule', read_only=True, default=None)

    class Meta:
        model = FraisScolarite
        fields = (
            'id', 'annee_scolaire', 'niveau', 'niveau_intitule', 'filiere', 'filiere_intitule',
            'montant_inscription', 'montant_annuel',
        )


class PaiementEcolageSerializer(ValidatedModelSerializer):
    etudiant_nom = serializers.CharField(source='etudiant.get_full_name', read_only=True)
    reste = serializers.SerializerMethodField()

    class Meta:
        model = PaiementEcolage
        fields = (
            'id', 'etudiant', 'etudiant_nom', 'annee_scolaire', 'montant', 'montant_paye', 'reste',
            'date_paiement', 'date_echeance', 'statut', 'mois_couvert', 'mode_paiement', 'reference',
            'commentaire', 'cree_par', 'secretaire', 'date_creation',
        )
        read_only_fields = ('cree_par', 'secretaire', 'date_creation')

    def get_reste(self, obj):
        return max(obj.montant - obj.montant_paye, 0)

    def create(self, validated_data):
        # `statut`/`montant_paye` sont réconciliés dans `PaiementEcolage.save()` (s'applique
        # aussi à une création directe via l'ORM — admin Django, scripts, tests), pas ici.
        request = self.context['request']
        validated_data['cree_par'] = request.user
        if request.user.role in ('ADMIN', 'SECRETARIAT'):
            validated_data['secretaire'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Seul cas que `PaiementEcolage.save()` ne peut pas trancher lui-même : un `PATCH`
        # envoyant `statut='EN_ATTENTE'` seul ("marquer non payé", ancien flux) sans toucher
        # `montant_paye` — qui garde alors sa valeur précédente et referait dériver le statut
        # vers PAYE/PARTIEL. Seul le serializer sait, via `validated_data`, que le client n'a
        # pas voulu piloter `montant_paye` ici.
        if validated_data.get('statut') == PaiementEcolage.StatutPaiement.EN_ATTENTE and 'montant_paye' not in validated_data:
            validated_data['montant_paye'] = 0
        return super().update(instance, validated_data)


class DossierFinancierSerializer(serializers.Serializer):
    """Sérialise le résultat du service `finance.dossier_financier` (pas un ModelSerializer : agrégat calculé)."""
    total_du = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_paye = serializers.DecimalField(max_digits=10, decimal_places=2)
    reste_du = serializers.DecimalField(max_digits=10, decimal_places=2)
    statut = serializers.CharField()


class EtudiantEndetteSerializer(serializers.Serializer):
    etudiant = serializers.IntegerField(source='etudiant.id')
    nom_complet = serializers.SerializerMethodField()
    total_du = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_paye = serializers.DecimalField(max_digits=10, decimal_places=2)
    reste_du = serializers.DecimalField(max_digits=10, decimal_places=2)
    statut = serializers.CharField()

    def get_nom_complet(self, obj):
        return obj['etudiant'].get_full_name()


class SyntheseFinanciereSerializer(serializers.Serializer):
    """Sérialise le résultat du service `finance.synthese_ecole`."""
    total_du = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_paye = serializers.DecimalField(max_digits=10, decimal_places=2)
    reste_du = serializers.DecimalField(max_digits=10, decimal_places=2)
    taux_recouvrement = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    etudiants_endettes = EtudiantEndetteSerializer(many=True)
