from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import (
    User, Ecole, AnneeScolaire, Trimestre, Filiere, Niveau, Salle, Classe,
    Etudiant, Inscription, TuteurEtudiant, Matiere, Note, Bulletin, FraisScolarite, PaiementEcolage,
    PresenceCours, EmploiDuTemps, DemandeDocument, Message, Annonce, Notification, AuditLog, CahierTexte,
    EvenementDisciplinaire, DossierEnseignant, EvenementCalendrier, DocumentJustificatifEtudiant,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'ecole', 'is_staff')
    list_filter = ('role', 'ecole', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Informations personnelles'), {'fields': ('first_name', 'last_name', 'email', 'ecole')}),
        (_('Rôle et permissions'), {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Dates importantes'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'ecole'),
        }),
    )
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)


@admin.register(Ecole)
class EcoleAdmin(admin.ModelAdmin):
    list_display = ('code', 'nom', 'telephone', 'email', 'est_active')
    list_filter = ('est_active',)
    search_fields = ('code', 'nom')


@admin.register(AnneeScolaire)
class AnneeScolaireAdmin(admin.ModelAdmin):
    list_display = ('libelle', 'ecole', 'date_debut', 'date_fin', 'statut', 'est_active')
    list_filter = ('ecole', 'statut', 'est_active')
    search_fields = ('libelle', 'ecole__nom')


@admin.register(Trimestre)
class TrimestreAdmin(admin.ModelAdmin):
    list_display = ('annee_scolaire', 'numero', 'date_debut', 'date_fin', 'est_actif')
    list_filter = ('annee_scolaire__ecole', 'annee_scolaire', 'est_actif')


@admin.register(Filiere)
class FiliereAdmin(admin.ModelAdmin):
    list_display = ('code', 'intitule', 'ecole', 'responsable', 'est_active')
    list_filter = ('ecole', 'est_active')
    search_fields = ('code', 'intitule', 'description')
    raw_id_fields = ('responsable',)


@admin.register(Niveau)
class NiveauAdmin(admin.ModelAdmin):
    list_display = ('code', 'intitule', 'ecole', 'ordre', 'est_actif')
    list_filter = ('ecole', 'est_actif')
    ordering = ('ecole', 'ordre')


@admin.register(Salle)
class SalleAdmin(admin.ModelAdmin):
    list_display = ('nom', 'ecole', 'capacite', 'type_salle', 'est_active')
    list_filter = ('ecole', 'type_salle', 'est_active')
    search_fields = ('nom',)


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ('nom', 'annee_scolaire', 'niveau', 'filiere', 'titulaire', 'effectif', 'est_active')
    list_filter = ('annee_scolaire', 'niveau', 'filiere', 'est_active')
    search_fields = ('nom',)
    raw_id_fields = ('titulaire',)
    list_select_related = ('annee_scolaire', 'niveau', 'filiere', 'titulaire')


@admin.register(Etudiant)
class EtudiantAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'nom_complet', 'ecole', 'classe_actuelle', 'statut')
    list_filter = ('ecole', 'statut', 'genre')
    search_fields = ('matricule', 'nom', 'prenom', 'email')

    def nom_complet(self, obj):
        return f"{obj.prenom} {obj.nom}"
    nom_complet.short_description = 'Nom complet'

    def classe_actuelle(self, obj):
        inscription = obj.inscription_courante
        return inscription.classe if inscription else '-'
    classe_actuelle.short_description = 'Classe actuelle'


@admin.register(Inscription)
class InscriptionAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'classe', 'annee_scolaire', 'statut', 'date_inscription')
    list_filter = ('annee_scolaire', 'classe', 'statut')
    search_fields = ('etudiant__nom', 'etudiant__prenom', 'etudiant__matricule')
    raw_id_fields = ('etudiant', 'classe')


@admin.register(TuteurEtudiant)
class TuteurEtudiantAdmin(admin.ModelAdmin):
    list_display = ('parent', 'etudiant', 'relation', 'est_contact_principal')
    list_filter = ('relation', 'est_contact_principal')
    search_fields = ('parent__first_name', 'parent__last_name', 'etudiant__nom', 'etudiant__prenom')
    raw_id_fields = ('parent', 'etudiant')


@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display = ('code', 'intitule', 'filiere', 'niveau', 'enseignant', 'coefficient', 'est_active')
    list_filter = ('filiere', 'niveau', 'est_active')
    search_fields = ('code', 'intitule', 'description')
    raw_id_fields = ('enseignant',)


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'matiere', 'trimestre', 'valeur', 'type_evaluation', 'date_evaluation')
    list_filter = ('trimestre', 'type_evaluation', 'matiere__filiere', 'matiere__niveau')
    search_fields = ('etudiant__nom', 'etudiant__prenom', 'matiere__intitule')
    date_hierarchy = 'date_evaluation'
    raw_id_fields = ('etudiant', 'matiere')


@admin.register(Bulletin)
class BulletinAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'classe', 'annee_scolaire', 'trimestre', 'moyenne_generale', 'rang', 'mention', 'est_valide')
    list_filter = ('annee_scolaire', 'trimestre', 'mention', 'decision', 'est_valide')
    search_fields = ('etudiant__nom', 'etudiant__prenom')
    raw_id_fields = ('etudiant', 'classe')
    readonly_fields = ('date_generation',)


