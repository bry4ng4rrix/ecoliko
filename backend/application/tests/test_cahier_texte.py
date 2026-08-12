from rest_framework import status
from rest_framework.test import APITestCase

from application.models import CahierTexte, EvenementCalendrier, Notification, User
from . import factories as f


class CahierTextePermissionTests(APITestCase):
    def test_enseignant_can_create_entry_for_his_own_matiere(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/cahier-textes/', {
            'classe': classe.id, 'matiere': matiere.id, 'date_seance': '2026-01-10',
            'contenu_seance': 'Chapitre 3 : les fonctions.', 'travail_a_faire': 'Exercices 1 à 5.',
            'date_echeance_travail': '2026-01-17',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['enseignant'], prof.id)

    def test_enseignant_cannot_create_entry_for_matiere_not_his(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)  # sans enseignant
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/cahier-textes/', {
            'classe': classe.id, 'matiere': matiere.id, 'date_seance': '2026-01-10',
            'contenu_seance': 'Contenu.',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_etudiant_sees_only_his_classe_entries(self):
        classe = f.make_classe()
        autre_classe = f.make_classe(annee_scolaire=classe.annee_scolaire)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        autre_matiere = f.make_matiere(filiere=autre_classe.filiere, niveau=autre_classe.niveau)

        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        f.make_inscription(etudiant=etudiant, classe=classe)

        from application.models import CahierTexte
        entree_sienne = CahierTexte.objects.create(
            classe=classe, matiere=matiere, date_seance='2026-01-10', contenu_seance='Vu en cours.',
        )
        CahierTexte.objects.create(
            classe=autre_classe, matiere=autre_matiere, date_seance='2026-01-10', contenu_seance='Autre classe.',
        )

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get('/api/cahier-textes/')
        ids = {row['id'] for row in response.data}
        self.assertEqual(ids, {entree_sienne.id})

    def test_creating_devoir_notifies_students_and_parents(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()

        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        f.make_inscription(etudiant=etudiant, classe=classe)

        self.client.force_authenticate(user=prof)
        response = self.client.post('/api/cahier-textes/', {
            'classe': classe.id, 'matiere': matiere.id, 'date_seance': '2026-01-10',
            'contenu_seance': 'Chapitre 3.', 'travail_a_faire': 'Exercices 1 à 5.',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        notif = Notification.objects.get(destinataire=etudiant.utilisateur, type_notification=Notification.Type.DEVOIR)
        self.assertIn('Exercices', notif.message)

    def test_contenu_seance_est_optionnel_pour_devoir_hors_seance(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/cahier-textes/', {
            'classe': classe.id, 'matiere': matiere.id,
            'travail_a_faire': 'Réviser le chapitre 2.', 'date_echeance_travail': '2026-02-01',
            'heure_echeance_travail': '18:00',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['heure_echeance_travail'], '18:00:00')


class DevoirCalendrierSyncTests(APITestCase):
    def test_creating_devoir_avec_echeance_synchronise_evenement_calendrier(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/cahier-textes/', {
            'classe': classe.id, 'matiere': matiere.id, 'date_seance': '2026-01-10',
            'travail_a_faire': 'Exercices 1 à 5.', 'date_echeance_travail': '2026-01-17',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        evenement = EvenementCalendrier.objects.get(cahier_texte_id=response.data['id'])
        self.assertEqual(evenement.classe_id, classe.id)
        self.assertEqual(evenement.type_evenement, EvenementCalendrier.TypeEvenement.DEVOIR)
        self.assertEqual(str(evenement.date_debut), '2026-01-17')
        self.assertEqual(evenement.ecole_id, classe.annee_scolaire.ecole_id)

    def test_clearing_travail_a_faire_removes_evenement_calendrier(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/cahier-textes/', {
            'classe': classe.id, 'matiere': matiere.id, 'date_seance': '2026-01-10',
            'travail_a_faire': 'Exercices.', 'date_echeance_travail': '2026-01-17',
        })
        cahier_id = response.data['id']
        self.assertTrue(EvenementCalendrier.objects.filter(cahier_texte_id=cahier_id).exists())

        self.client.patch(f'/api/cahier-textes/{cahier_id}/', {'travail_a_faire': ''}, format='json')
        self.assertFalse(EvenementCalendrier.objects.filter(cahier_texte_id=cahier_id).exists())

    def test_etudiant_ne_voit_pas_evenement_devoir_dune_autre_classe(self):
        classe = f.make_classe()
        autre_classe = f.make_classe(annee_scolaire=classe.annee_scolaire)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        autre_matiere = f.make_matiere(filiere=autre_classe.filiere, niveau=autre_classe.niveau)

        CahierTexte.objects.create(
            classe=classe, matiere=matiere, date_seance='2026-01-10',
            travail_a_faire='Pour ma classe.', date_echeance_travail='2026-01-17',
        )
        CahierTexte.objects.create(
            classe=autre_classe, matiere=autre_matiere, date_seance='2026-01-10',
            travail_a_faire='Pour une autre classe.', date_echeance_travail='2026-01-18',
        )

        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        f.make_inscription(etudiant=etudiant, classe=classe)

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get('/api/evenements-calendrier/')
        classes_vues = {row['classe'] for row in response.data}
        self.assertIn(classe.id, classes_vues)
        self.assertNotIn(autre_classe.id, classes_vues)
