# SIG-LYCÉE - CAHIER DE CHARGE COMPLET

## 1. PRÉSENTATION GÉNÉRALE DU PROJET

### Objectif
Développer un Système Informatisé de Gestion (SIG) pour établissements scolaires (Lycée) permettant la gestion complète de l'administration académique, pédagogique et financière.

### Vision
Centraliser la gestion des données académiques, administratives et financières dans une plateforme unique, sécurisée et accessible selon les rôles des utilisateurs.

### Périmètre
- Gestion des élèves (inscription, suivi, historique)
- Gestion académique (classes, matières, emplois du temps, programmes)
- Suivi pédagogique (notes, évaluations, bulletins)
- Gestion de la présence et des absences
- Gestion des paiements d'écollages
- Communication et notifications
- Rapports et statistiques
- Gestion administrative et financière

---

## 2. RÔLES UTILISATEURS ET ACCÈS

### 2.1 ADMINISTRATEUR
**Accès:** Complet à tous les modules
**Responsabilité:** Gestion globale du système

#### Modules:
1. **Tableau de bord administratif**
   - Vue d'ensemble globale
   - Statistiques par classe, filière, niveau
   - Utilisateurs connectés
   - Alertes systèmes

2. **Gestion des utilisateurs**
   - CRUD complet des utilisateurs (admin, enseignants, responsables pédagogiques)
   - Attribution des rôles et permissions
   - Gestion des accès et sécurité

3. **Gestion académique globale**
   - Création et modification des classes
   - Gestion des filières
   - Configuration des matières et programmes
   - Gestion des emplois du temps globaux

4. **Gestion des étudiants**
   - Inscription/désinscription
   - Modification des données
   - Suivi des statuts
   - Gestion des historiques

5. **Notes et évaluations**
   - Consultation globale des notes
   - Validation des bulletins
   - Statistiques académiques
   - Analyses de performance

6. **Présence et absences**
   - Rapports globaux
   - Analyse des tendances
   - Gestion des justifications

7. **Gestion administrative**
   - Gestion des utilisateurs du système
   - Configuration des paramètres
   - Sauvegarde et sécurité

8. **Gestion financière**
   - Gestion complète des paiements
   - Suivi des dettes
   - Rapports financiers détaillés
   - Configuration des frais de scolarité

9. **Communication**
   - Notifications globales
   - Messagerie système
   - Rapports administratifs

10. **Rapports et statistiques**
    - Tous les rapports disponibles
    - Export de données
    - Analyses complètes

---

### 2.2 RESPONSABLE PÉDAGOGIQUE
**Accès:** Superviseur pédagogique inter-classes/filière
**Responsabilité:** Supervision académique et pédagogique

#### Modules:

1. **Tableau de bord pédagogique**
   - Statistiques par filière/niveau
   - Alertes pédagogiques
   - Vue d'ensemble académique

2. **Gestion académique**
   - Consultation des classes et filières
   - Supervision des matières et programmes
   - Suivi des enseignants assignés
   - Consultation et optimisation des emplois du temps

3. **Notes et évaluations**
   - Consultation des moyennes globales par classe/filière
   - Validation des bulletins
   - Statistiques par semestre/année
   - Suivi des performances par filière

4. **Présence et absences**
   - Rapports globaux par classe/filière
   - Analyse des tendances d'absentéisme
   - Identification des cas critiques

5. **Gestion des étudiants**
   - Consultation des historiques académiques
   - Suivi des parcours (redoublements, orientations)
   - Analyse des progressions

6. **Paiements d'écollages**
   - Enregistrement des paiements
   - Suivi par filière et classe
   - Filtrage par statut (Payé, Partiel, Impayé)
   - Rapports de recouvrement
   - Historique des transactions
   - Export de rapports

7. **Communication**
   - Envoi de notifications pédagogiques
   - Messagerie interne
   - Rapports pédagogiques

8. **Rapports**
   - Rapports de performances par filière
   - Rapports d'assiduité
   - Analyses comparatives

---

