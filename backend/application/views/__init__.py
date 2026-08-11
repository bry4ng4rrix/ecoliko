from .auth import (
    ChangePasswordView, CustomTokenObtainPairView, DemandeInscriptionViewSet, RegisterEcoleView, RegisterView,
    StaffViewSet, UserProfileView,
)
from .academique import (
    AnneeScolaireViewSet, ClasseViewSet, EcoleViewSet, FiliereViewSet,
    NiveauViewSet, SalleViewSet, TrimestreViewSet,
)
from .etudiants import EtudiantViewSet, InscriptionViewSet, TuteurEtudiantViewSet
from .pedagogie import MatiereViewSet, NoteViewSet
from .finance import FraisScolariteViewSet, PaiementEcolageViewSet
from .vie_scolaire import CahierTexteViewSet, EmploiDuTempsViewSet, PresenceCoursViewSet
from .bulletin import BulletinViewSet
from .documents import DemandeDocumentViewSet
from .communication import AnnonceViewSet, MessageViewSet, NotificationViewSet
from .audit import AuditLogViewSet
from .statistiques import StatistiquesView
from .discipline import EvenementDisciplinaireViewSet
from .rh import DossierEnseignantViewSet, PaiementSalaireViewSet
from .calendrier import EvenementCalendrierViewSet
from .documents_etudiant import DocumentJustificatifEtudiantViewSet
from .demandes_inscription import PieceJointeInscriptionViewSet

__all__ = [
    'ChangePasswordView', 'CustomTokenObtainPairView', 'DemandeInscriptionViewSet', 'RegisterEcoleView',
    'RegisterView', 'StaffViewSet', 'UserProfileView',
    'AnneeScolaireViewSet', 'ClasseViewSet', 'EcoleViewSet', 'FiliereViewSet',
    'NiveauViewSet', 'SalleViewSet', 'TrimestreViewSet',
    'EtudiantViewSet', 'InscriptionViewSet', 'TuteurEtudiantViewSet',
    'MatiereViewSet', 'NoteViewSet',
    'FraisScolariteViewSet', 'PaiementEcolageViewSet',
    'PresenceCoursViewSet', 'EmploiDuTempsViewSet', 'CahierTexteViewSet', 'BulletinViewSet',
    'DemandeDocumentViewSet',
    'AnnonceViewSet', 'MessageViewSet', 'NotificationViewSet',
    'AuditLogViewSet', 'StatistiquesView', 'EvenementDisciplinaireViewSet',
    'DossierEnseignantViewSet', 'EvenementCalendrierViewSet', 'DocumentJustificatifEtudiantViewSet',
    'PieceJointeInscriptionViewSet', 'PaiementSalaireViewSet',
]
