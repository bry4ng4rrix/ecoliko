from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid

TELEPHONE_VALIDATOR = RegexValidator(
    regex=r'^\+?[0-9]{10,15}$',
    message=_('Format de téléphone invalide. Ex: +261340000000 ou 0340000000')
)


class Ecole(models.Model):
    """Établissement scolaire. Racine du cloisonnement multi-établissement."""

    nom = models.CharField(_('nom'), max_length=150)
    code = models.CharField(
        _('code'),
        max_length=20,
        unique=True,
        help_text=_("Code court unique de l'établissement (ex: LYC-TANA)")
    )
    adresse = models.TextField(_('adresse'), blank=True, null=True)
    telephone = models.CharField(
        _('téléphone'), max_length=20, validators=[TELEPHONE_VALIDATOR], blank=True, null=True
    )
    email = models.EmailField(_('email'), blank=True, null=True)
    logo = models.ImageField(_('logo'), upload_to='logos_ecoles/', blank=True, null=True)
    devise = models.CharField(_('devise'), max_length=10, default='Ar')
    est_active = models.BooleanField(_('est active'), default=True)
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)

    class Meta:
        verbose_name = _('établissement')
        verbose_name_plural = _('établissements')
        ordering = ['nom']

    def __str__(self):
        return self.nom


class UserManager(BaseUserManager):
    """Gestionnaire personnalisé pour le modèle User."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email est obligatoire')

        email = self.normalize_email(email)
        
        role = extra_fields.get('role', 'ETUDIANT')  # Use string literal as default

        # Désactiver la connexion pour les étudiants
        if role == 'ETUDIANT':
            extra_fields.setdefault('is_active', False)

        user = self.model(email=email, **extra_fields)
        user.role = role  # Set the role after creating the user
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        # S'assurer que les superutilisateurs sont actifs
        extra_fields.setdefault('is_active', True)
        # S'assurer qu'un superutilisateur est un administrateur
        extra_fields.setdefault('role', 'ADMIN')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superutilisateur doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superutilisateur doit avoir is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Modèle utilisateur personnalisé."""

    # Redéfinition du champ username pour le rendre non obligatoire
    username = models.CharField(
        _('nom d\'utilisateur'),
        max_length=150,
        blank=True,
        null=True,
        unique=True,
        default=uuid.uuid4,  # Valeur par défaut unique
        help_text=_('Généré automatiquement si non fourni')
    )

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = str(uuid.uuid4())
        super().save(*args, **kwargs)

    # Définition des rôles possibles
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrateur')
        ENSEIGNANT = 'ENSEIGNANT', _('Enseignant')
        ETUDIANT = 'ETUDIANT', _('Étudiant')
        RESPONSABLE = 'RESPONSABLE', _('responsable Pédagogique')
        SECRETARIAT = 'SECRETARIAT', _('Secrétariat')
        PARENT = 'PARENT', _('Parent / Tuteur')

    # Définition des genres possibles
    class Genre(models.TextChoices):
        HOMME = 'H', _('Homme')
        FEMME = 'F', _('Femme')
        AUTRE = 'A', _('Autre')

    # Champs personnalisés
    role = models.CharField(
        _('rôle'),
        max_length=15,
        choices=Role.choices,
        default=Role.ETUDIANT
    )

    genre = models.CharField(
        _('genre'),
        max_length=1,
        choices=Genre.choices,
        blank=True,
        null=True
    )

    matricule = models.CharField(
        _('matricule'),
        max_length=20,
        blank=True,
        null=True,
        help_text=_("Identifiant de connexion pour les enseignants et étudiants (utilisable à la place de l'email)."),
    )

    must_change_password = models.BooleanField(
        _('doit changer son mot de passe'),
        default=False,
        help_text=_("Vrai pour un compte créé par un administrateur avec un mot de passe temporaire."),
    )

    ecole = models.ForeignKey(
        Ecole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='utilisateurs',
        verbose_name=_('établissement'),
        help_text=_("Établissement de rattachement (vide pour un super-administrateur plateforme).")
    )

    # Champs hérités de AbstractUser avec des personnalisations
    email = models.EmailField(_('adresse email'), unique=True)
    first_name = models.CharField(_('prénom'), max_length=150)
    last_name = models.CharField(_('nom'), max_length=150)
    is_active = models.BooleanField(
        _('compte actif'),
        default=False,
        help_text=_('Détermine si l\'utilisateur peut se connecter. Les étudiants ne peuvent pas se connecter.')
    )

    # Configuration pour utiliser l'email comme identifiant
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']

    # Gestion des groupes et permissions
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groupes'),
        blank=True,
        help_text=_('Les groupes auxquels appartient l\'utilisateur.'),
        related_name='application_user_set',
        related_query_name='application_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('permissions utilisateur'),
        blank=True,
        help_text=_('Permissions spécifiques pour cet utilisateur.'),
        related_name='application_user_set',
        related_query_name='application_user',
    )
    telephone = models.CharField(
        _('téléphone'), max_length=20, validators=[TELEPHONE_VALIDATOR], blank=True, null=True
    )
    photo = models.ImageField(
        _('photo de profil'),
        upload_to='photos_profils/',
        blank=True,
        null=True
    )
    date_naissance = models.DateField(
        _('date de naissance'),
        null=True,
        blank=True
    )
    lieu_naissance = models.CharField(
        _('lieu de naissance'),
        max_length=100,
        blank=True,
        null=True
    )
    adresse = models.TextField(
        _('adresse'),
        blank=True,
        null=True
    )
    date_creation = models.DateTimeField(
        _('date de création'),
        auto_now_add=True
    )
    date_modification = models.DateTimeField(
        _('date de modification'),
        auto_now=True
    )

    objects = UserManager()

    class Meta:
        verbose_name = _('utilisateur')
        verbose_name_plural = _('utilisateurs')
        ordering = ['last_name', 'first_name']
        constraints = [
            models.UniqueConstraint(
                fields=['ecole', 'matricule'], condition=models.Q(matricule__isnull=False),
                name='unique_matricule_par_ecole',
            ),
        ]

    def __str__(self):
        return self.get_full_name() or self.email


class AnneeScolaire(models.Model):
    """Année scolaire d'un établissement (ex: 2025-2026)."""

    class Statut(models.TextChoices):
        EN_PREPARATION = 'EN_PREPARATION', _('En préparation')
        EN_COURS = 'EN_COURS', _('En cours')
        CLOTUREE = 'CLOTUREE', _('Clôturée')
        ARCHIVEE = 'ARCHIVEE', _('Archivée')

    ecole = models.ForeignKey(
        Ecole, on_delete=models.CASCADE, related_name='annees_scolaires', verbose_name=_('établissement')
    )
    libelle = models.CharField(_('libellé'), max_length=20, help_text=_('Ex: 2025-2026'))
    date_debut = models.DateField(_('date de début'))
    date_fin = models.DateField(_('date de fin'))
    statut = models.CharField(
        _('statut'), max_length=20, choices=Statut.choices, default=Statut.EN_PREPARATION
    )
    est_active = models.BooleanField(
        _('est active'), default=False, help_text=_('Une seule année active par établissement.')
    )
    mois_debut_annee_scolaire = models.PositiveSmallIntegerField(
        _("mois de début du calendrier scolaire"), default=9,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text=_(
            "Premier mois du cycle des 12 mois d'écolage (1=janvier ... 12=décembre, "
            "9=septembre par défaut). Détermine l'échéancier de l'écolage mensuel."
        ),
    )
    jour_echeance_mensuelle = models.PositiveSmallIntegerField(
        _("jour d'échéance mensuelle"), default=5,
        validators=[MinValueValidator(1), MaxValueValidator(28)],
        help_text=_("Jour du mois auquel l'écolage mensuel est dû (1 à 28, pour rester valide tous les mois)."),
    )
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)

    class Meta:
        verbose_name = _('année scolaire')
        verbose_name_plural = _('années scolaires')
        ordering = ['-date_debut']
        unique_together = ['ecole', 'libelle']
        constraints = [
            models.UniqueConstraint(
                fields=['ecole'],
                condition=models.Q(est_active=True),
                name='unique_annee_active_par_ecole'
            )
        ]

    def __str__(self):
        return f"{self.ecole.code} - {self.libelle}"

    def clean(self):
        if self.date_debut and self.date_fin and self.date_fin <= self.date_debut:
            raise ValidationError(_('La date de fin doit être postérieure à la date de début.'))