### 2.3 ENSEIGNANT
**Accès:** Limité à ses classes, matières et étudiants assignés
**Responsabilité:** Gestion pédagogique quotidienne de ses classes

#### Modules:

1. **Tableau de bord pédagogique**
   - Vue de ses classes
   - Tâches à accomplir
   - Activités récentes
   - Statistiques personnelles

2. **Gestion académique**
   - Consultation de l'emploi du temps personnel
   - Consultation des matières assignées
   - Consultation des programmes assignés

3. **Notes et évaluations**
   - Saisie des notes et évaluations pour ses classes/matières
   - Calcul automatique des moyennes
   - Génération de bulletins/relevés partiels
   - Validation avant envoi aux étudiants

4. **Présence et absences**
   - Enregistrement des présences, absences et retards
   - Suivi des absences de ses étudiants
   - Génération de rapports de présence

5. **Communication**
   - Envoi de notifications aux étudiants
   - Messagerie interne
   - Envoi d'emails ciblés

6. **Historique étudiants**
   - Consultation de l'historique académique
   - Suivi des parcours

7. **Rapports**
   - Rapports sur ses classes
   - Moyennes et assiduité

8. **Paramètres**
   - Gestion du profil
   - Préférences de notification

---

### 2.4 ÉTUDIANT
**Accès:** Lecture seule - données personnelles et académiques
**Responsabilité:** Consultation de sa situation académique

#### Modules:

1. **Tableau de bord étudiant**
   - Vue d'ensemble personnelle
   - Annonces importantes
   - Informations clés

2. **Mon profil**
   - Consultation des données personnelles
   - Historique académique personnel

3. **Gestion académique**
   - Consultation de l'emploi du temps
   - Consultation des matières et programmes

4. **Notes et résultats**
   - Consultation des notes par période
   - Téléchargement de bulletins
   - Moyennes personnelles

5. **Présence**
   - Suivi des absences personnelles
   - Justifications

6. **Gestion administrative**
   - Consultation du statut de paiement
   - Historique des transactions

7. **Communications**
   - Réception des notifications
   - Messagerie interne (lecture)

8. **Mes documents**
   - Téléchargement des attestations
   - Téléchargement des certificats
   - Téléchargement des bulletins

---

## 3. MODULES GLOBAUX DU SYSTÈME

### 3.1 GESTION ACADÉMIQUE

#### Fonctionnalités:
- Création et gestion des classes
- Gestion des filières (Scientifique, Littéraire, Technique, etc.)
- Gestion des matières
- Gestion des programmes pédagogiques
- Création et optimisation des emplois du temps
- Affectation des enseignants aux classes/matières
- Gestion des niveaux (6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Terminale)

#### Données:
- Classe (ID, nom, niveau, filière, capacité, prof principal)
- Matière (ID, nom, code, description, heures/semaine)
- Emploi du temps (jour, heure début, heure fin, classe, matière, enseignant, salle)
- Programme (ID, matière, contenu, trimestre/semestre, volume horaire)

---

### 3.2 GESTION DES ÉTUDIANTS

#### Fonctionnalités:
- Inscription des étudiants
- Modification des données personnelles
- Suivi des parcours académiques
- Historique complet
- Gestion des statuts (Actif, Suspendu, Diplômé, Renvoyé)
- Suivi des redoublements et orientations

#### Données:
- Étudiant (ID, matricule, prénom, nom, date naissance, sexe, adresse, téléphone)
- Parent/Responsable (nom, relation, contact)
- Historique académique (année, classe, filière, moyenne, statut)
- Parcours (orientations, redoublements)

---

### 3.3 NOTES ET ÉVALUATIONS

#### Fonctionnalités:
- Saisie des notes (contrôles, examens, travaux)
- Calcul automatique des moyennes
  - Moyenne par devoir
  - Moyenne par trimestre/semestre
  - Moyenne générale
- Génération de bulletins
- Validation des résultats
- Statistiques et analyses
- Rapports de performance

#### Calculs:
- Moyenne par matière = (Σ notes × coefficients) / Σ coefficients
- Moyenne trimestre = (Σ moyennes matières) / nombre de matières
- Moyenne générale = (Σ moyennes trimestres) / 3 ou 2

