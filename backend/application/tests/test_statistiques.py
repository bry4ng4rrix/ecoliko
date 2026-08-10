from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from application.models import Note, PresenceCours, User
from application.services import statistiques as stats_service
from . import factories as f


class StatistiquesServiceTests(APITestCase):
    def _classe_avec_notes(self, moyennes):
        """Crée une classe avec un étudiant par moyenne cible (une seule matière/note)."""
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau, coefficient=1)
        trimestre = f.make_trimestre(annee_scolaire=classe.annee_scolaire)
        for valeur in moyennes:
            etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
            f.make_inscription(etudiant=etudiant, classe=classe)
            Note.objects.create(
                etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=valeur, type_evaluation='CC1',
            )
        return classe, trimestre

    def test_effectifs_par_classe(self):
        classe, _ = self._classe_avec_notes([12, 8])
        resultat = stats_service.effectifs_par_classe(classe.annee_scolaire)
        self.assertEqual(resultat, [{'classe_id': classe.id, 'classe_nom': classe.nom, 'effectif': 2}])

    def test_moyennes_par_classe(self):
        classe, trimestre = self._classe_avec_notes([12, 8])
        resultat = stats_service.moyennes_par_classe(classe.annee_scolaire, trimestre)
        self.assertEqual(resultat[0]['moyenne'], Decimal('10.00'))
        self.assertEqual(resultat[0]['nb_notes'], 2)

    def test_taux_reussite(self):
        classe, trimestre = self._classe_avec_notes([12, 8, 15])
        resultat = stats_service.taux_reussite(classe.annee_scolaire, trimestre)
        self.assertEqual(resultat['nb_evalues'], 3)
        self.assertAlmostEqual(resultat['taux_reussite'], 66.7, places=1)

    def test_taux_reussite_no_data_returns_none(self):
        classe = f.make_classe()
        resultat = stats_service.taux_reussite(classe.annee_scolaire)
        self.assertIsNone(resultat['taux_reussite'])
        self.assertEqual(resultat['nb_evalues'], 0)

    def test_taux_presence(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        PresenceCours.objects.create(
            etudiant=etudiant, matiere=matiere, date_cours='2026-01-05',
            heure_debut='08:00', heure_fin='09:00', statut=PresenceCours.StatutPresence.PRESENT,
        )
        PresenceCours.objects.create(
            etudiant=etudiant, matiere=matiere, date_cours='2026-01-06',
            heure_debut='08:00', heure_fin='09:00', statut=PresenceCours.StatutPresence.ABSENT,
        )
        resultat = stats_service.taux_presence(classe.annee_scolaire)
        self.assertEqual(resultat['total_seances'], 2)
        self.assertEqual(resultat['taux_presence'], 50.0)


class StatistiquesViewTests(APITestCase):
    def test_requires_admin_or_responsable(self):
        etudiant = f.make_etudiant()
        annee = f.make_annee_scolaire(ecole=etudiant.ecole)
        eleve = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        self.client.force_authenticate(user=eleve)

        response = self.client.get(f'/api/statistiques/?annee_scolaire={annee.id}')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_gets_synthese(self):
        annee = f.make_annee_scolaire()
        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.get(f'/api/statistiques/?annee_scolaire={annee.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('effectifs_par_classe', response.data)
        self.assertIn('moyennes_par_classe', response.data)
        self.assertIn('taux_reussite', response.data)
        self.assertIn('taux_presence', response.data)

    def test_rejects_annee_scolaire_of_another_ecole(self):
        autre_annee = f.make_annee_scolaire()
        admin = f.make_user(role=User.Role.ADMIN, ecole=f.make_ecole())
        self.client.force_authenticate(user=admin)

        response = self.client.get(f'/api/statistiques/?annee_scolaire={autre_annee.id}')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