class Trimestre(models.Model):
    """Période d'évaluation (trimestre) au sein d'une année scolaire."""

    annee_scolaire = models.ForeignKey(
        AnneeScolaire, on_delete=models.CASCADE, related_name='trimestres', verbose_name=_('année scolaire')
    )
    numero = models.PositiveSmallIntegerField(
        _('numéro'), validators=[MinValueValidator(1), MaxValueValidator(3)]
    )
    date_debut = models.DateField(_('date de début'))
    date_fin = models.DateField(_('date de fin'))
    est_actif = models.BooleanField(_('est actif'), default=False)

    class Meta:
        verbose_name = _('trimestre')
        verbose_name_plural = _('trimestres')
        ordering = ['annee_scolaire', 'numero']
        unique_together = ['annee_scolaire', 'numero']
        constraints = [
            models.UniqueConstraint(
                fields=['annee_scolaire'],
                condition=models.Q(est_actif=True),
                name='unique_trimestre_actif_par_annee'
            )
        ]

    def __str__(self):
        return f"{self.annee_scolaire} - Trimestre {self.numero}"

    def clean(self):
        if self.date_debut and self.date_fin and self.date_fin <= self.date_debut:
            raise ValidationError(_('La date de fin doit être postérieure à la date de début.'))


class Filiere(models.Model):
    """Modèle représentant une filière de formation, propre à un établissement."""
    ecole = models.ForeignKey(
        Ecole, on_delete=models.CASCADE, related_name='filieres', verbose_name=_('établissement')
    )
    code = models.CharField(
        _('code'),
        max_length=10,
        help_text=_('Code court de la filière (ex: INFO, GESTION)')
    )
    intitule = models.CharField(
        _('intitulé'),
        max_length=100
    )
    description = models.TextField(
        _('description'),
        blank=True,
        null=True
    )
    duree_etudes = models.PositiveSmallIntegerField(
        _('durée des études (années)'),
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(6)]
    )
    responsable = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': User.Role.RESPONSABLE},
        related_name='filieres_dirigees',
        verbose_name=_('responsable pédagogique')
    )
    capacite_max = models.PositiveSmallIntegerField(
        _('capacité maximale'),
        default=50
    )
    est_active = models.BooleanField(
        _('est active'),
        default=True
    )

    class Meta:
        verbose_name = _('filière')
        verbose_name_plural = _('filières')
        ordering = ['code']
        unique_together = ['ecole', 'code']

    def __str__(self):
        return f"{self.code} - {self.intitule}"


class Niveau(models.Model):
    """Modèle représentant un niveau d'étude, propre à un établissement."""
    ecole = models.ForeignKey(
        Ecole, on_delete=models.CASCADE, related_name='niveaux', verbose_name=_('établissement')
    )
    code = models.CharField(
        _('code'),
        max_length=10,
        help_text=_('Ex: 6EME, 2ND, TLE, L1, etc.')
    )
    intitule = models.CharField(
        _('intitulé'),
        max_length=100
    )
    ordre = models.PositiveSmallIntegerField(
        _('ordre'),
        help_text=_('Ordre d\'affichage (1 pour le premier niveau)')
    )
    est_actif = models.BooleanField(
        _('est actif'),
        default=True
    )

    class Meta:
        verbose_name = _('niveau')
        verbose_name_plural = _('niveaux')
        ordering = ['ordre']
        unique_together = [('ecole', 'code'), ('ecole', 'ordre')]

    def __str__(self):
        return f"{self.code} - {self.intitule}"


class Salle(models.Model):
    """Salle physique d'un établissement (classe, laboratoire, amphithéâtre, etc.)."""

    ecole = models.ForeignKey(
        Ecole, on_delete=models.CASCADE, related_name='salles', verbose_name=_('établissement')
    )
    nom = models.CharField(_('nom'), max_length=50, help_text=_('Ex: Salle 12, Labo Physique'))
    capacite = models.PositiveSmallIntegerField(_('capacité'), default=40)
    type_salle = models.CharField(
        _('type'), max_length=50, blank=True, null=True,
        help_text=_('Ex: Salle de classe, Laboratoire, Amphithéâtre')
    )
    est_active = models.BooleanField(_('est active'), default=True)

    class Meta:
        verbose_name = _('salle')
        verbose_name_plural = _('salles')
        ordering = ['nom']
        unique_together = ['ecole', 'nom']

    def __str__(self):
        return self.nom


class Classe(models.Model):
    """Instance annuelle d'une classe (ex: 2nde C pour 2025-2026)."""

    annee_scolaire = models.ForeignKey(
        AnneeScolaire, on_delete=models.CASCADE, related_name='classes', verbose_name=_('année scolaire')
    )
    niveau = models.ForeignKey(
        Niveau, on_delete=models.PROTECT, related_name='classes', null=True, blank=True, verbose_name=_('niveau')
    )
    filiere = models.ForeignKey(
        Filiere, on_delete=models.PROTECT, related_name='classes', null=True, blank=True,
        verbose_name=_('filière')
    )
    nom = models.CharField(_('nom'), max_length=50, help_text=_('Ex: 2nde C, Terminale S1'))
    section = models.CharField(
        _('section'), max_length=50, blank=True, null=True,
        help_text=_('Ex: A, B, Bilingue... (regroupement au sein du niveau/filière)'),
    )
    capacite_max = models.PositiveSmallIntegerField(_('capacité maximale'), default=40)
    titulaire = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': User.Role.ENSEIGNANT},
        related_name='classes_titulaire',
        verbose_name=_('professeur titulaire')
    )
    salle = models.ForeignKey(
        Salle, on_delete=models.SET_NULL, null=True, blank=True, related_name='classes', verbose_name=_('salle')
    )
    delegue = models.ForeignKey(
        'Etudiant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='classes_delegue',
        verbose_name=_('délégué de classe'),
        help_text=_("Étudiant représentant la classe (destinataire privilégié des documents des enseignants).")
    )
    enseignants = models.ManyToManyField(
        User,
        blank=True,
        limit_choices_to={'role': User.Role.ENSEIGNANT},
        related_name='classes_enseignees',
        verbose_name=_('enseignants'),
        help_text=_("Enseignants intervenant dans cette classe (au-delà du seul professeur titulaire)."),
    )
    frais_ecolage_mensuel = models.DecimalField(
        _('écolage mensuel'), max_digits=10, decimal_places=2, null=True, blank=True,
        help_text=_("Montant de l'écolage par mois pour cette classe (ex: 100000 Ar/mois)."),
    )
    frais_inscription = models.DecimalField(
        _("droit d'inscription"), max_digits=10, decimal_places=2, null=True, blank=True,
        help_text=_("Frais d'inscription pour un nouvel élève dans cette classe."),
    )
    frais_reinscription = models.DecimalField(
        _('droit de réinscription'), max_digits=10, decimal_places=2, null=True, blank=True,
        help_text=_("Frais de réinscription pour un élève déjà inscrit l'année précédente."),
    )
    est_active = models.BooleanField(_('est active'), default=True)
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)

    class Meta:
        verbose_name = _('classe')
        verbose_name_plural = _('classes')
        ordering = ['annee_scolaire', 'niveau__ordre', 'nom']
        unique_together = ['annee_scolaire', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.annee_scolaire.libelle})"

    def clean(self):
        if self.niveau_id and self.annee_scolaire_id and self.niveau.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("Le niveau doit appartenir à l'établissement de l'année scolaire."))
        if self.filiere_id and self.annee_scolaire_id and self.filiere.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("La filière doit appartenir à l'établissement de l'année scolaire."))
        if self.salle_id and self.annee_scolaire_id and self.salle.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("La salle doit appartenir à l'établissement de l'année scolaire."))
        if self.delegue_id and self.annee_scolaire_id and self.delegue.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("Le délégué doit appartenir à l'établissement de l'année scolaire."))

    @property
    def ecole(self):
        return self.annee_scolaire.ecole

    @property
    def effectif(self):
        return self.inscriptions.filter(statut=Inscription.StatutInscription.ACTIVE).count()


