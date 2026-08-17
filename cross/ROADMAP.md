# SIG-Lycée — Application Flutter cross-platform

Portage progressif du frontend web React (`../frontend`) vers Flutter, pour une
application mobile/desktop cross-platform consommant la même API Django (`../backend`).

## État actuel (première passe)

### Fondations (terminées)
- **Auth JWT** avec rafraîchissement automatique (`lib/core/api/api_client.dart`), stockage
  sécurisé (`flutter_secure_storage`), connexion par **email ou matricule** (miroir de
  `CustomTokenObtainPairSerializer`).
- **Routing** par rôle avec garde d'accès (`lib/core/router/app_router.dart`, via `go_router`)
  — miroir de `ProtectedRoute.jsx` / `ROLE_HOME`.
- **État applicatif** avec Riverpod (`FutureProvider` par ressource — équivalent de
  `useResourceList`/TanStack Query côté web).
- **Thème** Material 3 aligné sur la charte indigo du web (`lib/core/theme/app_theme.dart`).
- **Coquille de navigation** réutilisable par rôle (`lib/core/widgets/role_shell.dart`) —
  drawer avec la même liste de sections que chaque `*Dashboard.jsx`, avatar/déconnexion
  toujours accessibles.
- **Client REST générique** (`lib/core/api/resource_service.dart`) miroir de
  `createResourceService()`.

### Élève (`lib/features/student/`) — le plus complet
- Tableau de bord (classe, trimestre actif, notes récentes)
- Mon Profil
- Emploi du Temps (agenda par jour)
- Devoirs (liste + statut d'échéance)
- Notes & Résultats (par trimestre + **moyenne générale annuelle**, même calcul que
  `services/moyenne.py` — arrondi trimestre par trimestre avant la moyenne finale)
- Présence (compteurs + historique + soumission de justificatif)
- *À porter* : Gestion Administrative, Communications, Mes Documents

### Enseignant (`lib/features/teacher/`)
- Tableau de bord (classes + effectifs)
- Emploi du Temps
- Notes & Évaluations (sélection matière/trimestre, saisie d'une note par élève)
- Devoirs (création + liste + suppression — **sans** pièce jointe/photo/scan OCR/chat)
- *À porter* : Cahier de textes (distinct des devoirs), Présence & Absences (pointage),
  Communication (chat de classe + ouverture/fermeture), Historique Étudiants, Rapports,
  Paramètres (photo de profil)

### Parent (`lib/features/parent/`)
- Accueil (moyenne par enfant)
- Mes Enfants
- Bulletins (téléchargement + ouverture du PDF)
- Absences
- *À porter* : Cahier de textes, Paiements (dossier financier), Communication

### Admin (`lib/features/admin/`)
- Tableau de bord (cartes de synthèse + distribution par classe — **sans** les graphiques
  Area/Radar du web, voir ci-dessous)
- Gestion Étudiants (liste + recherche, **sans** création/modification)
- Notes & Évaluations (classement par trimestre **et** bilan annuel passage/redoublement,
  réutilise `GET /classes/<id>/classement-annuel/`)
- *À porter* : Demandes d'inscription, Gestion des Profs, Gestion Académique, Emploi du
  Temps, Présence & Absences, Gestion Administrative (paiements/documents/utilisateurs),
  Communication, Rapports & Stats

Les rôles RESPONSABLE et SECRETARIAT (dashboards web séparés) ne sont **pas** couverts —
décision explicite pour cette première passe, ces utilisateurs restent sur le web.

## Vérifié en conditions réelles

Testé en direct (Chrome headless) contre le backend Django local :
- Connexion admin (`contact@label.com`) → tableau de bord avec données réelles (22 élèves,
  14 enseignants, 7 classes)
- Connexion élève par **matricule** (`2026-LBL-0010`) → notes réelles affichées, valeurs
  identiques à celles saisies précédemment côté web
- Navigation par drawer, sélection de classe, bascule "Par trimestre" / "Bilan annuel"
- Aucune erreur console/page pendant ces parcours

`flutter analyze` : 0 erreur (seulement des suggestions de style mineures).
`flutter build web` : succès.

## Connu, à corriger

- **Glyphe manquant** : le caractère « ᵉ » (ordinal, ex. "6ᵉ") s'affiche en tofu box sur le
  build web — la police Roboto par défaut ne l'inclut pas dans le subset tree-shaké.
  Solution : embarquer une police avec ce glyphe, ou l'éviter dans les libellés de classe.
- Les graphiques du tableau de bord admin (Area Chart taux par trimestre, Radar Chart
  distribution par classe) n'ont pas d'équivalent Flutter pour l'instant — `fl_chart` ou
  `syncfusion_flutter_charts` seraient les candidats naturels.
- Le scan OCR, la capture photo et le chat de classe (devoirs enseignant) ne sont pas
  portés — ce sont les fonctionnalités les plus coûteuses à reproduire (tesseract.js n'a
  pas d'équivalent direct ; `google_mlkit_text_recognition` serait le candidat Flutter).

## Config réseau

`lib/core/api/api_client.dart` choisit l'URL de base automatiquement :
- Web / iOS / desktop : `http://127.0.0.1:8000/api`
- Émulateur Android : `http://10.0.2.2:8000/api` (routage spécial vers l'hôte)
- Appareil physique : lancer avec `--dart-define=API_BASE_URL=http://<ip-lan>:8000/api`

## Lancer l'app

```bash
cd cross
flutter pub get
flutter run                 # choisit un device connecté
flutter run -d chrome        # web
flutter build web            # build de prod
```

Le backend Django (`../backend`) doit tourner sur le port 8000, avec `CORS_ALLOW_ALL_ORIGINS`
déjà activé en dev (`backend/settings.py`).

## Prochaines étapes suggérées (par ordre d'impact)

1. Compléter le rôle Enseignant (chat de classe, présence, cahier de textes) — c'est le
   rôle le plus utilisé au quotidien après Élève/Parent.
2. Ajouter les graphiques du tableau de bord Admin.
3. CRUD complet Admin (création/édition étudiants, enseignants, classes).
4. Notifications push (le backend a déjà un modèle `Notification` — manque juste le
   transport push mobile, ex. Firebase Cloud Messaging).
5. Mode hors-ligne / cache local pour l'emploi du temps et les notes (déjà consulté très
   régulièrement, données qui changent peu).
