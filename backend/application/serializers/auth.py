from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from ..models import AnneeScolaire, Classe, Ecole, User, Etudiant, Inscription, TuteurEtudiant
from ..services.matricule import generer_matricule
from .demandes_inscription import DemandeInscriptionSuiviSerializer, PieceJointeInscriptionSerializer

MOT_DE_PASSE_TEMPORAIRE = '12345678'


class UserSerializer(serializers.ModelSerializer):
    """Profil utilisateur. `role` et `ecole` sont en lecture seule : un utilisateur

    ne peut pas s'auto-promouvoir ni changer d'établissement depuis son profil.
    """
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = (
            'id', 'email', 'password', 'first_name', 'last_name', 'role', 'genre', 'matricule',
            'telephone', 'photo', 'date_naissance', 'lieu_naissance', 'adresse', 'ecole',
            'must_change_password',
        )
        read_only_fields = ('role', 'ecole', 'matricule', 'must_change_password')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=['password'])
        return instance


class DemandeInscriptionSerializer(serializers.ModelSerializer):
    """Vue en lecture seule d'un compte auto-inscrit (rôle Étudiant/Parent) en attente

    d'activation par un administrateur — voir `RegisterSerializer` pour la création.
    Inclut le suivi documents/paiement instruit par le secrétariat (voir
    `DemandeInscriptionSuivi` / `PieceJointeInscription`).
    """
    pieces_jointes = PieceJointeInscriptionSerializer(source='pieces_jointes_inscription', many=True, read_only=True)
    suivi = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'role', 'genre', 'telephone',
            'adresse', 'date_naissance', 'lieu_naissance', 'date_creation', 'pieces_jointes', 'suivi',
        )
        read_only_fields = fields

    def get_suivi(self, obj):
        suivi = getattr(obj, 'suivi_inscription', None)
        return DemandeInscriptionSuiviSerializer(suivi).data if suivi else {
            'frais_inscription_paye': False, 'notes': None,
        }