class Etudiant(models.Model):
    """Modèle représentant un étudiant (dossier permanent, indépendant de l'année scolaire)."""

    class StatutEtudiant(models.TextChoices):
        INSCRIT = 'INSCRIT', _('Inscrit')
        ADMIS = 'ADMIS', _('Admis')
        ABANDON = 'ABANDON', _('Abandon')
        EXCLU = 'EXCLU', _('Exclu')
        DIPLOME = 'DIPLOME', _('Diplômé')

    class Genre(models.TextChoices):
        HOMME = 'H', _('Homme')
        FEMME = 'F', _('Femme')
        AUTRE = 'A', _('Autre')

    ecole = models.ForeignKey(
        Ecole, on_delete=models.CASCADE, related_name='etudiants', verbose_name=_('établissement')
    )
    utilisateur = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': User.Role.ETUDIANT},
        related_name='dossier_etudiant',
        verbose_name=_('compte de connexion'),
        help_text=_("Compte utilisateur permettant à l'étudiant de se connecter (facultatif).")
    )

    # Informations personnelles
    matricule = models.CharField(
        _('matricule'),
        max_length=20,
        help_text=_('Format: ANNEE-CODE-XXXX (ex: 2023-INF-0001)')
    )
    nom = models.CharField(_('nom'), max_length=100)
    prenom = models.CharField(_('prénom'), max_length=100)
    date_naissance = models.DateField(_('date de naissance'))
    lieu_naissance = models.CharField(_('lieu de naissance'), max_length=100)
    genre = models.CharField(
        _('genre'),
        max_length=1,
        choices=Genre.choices
    )
    nationalite = models.CharField(
        _('nationalité'),
        max_length=100,
        default='Malagasy'
    )

    # Informations de contact
    adresse = models.TextField(_('adresse'), blank=True, null=True)
    telephone = models.CharField(
        _('téléphone'), max_length=20, validators=[TELEPHONE_VALIDATOR], blank=True, null=True
    )
    email = models.EmailField(_('adresse email'), unique=True, blank=True, null=True)
    photo = models.ImageField(_('photo'), upload_to='photos_etudiants/', blank=True, null=True)

    # Situation et suivi
    situation_familiale = models.CharField(_('situation familiale'), max_length=100, blank=True, null=True)
    ancien_etablissement = models.CharField(_('ancien établissement'), max_length=150, blank=True, null=True)
    dossier_medical = models.TextField(
        _('dossier médical'), blank=True, null=True,
        help_text=_('Allergies, traitements en cours, contre-indications médicales...'),
    )
    contact_urgence_nom = models.CharField(_("nom du contact d'urgence"), max_length=150, blank=True, null=True)
    contact_urgence_telephone = models.CharField(
        _("téléphone du contact d'urgence"), max_length=20,
        validators=[TELEPHONE_VALIDATOR], blank=True, null=True,
    )

    # Informations académiques
    date_inscription = models.DateField(_("date d'inscription"), auto_now_add=True)
    statut = models.CharField(
        _('statut'),
        max_length=10,
        choices=StatutEtudiant.choices,
        default=StatutEtudiant.INSCRIT
    )

    # Champs de suivi
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('étudiant')
        verbose_name_plural = _('étudiants')
        ordering = ['nom', 'prenom']
        unique_together = [('ecole', 'matricule'), ('ecole', 'nom', 'prenom', 'date_naissance')]

    def __str__(self):
        return f"{self.nom.upper()} {self.prenom} ({self.matricule})"

    @property
    def age(self):
        """Calcule l'âge de l'étudiant."""
        from datetime import date
        today = date.today()
        return today.year - self.date_naissance.year - (
            (today.month, today.day) <
            (self.date_naissance.month, self.date_naissance.day)
        )

    def get_full_name(self):
        """Retourne le nom complet de l'étudiant."""
        return f"{self.prenom} {self.nom.upper()}"

    def clean(self):
        if self.utilisateur_id and self.ecole_id and self.utilisateur.ecole_id != self.ecole_id:
            raise ValidationError(_("Le compte de connexion doit appartenir au même établissement."))

    @property
    def inscription_courante(self):
        return self.inscriptions.filter(
            classe__annee_scolaire__est_active=True
        ).select_related('classe', 'classe__niveau', 'classe__filiere').first()


class Inscription(models.Model):
    """Enregistrement de l'inscription d'un étudiant dans une classe pour une année scolaire donnée."""

    class StatutInscription(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        REDOUBLANT = 'REDOUBLANT', _('Redoublant')
        TRANSFERE = 'TRANSFERE', _('Transféré')
        ABANDON = 'ABANDON', _('Abandon')
        EXCLU = 'EXCLU', _('Exclu')
        DIPLOME = 'DIPLOME', _('Diplômé')

    etudiant = models.ForeignKey(
        Etudiant, on_delete=models.CASCADE, related_name='inscriptions', verbose_name=_('étudiant')
    )
    classe = models.ForeignKey(
        Classe, on_delete=models.PROTECT, related_name='inscriptions', verbose_name=_('classe')
    )
    annee_scolaire = models.ForeignKey(
        AnneeScolaire, on_delete=models.CASCADE, related_name='inscriptions', verbose_name=_('année scolaire')
    )
    date_inscription = models.DateField(_("date d'inscription"), default=timezone.localdate)
    statut = models.CharField(
        _('statut'), max_length=15, choices=StatutInscription.choices, default=StatutInscription.ACTIVE
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('inscription')
        verbose_name_plural = _('inscriptions')
        ordering = ['-annee_scolaire__date_debut', 'classe']
        unique_together = ['etudiant', 'annee_scolaire']

    def __str__(self):
        return f"{self.etudiant} - {self.classe} - {self.annee_scolaire.libelle}"

    def clean(self):
        if self.classe_id and self.annee_scolaire_id and self.classe.annee_scolaire_id != self.annee_scolaire_id:
            raise ValidationError(_("La classe doit appartenir à l'année scolaire de l'inscription."))
        if self.etudiant_id and self.classe_id and self.etudiant.ecole_id != self.classe.annee_scolaire.ecole_id:
            raise ValidationError(_("L'étudiant et la classe doivent appartenir au même établissement."))


class TuteurEtudiant(models.Model):
    """Lien entre un compte parent/tuteur (User, rôle PARENT) et un étudiant."""

    class Relation(models.TextChoices):
        PERE = 'PERE', _('Père')
        MERE = 'MERE', _('Mère')
        TUTEUR = 'TUTEUR', _('Tuteur légal')
        AUTRE = 'AUTRE', _('Autre')

    parent = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'role': User.Role.PARENT},
        related_name='enfants',
        verbose_name=_('parent')
    )
    etudiant = models.ForeignKey(
        Etudiant, on_delete=models.CASCADE, related_name='tuteurs', verbose_name=_('étudiant')
    )
    relation = models.CharField(_('relation'), max_length=10, choices=Relation.choices)
    est_contact_principal = models.BooleanField(_('contact principal'), default=False)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('tuteur')
        verbose_name_plural = _('tuteurs')
        unique_together = ['parent', 'etudiant']

    def __str__(self):
        return f"{self.parent} - {self.get_relation_display()} de {self.etudiant}"

    def clean(self):
        if self.parent_id and self.etudiant_id and self.parent.ecole_id != self.etudiant.ecole_id:
            raise ValidationError(_("Le parent et l'étudiant doivent appartenir au même établissement."))


class Matiere(models.Model):
    """Modèle représentant une matière d'enseignement (catalogue par établissement).

    `ecole` est l'ancrage multi-établissement direct : `niveau`/`filiere` restent des
    métadonnées de classement optionnelles (une matière peut être créée sans préciser
    de niveau), donc on ne peut plus s'appuyer sur elles pour le cloisonnement.
    """

    ecole = models.ForeignKey(
        Ecole, on_delete=models.CASCADE, related_name='matieres', verbose_name=_('établissement')
    )
    code = models.CharField(
        _('code'),
        max_length=10,
        blank=True,
        help_text=_('Code court de la matière (ex: MATH, PHYS) — généré automatiquement si laissé vide.')
    )
    intitule = models.CharField(
        _('intitulé'),
        max_length=100
    )
    description = models.TextField(
        _('description'),
        blank=True,
        null=True
    )
    coefficient = models.PositiveSmallIntegerField(
        _('coefficient'),
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    couleur = models.CharField(
        _('couleur'), max_length=7, default='#6366f1',
        help_text=_("Couleur d'affichage dans l'emploi du temps (hexadécimal, ex: #6366f1)."),
    )
    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name=_('filière'),
        related_name='matieres',
        help_text=_('Laisser vide pour un niveau sans filière (ex: collège).')
    )
    niveau = models.ForeignKey(
        Niveau,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name=_('niveau'),
        related_name='matieres'
    )
    enseignant = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': User.Role.ENSEIGNANT},
        verbose_name=_('enseignant'),
        related_name='matieres_enseignees'
    )
    est_active = models.BooleanField(
        _('est active'),
        default=True
    )

    class Meta:
        verbose_name = _('matière')
        verbose_name_plural = _('matières')
        ordering = ['code']
        unique_together = ['ecole', 'code']

    def __str__(self):
        return f"{self.code} - {self.intitule}"

    def clean(self):
        if self.filiere_id and self.filiere.ecole_id != self.ecole_id:
            raise ValidationError(_("La filière doit appartenir au même établissement que la matière."))
        if self.niveau_id and self.niveau.ecole_id != self.ecole_id:
            raise ValidationError(_("Le niveau doit appartenir au même établissement que la matière."))


