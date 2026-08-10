=========================
REFERENCE FONCTIONNELLE
=========================

Pour les fonctionnalités métier, considère comme référence les capacités offertes par les principaux logiciels de gestion scolaire tels que Pronote.

L'objectif est d'atteindre un niveau fonctionnel équivalent, sans reproduire le code, l'identité visuelle, les éléments graphiques ou les contenus protégés.

Le système doit couvrir l'ensemble des besoins d'un établissement scolaire.

Légende de statut : ✅ implémenté et testé · 🚧 backend prêt, UI à finir (ou l'inverse) · ⏳ non commencé (backlog).

---

## Objectif et périmètre de l'application

**SIG-Lycée** est un ERP scolaire multi-établissement (SaaS) : une seule plateforme héberge plusieurs lycées/écoles indépendants, chacun avec ses propres utilisateurs, élèves, classes, notes et données financières, strictement cloisonnés les uns des autres.

Le système doit permettre à un établissement de gérer, de bout en bout :
1. Sa structure académique (années scolaires, trimestres, niveaux, filières, classes, salles, matières).
2. Son personnel et ses élèves (comptes, rôles, inscriptions année par année, historique).
3. La vie pédagogique quotidienne (saisie des notes, calcul des moyennes/classements, présences, emplois du temps).
4. La communication avec les familles (parents/tuteurs) et la gestion financière (écolage).
5. La production de documents officiels (bulletins, certificats, attestations) et le reporting.

### Rôles utilisateurs

| Rôle | Code | Portée |
|---|---|---|
| Administrateur | `ADMIN` | Accès complet à son établissement (pas aux autres). Fondateur de l'établissement (auto-inscription en créant son école) ou créé par un autre admin. Crée tous les comptes du personnel. |
| Responsable pédagogique | `RESPONSABLE` | Supervision académique inter-classes/filières, principalement en lecture ; valide les bulletins ; accès aux statistiques. |
| Enseignant | `ENSEIGNANT` | Limité à ses matières, ses classes (déduites de ses matières) et ses élèves. Peut créer les matières qu'il enseigne (auto-assignées), saisir notes/coefficients/présences/cahier de textes pour ses seules matières, et envoyer un message au délégué de ses classes. |
| Bureau administratif | `SECRETARIAT` | Gère le quotidien administratif : paiements (enregistrement + synthèse), validation/refus des demandes de documents, CRUD classes/matières/emploi du temps, consultation des présences. N'a pas accès à la création de comptes personnel (réservée à `ADMIN`). |
| Étudiant | `ETUDIANT` | Lecture seule de ses propres données (notes, bulletins, cahier de textes de sa classe) ; compte inactif tant qu'il n'est pas activé par un administrateur si auto-inscrit. Peut demander des documents administratifs. |
| Parent / Tuteur | `PARENT` | Lecture seule des données de ses enfants (lien via une table de tutelle, plusieurs tuteurs par élève possibles). |

Un super-utilisateur plateforme (`is_superuser`, sans `ecole` assignée) existe en plus de ces rôles, pour l'administration technique multi-établissement (support, création de nouveaux établissements).

**Périmètre confirmé avec l'utilisateur (2026-08-07)** : établissement type = lycée classique, **sans** cantine/internat/transport scolaire/bibliothèque. Ces modules (et les rôles associés : bibliothécaire, responsable cantine, infirmier, responsable transport, responsable internat) restent hors périmètre — voir `done.md` à la racine du projet pour la liste complète des ambitions Pronote dont ils sont issus, non retenue en totalité.

### Inscription (deux parcours distincts)

1. **Créer un établissement** (`POST /api/auth/register/ecole/`, page `Register.jsx` onglet "Créer un établissement") : un administrateur fondateur crée en une seule opération atomique un nouvel `Ecole` (nom, code unique, coordonnées) et son propre compte `ADMIN`, **actif immédiatement** (`is_active=True` — il n'existe personne d'autre pour l'activer). Il crée ensuite tout son personnel (enseignants, bureau, responsables) depuis son tableau de bord (`PersonnelPanel`, `POST /api/personnel/`), jamais par auto-inscription.
2. **Rejoindre un établissement existant** (`POST /api/auth/register/`, onglet "Élève / Parent") : réservé aux rôles `ETUDIANT`/`PARENT`, l'établissement est choisi dans une liste publique (`GET /api/ecoles/publiques/`), le compte reste **inactif** jusqu'à activation par un administrateur.

Ce cloisonnement empêche qu'un compte public auto-créé obtienne un rôle privilégié sur un établissement existant, tout en permettant à un nouvel établissement de démarrer sans dépendre d'un administrateur plateforme.

**Rôles envisagés mais non implémentés** (backlog, cf. section "Extensions du périmètre") : Super Administrateur SaaS avec tableau de bord dédié (au-delà du simple flag technique `is_superuser` actuel), et sous-rôles spécialisés côté personnel (comptable, censeur, surveillant, bibliothécaire) — pour l'instant tout personnel non-enseignant/non-secrétariat doit être modélisé via `ADMIN`, `RESPONSABLE` ou `SECRETARIAT`.

### Architecture de données actuelle

Établissement (`Ecole`) → Année scolaire (`AnneeScolaire`, une seule active à la fois) → Trimestre (`Trimestre`, un seul actif à la fois) ; Niveau / Filière / Salle (catalogue par établissement) → Classe (instance annuelle d'un niveau+filière, `section` optionnelle) → Inscription (lien élève/classe/année, historisé) ; Matière (catalogue filière+niveau, coefficient, `couleur` pour l'emploi du temps, enseignant assigné) → Note (élève+matière+trimestre+type d'évaluation) → Bulletin (calculé : moyenne, rang, mention, décision, PDF) ; Frais de scolarité (tarif par niveau/filière/année) → Paiement d'écolage → Dossier financier (calculé : total dû/payé/reste) ; Présence (par cours, saisie groupée via "appel", `justification_statut` : workflow de justification) ; Emploi du temps (par classe, jour, matière, enseignant, salle, `groupe` optionnel pour les sous-groupes, détection de conflits horaires) ; Parent lié à un ou plusieurs élèves via une table de tutelle avec relation (père/mère/tuteur).

Depuis, ajoutés : `AuditLog` (journal d'audit : qui a créé/modifié/supprimé quoi, alimenté par signaux) ; `CahierTexte` (cahier de textes numérique : contenu de séance + travail à faire + pièce jointe + lien, par classe/matière/date, déclenche une notification `DEVOIR` aux élèves/parents de la classe concernée) ; `Classe.delegue` (étudiant délégué de la classe, destinataire privilégié des messages d'un enseignant) ; `EvenementDisciplinaire` (vie scolaire : observation/avertissement/sanction/exclusion/convocation/retenue, notifie l'étudiant et ses parents) ; `DossierEnseignant` (RH : contrat, date d'embauche, diplômes, salaire, volume horaire, documents RH — accès restreint admin + l'enseignant concerné) ; `EvenementCalendrier` (vacances/examens/événements/réunions) ; `DocumentJustificatifEtudiant` (documents versés au dossier élève par l'établissement : acte de naissance, CIN parent, certificat médical... — distinct de `DemandeDocument`, qui est le sens inverse) ; profil `Etudiant` enrichi (situation familiale, ancien établissement, dossier médical, contact d'urgence) avec génération de QR code et code-barres (matricule) pour la carte scolaire.

Toutes les règles de cloisonnement (un établissement ne voit jamais les données d'un autre) et les règles de calcul (moyennes pondérées par coefficient, classement, dossier financier, bulletins, statistiques agrégées) sont centralisées côté backend et couvertes par des tests automatisés (128 tests).

### Stack technique confirmée

Backend : Django + Django REST Framework + JWT (SimpleJWT, refresh token) + SQLite. Frontend : React (JavaScript, pas TypeScript) + Vite + **shadcn/ui** (Tailwind) + TanStack Query + React Context pour l'auth. Ce choix de stack frontend a été explicitement confirmé face à une proposition concurrente (TypeScript + Material UI + Zustand) : on ne migre pas, tout le frontend déjà construit et vérifié navigateur reste en JS/shadcn.

---

## Administration

- Gestion des établissements — ✅ backend (modèle + API) · 🚧 pas d'écran de gestion dédié
- Gestion des années scolaires — ✅ backend (activation atomique, une seule active) · 🚧 écran encore statique
- Gestion des périodes (trimestres) — ✅ backend (activation atomique) · 🚧 écran encore statique · ⏳ pas de mode "semestre" alternatif
- Gestion des niveaux — ✅ backend · ⏳ écran de gestion
- Gestion des filières — ✅ backend · ⏳ écran de gestion
- Gestion des classes — ✅ backend + UI complète (CRUD, `ClassesPanel` : admin ET bureau, avec désignation du délégué de classe)
- Gestion des salles — ✅ backend (entité dédiée, capacité, type) · ⏳ écran de gestion dédié (sélectionnable en cascade depuis Classes/Emploi du temps)
- Gestion des matières — ✅ backend + UI complète (`MatieresPanel` : admin/bureau CRUD total ; un enseignant peut créer/éditer les matières qu'il enseigne lui-même, jamais celles d'un collègue)
- Gestion des coefficients — ✅ (au niveau matière, utilisé dans le calcul des moyennes)
- Gestion des enseignants — ✅ backend + UI (`PersonnelPanel`, admin-only : création/suppression de tout compte personnel avec choix du rôle ; page dédiée "Gestion des Profs" avec assignation des matières enseignées + classe dont il est titulaire directement à la création du compte, et onglet "Dossiers RH" — contrat/embauche/diplômes/salaire/volume horaire, `DossierEnseignantPanel`)
- Gestion des élèves — ✅ backend + UI complète (`EtudiantsPanel`) : profil complet (identité, contact, situation familiale, ancien établissement, dossier médical, personne à contacter, photo), assignation de classe à l'inscription (crée l'`Inscription` automatiquement), QR code + code-barres (carte scolaire), documents justificatifs (acte de naissance, CIN parent, certificat médical... upload PDF/image), historique scolaire (inscriptions passées)
- Gestion des parents — ✅ backend (rôle `PARENT`, table de tutelle multi-parents/multi-enfants) + UI (paiements/absences/bulletins/cahier de textes par enfant) · ⏳ écran de gestion admin des liens parent-enfant
- Gestion du personnel administratif — ✅ backend + UI (`PersonnelPanel`, admin-only, tous rôles personnel confondus)
- Tableau de bord dédié **Bureau administratif** (`SecretariatDashboard.jsx`, route `/secretariat`) — ✅ : étudiants (lecture), académique (classes/matières/EDT en CRUD), présences (lecture), paiements + documents, communication

## Vie scolaire

- Présences — ✅ modèle + API + saisie groupée ("appel du jour") + UI (enseignant/admin/étudiant/parent), testé
- Absences — ✅ (statut de présence + agrégats temps réel côté UI) + **notification automatique** à l'élève et ses parents à la création (signal `notifier_absence`)
- Retards — ✅ (statut de présence dédié)
- Justificatifs — ✅ workflow complet : l'élève/parent soumet un justificatif (`POST /presences/{id}/justifier/`), le personnel accepte (passe le statut à "Absence justifiée") ou refuse (`valider-justification`/`refuser-justification`), suivi via `justification_statut` (aucune/en attente/acceptée/refusée), UI des deux côtés (élève : bouton "Justifier" ; personnel : section "Justificatifs en attente" dans `AttendancePanel`)
- Sanctions disciplinaires, avertissements, exclusions, convocations, retenues — ✅ modèle `EvenementDisciplinaire` (type + gravité + description + date) + API (`/api/discipline/`, écriture personnel seulement, lecture scopée à l'élève concerné) + UI (`DisciplinePanel`, onglet "Vie scolaire" dans Présences & Absences sur Admin/Bureau/Enseignant), notifie automatiquement l'élève et ses parents
- Observations — ✅ (type `OBSERVATION` du modèle `EvenementDisciplinaire`)
- Récompenses — ⏳
- Suivi comportemental agrégé (tableau de bord dédié) — ⏳ (les événements existent, pas de vue de synthèse par élève/classe)
- Carnet de liaison numérique — ⏳

## Pédagogie

- Cahier de textes — ✅ modèle `CahierTexte` + API (`/api/cahier-textes/`) + UI (`CahierTextePanel`, réutilisé enseignant/étudiant/parent), testé
- Planification des cours (emploi du temps) — ✅ modèle + API + UI calendrier hebdomadaire (`EmploiDuTempsCalendar` : grille Lundi-Samedi par classe, couleur par matière, admin/bureau), testé
- Contenu des séances — ✅ (champ `contenu_seance` du cahier de textes)
- Devoirs — ✅ (champ `travail_a_faire` + `date_echeance_travail` du cahier de textes, notifie automatiquement élèves/parents de la classe)
- Ressources pédagogiques (pièce jointe, lien) — ✅ champs `piece_jointe` (upload PDF/image/tout fichier) et `lien` (URL externe) du cahier de textes
- Exercices — ⏳ (couvert de façon informelle via le contenu du cahier de textes / pièce jointe, pas de modèle dédié avec remise/notation)
- Remise de fichiers par l'élève, corrections — ⏳
- Compétences (évaluation par compétences) — ⏳
- Évaluations — ✅ (saisie de notes par type d'évaluation libre, opérationnelle)

## Notes

- Contrôles, devoirs surveillés, examens, TP — ✅ (via le champ libre "type d'évaluation")
- Évaluations par compétences — ⏳
- Coefficients — ✅ (au niveau matière)
- Barèmes — ✅ (/20)
- Notes sur différentes échelles — ⏳ (actuellement fixé sur 20)
- Validation des notes (statut brouillon/validé) — ⏳ (la validation existe au niveau du bulletin, pas de la note individuelle)
- Historique des modifications — 🚧 (horodatage présent, pas de journal détaillé — voir Audit)

**Calculs automatiques** (service dédié, testé unitairement) :

- moyenne matière — ✅
- moyenne de trimestre (pondérée par coefficient) — ✅
- moyenne générale annuelle — ✅
- classement / rang de classe — ✅ (par trimestre et annuel)
- statistiques agrégées (classe/établissement) — ✅ voir section "Statistiques"
- mentions — ✅ (Félicitations/Encouragements/Tableau d'honneur/Aucune, calculées automatiquement)
- décisions (admis/ajourné) — ✅ pour le bulletin annuel · redoublement non distingué d'ajourné

## Bulletins

- Génération automatique (trimestriel et annuel), calcul moyenne/rang/mention/décision — ✅ testé
- Impression PDF — ✅ (reportlab, mise en page établissement/élève/notes/résumé)
- Validation (workflow admin/responsable) — ✅
- Bulletins semestriels — ⏳ (non distingué du trimestriel, dépend de la config des périodes)
- Archivage / historique — ✅ (chaque génération met à jour le même enregistrement, `date_generation`/`date_validation` conservées)

## Emploi du temps

- Planning des classes / enseignants / salles — ✅ modèle + API + UI grille hebdomadaire (enseignant/étudiant/admin/bureau), testé
- Détection de conflits horaires — ✅ `EmploiDuTemps.clean()` refuse tout chevauchement pour le même enseignant, la même salle, ou la même classe (hors sous-groupes) ; testé (créneaux qui se chevauchent partiellement, pas seulement identiques)
- Groupes / sous-groupes (cours en demi-classe, ex. TP) — ✅ champ `groupe`, deux groupes distincts peuvent avoir le même créneau sans être en conflit
- Couleur par matière (repère visuel dans la grille) — ✅ champ `Matiere.couleur`
- Éditeur visuel glisser-déposer — ⏳ (CRUD formulaire, pas de drag & drop)
- Impression — ⏳
- Gestion des remplacements (professeur absent) — ⏳
- Vacances, examens, événements, réunions — ✅ modèle `EvenementCalendrier` + API (`/api/evenements-calendrier/`) + UI (`EvenementsCalendrierPanel`, onglet dédié dans Emploi du Temps sur Admin/Bureau), lecture pour tout le personnel, écriture admin/responsable/bureau

## Communication

- Messagerie interne directe (1-à-1) — ✅ modèle `Message` + API + UI (`MessageriePanel`), testé ; le personnel compose vers n'importe qui, élève/parent peuvent répondre dans un fil existant ; un enseignant peut en plus contacter directement le délégué de chacune de ses classes
- Diffusion générale (annonces) — ✅ modèle `Annonce` + API + UI (`AnnoncesPanel`), portée configurable (établissement/classe/enseignants/parents), testé
- Notifications système — ✅ modèle `Notification` + signaux (note, absence, paiement, bulletin, document, annonce, message, devoir) + UI (`NotificationBell`, marquer lu/tout marquer lu)
- Groupes de diffusion personnalisés — ⏳ (la portée est actuellement limitée aux catégories prédéfinies d'`Annonce`)
- Accusés de lecture, pièces jointes — ⏳

## Parents

- Consultation des notes — 🚧 backend prêt (l'API notes est déjà scopée par parent via la table de tutelle) · ⏳ écran dédié (visible via le détail élève actuellement)
- Consultation des absences — ✅
- Consultation et téléchargement des bulletins — ✅
- Cahier de textes / devoirs des enfants — ✅
- Messagerie / notifications / annonces — ✅
- Paiements (dossier financier par enfant) — ✅
- Documents (demande de certificats) — ⏳ (le workflow existe côté élève ; pas encore de demande initiée par le parent)

## Élèves

- Consultation des notes — ✅
- Emploi du temps — ✅
- Bulletins (téléchargement) — ✅ calcul automatique à partir de la moyenne pondérée de toutes les notes de ses matières
- Paiements d'écolage en tableau mois × année scolaire — ✅ (`PaiementsParMoisTable`, grille 12 mois par année avec statut coloré)
- Demande de certificat de scolarité (et attestation, certificat de réussite) — ✅ workflow demande → validation/refus → PDF
- Cahier de textes / devoirs — ✅
- Messagerie / notifications / annonces — ✅
- Vie scolaire (événements disciplinaires le concernant, notifications) — ✅
- Justification d'une absence/retard — ✅ (bouton "Justifier" sur l'historique de présence, suivi du statut de validation)

## Finance

- Frais d'inscription et écolage (tarification par niveau/filière/année) — ✅ modèle `FraisScolarite`
- Paiements (enregistrement via formulaire réel, historique, statut) — ✅ API + UI (`PaiementsPanel`, admin/bureau), testé
- Dossier financier calculé (total dû/payé/reste, statut PAYÉ/PARTIEL/IMPAYÉ) — ✅ service dédié, testé
- Synthèse financière établissement (revenus, dettes, taux de recouvrement, liste des élèves endettés) — ✅
- Reçus PDF, factures — ⏳
- Modes de paiement structurés (espèces/Mobile Money/banque) — 🚧 champ texte libre, pas de validation par choix

## Documents

- Certificat de scolarité, attestation de fréquentation, certificat de réussite — ✅ modèle `DemandeDocument` + PDF (reportlab) + UI (`DocumentsValidationPanel`)
- Convocations, diplômes — ⏳
- Bulletin (voir section dédiée) — ✅
- Workflow de demande élève → validation admin/bureau → téléchargement — ✅ testé

## Statistiques

- Taux de réussite, moyennes par classe, effectifs par classe, taux de présence — ✅ service `statistiques.py` + endpoint `GET /api/statistiques/?annee_scolaire=&trimestre=` (admin/responsable) + UI (`StatistiquesPanel`, onglet Rapports), filtrable par trimestre ou année complète
- Évolution des résultats, répartition des notes, statistiques financières détaillées — ⏳ (la synthèse financière globale existe déjà, voir section Finance, mais pas intégrée à cet écran)

## Audit

- Journal des créations/modifications/suppressions — ✅ modèle `AuditLog` alimenté par signaux (notes, paiements, bulletins validés, demandes de documents, événements disciplinaires) + API (`/api/audit-logs/`, admin-only, cloisonné par établissement) + UI (`AuditLogPanel`, onglet Administratif)
- Journal des connexions, traçabilité des téléchargements — ⏳

## Notifications

Le système notifie automatiquement : nouvelle note, bulletin disponible, paiement enregistré, document traité, nouvelle annonce, nouveau message, nouveau devoir (cahier de textes), **absence/retard** (à l'élève et ses parents), **événement disciplinaire** — ✅ tous couverts par signaux + `NotificationBell`.

## Multi-école

Le système doit être conçu dès le départ pour gérer plusieurs établissements avec une seule plateforme.

Chaque établissement possède ses propres utilisateurs, élèves, enseignants, classes, matières, années scolaires, documents et statistiques. Les données d'un établissement ne doivent jamais être accessibles à un autre.

**Statut : ✅ implémenté et testé.** Cloisonnement appliqué de façon centralisée (mixin de scope par établissement sur chaque endpoint, contraintes base de données comme "une seule année active par établissement"), avec des tests automatisés vérifiant explicitement qu'un administrateur d'un établissement ne peut pas voir les données d'un autre.

---

## Extensions du périmètre (backlog, non encore commencées)

Reçues via un prompt de cadrage plus détaillé après la construction du cœur applicatif ci-dessus. Décision actée : on ne change pas la stack frontend (JS + shadcn, voir "Stack technique confirmée") — ces éléments sont un enrichissement fonctionnel du même produit, pas une reconstruction.

- **Super Administrateur SaaS** : tableau de bord dédié pour créer/suspendre/supprimer un établissement, statistiques globales plateforme, gestion des abonnements/licences, espace disque, sauvegardes, journaux d'activité. Aujourd'hui il n'existe que le flag technique `is_superuser` sans interface (un administrateur d'établissement peut en revanche créer son propre établissement en autonomie, voir "Inscription").
- **Sous-rôles personnel** : comptable, censeur, surveillant (actuellement à modéliser via `ADMIN`/`RESPONSABLE`/`SECRETARIAT` faute de rôles dédiés — la vie scolaire/discipline et les présences couvrent déjà une grande partie du besoin fonctionnel d'un censeur/surveillant, sans rôle dédié).
- **Services annexes hors périmètre confirmé** (établissement type = lycée classique) : bibliothèque, cantine, transport scolaire, internat, et les rôles associés (bibliothécaire, responsable cantine, infirmier, responsable transport, responsable internat). À reconsidérer seulement si l'établissement cible en a besoin.
- **Emploi du temps** : glisser-déposer visuel et impression restent en backlog (la détection de conflits, les couleurs par matière et les sous-groupes sont faits, voir section dédiée).
- **Remplacement d'un professeur absent** (workflow dédié).
- **Documents administratifs supplémentaires** : convocations, diplômes remis à l'élève (le workflow demande → validation → PDF existe déjà pour certificat de scolarité/attestation/certificat de réussite ; le dépôt de documents par l'établissement dans le dossier élève existe aussi, voir `DocumentJustificatifEtudiant`).
- **Reçus de paiement PDF** générés automatiquement à chaque paiement enregistré ; modes de paiement structurés (espèces/Mobile Money/banque) plutôt que texte libre.
- **Recherche globale** transverse (élèves, professeurs, classes, paiements, documents).
- **Permissions fines et configurables** par rôle depuis l'UI (au-delà des permission classes actuelles, qui sont codées en dur côté backend).
- **Export** Excel / PDF / CSV pour listes, bulletins, reçus, emplois du temps.
- **Signature électronique** sur les documents officiels (bulletins, certificats).
- **Notifications multi-canal** (email/SMS/WhatsApp) — actuellement uniquement in-app (`Notification` + `NotificationBell`).
- **Infrastructure** : Docker (dev + prod), CI/CD (GitHub Actions), documentation API OpenAPI/Swagger, rate limiting, sauvegarde automatique de la base.

---

Avant d'implémenter une fonctionnalité, vérifier qu'elle est cohérente avec les besoins réels d'un ERP scolaire moderne et proposer une solution robuste, évolutive et maintenable.