class RegisterSerializer(serializers.ModelSerializer):
    """Auto-inscription publique : réservée aux rôles ÉTUDIANT et PARENT.

    Les comptes créés ici sont toujours inactifs (`is_active=False`) : ils doivent
    être activés par un administrateur de l'établissement, ce qui empêche la création
    de comptes utilisables directement depuis un point d'entrée public non vérifié.

    Pour le rôle ÉTUDIANT, le dossier `Etudiant` complet (miroir du formulaire "Inscription
    nouvel étudiant" du personnel — EtudiantsPanel.jsx) est créé dans la foulée, pour que
    l'administrateur qui active le compte n'ait pas à ressaisir toutes ces informations : seul
    le matricule est exclu de la saisie publique (généré côté serveur, voir
    `services.matricule.generer_matricule`) et la classe reste une simple préférence
    (l'inscription à la classe choisie est créée mais reste modifiable par l'admin).
    """
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    matricule_enfant = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Champs du dossier étudiant, sans équivalent sur `User` (voir docstring ci-dessus).
    nationalite = serializers.CharField(write_only=True, required=False, allow_blank=True)
    situation_familiale = serializers.CharField(write_only=True, required=False, allow_blank=True)
    ancien_etablissement = serializers.CharField(write_only=True, required=False, allow_blank=True)
    dossier_medical = serializers.CharField(write_only=True, required=False, allow_blank=True)
    contact_urgence_nom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    contact_urgence_telephone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    classe = serializers.PrimaryKeyRelatedField(queryset=Classe.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'password', 'first_name', 'last_name', 'role', 'genre', 'ecole', 'matricule_enfant',
            # Déjà des champs de `User` (voir `DemandeInscriptionSerializer`) — collectés ici plutôt que
            # de laisser l'admin les ressaisir à l'activation.
            'telephone', 'photo', 'date_naissance', 'lieu_naissance', 'adresse',
            'nationalite', 'situation_familiale', 'ancien_etablissement', 'dossier_medical',
            'contact_urgence_nom', 'contact_urgence_telephone', 'classe',
        )
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'role': {'required': True},
            'ecole': {'required': True},
        }

    def validate_role(self, value):
        if value not in (User.Role.ETUDIANT, User.Role.PARENT):
            raise serializers.ValidationError(
                "L'auto-inscription n'est possible que pour les rôles Étudiant ou Parent. "
                "Les comptes du personnel sont créés par un administrateur."
            )
        return value

    def validate(self, attrs):
        role = attrs.get('role')
        # If registering as parent, require matricule_enfant
        if role == User.Role.PARENT:
            matricule = attrs.get('matricule_enfant')
            if not matricule:
                raise serializers.ValidationError({'matricule_enfant': "Le matricule de l'enfant est requis pour un parent."})
            # check student existence
            etu = Etudiant.objects.filter(matricule__iexact=matricule).first()
            if not etu:
                raise serializers.ValidationError({'matricule_enfant': "Aucun étudiant trouvé avec ce matricule."})
            # attach found student object to attrs for use in create()
            attrs['_matricule_enfant_obj'] = etu
        # Le dossier étudiant a besoin au minimum de la date et du lieu de naissance
        # (champs obligatoires du modèle `Etudiant`) — le reste reste facultatif.
        elif role == User.Role.ETUDIANT:
            manquants = {}
            if not attrs.get('date_naissance'):
                manquants['date_naissance'] = 'La date de naissance est requise.'
            if not attrs.get('lieu_naissance'):
                manquants['lieu_naissance'] = 'Le lieu de naissance est requis.'
            if manquants:
                raise serializers.ValidationError(manquants)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # Pop out helper
        etu = validated_data.pop('_matricule_enfant_obj', None)
        # Remove raw matricule field so it isn't passed to User.create_user
        validated_data.pop('matricule_enfant', None)
        # Champs réservés au dossier `Etudiant`, sans colonne sur `User`.
        dossier_etudiant = {
            champ: validated_data.pop(champ, None)
            for champ in (
                'nationalite', 'situation_familiale', 'ancien_etablissement', 'dossier_medical',
                'contact_urgence_nom', 'contact_urgence_telephone', 'classe',
            )
        }
        classe = dossier_etudiant.pop('classe', None)
        # Ensure account inactive by default
        validated_data['is_active'] = False

        # If parent, set parent's school to the student's school (ensures same ecole)
        if validated_data.get('role') == User.Role.PARENT and etu is not None:
            validated_data['ecole'] = etu.ecole

        user = User.objects.create_user(**validated_data)

        # Create tuteur link when registering as parent
        if validated_data.get('role') == User.Role.PARENT and etu is not None:
            TuteurEtudiant.objects.create(parent=user, etudiant=etu, relation=TuteurEtudiant.Relation.AUTRE)

        if validated_data.get('role') == User.Role.ETUDIANT:
            etudiant = Etudiant.objects.create(
                ecole=user.ecole, utilisateur=user, matricule=generer_matricule(user.ecole),
                nom=user.last_name, prenom=user.first_name, genre=user.genre or Etudiant.Genre.AUTRE,
                date_naissance=user.date_naissance, lieu_naissance=user.lieu_naissance,
                nationalite=dossier_etudiant.get('nationalite') or 'Malagasy',
                adresse=user.adresse, telephone=user.telephone, email=user.email,
                photo=user.photo.name if user.photo else None,
                situation_familiale=dossier_etudiant.get('situation_familiale') or None,
                ancien_etablissement=dossier_etudiant.get('ancien_etablissement') or None,
                dossier_medical=dossier_etudiant.get('dossier_medical') or None,
                contact_urgence_nom=dossier_etudiant.get('contact_urgence_nom') or None,
                contact_urgence_telephone=dossier_etudiant.get('contact_urgence_telephone') or None,
            )
            if classe is not None:
                annee_active = AnneeScolaire.objects.filter(ecole=user.ecole, est_active=True).first()
                if annee_active is not None:
                    Inscription.objects.create(etudiant=etudiant, classe=classe, annee_scolaire=annee_active)

        return user