class Note(models.Model):
    """Modèle représentant une note d'un étudiant dans une matière, pour un trimestre donné."""

    etudiant = models.ForeignKey(
        Etudiant,
        on_delete=models.CASCADE,
        verbose_name=_('étudiant'),
        related_name='notes'
    )
    matiere = models.ForeignKey(
        Matiere,
        on_delete=models.CASCADE,
        verbose_name=_('matière'),
        related_name='notes'
    )
    trimestre = models.ForeignKey(
        Trimestre,
        on_delete=models.CASCADE,
        verbose_name=_('trimestre'),
        related_name='notes'
    )
    valeur = models.DecimalField(
        _('note'),
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('20'))]
    )
    date_evaluation = models.DateField(
        _("date d'évaluation"),
        default=timezone.localdate
    )
    type_evaluation = models.CharField(
        _("type d'évaluation"),
        max_length=50,
        help_text=_('Ex: Contrôle continu, Examen final, etc.')
    )
    commentaire = models.TextField(
        _('commentaire'),
        blank=True,
        null=True
    )
    saisie_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notes_saisies',
        verbose_name=_('saisie par')
    )
    date_creation = models.DateTimeField(
        _('date de création'),
        auto_now_add=True
    )
    date_modification = models.DateTimeField(
        _('date de modification'),
        auto_now=True
    )

    class Meta:
        verbose_name = _('note')
        verbose_name_plural = _('notes')
        ordering = ['-date_evaluation', 'etudiant']
        unique_together = ['etudiant', 'matiere', 'type_evaluation', 'trimestre']

    def __str__(self):
        return f"{self.etudiant} - {self.matiere} - {self.valeur}/20 (T{self.trimestre.numero})"

    def clean(self):
        if self.matiere_id and self.trimestre_id and self.matiere.ecole_id != self.trimestre.annee_scolaire.ecole_id:
            raise ValidationError(_("La matière et le trimestre doivent appartenir au même établissement."))


class Bulletin(models.Model):
    """Bulletin scolaire (trimestriel si `trimestre` est renseigné, annuel sinon).

    Les valeurs (moyenne, rang, mention, décision) sont calculées par
    `services.bulletin.generer_bulletin` au moment de la génération, pas saisies à la main.
    """

    class Mention(models.TextChoices):
        FELICITATIONS = 'FELICITATIONS', _('Félicitations')
        ENCOURAGEMENTS = 'ENCOURAGEMENTS', _('Encouragements')
        TABLEAU_HONNEUR = 'TABLEAU_HONNEUR', _("Tableau d'honneur")
        AUCUNE = 'AUCUNE', _('Aucune')

    class Decision(models.TextChoices):
        ADMIS = 'ADMIS', _('Admis')
        AJOURNE = 'AJOURNE', _('Ajourné')
        REDOUBLE = 'REDOUBLE', _('Redouble')
        NON_APPLICABLE = 'NON_APPLICABLE', _('Non applicable (bulletin trimestriel)')

    etudiant = models.ForeignKey(
        Etudiant, on_delete=models.CASCADE, related_name='bulletins', verbose_name=_('étudiant')
    )
    classe = models.ForeignKey(
        Classe, on_delete=models.PROTECT, related_name='bulletins', verbose_name=_('classe')
    )
    annee_scolaire = models.ForeignKey(
        AnneeScolaire, on_delete=models.CASCADE, related_name='bulletins', verbose_name=_('année scolaire')
    )
    trimestre = models.ForeignKey(
        Trimestre, on_delete=models.CASCADE, related_name='bulletins', null=True, blank=True,
        verbose_name=_('trimestre'), help_text=_('Vide pour un bulletin annuel.')
    )
    moyenne_generale = models.DecimalField(
        _('moyenne générale'), max_digits=4, decimal_places=2, null=True, blank=True
    )
    rang = models.PositiveSmallIntegerField(_('rang'), null=True, blank=True)
    effectif_classe = models.PositiveSmallIntegerField(_('effectif de la classe'), null=True, blank=True)
    mention = models.CharField(_('mention'), max_length=20, choices=Mention.choices, default=Mention.AUCUNE)
    decision = models.CharField(
        _('décision'), max_length=20, choices=Decision.choices, default=Decision.NON_APPLICABLE
    )
    est_valide = models.BooleanField(_('validé'), default=False)
    valide_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='bulletins_valides', verbose_name=_('validé par')
    )
    date_generation = models.DateTimeField(_('date de génération'), auto_now_add=True)
    date_validation = models.DateTimeField(_('date de validation'), null=True, blank=True)

    class Meta:
        verbose_name = _('bulletin')
        verbose_name_plural = _('bulletins')
        ordering = ['-annee_scolaire__date_debut', 'trimestre', 'etudiant']
        unique_together = ['etudiant', 'annee_scolaire', 'trimestre']

    def __str__(self):
        periode = f"Trimestre {self.trimestre.numero}" if self.trimestre else 'Annuel'
        return f"{self.etudiant} - {self.annee_scolaire.libelle} - {periode}"

    def clean(self):
        if self.etudiant_id and self.classe_id and self.etudiant.ecole_id != self.classe.annee_scolaire.ecole_id:
            raise ValidationError(_("L'étudiant et la classe doivent appartenir au même établissement."))
        if self.trimestre_id and self.trimestre.annee_scolaire_id != self.annee_scolaire_id:
            raise ValidationError(_("Le trimestre doit appartenir à l'année scolaire du bulletin."))


class FraisScolarite(models.Model):
    """Tarif configuré par niveau (et éventuellement filière) pour une année scolaire.

    Sert de référence pour calculer le reste à payer d'un étudiant (dossier financier).
    """

    annee_scolaire = models.ForeignKey(
        AnneeScolaire, on_delete=models.CASCADE, related_name='frais_scolarite', verbose_name=_('année scolaire')
    )
    niveau = models.ForeignKey(
        Niveau, on_delete=models.CASCADE, related_name='frais_scolarite', verbose_name=_('niveau')
    )
    filiere = models.ForeignKey(
        Filiere, on_delete=models.CASCADE, related_name='frais_scolarite', null=True, blank=True,
        verbose_name=_('filière')
    )
    montant_inscription = models.DecimalField(
        _("frais d'inscription"), max_digits=10, decimal_places=2, default=0
    )
    montant_annuel = models.DecimalField(_('écolage annuel'), max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = _('frais de scolarité')
        verbose_name_plural = _('frais de scolarité')
        ordering = ['annee_scolaire', 'niveau']
        unique_together = ['annee_scolaire', 'niveau', 'filiere']

    def __str__(self):
        return f"{self.niveau} {self.filiere or ''} - {self.annee_scolaire.libelle} - {self.montant_annuel}"

    def clean(self):
        if self.niveau_id and self.annee_scolaire_id and self.niveau.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("Le niveau doit appartenir à l'établissement de l'année scolaire."))
        if self.filiere_id and self.annee_scolaire_id and self.filiere.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("La filière doit appartenir à l'établissement de l'année scolaire."))


class PaiementEcolage(models.Model):
    """Modèle représentant un paiement d'écolage."""

    class StatutPaiement(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', _('En attente')
        PAYE = 'PAYE', _('Payé')
        ANNULE = 'ANNULE', _('Annulé')
        EN_RETARD = 'EN_RETARD', _('En retard')

    etudiant = models.ForeignKey(
        Etudiant,
        on_delete=models.CASCADE,
        verbose_name=_('étudiant'),
        related_name='paiements_ecolage'
    )
    annee_scolaire = models.ForeignKey(
        AnneeScolaire,
        on_delete=models.CASCADE,
        verbose_name=_('année scolaire'),
        related_name='paiements_ecolage'
    )
    montant = models.DecimalField(
        _('montant'),
        max_digits=10,
        decimal_places=2
    )
    date_paiement = models.DateField(
        _('date de paiement'),
        default=timezone.localdate
    )
    date_echeance = models.DateField(
        _('date d\'échéance')
    )
    statut = models.CharField(
        _('statut'),
        max_length=15,
        choices=StatutPaiement.choices,
        default=StatutPaiement.EN_ATTENTE
    )
    mois_couvert = models.PositiveSmallIntegerField(
        _('mois couvert'),
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    mode_paiement = models.CharField(
        _('mode de paiement'),
        max_length=50,
        default='Espèces',
        help_text=_('Ex: Espèces, Virement, Chèque, etc.')
    )
    reference = models.CharField(
        _('référence'),
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Numéro de référence du paiement')
    )
    commentaire = models.TextField(
        _('commentaire'),
        blank=True,
        null=True
    )
    date_creation = models.DateTimeField(
        _('date de création'),
        auto_now_add=True
    )
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='paiements_crees',
        verbose_name=_('créé par')
    )
    secretaire = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role__in': [User.Role.ADMIN, User.Role.SECRETARIAT]},
        related_name='paiements_enregistres',
        verbose_name=_('secrétaire')
    )

    class Meta:
        verbose_name = _('paiement d\'écolage')
        verbose_name_plural = _('paiements d\'écolage')
        ordering = ['-date_paiement', 'etudiant']

    def __str__(self):
        return f"{self.etudiant} - {self.montant} {self.etudiant.ecole.devise} - {self.get_statut_display()}"

    def est_en_retard(self):
        return self.date_echeance < timezone.now().date() and self.statut != self.StatutPaiement.PAYE

    def clean(self):
        if self.etudiant_id and self.annee_scolaire_id and self.etudiant.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("L'étudiant et l'année scolaire doivent appartenir au même établissement."))


