from rest_framework import serializers

from ..models import Bulletin


class BulletinSerializer(serializers.ModelSerializer):
    """Un bulletin est calculé (voir `services.bulletin.generer_bulletin`), jamais saisi à la main :

    tous les champs sont en lecture seule ici, l'écriture passe par l'action `generer`."""
    etudiant_nom = serializers.CharField(source='etudiant.get_full_name', read_only=True)
    classe_nom = serializers.CharField(source='classe.nom', read_only=True)
    trimestre_numero = serializers.IntegerField(source='trimestre.numero', read_only=True, default=None)

    class Meta:
        model = Bulletin
        fields = (
            'id', 'etudiant', 'etudiant_nom', 'classe', 'classe_nom', 'annee_scolaire',
            'trimestre', 'trimestre_numero', 'moyenne_generale', 'rang', 'effectif_classe',
            'mention', 'decision', 'est_valide', 'valide_par', 'date_generation', 'date_validation',
        )
        read_only_fields = fields


class GenererBulletinSerializer(serializers.Serializer):
    etudiant = serializers.IntegerField()
    annee_scolaire = serializers.IntegerField()
    trimestre = serializers.IntegerField(required=False, allow_null=True)