class EcoleAdminRegisterSerializer(serializers.Serializer):
    """Auto-inscription publique d'un administrateur fondateur : crée l'établissement

    ET son compte administrateur en une seule opération atomique. Contrairement à
    `RegisterSerializer`, ce compte est actif immédiatement : en tant que fondateur de
    l'établissement, il n'existe personne d'autre pour l'activer. Tout le personnel
    (enseignants, secrétariat, responsables) est ensuite créé par cet administrateur
    via `StaffCreateSerializer`, jamais par auto-inscription.
    """
    ecole_nom = serializers.CharField(max_length=150)
    ecole_code = serializers.CharField(max_length=20)
    ecole_adresse = serializers.CharField(required=False, allow_blank=True)
    ecole_telephone = serializers.CharField(required=False, allow_blank=True)
    ecole_email = serializers.EmailField(required=False, allow_blank=True)

    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    admin_first_name = serializers.CharField(max_length=150)
    admin_last_name = serializers.CharField(max_length=150)
    admin_telephone = serializers.CharField(required=False, allow_blank=True)

    def validate_ecole_code(self, value):
        if Ecole.objects.filter(code__iexact=value).exists():
            raise serializers.ValidationError("Ce code d'établissement est déjà utilisé.")
        return value

    def validate_admin_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        ecole = Ecole.objects.create(
            nom=validated_data['ecole_nom'],
            code=validated_data['ecole_code'],
            adresse=validated_data.get('ecole_adresse') or None,
            telephone=validated_data.get('ecole_telephone') or None,
            email=validated_data.get('ecole_email') or None,
        )
        admin = User.objects.create_user(
            email=validated_data['admin_email'],
            password=validated_data['admin_password'],
            first_name=validated_data['admin_first_name'],
            last_name=validated_data['admin_last_name'],
            telephone=validated_data.get('admin_telephone') or None,
            role=User.Role.ADMIN,
            ecole=ecole,
            is_active=True,
        )
        return ecole, admin


class StaffCreateSerializer(serializers.ModelSerializer):
    """Création de comptes personnel par un administrateur : l'établissement n'est

    jamais fourni par le client, il est forcé côté serveur sur celui de l'admin, de même que
    le mot de passe — toujours `MOT_DE_PASSE_TEMPORAIRE`, à changer à la première connexion
    (voir `must_change_password`). Le `matricule` sert d'identifiant de connexion alternatif
    (surtout utile pour les enseignants).
    """

    class Meta:
        model = User
        fields = ('id', 'email', 'matricule', 'first_name', 'last_name', 'role', 'genre', 'telephone')

    def validate_role(self, value):
        if value not in (User.Role.ENSEIGNANT, User.Role.RESPONSABLE, User.Role.SECRETARIAT, User.Role.ADMIN):
            raise serializers.ValidationError("Rôle invalide pour un compte du personnel.")
        return value

    def validate_matricule(self, value):
        if not value:
            return value
        ecole = self.context['request'].user.ecole
        if User.objects.filter(ecole=ecole, matricule=value).exists():
            raise serializers.ValidationError("Ce matricule est déjà utilisé dans l'établissement.")
        return value

    def create(self, validated_data):
        validated_data['ecole'] = self.context['request'].user.ecole
        validated_data['is_active'] = True
        validated_data['must_change_password'] = True
        return User.objects.create_user(password=MOT_DE_PASSE_TEMPORAIRE, **validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Connexion par email OU par matricule (enseignants/étudiants) : si l'identifiant

    soumis ne ressemble pas à un email, on le résout d'abord en matricule vers l'email
    réel avant de déléguer à l'authentification standard de SimpleJWT.
    """
    default_error_messages = {
        'no_active_account': "Aucun compte actif trouvé avec ces identifiants.",
    }

    def validate(self, attrs):
        identifiant = attrs.get(self.username_field)
        if identifiant and '@' not in identifiant:
            utilisateur = User.objects.filter(matricule=identifiant).first()
            if utilisateur:
                attrs[self.username_field] = utilisateur.email

        data = super().validate(attrs)
        refresh = self.get_token(self.user)

        user_data = UserSerializer(self.user).data
        data.update({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': user_data,
        })
        return data