class DemandeDocument(models.Model):
    """Demande d'un document administratif (certificat, attestation...) avec workflow de validation.

    Le PDF n'est généré à la volée (voir `services.documents`) qu'une fois la demande validée.
    """

    class TypeDocument(models.TextChoices):
        CERTIFICAT_SCOLARITE = 'CERTIFICAT_SCOLARITE', _('Certificat de scolarité')
        ATTESTATION = 'ATTESTATION', _('Attestation de fréquentation')
        CERTIFICAT_REUSSITE = 'CERTIFICAT_REUSSITE', _('Certificat de réussite')

    class Statut(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', _('En attente')
        VALIDE = 'VALIDE', _('Validé')
        REFUSE = 'REFUSE', _('Refusé')

    etudiant = models.ForeignKey(
        Etudiant, on_delete=models.CASCADE, related_name='demandes_documents', verbose_name=_('étudiant')
    )
    annee_scolaire = models.ForeignKey(
        AnneeScolaire, on_delete=models.CASCADE, related_name='demandes_documents', verbose_name=_('année scolaire')
    )
    type_document = models.CharField(_('type de document'), max_length=25, choices=TypeDocument.choices)
    statut = models.CharField(_('statut'), max_length=10, choices=Statut.choices, default=Statut.EN_ATTENTE)
    motif_refus = models.TextField(_('motif de refus'), blank=True, null=True)
    demande_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='documents_demandes', verbose_name=_('demandé par')
    )
    traite_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_traites', verbose_name=_('traité par')
    )
    date_demande = models.DateTimeField(_('date de demande'), auto_now_add=True)
    date_traitement = models.DateTimeField(_('date de traitement'), null=True, blank=True)

    class Meta:
        verbose_name = _('demande de document')
        verbose_name_plural = _('demandes de documents')
        ordering = ['-date_demande']

    def __str__(self):
        return f"{self.etudiant} - {self.get_type_document_display()} ({self.get_statut_display()})"

    def clean(self):
        if self.etudiant_id and self.annee_scolaire_id and self.etudiant.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("L'étudiant et l'année scolaire doivent appartenir au même établissement."))


class Message(models.Model):
    """Message interne direct (1 expéditeur, 1 destinataire)."""

    expediteur = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='messages_envoyes', verbose_name=_('expéditeur')
    )
    destinataire = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='messages_recus', verbose_name=_('destinataire')
    )
    objet = models.CharField(_('objet'), max_length=200)
    contenu = models.TextField(_('contenu'))
    est_lu = models.BooleanField(_('lu'), default=False)
    date_envoi = models.DateTimeField(_("date d'envoi"), auto_now_add=True)

    class Meta:
        verbose_name = _('message')
        verbose_name_plural = _('messages')
        ordering = ['-date_envoi']

    def __str__(self):
        return f"{self.expediteur} → {self.destinataire} : {self.objet}"

    def clean(self):
        if self.expediteur_id and self.destinataire_id and self.expediteur_id == self.destinataire_id:
            raise ValidationError(_("Impossible de s'envoyer un message à soi-même."))
        if self.expediteur_id and self.destinataire_id and self.expediteur.ecole_id != self.destinataire.ecole_id:
            raise ValidationError(_("L'expéditeur et le destinataire doivent appartenir au même établissement."))


class MessageGroupeClasse(models.Model):
    """Message dans le chat de groupe d'une classe, rattaché à l'enseignant qui l'anime : chaque

    professeur dispose ainsi de son propre espace de discussion avec chacune de ses classes,
    ouvert aux élèves de cette classe et à leurs parents (mêmes destinataires qu'une annonce de
    portée CLASSE) — pratique pour échanger autour des devoirs envoyés à ce groupe.
    """
    classe = models.ForeignKey(
        Classe, on_delete=models.CASCADE, related_name='messages_groupe', verbose_name=_('classe')
    )
    enseignant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='messages_groupe_classes',
        limit_choices_to={'role': User.Role.ENSEIGNANT}, verbose_name=_('enseignant'),
    )
    auteur = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='messages_groupe_envoyes', verbose_name=_('auteur')
    )
    contenu = models.TextField(_('contenu'), blank=True)
    fichier = models.FileField(
        _('fichier'), upload_to='messages_groupe_classe/', blank=True, null=True,
        help_text=_('Pièce jointe optionnelle (image, PDF, document...).'),
    )
    date_envoi = models.DateTimeField(_("date d'envoi"), auto_now_add=True)

    class Meta:
        verbose_name = _('message de groupe (classe)')
        verbose_name_plural = _('messages de groupe (classe)')
        ordering = ['date_envoi']

    def __str__(self):
        return f"{self.classe} / {self.enseignant} — {self.auteur} : {self.contenu[:30]}"

    def clean(self):
        if self.classe_id and self.enseignant_id and self.classe.annee_scolaire.ecole_id != self.enseignant.ecole_id:
            raise ValidationError(_("La classe et l'enseignant doivent appartenir au même établissement."))
        if not self.contenu and not self.fichier:
            raise ValidationError(_('Le message doit contenir du texte ou une pièce jointe.'))


class DiscussionClasse(models.Model):
    """État (ouverte/fermée) du chat de groupe d'une classe pour un enseignant donné : le

    professeur peut fermer la discussion pour empêcher temporairement les élèves (et leurs
    parents) d'y répondre — lui-même peut toujours écrire — puis la rouvrir. L'absence
    d'enregistrement pour un (classe, enseignant) donné vaut discussion ouverte par défaut.
    """
    classe = models.ForeignKey(
        Classe, on_delete=models.CASCADE, related_name='discussions', verbose_name=_('classe')
    )
    enseignant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='discussions_classes',
        limit_choices_to={'role': User.Role.ENSEIGNANT}, verbose_name=_('enseignant'),
    )
    est_ouverte = models.BooleanField(_('discussion ouverte'), default=True)
    date_modification = models.DateTimeField(_('dernière modification'), auto_now=True)

    class Meta:
        verbose_name = _('discussion de classe')
        verbose_name_plural = _('discussions de classe')
        unique_together = ['classe', 'enseignant']

    def __str__(self):
        etat = 'ouverte' if self.est_ouverte else 'fermée'
        return f"{self.classe} / {self.enseignant} — {etat}"

    def clean(self):
        if self.classe_id and self.enseignant_id and self.classe.annee_scolaire.ecole_id != self.enseignant.ecole_id:
            raise ValidationError(_("La classe et l'enseignant doivent appartenir au même établissement."))


class Annonce(models.Model):
    """Annonce diffusée à un groupe de destinataires (établissement, classe, enseignants, parents)."""

    class Portee(models.TextChoices):
        ETABLISSEMENT = 'ETABLISSEMENT', _("Tout l'établissement")
        CLASSE = 'CLASSE', _('Une classe')
        ENSEIGNANTS = 'ENSEIGNANTS', _('Les enseignants')
        PARENTS = 'PARENTS', _('Les parents')

    ecole = models.ForeignKey(Ecole, on_delete=models.CASCADE, related_name='annonces', verbose_name=_('établissement'))
    classe = models.ForeignKey(
        Classe, on_delete=models.CASCADE, related_name='annonces', null=True, blank=True,
        verbose_name=_('classe'), help_text=_("Requis uniquement si portée = 'Une classe'.")
    )
    portee = models.CharField(_('portée'), max_length=20, choices=Portee.choices, default=Portee.ETABLISSEMENT)
    titre = models.CharField(_('titre'), max_length=200)
    contenu = models.TextField(_('contenu'))
    auteur = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='annonces_publiees', verbose_name=_('auteur')
    )
    date_publication = models.DateTimeField(_('date de publication'), auto_now_add=True)

    class Meta:
        verbose_name = _('annonce')
        verbose_name_plural = _('annonces')
        ordering = ['-date_publication']

    def __str__(self):
        return self.titre

    def clean(self):
        if self.portee == self.Portee.CLASSE and not self.classe_id:
            raise ValidationError(_("Une classe doit être précisée pour une annonce de portée 'Classe'."))
        if self.classe_id and self.ecole_id and self.classe.annee_scolaire.ecole_id != self.ecole_id:
            raise ValidationError(_("La classe doit appartenir à l'établissement de l'annonce."))


