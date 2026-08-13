from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AnneeScolaireViewSet, AnnonceViewSet, AuditLogViewSet, BulletinViewSet, CahierTexteViewSet, ChangePasswordView,
    ClasseViewSet, CustomTokenObtainPairView, DemandeDocumentViewSet, DemandeInscriptionViewSet,
    DiscussionClasseViewSet, DocumentDevoirViewSet, DocumentJustificatifEtudiantViewSet, DossierEnseignantViewSet,
    EcoleViewSet,
    EmploiDuTempsViewSet, EtudiantViewSet, EvenementCalendrierViewSet, EvenementDisciplinaireViewSet, FiliereViewSet,
    FraisScolariteViewSet, InscriptionViewSet, MatiereViewSet, MessageGroupeClasseViewSet, MessageViewSet,
    NiveauViewSet, NotificationViewSet,
    NoteViewSet, PaiementEcolageViewSet, PaiementSalaireViewSet, PieceJointeInscriptionViewSet,
    PresenceCoursViewSet, RegisterEcoleView, RegisterView, SalleViewSet, StaffViewSet, StatistiquesView,
    TrimestreViewSet, TuteurEtudiantViewSet, UserProfileView,
)

router = DefaultRouter()
router.register('ecoles', EcoleViewSet, basename='ecole')
router.register('annees-scolaires', AnneeScolaireViewSet, basename='anneescolaire')
router.register('trimestres', TrimestreViewSet, basename='trimestre')
router.register('niveaux', NiveauViewSet, basename='niveau')
router.register('filieres', FiliereViewSet, basename='filiere')
router.register('salles', SalleViewSet, basename='salle')
router.register('classes', ClasseViewSet, basename='classe')
router.register('etudiants', EtudiantViewSet, basename='etudiant')
router.register('inscriptions', InscriptionViewSet, basename='inscription')
router.register('tuteurs', TuteurEtudiantViewSet, basename='tuteuretudiant')
router.register('matieres', MatiereViewSet, basename='matiere')
router.register('notes', NoteViewSet, basename='note')
router.register('personnel', StaffViewSet, basename='staff')
router.register('demandes-inscription', DemandeInscriptionViewSet, basename='demandeinscription')
router.register('pieces-jointes-inscription', PieceJointeInscriptionViewSet, basename='piecejointeinscription')
router.register('frais-scolarite', FraisScolariteViewSet, basename='fraisscolarite')
router.register('paiements', PaiementEcolageViewSet, basename='paiementecolage')
router.register('presences', PresenceCoursViewSet, basename='presencecours')
router.register('emplois-du-temps', EmploiDuTempsViewSet, basename='emploidutemps')
router.register('cahier-textes', CahierTexteViewSet, basename='cahiertexte')
router.register('documents-devoirs', DocumentDevoirViewSet, basename='documentdevoir')
router.register('discipline', EvenementDisciplinaireViewSet, basename='evenementdisciplinaire')
router.register('dossiers-enseignants', DossierEnseignantViewSet, basename='dossierenseignant')
router.register('paiements-salaire', PaiementSalaireViewSet, basename='paiementsalaire')
router.register('evenements-calendrier', EvenementCalendrierViewSet, basename='evenementcalendrier')
router.register('documents-etudiants', DocumentJustificatifEtudiantViewSet, basename='documentjustificatifetudiant')
router.register('bulletins', BulletinViewSet, basename='bulletin')
router.register('demandes-documents', DemandeDocumentViewSet, basename='demandedocument')
router.register('messages', MessageViewSet, basename='message')
router.register('messages-groupe-classe', MessageGroupeClasseViewSet, basename='messagegroupeclasse')
router.register('discussions-classe', DiscussionClasseViewSet, basename='discussionclasse')
router.register('annonces', AnnonceViewSet, basename='annonce')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('audit-logs', AuditLogViewSet, basename='auditlog')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/register/ecole/', RegisterEcoleView.as_view(), name='register_ecole'),
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='user_profile'),
    path('auth/changer-mot-de-passe/', ChangePasswordView.as_view(), name='change_password'),
    path('statistiques/', StatistiquesView.as_view(), name='statistiques'),
    path('', include(router.urls)),
]