#### Données:
- Note (ID, étudiant, matière, type, valeur, date, enseignant)
- Bulletin (ID, étudiant, trimestre, classe, moyennes, observations)
- Statistiques (moyennes par classe, filière, niveau)

---

### 3.4 PRÉSENCE ET ABSENCES

#### Fonctionnalités:
- Enregistrement quotidien des présences
- Enregistrement des absences et retards
- Justification des absences
- Suivi statistique
- Rapports d'assiduité
- Alertes absentéisme

#### Données:
- Présence (ID, étudiant, cours, date, statut: Présent/Absent/Retard)
- Justification (ID, absence, motif, document, date justification, statut)
- Rapport (classe, taux présence, nombre absences, tendances)

#### Statistiques:
- Taux de présence par étudiant/classe/filière
- Nombre d'absences par période
- Analyse des tendances

---

### 3.5 GESTION FINANCIÈRE - PAIEMENTS D'ÉCOLLAGES

#### Fonctionnalités:
- Configuration des tarifs par filière/niveau
- Enregistrement des paiements
- Suivi des dettes
- Génération de reçus/quittances
- Rappels de paiement automatiques
- Rapports de recouvrement
- Historique des transactions
- Filtrage par statut (Payé, Partiel, Impayé)
- Export de données financières

#### Données:
- Frais de scolarité (ID, filière, montant, période, année)
- Paiement (ID, étudiant, montant, date, mode, référence, enseignant qui enregistre)
- Dossier financier (étudiant, total frais, total payé, reste dû, statut)
- Mode de paiement: Espèces, Chèque, Virement bancaire, Mobile Money

#### Statuts:
- **Payé**: Montant payé = Montant dû (100%)
- **Partiel**: 0% < Montant payé < 100%
- **Impayé**: Montant payé = 0%

#### Calculs:
- Reste à payer = Frais totaux - Montant payé
- Taux recouvrement = (Total payé / Total frais) × 100%
- Montant dû par filière/classe

---

### 3.6 COMMUNICATION

#### Fonctionnalités:
- Notifications/Annonces globales
- Messagerie interne
- Envoi d'emails ciblés (si autorisé)
- Envoi de SMS (si autorisé)
- Distribution par destinataire (classe, filière, niveau, rôle)
- Historique des communications
- Statut de lecture

#### Destinataires:
- Tous les étudiants d'une classe
- Tous les étudiants d'une filière
- Tous les enseignants
- Parents/Responsables
- Administrateurs

#### Types de notifications:
- Annonces générales
- Résultats d'examen
- Devoirs à faire
- Rappels de paiement
- Avis de présence parentale

---

### 3.7 RAPPORTS ET STATISTIQUES

#### Rapports disponibles par rôle:

**Pour Admin:**
- Rapport global de performance par filière
- Rapport financier complet
- Rapport d'assiduité global
- Rapport d'effectifs
- Rapport de gestion utilisateurs

**Pour Responsable Pédagogique:**
- Rapport de performances par filière/niveau
- Rapport d'assiduité par classe/filière
- Rapport des parcours académiques
- Analyse comparatives inter-filières
- Rapport de validation des bulletins

**Pour Enseignant:**
- Rapport de classe (moyennes, assiduité)
- Rapport individual par étudiant
- Rapport par matière
- Rapport mensuel

**Pour Étudiant:**
- Relevé de notes
- Bulletin scolaire
- Certificat de présence

#### Exports:
- PDF, Excel, CSV
- Par période (mois, trimestre, année)
- Par filière, classe, niveau

---

## 4. FONCTIONNALITÉS TRANSVERSALES

### 4.1 AUTHENTIFICATION ET SÉCURITÉ
- Login/Logout
- Réinitialisation de mot de passe
- Contrôle d'accès par rôle
- Historique des connexions
- Session timeout

### 4.2 TABLEAU DE BORD
- Vue d'ensemble personnalisée par rôle
- Widgets avec statistiques clés
- Alertes et notifications
- Tâches à accomplir
- Activités récentes