class Notification(models.Model):
    """Notification système, générée automatiquement (signaux) — jamais créée manuellement par un utilisateur."""

    class Type(models.TextChoices):
        NOTE = 'NOTE', _('Nouvelle note')
        ABSENCE = 'ABSENCE', _('Absence')
        PAIEMENT = 'PAIEMENT', _('Paiement enregistré')
        BULLETIN = 'BULLETIN', _('Bulletin disponible')
        DOCUMENT = 'DOCUMENT', _('Document disponible')
        ANNONCE = 'ANNONCE', _('Nouvelle annonce')
        MESSAGE = 'MESSAGE', _('Nouveau message')
        DEVOIR = 'DEVOIR', _('Nouveau devoir')
        RAPPEL_DEVOIR = 'RAPPEL_DEVOIR', _('Rappel de devoir')
        DISCIPLINE = 'DISCIPLINE', _('Événement disciplinaire')

    destinataire = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications', verbose_name=_('destinataire')
    )
    type_notification = models.CharField(_('type'), max_length=15, choices=Type.choices)
    titre = models.CharField(_('titre'), max_length=200)
    message = models.TextField(_('message'), blank=True, null=True)
    est_lue = models.BooleanField(_('lue'), default=False)
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)

    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.destinataire} - {self.titre}"


class PresenceCours(models.Model):
    """Modèle pour enregistrer les présences/absences des étudiants aux cours."""

    class StatutPresence(models.TextChoices):
        PRESENT = 'P', _('Présent')
        ABSENT = 'A', _('Absent')
        RETARD = 'R', _('En retard')
        EXCUSE = 'E', _('Absence justifiée')

    class StatutJustification(models.TextChoices):
        AUCUNE = 'AUCUNE', _('Aucune justification')
        EN_ATTENTE = 'EN_ATTENTE', _('En attente de validation')
        ACCEPTEE = 'ACCEPTEE', _('Acceptée')
        REFUSEE = 'REFUSEE', _('Refusée')

    etudiant = models.ForeignKey(
        Etudiant,
        on_delete=models.CASCADE,
        verbose_name=_('étudiant'),
        related_name='presences'
    )
    matiere = models.ForeignKey(
        Matiere,
        on_delete=models.CASCADE,
        verbose_name=_('matière'),
        related_name='presences'
    )
    date_cours = models.DateField(
        _('date du cours')
    )
    heure_debut = models.TimeField(
        _('heure de début')
    )
    heure_fin = models.TimeField(
        _('heure de fin')
    )
    statut = models.CharField(
        _('statut'),
        max_length=1,
        choices=StatutPresence.choices,
        default=StatutPresence.PRESENT
    )
    justificatif = models.TextField(
        _('justificatif'),
        blank=True,
        null=True
    )
    justification_statut = models.CharField(
        _('statut de la justification'), max_length=10,
        choices=StatutJustification.choices, default=StatutJustification.AUCUNE,
    )
    date_creation = models.DateTimeField(
        _('date de création'),
        auto_now_add=True
    )
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='presences_enregistrees',
        verbose_name=_('enregistré par')
    )

    class Meta:
        verbose_name = _('présence au cours')
        verbose_name_plural = _('présences aux cours')
        ordering = ['-date_cours', 'heure_debut', 'etudiant']
        unique_together = ['etudiant', 'matiere', 'date_cours']

    def __str__(self):
        return f"{self.etudiant} - {self.matiere} - {self.date_cours} - {self.get_statut_display()}"

    def clean(self):
        if self.heure_debut and self.heure_fin and self.heure_fin <= self.heure_debut:
            raise ValidationError(_("L'heure de fin doit être postérieure à l'heure de début."))
        if self.matiere_id and self.etudiant_id and self.matiere.ecole_id != self.etudiant.ecole_id:
            raise ValidationError(_("La matière et l'étudiant doivent appartenir au même établissement."))


class EmploiDuTemps(models.Model):
    """Modèle pour gérer l'emploi du temps d'une classe (annuel)."""

    class JourSemaine(models.TextChoices):
        LUNDI = 'LUN', _('Lundi')
        MARDI = 'MAR', _('Mardi')
        MERCREDI = 'MER', _('Mercredi')
        JEUDI = 'JEU', _('Jeudi')
        VENDREDI = 'VEN', _('Vendredi')
        SAMEDI = 'SAM', _('Samedi')

    classe = models.ForeignKey(
        Classe,
        on_delete=models.CASCADE,
        verbose_name=_('classe'),
        related_name='emplois_du_temps'
    )
    matiere = models.ForeignKey(
        Matiere,
        on_delete=models.CASCADE,
        verbose_name=_('matière'),
        related_name='emplois_du_temps'
    )
    enseignant = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': User.Role.ENSEIGNANT},
        verbose_name=_('enseignant'),
        related_name='cours_donnes'
    )
    jour = models.CharField(
        _('jour'),
        max_length=3,
        choices=JourSemaine.choices
    )
    heure_debut = models.TimeField(
        _('heure de début')
    )
    heure_fin = models.TimeField(
        _('heure de fin')
    )
    salle = models.ForeignKey(
        Salle, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='emplois_du_temps', verbose_name=_('salle')
    )
    groupe = models.CharField(
        _('groupe'), max_length=50, blank=True, null=True,
        help_text=_('Ex: Groupe A, TP1... pour un cours en sous-groupe plutôt que classe entière.'),
    )
    est_actif = models.BooleanField(
        _('est actif'),
        default=True
    )
    date_creation = models.DateTimeField(
        _('date de création'),
        auto_now_add=True
    )
    cree_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='emplois_du_temps_crees',
        verbose_name=_('créé par')
    )

    class Meta:
        verbose_name = _('emploi du temps')
        verbose_name_plural = _('emplois du temps')
        ordering = ['jour', 'heure_debut']
        # Pas de unique_together : la détection de conflits (chevauchements, pas seulement
        # créneaux identiques) est gérée par `clean()._verifier_conflits()`, qui doit aussi
        # autoriser deux groupes distincts de la même classe sur le même créneau.

    def __str__(self):
        return f"{self.get_jour_display()} {self.heure_debut.strftime('%H:%M')}-{self.heure_fin.strftime('%H:%M')} - {self.matiere} - {self.classe}"

    def clean(self):
        if self.heure_debut and self.heure_fin and self.heure_fin <= self.heure_debut:
            raise ValidationError(_("L'heure de fin doit être postérieure à l'heure de début."))
        if self.jour and self.heure_debut and self.heure_fin:
            self._verifier_conflits()

    def _verifier_conflits(self):
        """Un même enseignant ou une même salle ne peut être sur deux cours qui se

        chevauchent le même jour ; une classe entière (sans groupe) ne peut pas non plus
        se chevaucher avec un autre créneau de la même classe.
        """
        chevauche = models.Q(heure_debut__lt=self.heure_fin, heure_fin__gt=self.heure_debut)
        qs = EmploiDuTemps.objects.filter(jour=self.jour, est_actif=True).filter(chevauche)
        if self.pk:
            qs = qs.exclude(pk=self.pk)

        if self.enseignant_id:
            conflit = qs.filter(enseignant_id=self.enseignant_id).first()
            if conflit:
                raise ValidationError(
                    _("Conflit d'emploi du temps : %(enseignant)s a déjà cours (%(autre)s) sur ce créneau.")
                    % {'enseignant': self.enseignant.get_full_name(), 'autre': str(conflit)}
                )
        if self.salle_id:
            conflit = qs.filter(salle_id=self.salle_id).first()
            if conflit:
                raise ValidationError(
                    _("Conflit d'emploi du temps : la salle %(salle)s est déjà occupée (%(autre)s) sur ce créneau.")
                    % {'salle': self.salle, 'autre': str(conflit)}
                )
        if not self.groupe:
            conflit = qs.filter(classe_id=self.classe_id, groupe__isnull=True).first()
            if conflit:
                raise ValidationError(
                    _("Conflit d'emploi du temps : la classe a déjà cours (%(autre)s) sur ce créneau.")
                    % {'autre': str(conflit)}
                )

    def duree(self):
        """Calcule la durée du cours en heures."""
        from datetime import datetime

        if not self.heure_debut or not self.heure_fin:
            return 0.0

        debut = datetime.combine(datetime.today(), self.heure_debut)
        fin = datetime.combine(datetime.today(), self.heure_fin)
        return (fin - debut).total_seconds() / 3600


