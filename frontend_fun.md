# Frontend — Fonctionnalités & Endpoints utilisés

Ce document recense toutes les fonctionnalités du frontend (`frontend/src`) et les endpoints de l'API Django/DRF (`backend/application`) qu'elles consomment. Base URL API : `/api` (via `apiClient`, axios avec intercepteur JWT + refresh automatique).

## Sommaire

1. [Authentification](#1-authentification)
2. [Convention CRUD générique](#2-convention-crud-générique-createresourceservice)
3. [Fonctions de service personnalisées (non-CRUD)](#3-fonctions-de-service-personnalisées-non-crud)
4. [Dashboard Admin](#4-dashboard-admin-pagesadmindashboardjsx)
5. [Dashboard Secrétariat](#5-dashboard-secrétariat-pagessecretariatdashboardjsx)
6. [Dashboard Coordinateur pédagogique](#6-dashboard-coordinateur-pédagogique-pagespedagogicalcoordinatordashboardjsx)
7. [Dashboard Enseignant](#7-dashboard-enseignant-pagesteacherdashboardjsx)
8. [Dashboard Étudiant](#8-dashboard-étudiant-pagesstudentdashboardjsx)
9. [Dashboard Parent](#9-dashboard-parent-pagesparentdashboardjsx)
10. [Composants partagés transverses](#10-composants-partagés-transverses)

---

## 1. Authentification

Fichier : `frontend/src/services/authService.js`

| Fonctionnalité | Méthode | Endpoint |
|---|---|---|
| Connexion (login) | POST | `/auth/token/` |
| Rafraîchissement du token JWT (auto, intercepteur axios) | POST | `/auth/token/refresh/` |
| Inscription d'un compte (parent/étudiant, auto-demande) | POST | `/auth/register/` |
| Inscription d'un nouvel établissement (onboarding école) | POST | `/auth/register/ecole/` |
| Récupération du profil connecté | GET | `/auth/profile/` |
| Mise à jour du profil (nom, téléphone, photo…) | PATCH | `/auth/profile/` |
| Changement de mot de passe | POST | `/auth/changer-mot-de-passe/` |
| Liste des écoles publiques (page register, sélecteur d'établissement) | GET | `/ecoles/publiques/` |

`ProtectedRoute.jsx` s'appuie sur le profil chargé par `useAuth` (contexte React, hydraté via `GET /auth/profile/`) pour le contrôle d'accès par rôle.

---

## 2. Convention CRUD générique (`createResourceService`)

`frontend/src/services/resourceService.js` fabrique, pour un `basePath` donné, les 5 opérations standard :

| Opération | Méthode | Endpoint |
|---|---|---|
| `list(params)` | GET | `{basePath}/` |
| `get(id)` | GET | `{basePath}/{id}/` |
| `create(payload)` | POST | `{basePath}/` |
| `update(id, payload)` | PATCH | `{basePath}/{id}/` |
| `remove(id)` | DELETE | `{basePath}/{id}/` |
| `action(id, name, payload, method)` | POST (défaut) | `{basePath}/{id}/{name}/` |

Consommé via les hooks TanStack Query `useResourceList` / `useCreateResource` / `useUpdateResource` / `useDeleteResource` (`frontend/src/hooks/useResource.js`).

Services générés dans `frontend/src/services/index.js` :

| Service | Base path |
|---|---|
| `ecoleService` | `/ecoles` |
| `anneeScolaireService` | `/annees-scolaires` |
| `trimestreService` | `/trimestres` |
| `niveauService` | `/niveaux` |
| `filiereService` | `/filieres` |
| `salleService` | `/salles` |
| `classeService` | `/classes` |
| `etudiantService` | `/etudiants` |
| `inscriptionService` | `/inscriptions` |
| `tuteurService` | `/tuteurs` |
| `matiereService` | `/matieres` |
| `noteService` | `/notes` |
| `staffService` | `/personnel` |
| `fraisScolariteService` | `/frais-scolarite` |
| `paiementService` | `/paiements` |
| `presenceService` | `/presences` |
| `emploiDuTempsService` | `/emplois-du-temps` |
| `bulletinService` | `/bulletins` |
| `demandeDocumentService` | `/demandes-documents` |
| `messageService` | `/messages` |
| `annonceService` | `/annonces` |
| `notificationService` | `/notifications` |
| `auditLogService` | `/audit-logs` |
| `cahierTexteService` | `/cahier-textes` |
| `disciplineService` | `/discipline` |
| `dossierEnseignantService` | `/dossiers-enseignants` |
| `paiementSalaireService` | `/paiements-salaire` |
| `evenementCalendrierService` | `/evenements-calendrier` |
| `documentEtudiantService` | `/documents-etudiants` |
| `messageGroupeClasseService` | `/messages-groupe-classe` |
| `documentDevoirService` | `/documents-devoirs` |
| `discussionClasseService` | `/discussions-classe` |
| `demandeInscriptionService` | `/demandes-inscription` |
| `pieceJointeInscriptionService` | `/pieces-jointes-inscription` |

---

## 3. Fonctions de service personnalisées (non-CRUD)

Toutes dans `frontend/src/services/index.js`, sauf mention contraire.

| Fonction | Méthode | Endpoint | Usage |
|---|---|---|---|
| `definirDiscussionClasse(classeId, enseignantId, estOuverte)` | POST | `/discussions-classe/definir/` | Ouvrir/fermer le tchat de classe (prof) |
| `synchroniserJoursFeries()` | POST | `/evenements-calendrier/synchroniser-jours-feries/` | Import des jours fériés de Madagascar |
| `envoyerRappelsDevoirs(joursAvant)` | POST | `/cahier-textes/envoyer-rappels/` | Rappel manuel des devoirs à échéance proche |
| `genererBulletin({etudiant, annee_scolaire, trimestre})` | POST | `/bulletins/generer/` | Calcul/génération d'un bulletin (trimestriel ou annuel) |
| `validerBulletin(bulletinId)` | POST | `/bulletins/{id}/valider/` | Validation d'un bulletin |
| `telechargerBulletinPdf(bulletinId)` | GET (blob) | `/bulletins/{id}/pdf/` | Téléchargement PDF du bulletin |
| `validerDemandeDocument(demandeId)` | POST | `/demandes-documents/{id}/valider/` | Validation d'une demande de document administratif |
| `refuserDemandeDocument(demandeId, motif)` | POST | `/demandes-documents/{id}/refuser/` | Refus d'une demande |
| `telechargerDocumentPdf(demandeId)` | GET (blob) | `/demandes-documents/{id}/pdf/` | PDF du document validé |
| `enregistrerAppel(payload)` | POST | `/presences/appel/` | Saisie groupée de l'appel (prof) |
| `fetchDossierFinancier(etudiantId, anneeScolaireId)` | GET | `/paiements/dossier/` | Dossier financier consolidé (dû/payé/reste) |
| `fetchSyntheseFinanciere(anneeScolaireId)` | GET | `/paiements/synthese/` | Synthèse financière établissement (staff) |
| `fetchMoyenneTrimestre(etudiantId, trimestreId)` | GET | `/notes/moyenne/` | Moyenne pondérée par coefficient |
| `fetchClassement(classeId, trimestreId)` | GET | `/classes/{id}/classement/` | Classement de classe (trimestre) |
| `fetchClassementAnnuel(classeId)` | GET | `/classes/{id}/classement-annuel/` | Bilan annuel de classe (passage/redoublement) |
| `fetchStatistiques(anneeScolaireId, trimestreId)` | GET | `/statistiques/` | Statistiques globales de l'établissement |
| `fetchEtudiantQrCodeUrl(etudiantId)` | GET (blob) | `/etudiants/{id}/qrcode/` | QR code d'identification |
| `fetchEtudiantCodeBarreUrl(etudiantId)` | GET (blob) | `/etudiants/{id}/codebarre/` | Code-barres du matricule |
| `telechargerCarteEtudiant(etudiantId)` | GET (blob) | `/etudiants/{id}/carte/` | Carte étudiant PDF (photo + QR) |
| `genererCertificatScolarite(etudiantId)` | POST (blob) | `/etudiants/{id}/certificat-scolarite/` | Certificat de scolarité PDF |
| `telechargerCarteEcolage(etudiantId)` | GET (blob) | `/etudiants/{id}/carte-ecolage/` | Carte d'écolage (reçu récapitulatif) |
| `telechargerFactureEcolage(etudiantId, {anneeScolaireId, mois, inscription, allowPaid})` | GET (blob) | `/etudiants/{id}/facture-ecolage/` | Facture PDF pour un mois impayé ou le droit d'inscription |
| `soumettreJustification(presenceId, justificatif)` | POST | `/presences/{id}/justifier/` | Justification d'absence/retard (élève/parent) |
| `validerJustification(presenceId)` | POST | `/presences/{id}/valider-justification/` | Validation de la justification (staff) |
| `refuserJustification(presenceId)` | POST | `/presences/{id}/refuser-justification/` | Refus de la justification |
| `activerAnneeScolaire(anneeScolaireId)` | POST | `/annees-scolaires/{id}/activer/` | Active une année scolaire (désactive l'ancienne) |
| `validerDemandeInscription(id)` | POST | `/demandes-inscription/{id}/valider/` | Valide une demande d'inscription auto-soumise |
| `rejeterDemandeInscription(id)` | POST | `/demandes-inscription/{id}/rejeter/` | Rejette/supprime une demande |
| `mettreAJourSuiviInscription(id, payload)` | PATCH | `/demandes-inscription/{id}/suivi/` | Suivi de paiement des frais d'inscription |

Actions supplémentaires appelées directement en `apiClient`/`service.action(...)` depuis les panels (voir sections par rôle) : `POST /trimestres/{id}/activer/`, `POST /messages/{id}/marquer-lu/`, `POST /notifications/{id}/marquer-lue/`, `POST /notifications/tout-marquer-lu/`.

---

## 4. Dashboard Admin (`pages/AdminDashboard.jsx`)

Menu latéral → panel → endpoints principaux :

| Menu | Composant | Endpoints clés |
|---|---|---|
| Tableau de bord | (inline) | `GET /statistiques/`, `GET /etudiants/`, `GET /classes/`, `GET /personnel/` |
| Gestion Étudiants | `EtudiantsPanel` | `GET/POST/PATCH/DELETE /etudiants/`, `GET /inscriptions/`, `GET /tuteurs/` (dialogue « infos élève + parents »), `GET/POST/PATCH /paiements/`, `GET /frais-scolarite/`, `telechargerCarteEcolage`, `telechargerFactureEcolage`, `genererCertificatScolarite` |
| Demandes d'inscription | `DemandesInscriptionPanel` | `GET /demandes-inscription/`, `GET /pieces-jointes-inscription/`, `validerDemandeInscription`, `rejeterDemandeInscription`, `mettreAJourSuiviInscription` |
| Gestion des Profs | `PersonnelPanel` + `DossierEnseignantPanel` | `GET/POST/PATCH/DELETE /personnel/`, `GET/POST/PATCH /dossiers-enseignants/`, `GET/POST/PATCH /paiements-salaire/` |
| Gestion Académique | `ClassesPanel`, `MatieresPanel`, `SallesPanel`, `AnneesScolairesPanel` (onglet Année scolaire) | `GET/POST/PATCH/DELETE /classes/`, `/matieres/`, `/salles/`, `/niveaux/`, `/filieres/`, `/annees-scolaires/`, `/trimestres/`, `POST /annees-scolaires/{id}/activer/`, `POST /trimestres/{id}/activer/` |
| Emploi du Temps | `EmploiDuTempsCalendar` | `GET/POST/PATCH/DELETE /emplois-du-temps/` |
| Notes & Évaluations | `NotesEvaluationsPanel` | `GET/POST/PATCH/DELETE /notes/`, `GET /notes/moyenne/`, `GET /classes/{id}/classement/`, `GET /classes/{id}/classement-annuel/` |
| Présence & Absences | `AttendancePanel` | `GET/POST/PATCH /presences/`, `POST /presences/appel/`, `POST /presences/{id}/valider-justification/`, `POST /presences/{id}/refuser-justification/` |
| Gestion Administrative | `PaiementsPanel` (dettes en `DataTable`), `DocumentsValidationPanel`, `DisciplinePanel`, `AuditLogPanel` | `GET /paiements/dossier/`, `GET /paiements/synthese/`, `GET /paiements/calendrier-impayes/`, `GET/POST/PATCH /demandes-documents/`, `validerDemandeDocument`, `refuserDemandeDocument`, `telechargerDocumentPdf`, `GET/POST/PATCH/DELETE /discipline/`, `GET /audit-logs/` |
| Communication | `AnnoncesPanel`, `MessageriePanel` | `GET/POST/PATCH/DELETE /annonces/`, `/messages/`, `/messages-groupe-classe/`, `POST /messages/{id}/marquer-lu/`, `definirDiscussionClasse` |
| Rapports & Stats | `StatistiquesPanel`, `TauxParTrimestreChart`, `DistributionClasseRadarChart` | `GET /statistiques/`, `GET /classes/{id}/classement/` |
| Paramètres | `EcoleInfoPanel`, `MonProfilPanel` | `GET/PATCH /ecoles/{id}/`, `GET/PATCH /auth/profile/`, `POST /auth/changer-mot-de-passe/` |
| Cloche de notifications | `NotificationBell` (partagé, tous rôles) | `GET /notifications/`, `POST /notifications/{id}/marquer-lue/`, `POST /notifications/tout-marquer-lu/` |

---

## 5. Dashboard Secrétariat (`pages/SecretariatDashboard.jsx`)

Rôle en lecture/écriture large sur l'administratif, sans les onglets RH/Rapports de l'Admin.

| Menu | Composant | Endpoints clés |
|---|---|---|
| Tableau de bord | (inline) | `GET /etudiants/`, `GET /demandes-documents/` |
| Étudiants | `EtudiantsPanel` | idem Admin (`/etudiants/`, `/inscriptions/`, `/tuteurs/`, `/paiements/`) |
| Demandes d'inscription | `DemandesInscriptionPanel` | idem Admin |
| Gestion Académique | `ClassesPanel`, `SallesPanel`, `MatieresPanel`, `EmploiDuTempsCalendar`, `EvenementsCalendrierPanel` | `/classes/`, `/salles/`, `/matieres/`, `/emplois-du-temps/`, `/evenements-calendrier/`, `synchroniserJoursFeries` |
| Présence & Absences | `AttendancePanel` | `/presences/` |
| Paiements & Documents | `PaiementsPanel`, `DocumentsValidationPanel` | `/paiements/`, `/paiements/dossier/`, `/paiements/synthese/`, `/demandes-documents/` |
| Communication | `AnnoncesPanel`, `MessageriePanel` | `/annonces/`, `/messages/` |
| Paramètres | `AnneesScolairesPanel`, `MonProfilPanel` | `/annees-scolaires/`, `/trimestres/`, `/auth/profile/` |

---

## 6. Dashboard Coordinateur pédagogique (`pages/PedagogicalCoordinatorDashboard.jsx`)

| Menu | Endpoints clés |
|---|---|
| Tableau de bord | `GET /classes/`, `GET /etudiants/` |
| Gestion Académique | `/classes/`, `/matieres/`, `/emplois-du-temps/` |
| Notes & Évaluations | `/notes/`, `/notes/moyenne/`, `/classes/{id}/classement/` |
| Présence & Absences | `/presences/` |
| Gestion Étudiants | `/etudiants/` |
| Paiements Écolages | `/paiements/dossier/`, `/paiements/synthese/` |
| Communication | `/annonces/`, `/messages/` |
| Rapports Pédagogiques | `/statistiques/`, `/classes/{id}/classement-annuel/` |
| Paramètres | `/auth/profile/` |

---

## 7. Dashboard Enseignant (`pages/TeacherDashboard.jsx`)

Portée limitée : `EtudiantViewSet`/`ClasseViewSet`/`NoteViewSet`/`PresenceViewSet` sont filtrés côté backend via `scoping.classes_du_professeur` / `etudiants_du_professeur`.

| Menu | Composant | Endpoints clés |
|---|---|---|
| Tableau de bord | (inline) | `GET /classes/`, `GET /etudiants/` (scopés au prof) |
| Gestion Académique | (inline, classes/matières du prof) | `GET /classes/`, `GET /matieres/`, `GET /dossiers-enseignants/` |
| Emploi du Temps | (inline) | `GET /emplois-du-temps/` |
| Notes & Évaluations | (inline) | `GET/POST/PATCH/DELETE /notes/`, `genererBulletin`, `validerBulletin`, `telechargerBulletinPdf` |
| Devoirs | `DevoirsPanel`, `DocumentsDevoirSection` | `GET/POST/PATCH/DELETE /documents-devoirs/`, `envoyerRappelsDevoirs` |
| Cahier de textes | `CahierTextePanel` | `GET/POST/PATCH/DELETE /cahier-textes/` |
| Présence & Absences | (inline appel) | `GET /presences/`, `enregistrerAppel`, `POST /presences/{id}/valider-justification/`, `.../refuser-justification/` |
| Communication | `AnnoncesPanel`, `MessageriePanel`, `ChatClassePanel` | `/annonces/`, `/messages/`, `definirDiscussionClasse` |
| Historique Étudiants | (inline) | `GET /etudiants/{id}/carte/`, dossier scolaire |
| Rapports | (inline) | `fetchClassement`, `fetchClassementAnnuel` |
| Paramètres | `authService` | `GET/PATCH /auth/profile/`, `POST /auth/changer-mot-de-passe/` |
| Discipline (via `DisciplinePanel`) | | `GET/POST /discipline/` |

---

## 8. Dashboard Étudiant (`pages/StudentDashboard.jsx`)

Portée : l'utilisateur ne voit que son propre dossier (`Etudiant.utilisateur = user`).

| Menu | Endpoints clés |
|---|---|
| Tableau de bord | `GET /etudiants/`, `fetchMoyenneTrimestre` |
| Mon Profil | `GET/PATCH /auth/profile/` |
| Gestion Académique | `GET /classes/`, `GET /matieres/` |
| Emploi du Temps | `GET /emplois-du-temps/` (+ `MonthCalendar`) |
| Devoirs | `GET /cahier-textes/` (devoirs à venir) |
| Notes & Résultats | `GET /notes/`, `fetchMoyenneTrimestre`, `GET /bulletins/`, `telechargerBulletinPdf` |
| Présence | `GET /presences/`, `soumettreJustification` |
| Gestion Administrative | `fetchDossierFinancier`, `GET /paiements/`, `GET /frais-scolarite/`, `GET /demandes-documents/`, `telechargerDocumentPdf` |
| Communications | `AnnoncesPanel`, `MessageriePanel`, `CahierTextePanel` |
| Mes Documents | `GET /demandes-documents/`, `telechargerDocumentPdf` |

---

## 9. Dashboard Parent (`pages/ParentDashboard.jsx`)

Portée multi-enfants : `TuteurEtudiant` relie un parent à 1..N `Etudiant` ; toutes les requêtes ci-dessous sont exécutées **par enfant** (un `ChildDossierCard`/section par enfant lié).

| Menu | Composant/Section | Endpoints clés |
|---|---|---|
| Accueil (`HomeTab`) | inline | `GET /etudiants/` (enfants liés via `tuteurs__parent=user`), `fetchMoyenneTrimestre` par enfant |
| Mes Enfants (`ChildrenTab`) | inline (Card par enfant) | `GET /etudiants/`, `GET /classes/` |
| Bulletins (`BulletinsTab`) | inline | `GET /bulletins/`, `telechargerBulletinPdf` |
| Cahier de textes | `CahierTextePanel` | `GET /cahier-textes/` |
| Absences (`AbsencesTab`) | inline | `GET /presences/` |
| Paiements (`ChildDossierCard`) | inline | `fetchDossierFinancier`, `GET /paiements/`, `GET /inscriptions/` (tarifs classe/niveau — corrigé cette session, cf. `InscriptionViewSet`), `GET /frais-scolarite/`, `GET /annees-scolaires/`, `GET /trimestres/`, `telechargerCarteEcolage`, `telechargerFactureEcolage` |
| Communication | `AnnoncesPanel`, `MessageriePanel` | `/annonces/`, `/messages/` |
| Mon Profil | `MonProfilPanel` | `GET/PATCH /auth/profile/` |

---

## 10. Composants partagés transverses

| Composant | Rôles | Endpoints |
|---|---|---|
| `NotificationBell.jsx` | Tous | `GET /notifications/`, `POST /notifications/{id}/marquer-lue/`, `POST /notifications/tout-marquer-lu/` |
| `MonProfilPanel.jsx` | Tous | `GET/PATCH /auth/profile/` |
| `ChangePasswordGate.jsx` | Tous (forcé si `doit_changer_mot_de_passe`) | `POST /auth/changer-mot-de-passe/` |
| `AnnoncesPanel.jsx` | Tous | `GET/POST/PATCH/DELETE /annonces/` |
| `MessageriePanel.jsx` | Tous | `GET/POST /messages/`, `POST /messages/{id}/marquer-lu/`, `GET /messages-groupe-classe/`, `GET/POST /discussions-classe/`, `definirDiscussionClasse` |
| `ProtectedRoute.jsx` | Tous (routage) | s'appuie sur `GET /auth/profile/` via `useAuth` |
| `FinanceOverviewChart.jsx`, `StatistiquesPanel.jsx`, `TauxParTrimestreChart.jsx`, `DistributionClasseRadarChart.jsx` | Admin / Secrétariat / Coordinateur | `GET /statistiques/`, `GET /paiements/synthese/` |