### 4.3 INTERFACE UTILISATEUR
- Responsive design (mobile, tablette, desktop)
- Navigation intuitive par menu latéral
- Palette de couleurs unifiée
- Icons cohérentes
- Accessibilité

### 4.4 NOTIFICATIONS
- Notifications en temps réel
- Notifications par email
- Notifications dans le système
- Centre de notifications avec historique

### 4.5 RECHERCHE ET FILTRAGE
- Recherche rapide
- Filtres avancés
- Tri par colonne
- Pagination

---

## 5. DONNÉES CLÉS DU SYSTÈME

### 5.1 Utilisateurs
```
- ID
- Email
- Mot de passe (hashé)
- Prénom
- Nom
- Rôle
- Status (Actif/Inactif)
- Date création
- Dernière connexion
```

### 5.2 Étudiants
```
- ID (Matricule unique)
- Prénom
- Nom
- Date de naissance
- Sexe
- Adresse
- Téléphone
- Email
- Classe actuelle
- Filière
- Niveau
- Status
- Date inscription
- Photo
```

### 5.3 Enseignants
```
- ID
- Prénom
- Nom
- Spécialité/Matière
- Classes assignées
- Email
- Téléphone
- Status
```

### 5.4 Classes
```
- ID
- Nom (ex: 2nde C)
- Niveau
- Filière
- Capacité
- Enseignant principal
- Année académique
- Effectif
```

### 5.5 Notes
```
- ID
- Étudiant
- Matière
- Type (Contrôle, Examen, Devoir)
- Valeur (sur 20)
- Coefficient
- Date
- Enseignant
- Trimestre
```

### 5.6 Paiements
```
- ID
- Étudiant
- Montant
- Date
- Mode (Espèces/Chèque/Virement/Mobile Money)
- Référence
- Enregistré par
- Status
```

---

## 6. RÈGLES DE GESTION

### 6.1 Académiques
- Une classe peut avoir plusieurs enseignants
- Un étudiant est assigné à UNE classe par période
- Les notes doivent être entre 0 et 20
- Les coefficients doivent être > 0
- Minimum 3 notes par matière et par trimestre
- Une moyenne = somme(notes × coefficients) / somme(coefficients)

### 6.2 Financières
- Les frais sont configurés par filière/niveau
- Un paiement peut être partiel
- Les dettes ne peuvent pas être négatives
- Chaque paiement généère une quittance
- Deux ans maximum pour recouvrer une dette

### 6.3 Absences
- Une absence doit être justifiée dans les 48h
- Maximum 25% d'absences autorisées par an
- Absences répétées = alerte administrative

### 6.4 Accès
- Chaque utilisateur accède uniquement à ses données
- Un enseignant voit ses classes uniquement
- Un étudiant voit ses données uniquement
- Les administrateurs voient tout

---

## 7. INTÉGRATIONS EXTERNES (OPTIONNELLES)

- **Email**: SMTP pour envoi d'emails
- **SMS**: API SMS pour notifications
- **Payment Gateway**: Pour paiements en ligne
- **Cloud Storage**: Sauvegarde documents
- **Analytics**: Dashboards analytiques

---

## 8. NORMES ET STANDARDS

- **Standard de date**: YYYY-MM-DD
- **Devise**: Ariary (Ar)
- **Langue**: Français
- **Timezone**: UTC+3 (Madagascar)
- **Année académique**: Septembre - Juin

---

## 9. PERFORMANCE ET CAPACITÉ

- Utilisateurs simultanés: 100+
- Étudiants: 1,000+
- Classes: 50+
- Enseignants: 50+
- Temps réponse: < 2s pour les pages
- Uptime: 99%

---

## 10. ÉVOLUTIONS FUTURES

- Portail parent avec consultation données enfant
- Application mobile native (iOS/Android)
- Intégration paiement en ligne
- E-learning intégré
- Système de chatbot IA
- Prédictions académiques (ML)
- Visioconférence intégrée

---

**Fin du cahier de charge - Version 1.0**