class AuditLog(models.Model):
    """Journal d'audit : trace qui a créé/modifié/supprimé quoi, pour les ressources sensibles

    (notes, paiements, bulletins, documents...). Alimenté par les signaux (voir `signals.py`),
    jamais écrit directement par les vues.
    """

    class Action(models.TextChoices):
        CREATION = 'CREATION', _('Création')
        MODIFICATION = 'MODIFICATION', _('Modification')
        SUPPRESSION = 'SUPPRESSION', _('Suppression')

    ecole = models.ForeignKey(
        Ecole, on_delete=models.CASCADE, related_name='journaux_audit', verbose_name=_('établissement')
    )
    utilisateur = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='actions_journalisees', verbose_name=_('utilisateur')
    )
    action = models.CharField(_('action'), max_length=15, choices=Action.choices)
    modele = models.CharField(_('modèle'), max_length=50, help_text=_('Ex: Note, PaiementEcolage'))
    objet_id = models.PositiveIntegerField(_('identifiant objet'))
    objet_repr = models.CharField(_('représentation'), max_length=255)
    date_action = models.DateTimeField(_("date de l'action"), auto_now_add=True)

    class Meta:
        verbose_name = _("journal d'audit")
        verbose_name_plural = _("journaux d'audit")
        ordering = ['-date_action']

    def __str__(self):
        return f"{self.get_action_display()} {self.modele}#{self.objet_id} par {self.utilisateur or 'système'}"


class CahierTexte(models.Model):
    """Cahier de textes numérique : ce qui a été fait en cours, et le travail à faire pour la

    prochaine séance. Une entrée par (classe, matière, date de séance).
    """

    classe = models.ForeignKey(
        Classe, on_delete=models.CASCADE, related_name='cahier_textes', verbose_name=_('classe')
    )
    matiere = models.ForeignKey(
        Matiere, on_delete=models.CASCADE, related_name='cahier_textes', verbose_name=_('matière')
    )
    enseignant = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        limit_choices_to={'role': User.Role.ENSEIGNANT}, related_name='cahier_textes',
        verbose_name=_('enseignant')
    )
    date_seance = models.DateField(_('date de la séance'), default=timezone.localdate)
    contenu_seance = models.TextField(
        _('contenu de la séance'), blank=True,
        help_text=_('Ce qui a été fait en cours (facultatif pour un devoir envoyé hors séance).'),
    )
    travail_a_faire = models.TextField(_('travail à faire'), blank=True, null=True)
    date_echeance_travail = models.DateField(_("date d'échéance du travail"), blank=True, null=True)
    heure_echeance_travail = models.TimeField(_("heure d'échéance du travail"), blank=True, null=True)
    piece_jointe = models.FileField(
        _('pièce jointe'), upload_to='cahier_textes/', blank=True, null=True,
        help_text=_('PDF, image, ou tout autre document lié à la séance.'),
    )
    lien = models.URLField(_('lien'), blank=True, null=True, help_text=_('Lien externe (vidéo, ressource...).'))
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)

    class Meta:
        verbose_name = _('cahier de textes')
        verbose_name_plural = _('cahiers de textes')
        ordering = ['-date_seance']

    def __str__(self):
        return f"{self.classe} - {self.matiere} - {self.date_seance}"

    def clean(self):
        if self.classe_id and self.matiere_id and self.classe.annee_scolaire.ecole_id != self.matiere.ecole_id:
            raise ValidationError(_("La classe et la matière doivent appartenir au même établissement."))


class DocumentDevoir(models.Model):
    """Document importé pour un devoir, en plus de l'unique `CahierTexte.piece_jointe` — permet

    d'attacher plusieurs documents (énoncé, corrigé, ressources...) à un même devoir.
    """
    cahier_texte = models.ForeignKey(
        CahierTexte, on_delete=models.CASCADE, related_name='documents_importes', verbose_name=_('devoir')
    )
    nom = models.CharField(
        _('nom'), max_length=150, blank=True, help_text=_("Nom affiché (par défaut, le nom du fichier).")
    )
    fichier = models.FileField(_('fichier'), upload_to='documents_devoirs/')
    importe_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='documents_devoirs_importes',
        verbose_name=_('importé par')
    )
    date_import = models.DateTimeField(_("date d'import"), auto_now_add=True)

    class Meta:
        verbose_name = _('document de devoir')
        verbose_name_plural = _('documents de devoir')
        ordering = ['-date_import']

    def __str__(self):
        return f"{self.nom or self.fichier.name} ({self.cahier_texte})"


class RappelDevoirEnvoye(models.Model):
    """Traçabilité des rappels de devoir déjà envoyés à un destinataire un jour donné —

    évite de renvoyer plusieurs fois le même rappel le même jour si la commande de
    rappels quotidiens (`envoyer_rappels_devoirs`) est exécutée plusieurs fois.
    """
    cahier_texte = models.ForeignKey(
        CahierTexte, on_delete=models.CASCADE, related_name='rappels_envoyes', verbose_name=_('devoir')
    )
    destinataire = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_('destinataire'))
    date_envoi = models.DateField(_("date d'envoi"), default=timezone.localdate)

    class Meta:
        verbose_name = _('rappel de devoir envoyé')
        verbose_name_plural = _('rappels de devoir envoyés')
        unique_together = ['cahier_texte', 'destinataire', 'date_envoi']

    def __str__(self):
        return f"Rappel {self.cahier_texte_id} -> {self.destinataire_id} ({self.date_envoi})"


class EvenementDisciplinaire(models.Model):
    """Événement de vie scolaire : observation, sanction, avertissement, exclusion,

    convocation ou retenue, rattaché à un étudiant. Notifie automatiquement le
    concerné et ses tuteurs à la création.
    """

    class TypeEvenement(models.TextChoices):
        OBSERVATION = 'OBSERVATION', _('Observation')
        AVERTISSEMENT = 'AVERTISSEMENT', _('Avertissement')
        SANCTION = 'SANCTION', _('Sanction')
        EXCLUSION = 'EXCLUSION', _('Exclusion')
        CONVOCATION = 'CONVOCATION', _('Convocation')
        RETENUE = 'RETENUE', _('Retenue')

    class Gravite(models.TextChoices):
        MINEURE = 'MINEURE', _('Mineure')
        MODEREE = 'MODEREE', _('Modérée')
        GRAVE = 'GRAVE', _('Grave')

    etudiant = models.ForeignKey(
        Etudiant, on_delete=models.CASCADE, related_name='evenements_disciplinaires', verbose_name=_('étudiant')
    )
    type_evenement = models.CharField(_("type d'événement"), max_length=15, choices=TypeEvenement.choices)
    gravite = models.CharField(_('gravité'), max_length=10, choices=Gravite.choices, default=Gravite.MINEURE)
    description = models.TextField(_('description'))
    date_evenement = models.DateField(_("date de l'événement"), default=timezone.localdate)
    cree_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='evenements_disciplinaires_crees',
        verbose_name=_('créé par')
    )
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)

    class Meta:
        verbose_name = _('événement disciplinaire')
        verbose_name_plural = _('événements disciplinaires')
        ordering = ['-date_evenement']

    def __str__(self):
        return f"{self.get_type_evenement_display()} - {self.etudiant} ({self.date_evenement})"


class DossierEnseignant(models.Model):
    """Dossier RH d'un enseignant : contrat, diplômes, salaire, volume horaire déclaré.

    Distinct du compte `User` pour cloisonner cette information sensible (accès
    limité à l'administration et à l'enseignant concerné, voir `permissions.py`).
    """

    class TypeContrat(models.TextChoices):
        CDI = 'CDI', _('CDI')
        CDD = 'CDD', _('CDD')
        VACATAIRE = 'VACATAIRE', _('Vacataire')
        STAGIAIRE = 'STAGIAIRE', _('Stagiaire')

    enseignant = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='dossier_enseignant',
        limit_choices_to={'role': User.Role.ENSEIGNANT}, verbose_name=_('enseignant'),
    )
    type_contrat = models.CharField(_('type de contrat'), max_length=15, choices=TypeContrat.choices, blank=True, null=True)
    date_embauche = models.DateField(_("date d'embauche"), blank=True, null=True)
    diplomes = models.TextField(_('diplômes'), blank=True, null=True)
    salaire = models.DecimalField(_('salaire'), max_digits=12, decimal_places=2, blank=True, null=True)
    volume_horaire_hebdo = models.DecimalField(
        _('volume horaire hebdomadaire'), max_digits=5, decimal_places=2, blank=True, null=True,
        help_text=_("Heures d'enseignement déclarées par semaine."),
    )
    documents_rh = models.FileField(_('documents RH'), upload_to='documents_rh/', blank=True, null=True)
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)
    date_modification = models.DateTimeField(_('date de modification'), auto_now=True)

    class Meta:
        verbose_name = _('dossier enseignant')
        verbose_name_plural = _('dossiers enseignants')

    def __str__(self):
        return f"Dossier RH - {self.enseignant.get_full_name()}"


