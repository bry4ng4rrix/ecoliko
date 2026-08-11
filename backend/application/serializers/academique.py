from rest_framework import serializers

from ..models import AnneeScolaire, Classe, Ecole, Filiere, Niveau, Salle, Trimestre, User
from .base import ValidatedModelSerializer


class EcoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ecole
        fields = (
            'id', 'nom', 'code', 'adresse', 'telephone', 'email', 'logo',
            'devise', 'est_active', 'date_creation',
        )
        read_only_fields = ('date_creation',)


class EcolePubliqueSerializer(serializers.ModelSerializer):
    """Vue minimale, exposée sans authentification (sélection d'établissement à l'inscription)."""

    class Meta:
        model = Ecole
        fields = ('id', 'nom', 'code')


class AnneeScolaireSerializer(ValidatedModelSerializer):
    class Meta:
        model = AnneeScolaire
        fields = ('id', 'ecole', 'libelle', 'date_debut', 'date_fin', 'statut', 'est_active', 'date_creation')
        read_only_fields = ('ecole', 'est_active', 'date_creation')

    def create(self, validated_data):
        validated_data['ecole'] = self.context['request'].user.ecole
        return super().create(validated_data)


class TrimestreSerializer(ValidatedModelSerializer):
    class Meta:
        model = Trimestre
        fields = ('id', 'annee_scolaire', 'numero', 'date_debut', 'date_fin', 'est_actif')
        read_only_fields = ('est_actif',)


class NiveauSerializer(serializers.ModelSerializer):
    class Meta:
        model = Niveau
        fields = ('id', 'ecole', 'code', 'intitule', 'ordre', 'est_actif')
        read_only_fields = ('ecole',)

    def create(self, validated_data):
        validated_data['ecole'] = self.context['request'].user.ecole
        return super().create(validated_data)


class FiliereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filiere
        fields = (
            'id', 'ecole', 'code', 'intitule', 'description', 'duree_etudes',
            'responsable', 'capacite_max', 'est_active',
        )
        read_only_fields = ('ecole',)

    def create(self, validated_data):
        validated_data['ecole'] = self.context['request'].user.ecole
        return super().create(validated_data)


class SalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salle
        fields = ('id', 'ecole', 'nom', 'capacite', 'type_salle', 'est_active')
        read_only_fields = ('ecole',)

    def create(self, validated_data):
        validated_data['ecole'] = self.context['request'].user.ecole
        return super().create(validated_data)


class ClasseSerializer(ValidatedModelSerializer):
    effectif = serializers.IntegerField(read_only=True)
    niveau_intitule = serializers.CharField(source='niveau.intitule', read_only=True, default=None)
    filiere_intitule = serializers.CharField(source='filiere.intitule', read_only=True, default=None)
    salle_nom = serializers.CharField(source='salle.nom', read_only=True, default=None)
    titulaire_nom = serializers.SerializerMethodField()
    delegue_nom = serializers.SerializerMethodField()
    delegue_utilisateur = serializers.IntegerField(source='delegue.utilisateur_id', read_only=True, default=None)
    enseignants = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=User.objects.filter(role=User.Role.ENSEIGNANT)
    )
    enseignants_noms = serializers.SerializerMethodField()

    class Meta:
        model = Classe
        fields = (
            'id', 'annee_scolaire', 'niveau', 'niveau_intitule', 'filiere', 'filiere_intitule',
            'nom', 'section', 'capacite_max', 'titulaire', 'titulaire_nom', 'salle', 'salle_nom',
            'delegue', 'delegue_nom', 'delegue_utilisateur', 'enseignants', 'enseignants_noms',
            'frais_ecolage_mensuel', 'frais_inscription', 'est_active', 'effectif', 'date_creation',
        )
        read_only_fields = ('annee_scolaire', 'date_creation')

    def get_delegue_nom(self, obj):
        return f'{obj.delegue.prenom} {obj.delegue.nom}' if obj.delegue else None

    def get_titulaire_nom(self, obj):
        return obj.titulaire.get_full_name() if obj.titulaire else None

    def get_enseignants_noms(self, obj):
        return [e.get_full_name() for e in obj.enseignants.all()]

    def validate(self, attrs):
        if self.instance:
            annee = self.instance.annee_scolaire
        else:
            ecole = self.context['request'].user.ecole
            annee = (
                AnneeScolaire.objects.filter(ecole=ecole, est_active=True).first()
                or AnneeScolaire.objects.filter(ecole=ecole).first()
            )
            if annee is None:
                raise serializers.ValidationError({
                    'annee_scolaire': "Aucune année scolaire n'existe pour cet établissement. "
                                      "Créez-en une dans les paramètres avant d'ajouter des classes.",
                })
        attrs = {**attrs, 'annee_scolaire': annee}

        # `enseignants` est un M2M : `ValidatedModelSerializer.validate()` instancie un modèle
        # jetable via `setattr()`, ce que Django interdit pour le côté direct d'un M2M. On le
        # retire avant l'appel puis le réinjecte dans les attrs validés.
        enseignants = attrs.pop('enseignants', None)
        if enseignants:
            invalides = [e for e in enseignants if e.ecole_id != annee.ecole_id]
            if invalides:
                raise serializers.ValidationError({
                    'enseignants': "Un enseignant sélectionné n'appartient pas à cet établissement.",
                })

        attrs = super().validate(attrs)
        if enseignants is not None:
            attrs['enseignants'] = enseignants
        return attrs