@admin.register(FraisScolarite)
class FraisScolariteAdmin(admin.ModelAdmin):
    list_display = ('annee_scolaire', 'niveau', 'filiere', 'montant_inscription', 'montant_annuel')
    list_filter = ('annee_scolaire', 'niveau', 'filiere')


@admin.register(PaiementEcolage)
class PaiementEcolageAdmin(admin.ModelAdmin):
    list_display = ('reference', 'etudiant', 'annee_scolaire', 'montant', 'date_paiement', 'date_echeance', 'statut', 'secretaire')
    list_filter = ('statut', 'annee_scolaire', 'mois_couvert', 'mode_paiement', 'secretaire')
    search_fields = ('etudiant__nom', 'etudiant__prenom', 'reference', 'commentaire', 'secretaire__username')
    date_hierarchy = 'date_paiement'
    list_per_page = 20
    raw_id_fields = ('etudiant', 'cree_par', 'secretaire')
    readonly_fields = ('date_creation',)

    def save_model(self, request, obj, form, change):
        if not obj.pk:  # Si c'est une nouvelle entrée
            obj.cree_par = request.user
            if not obj.secretaire and hasattr(request.user, 'role') and request.user.role in [User.Role.ADMIN, User.Role.SECRETARIAT]:
                obj.secretaire = request.user
        super().save_model(request, obj, form, change)


@admin.register(PresenceCours)
class PresenceCoursAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'matiere', 'date_cours', 'statut', 'heure_debut', 'heure_fin')
    list_filter = ('statut', 'matiere__filiere', 'matiere__niveau')
    search_fields = ('etudiant__nom', 'etudiant__prenom', 'matiere__intitule')
    date_hierarchy = 'date_cours'
    raw_id_fields = ('etudiant', 'matiere', 'cree_par')


@admin.register(EmploiDuTemps)
class EmploiDuTempsAdmin(admin.ModelAdmin):
    list_display = ('classe', 'matiere', 'enseignant', 'jour', 'heure_debut', 'heure_fin', 'salle', 'est_actif')
    list_filter = ('jour', 'classe', 'est_actif', 'enseignant')
    search_fields = ('matiere__intitule', 'enseignant__username', 'salle', 'classe__nom')
    list_per_page = 20
    raw_id_fields = ('matiere', 'enseignant', 'cree_par')
    readonly_fields = ('date_creation',)


@admin.register(DemandeDocument)
class DemandeDocumentAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'type_document', 'annee_scolaire', 'statut', 'date_demande', 'traite_par')
    list_filter = ('type_document', 'statut', 'annee_scolaire')
    search_fields = ('etudiant__nom', 'etudiant__prenom')
    raw_id_fields = ('etudiant', 'demande_par', 'traite_par')
    readonly_fields = ('date_demande',)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('expediteur', 'destinataire', 'objet', 'est_lu', 'date_envoi')
    list_filter = ('est_lu',)
    search_fields = ('objet', 'expediteur__email', 'destinataire__email')
    raw_id_fields = ('expediteur', 'destinataire')


@admin.register(Annonce)
class AnnonceAdmin(admin.ModelAdmin):
    list_display = ('titre', 'ecole', 'portee', 'classe', 'auteur', 'date_publication')
    list_filter = ('ecole', 'portee')
    search_fields = ('titre', 'contenu')
    raw_id_fields = ('classe', 'auteur')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('destinataire', 'type_notification', 'titre', 'est_lue', 'date_creation')
    list_filter = ('type_notification', 'est_lue')
    raw_id_fields = ('destinataire',)


@admin.register(CahierTexte)
class CahierTexteAdmin(admin.ModelAdmin):
    list_display = ('classe', 'matiere', 'enseignant', 'date_seance', 'date_echeance_travail')
    list_filter = ('classe', 'matiere')
    raw_id_fields = ('classe', 'matiere', 'enseignant')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('ecole', 'action', 'modele', 'objet_id', 'utilisateur', 'date_action')
    list_filter = ('ecole', 'action', 'modele')
    search_fields = ('objet_repr',)
    raw_id_fields = ('utilisateur',)
    readonly_fields = ('date_action',)


@admin.register(EvenementDisciplinaire)
class EvenementDisciplinaireAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'type_evenement', 'gravite', 'date_evenement', 'cree_par')
    list_filter = ('type_evenement', 'gravite')
    raw_id_fields = ('etudiant', 'cree_par')


@admin.register(DossierEnseignant)
class DossierEnseignantAdmin(admin.ModelAdmin):
    list_display = ('enseignant', 'type_contrat', 'date_embauche', 'volume_horaire_hebdo')
    list_filter = ('type_contrat',)
    raw_id_fields = ('enseignant',)


@admin.register(EvenementCalendrier)
class EvenementCalendrierAdmin(admin.ModelAdmin):
    list_display = ('titre', 'ecole', 'type_evenement', 'date_debut', 'date_fin')
    list_filter = ('ecole', 'type_evenement')
    raw_id_fields = ('cree_par',)


@admin.register(DocumentJustificatifEtudiant)
class DocumentJustificatifEtudiantAdmin(admin.ModelAdmin):
    list_display = ('etudiant', 'type_document', 'ajoute_par', 'date_ajout')
    list_filter = ('type_document',)
    raw_id_fields = ('etudiant', 'ajoute_par')
