from rest_framework import status
from rest_framework.test import APITestCase

from application.models import EmploiDuTemps, User
from . import factories as f


class EmploiDuTempsApiTests(APITestCase):
    def test_admin_can_create_slot(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        admin = f.make_user(role=User.Role.ADMIN, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/emplois-du-temps/', {
            'classe': classe.id, 'matiere': matiere.id, 'jour': 'LUN',
            'heure_debut': '08:00', 'heure_fin': '10:00',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_enseignant_cannot_create_slot(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/emplois-du-temps/', {
            'classe': classe.id, 'matiere': matiere.id, 'jour': 'LUN',
            'heure_debut': '08:00', 'heure_fin': '10:00',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enseignant_only_sees_his_own_slots(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        autre_prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)

        EmploiDuTemps.objects.create(
            classe=classe, matiere=matiere, enseignant=prof, jour='LUN', heure_debut='08:00', heure_fin='10:00',
        )
        EmploiDuTemps.objects.create(
            classe=classe, matiere=matiere, enseignant=autre_prof, jour='MAR', heure_debut='08:00', heure_fin='10:00',
        )

        self.client.force_authenticate(user=prof)
        response = self.client.get('/api/emplois-du-temps/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['jour'], 'LUN')

    def test_etudiant_sees_his_classe_schedule(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=classe.annee_scolaire.ecole)
        etudiant.save()
        f.make_inscription(etudiant=etudiant, classe=classe)

        autre_classe = f.make_classe(annee_scolaire=f.make_annee_scolaire(ecole=classe.annee_scolaire.ecole, est_active=False))
        EmploiDuTemps.objects.create(classe=classe, matiere=matiere, jour='LUN', heure_debut='08:00', heure_fin='10:00')
        EmploiDuTemps.objects.create(classe=autre_classe, matiere=matiere, jour='MAR', heure_debut='08:00', heure_fin='10:00')

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get('/api/emplois-du-temps/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['classe'], classe.id)
