from rest_framework import serializers

from ..models import Etudiant, Inscription, TuteurEtudiant, User
from .auth import MOT_DE_PASSE_TEMPORAIRE
from .base import ValidatedModelSerializer


class InscriptionSerializer(ValidatedModelSerializer):
    classe_nom = serializers.CharField(source='classe.nom', read_only=True)

    class Meta:
        model = Inscription
        fields = ('id', 'etudiant', 'classe', 'classe_nom', 'annee_scolaire', 'date_inscription', 'statut')


class EtudiantSerializer(ValidatedModelSerializer):
    age = serializers.IntegerField(read_only=True)
    classe_actuelle = serializers.SerializerMethodField()

    class Meta:
        model = Etudiant
        fields = (
            'id', 'ecole', 'utilisateur', 'matricule', 'nom', 'prenom', 'date_naissance',
            'lieu_naissance', 'genre', 'nationalite', 'adresse', 'telephone', 'email', 'photo',
            'situation_familiale', 'ancien_etablissement', 'dossier_medical',
            'contact_urgence_nom', 'contact_urgence_telephone',
            'date_inscription', 'statut', 'age', 'classe_actuelle',
        )
        read_only_fields = ('ecole', 'date_inscription')

    def get_classe_actuelle(self, obj):
        inscription = obj.inscription_courante
        return inscription.classe.nom if inscription else None

    def create(self, validated_data):
        validated_data['ecole'] = self.context['request'].user.ecole
        etudiant = super().create(validated_data)

        if not etudiant.utilisateur_id:
            ecole = etudiant.ecole
            email = etudiant.email or f"{etudiant.matricule}@{ecole.code}.eleve.local".lower()
            utilisateur = User.objects.create_user(
                email=email, password=MOT_DE_PASSE_TEMPORAIRE, first_name=etudiant.prenom,
                last_name=etudiant.nom, role=User.Role.ETUDIANT, ecole=ecole,
                matricule=etudiant.matricule, is_active=True, must_change_password=True,
            )
            etudiant.utilisateur = utilisateur
            etudiant.save(update_fields=['utilisateur'])

        return etudiant


class TuteurEtudiantSerializer(ValidatedModelSerializer):
    class Meta:
        model = TuteurEtudiant
        fields = ('id', 'parent', 'etudiant', 'relation', 'est_contact_principal', 'date_creation')
        read_only_fields = ('date_creation',)
