from .auth import (
    CustomTokenObtainPairSerializer, DemandeInscriptionSerializer, EcoleAdminRegisterSerializer, RegisterSerializer,
    StaffCreateSerializer, UserSerializer,
)
from .audit import AuditLogSerializer
from .discipline import EvenementDisciplinaireSerializer
from .rh import DossierEnseignantSerializer, PaiementSalaireSerializer
from .calendrier import EvenementCalendrierSerializer
from .documents_etudiant import DocumentJustificatifEtudiantSerializer
from .demandes_inscription import DemandeInscriptionSuiviSerializer, PieceJointeInscriptionSerializer
from .academique import (
    AnneeScolaireSerializer, ClasseSerializer, EcolePubliqueSerializer, EcoleSerializer, FiliereSerializer,
    NiveauSerializer, SalleSerializer, TrimestreSerializer,
)
from .etudiants import EtudiantSerializer, InscriptionSerializer, TuteurEtudiantSerializer
from .pedagogie import MatiereSerializer, NoteSerializer
from .finance import (
    DossierFinancierSerializer, FraisScolariteSerializer, PaiementEcolageSerializer, SyntheseFinanciereSerializer,
)
from .vie_scolaire import AppelDuJourSerializer, CahierTexteSerializer, EmploiDuTempsSerializer, PresenceCoursSerializer
from .bulletin import BulletinSerializer, GenererBulletinSerializer
from .documents import DemandeDocumentSerializer, RefuserDemandeSerializer
from .communication import AnnonceSerializer, MessageSerializer, NotificationSerializer

__all__ = [
    'CustomTokenObtainPairSerializer', 'DemandeInscriptionSerializer', 'RegisterSerializer',
    'StaffCreateSerializer', 'UserSerializer',
    'AnneeScolaireSerializer', 'ClasseSerializer', 'EcolePubliqueSerializer', 'EcoleSerializer', 'FiliereSerializer',
    'NiveauSerializer', 'SalleSerializer', 'TrimestreSerializer',
    'EtudiantSerializer', 'InscriptionSerializer', 'TuteurEtudiantSerializer',
    'MatiereSerializer', 'NoteSerializer',
    'DossierFinancierSerializer', 'FraisScolariteSerializer', 'PaiementEcolageSerializer',
    'SyntheseFinanciereSerializer', 'AppelDuJourSerializer', 'PresenceCoursSerializer',
    'EmploiDuTempsSerializer', 'BulletinSerializer', 'GenererBulletinSerializer',
    'DemandeDocumentSerializer', 'RefuserDemandeSerializer',
    'DemandeInscriptionSuiviSerializer', 'PieceJointeInscriptionSerializer', 'DocumentJustificatifEtudiantSerializer',
    'AnnonceSerializer', 'MessageSerializer', 'NotificationSerializer', 'PaiementSalaireSerializer',
]
