from rest_framework import status
from rest_framework.test import APITestCase

from application.models import PresenceCours, User
from . import factories as f


class PresenceApiTests(APITestCase):
    def test_enseignant_can_take_appel_for_his_matiere(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()

        e1 = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        e2 = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=e1, classe=classe)
        f.make_inscription(etudiant=e2, classe=classe)

        self.client.force_authenticate(user=prof)
        response = self.client.post('/api/presences/appel/', {
            'matiere': matiere.id, 'date_cours': '2025-09-15', 'heure_debut': '08:00', 'heure_fin': '10:00',
            'entrees': [
                {'etudiant': e1.id, 'statut': 'P'},
                {'etudiant': e2.id, 'statut': 'A'},
            ],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(PresenceCours.objects.count(), 2)
        self.assertEqual(PresenceCours.objects.get(etudiant=e2).statut, 'A')

    def test_appel_is_idempotent_and_updates_existing_rows(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)

        self.client.force_authenticate(user=prof)
        payload = {
            'matiere': matiere.id, 'date_cours': '2025-09-15', 'heure_debut': '08:00', 'heure_fin': '10:00',
            'entrees': [{'etudiant': etudiant.id, 'statut': 'A'}],
        }
        self.client.post('/api/presences/appel/', payload, format='json')
        payload['entrees'][0]['statut'] = 'R'
        response = self.client.post('/api/presences/appel/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(PresenceCours.objects.count(), 1)
        self.assertEqual(PresenceCours.objects.first().statut, 'R')

    def test_enseignant_cannot_take_appel_for_matiere_not_his(self):
        etudiant = f.make_etudiant()
        matiere = f.make_matiere()  # sans enseignant assigné
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=etudiant.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/presences/appel/', {
            'matiere': matiere.id, 'date_cours': '2025-09-15', 'heure_debut': '08:00', 'heure_fin': '10:00',
            'entrees': [{'etudiant': etudiant.id, 'statut': 'A'}],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_etudiant_sees_only_his_own_presences(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        moi = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        moi.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=classe.annee_scolaire.ecole)
        moi.save()
        autre = f.make_etudiant(ecole=classe.annee_scolaire.ecole)

        PresenceCours.objects.create(etudiant=moi, matiere=matiere, date_cours='2025-09-15', heure_debut='08:00', heure_fin='10:00', statut='P')
        PresenceCours.objects.create(etudiant=autre, matiere=matiere, date_cours='2025-09-15', heure_debut='08:00', heure_fin='10:00', statut='A')

        self.client.force_authenticate(user=moi.utilisateur)
        response = self.client.get('/api/presences/')
        etudiants_vus = {p['etudiant'] for p in response.data}
        self.assertEqual(etudiants_vus, {moi.id})
