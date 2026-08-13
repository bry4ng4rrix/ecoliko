from rest_framework import serializers

from ..models import CahierTexte, DocumentDevoir, EmploiDuTemps, PresenceCours
from .base import ValidatedModelSerializer


class PresenceCoursSerializer(ValidatedModelSerializer):
    etudiant_nom = serializers.CharField(source='etudiant.get_full_name', read_only=True)
    matiere_intitule = serializers.CharField(source='matiere.intitule', read_only=True)

    class Meta:
        model = PresenceCours
        fields = (
            'id', 'etudiant', 'etudiant_nom', 'matiere', 'matiere_intitule', 'date_cours',
            'heure_debut', 'heure_fin', 'statut', 'justificatif', 'justification_statut', 'cree_par', 'date_creation',
        )
        read_only_fields = ('cree_par', 'date_creation')

    def create(self, validated_data):
        validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)


class AppelEntreeSerializer(serializers.Serializer):
    """Une ligne de l'appel : un élève + son statut de présence."""
    etudiant = serializers.IntegerField()
    statut = serializers.ChoiceField(choices=PresenceCours.StatutPresence.choices)


class AppelDuJourSerializer(serializers.Serializer):
    """Saisie groupée : un enseignant fait l'appel pour toute une classe en un seul appel API."""
    matiere = serializers.IntegerField()
    date_cours = serializers.DateField()
    heure_debut = serializers.TimeField()
    heure_fin = serializers.TimeField()
    entrees = AppelEntreeSerializer(many=True)


class EmploiDuTempsSerializer(ValidatedModelSerializer):
    classe_nom = serializers.CharField(source='classe.nom', read_only=True)
    matiere_intitule = serializers.CharField(source='matiere.intitule', read_only=True)
    matiere_couleur = serializers.CharField(source='matiere.couleur', read_only=True)
    enseignant_nom = serializers.SerializerMethodField()
    enseignant_photo = serializers.ImageField(source='enseignant.photo', read_only=True, default=None)
    salle_nom = serializers.CharField(source='salle.nom', read_only=True, default=None)

    class Meta:
        model = EmploiDuTemps
        fields = (
            'id', 'classe', 'classe_nom', 'matiere', 'matiere_intitule', 'matiere_couleur', 'enseignant',
            'enseignant_nom', 'enseignant_photo', 'jour', 'heure_debut', 'heure_fin', 'salle', 'salle_nom',
            'groupe', 'est_actif', 'cree_par', 'date_creation',
        )
        read_only_fields = ('cree_par', 'date_creation')

    def get_enseignant_nom(self, obj):
        return obj.enseignant.get_full_name() if obj.enseignant else None

    def create(self, validated_data):
        validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)


class CahierTexteSerializer(ValidatedModelSerializer):
    classe_nom = serializers.CharField(source='classe.nom', read_only=True)
    matiere_intitule = serializers.CharField(source='matiere.intitule', read_only=True)
    enseignant_nom = serializers.SerializerMethodField()

    class Meta:
        model = CahierTexte
        fields = (
            'id', 'classe', 'classe_nom', 'matiere', 'matiere_intitule', 'enseignant', 'enseignant_nom',
            'date_seance', 'contenu_seance', 'travail_a_faire', 'date_echeance_travail', 'heure_echeance_travail',
            'piece_jointe', 'lien', 'date_creation',
        )
        read_only_fields = ('enseignant', 'date_creation')

    def get_enseignant_nom(self, obj):
        return obj.enseignant.get_full_name() if obj.enseignant else None

    def create(self, validated_data):
        validated_data['enseignant'] = self.context['request'].user
        return super().create(validated_data)


class DocumentDevoirSerializer(ValidatedModelSerializer):
    importe_par_nom = serializers.CharField(source='importe_par.get_full_name', read_only=True, default=None)

    class Meta:
        model = DocumentDevoir
        fields = ('id', 'cahier_texte', 'nom', 'fichier', 'importe_par', 'importe_par_nom', 'date_import')
        read_only_fields = ('importe_par', 'date_import')

    def create(self, validated_data):
        validated_data['importe_par'] = self.context['request'].user
        if not validated_data.get('nom'):
            validated_data['nom'] = validated_data['fichier'].name
        return super().create(validated_data)