class PaiementSalaire(models.Model):
    """Paiement du salaire mensuel d'un enseignant.

    Miroir de `PaiementEcolage` côté personnel : une carte de paiement par mois, avec
    statut et mode de paiement, pour le suivi de la paie de l'établissement.
    """

    class StatutPaiement(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', _('En attente')
        PAYE = 'PAYE', _('Payé')
        ANNULE = 'ANNULE', _('Annulé')

    membre = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='paiements_salaire',
        limit_choices_to={'role': User.Role.ENSEIGNANT}, verbose_name=_('enseignant'),
    )
    annee_scolaire = models.ForeignKey(
        AnneeScolaire, on_delete=models.CASCADE, related_name='paiements_salaire', verbose_name=_('année scolaire')
    )
    montant = models.DecimalField(_('montant'), max_digits=10, decimal_places=2)
    mois_couvert = models.PositiveSmallIntegerField(
        _('mois couvert'), validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    date_paiement = models.DateField(_('date de paiement'), default=timezone.localdate)
    mode_paiement = models.CharField(
        _('mode de paiement'), max_length=50, default='Espèces',
        help_text=_('Ex: Espèces, Virement, Chèque, Mobile Money...'),
    )
    statut = models.CharField(
        _('statut'), max_length=15, choices=StatutPaiement.choices, default=StatutPaiement.EN_ATTENTE
    )
    reference = models.CharField(_('référence'), max_length=50, blank=True, null=True)
    commentaire = models.TextField(_('commentaire'), blank=True, null=True)
    cree_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='paiements_salaire_crees',
        verbose_name=_('créé par'),
    )
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)

    class Meta:
        verbose_name = _('paiement de salaire')
        verbose_name_plural = _('paiements de salaire')
        ordering = ['-annee_scolaire__date_debut', 'mois_couvert']
        unique_together = ['membre', 'annee_scolaire', 'mois_couvert']

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.mois_couvert}/{self.annee_scolaire.libelle} - {self.montant}"

    def clean(self):
        if self.membre_id and self.annee_scolaire_id and self.membre.ecole_id != self.annee_scolaire.ecole_id:
            raise ValidationError(_("Le membre du personnel et l'année scolaire doivent appartenir au même établissement."))


class EvenementCalendrier(models.Model):
    """Événement d'établissement affiché en plus des cours : vacances, examens,

    événements et réunions.
    """

    class TypeEvenement(models.TextChoices):
        VACANCES = 'VACANCES', _('Vacances')
        EXAMEN = 'EXAMEN', _('Examen')
        EVENEMENT = 'EVENEMENT', _('Événement')
        REUNION = 'REUNION', _('Réunion')
        JOUR_FERIE = 'JOUR_FERIE', _('Jour férié')
        DEVOIR = 'DEVOIR', _('Devoir')

    ecole = models.ForeignKey(
        Ecole, on_delete=models.CASCADE, related_name='evenements_calendrier', verbose_name=_('établissement')
    )
    classe = models.ForeignKey(
        'Classe', on_delete=models.CASCADE, null=True, blank=True, related_name='evenements_calendrier',
        verbose_name=_('classe'),
        help_text=_("Laisser vide pour un événement concernant tout l'établissement ; renseigner pour "
                    "un événement visible uniquement par cette classe (ex: échéance de devoir)."),
    )
    titre = models.CharField(_('titre'), max_length=150)
    type_evenement = models.CharField(_("type d'événement"), max_length=10, choices=TypeEvenement.choices)
    date_debut = models.DateField(_('date de début'))
    date_fin = models.DateField(_('date de fin'))
    description = models.TextField(_('description'), blank=True, null=True)
    source_externe = models.CharField(
        _('identifiant externe'), max_length=255, blank=True, null=True,
        help_text=_("UID de l'événement dans la source externe (ex: calendrier des jours fériés), "
                    "utilisé pour éviter les doublons lors des resynchronisations."),
    )
    cahier_texte = models.OneToOneField(
        'CahierTexte', on_delete=models.CASCADE, null=True, blank=True, related_name='evenement_calendrier',
        verbose_name=_('devoir lié'),
        help_text=_("Entrée de cahier de textes dont cet événement synchronise l'échéance de devoir."),
    )
    cree_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='evenements_calendrier_crees',
        verbose_name=_('créé par')
    )
    date_creation = models.DateTimeField(_('date de création'), auto_now_add=True)

    class Meta:
        verbose_name = _('événement de calendrier')
        verbose_name_plural = _('événements de calendrier')
        ordering = ['date_debut']
        unique_together = ['ecole', 'source_externe']

    def __str__(self):
        return f"{self.get_type_evenement_display()} - {self.titre} ({self.date_debut})"

    def clean(self):
        if self.date_debut and self.date_fin and self.date_fin < self.date_debut:
            raise ValidationError(_('La date de fin doit être postérieure ou égale à la date de début.'))
        if self.classe_id and self.ecole_id and self.classe.annee_scolaire.ecole_id != self.ecole_id:
            raise ValidationError(_("La classe doit appartenir au même établissement que l'événement."))


class DocumentJustificatifEtudiant(models.Model):
    """Document versé au dossier d'un étudiant par l'établissement (acte de naissance,

    CIN d'un parent, certificat médical...) — distinct de `DemandeDocument`, qui est le
    workflow inverse (l'étudiant demande un document officiel à l'établissement).
    """

    class TypeDocument(models.TextChoices):
        ACTE_NAISSANCE = 'ACTE_NAISSANCE', _('Acte de naissance')
        CIN = 'CIN', _("Carte d'identité nationale (CIN) de l'étudiant")
        CIN_PARENT = 'CIN_PARENT', _("CIN d'un parent/tuteur")
        CERTIFICAT_MEDICAL = 'CERTIFICAT_MEDICAL', _('Certificat médical')
        PHOTO_IDENTITE = 'PHOTO_IDENTITE', _("Photo d'identité")
        BULLETIN_ANTERIEUR = 'BULLETIN_ANTERIEUR', _('Bulletin établissement antérieur')
        AUTRE = 'AUTRE', _('Autre')

    etudiant = models.ForeignKey(
        Etudiant, on_delete=models.CASCADE, related_name='documents_justificatifs', verbose_name=_('étudiant')
    )
    type_document = models.CharField(_('type de document'), max_length=25, choices=TypeDocument.choices)
    fichier = models.FileField(_('fichier'), upload_to='documents_etudiants/')
    libelle = models.CharField(_('libellé'), max_length=150, blank=True, null=True)
    ajoute_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='documents_etudiants_ajoutes',
        verbose_name=_('ajouté par')
    )
    date_ajout = models.DateTimeField(_("date d'ajout"), auto_now_add=True)

    class Meta:
        verbose_name = _("document justificatif d'étudiant")
        verbose_name_plural = _("documents justificatifs d'étudiant")
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.get_type_document_display()} - {self.etudiant}"


class PieceJointeInscription(models.Model):
    """Document versé au dossier d'une demande d'inscription auto-soumise (voir `RegisterView`),

    avant que l'étudiant ne soit officiellement créé — mêmes types que
    `DocumentJustificatifEtudiant`, mais rattaché au compte demandeur (Étudiant/Parent en attente).
    """

    demandeur = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='pieces_jointes_inscription',
        limit_choices_to={'role__in': [User.Role.ETUDIANT, User.Role.PARENT]}, verbose_name=_('demandeur'),
    )
    type_document = models.CharField(
        _('type de document'), max_length=25, choices=DocumentJustificatifEtudiant.TypeDocument.choices
    )
    fichier = models.FileField(_('fichier'), upload_to='pieces_jointes_inscription/')
    ajoute_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='pieces_jointes_inscription_ajoutees',
        verbose_name=_('ajouté par')
    )
    date_ajout = models.DateTimeField(_("date d'ajout"), auto_now_add=True)

    class Meta:
        verbose_name = _("pièce jointe de demande d'inscription")
        verbose_name_plural = _("pièces jointes de demande d'inscription")
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.get_type_document_display()} - {self.demandeur}"


class DemandeInscriptionSuivi(models.Model):
    """Suivi administratif d'une demande d'inscription auto-soumise : statut du paiement des

    frais d'inscription, renseigné par le secrétariat/l'administration pendant l'instruction
    du dossier (indépendant de la validation/l'activation du compte elle-même).
    """

    utilisateur = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='suivi_inscription',
        limit_choices_to={'role__in': [User.Role.ETUDIANT, User.Role.PARENT]}, verbose_name=_('demande'),
    )
    frais_inscription_paye = models.BooleanField(_("frais d'inscription payés"), default=False)
    notes = models.TextField(_('notes'), blank=True, null=True)
    date_modification = models.DateTimeField(_('date de modification'), auto_now=True)

    class Meta:
        verbose_name = _("suivi de demande d'inscription")
        verbose_name_plural = _("suivis de demandes d'inscription")

    def __str__(self):
        return f"Suivi - {self.utilisateur.get_full_name()}"
