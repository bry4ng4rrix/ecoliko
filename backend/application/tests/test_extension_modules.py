from rest_framework import status
from rest_framework.test import APITestCase

from application.models import (
    EmploiDuTemps, EvenementCalendrier, EvenementDisciplinaire, Notification, PresenceCours, User,
)
from . import factories as f


class DisciplineTests(APITestCase):
    def test_staff_can_create_and_it_notifies_student_and_parent(self):
        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        parent = f.make_user(role=User.Role.PARENT, ecole=etudiant.ecole)
        from application.models import TuteurEtudiant
        TuteurEtudiant.objects.create(parent=parent, etudiant=etudiant, relation='PERE')
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/discipline/', {
            'etudiant': etudiant.id, 'type_evenement': 'AVERTISSEMENT', 'gravite': 'MODEREE',
            'description': 'Bavardage répété en classe.', 'date_evenement': '2026-01-10',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        self.assertTrue(Notification.objects.filter(destinataire=etudiant.utilisateur, type_notification='DISCIPLINE').exists())
        self.assertTrue(Notification.objects.filter(destinataire=parent, type_notification='DISCIPLINE').exists())

    def test_etudiant_cannot_create_discipline_entry(self):
        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        self.client.force_authenticate(user=etudiant.utilisateur)

        response = self.client.post('/api/discipline/', {
            'etudiant': etudiant.id, 'type_evenement': 'OBSERVATION', 'description': 'x', 'date_evenement': '2026-01-10',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_etudiant_only_sees_his_own_entries(self):
        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        autre = f.make_etudiant(ecole=etudiant.ecole)
        EvenementDisciplinaire.objects.create(
            etudiant=etudiant, type_evenement='OBSERVATION', description='sien', date_evenement='2026-01-01',
        )
        EvenementDisciplinaire.objects.create(
            etudiant=autre, type_evenement='OBSERVATION', description='autre', date_evenement='2026-01-01',
        )

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get('/api/discipline/')
        self.assertEqual(len(response.data), 1)


class AbsenceNotificationTests(APITestCase):
    def test_absence_creation_notifies_student_and_parent(self):
        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=etudiant.ecole))

        PresenceCours.objects.create(
            etudiant=etudiant, matiere=matiere, date_cours='2026-01-10',
            heure_debut='08:00', heure_fin='09:00', statut=PresenceCours.StatutPresence.ABSENT,
        )

        self.assertTrue(Notification.objects.filter(destinataire=etudiant.utilisateur, type_notification='ABSENCE').exists())

    def test_present_does_not_notify(self):
        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=etudiant.ecole))

        PresenceCours.objects.create(
            etudiant=etudiant, matiere=matiere, date_cours='2026-01-10',
            heure_debut='08:00', heure_fin='09:00', statut=PresenceCours.StatutPresence.PRESENT,
        )
        self.assertFalse(Notification.objects.filter(destinataire=etudiant.utilisateur, type_notification='ABSENCE').exists())


class JustificationWorkflowTests(APITestCase):
    def test_student_submits_justification_then_staff_validates(self):
        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=etudiant.ecole))
        presence = PresenceCours.objects.create(
            etudiant=etudiant, matiere=matiere, date_cours='2026-01-10',
            heure_debut='08:00', heure_fin='09:00', statut=PresenceCours.StatutPresence.ABSENT,
        )

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.post(f'/api/presences/{presence.id}/justifier/', {'justificatif': 'Rendez-vous médical.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['justification_statut'], 'EN_ATTENTE')

        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)
        response = self.client.post(f'/api/presences/{presence.id}/valider-justification/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['justification_statut'], 'ACCEPTEE')
        self.assertEqual(response.data['statut'], 'E')

    def test_student_cannot_validate_own_justification(self):
        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=etudiant.ecole))
        presence = PresenceCours.objects.create(
            etudiant=etudiant, matiere=matiere, date_cours='2026-01-10',
            heure_debut='08:00', heure_fin='09:00', statut=PresenceCours.StatutPresence.ABSENT,
        )
        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.post(f'/api/presences/{presence.id}/valider-justification/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class EtudiantIdentiteTests(APITestCase):
    def test_qrcode_endpoint_returns_png(self):
        etudiant = f.make_etudiant()
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)
        response = self.client.get(f'/api/etudiants/{etudiant.id}/qrcode/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')

    def test_codebarre_endpoint_returns_png(self):
        etudiant = f.make_etudiant()
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)
        response = self.client.get(f'/api/etudiants/{etudiant.id}/codebarre/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')


class DossierEnseignantTests(APITestCase):
    def test_admin_can_create_dossier(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/dossiers-enseignants/', {
            'enseignant': prof.id, 'type_contrat': 'CDI', 'date_embauche': '2024-09-01',
            'diplomes': 'Master FLE', 'salaire': '850000', 'volume_horaire_hebdo': '18',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_teacher_sees_only_his_own_dossier(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        autre_prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        from application.models import DossierEnseignant
        DossierEnseignant.objects.create(enseignant=prof, type_contrat='CDI')
        DossierEnseignant.objects.create(enseignant=autre_prof, type_contrat='CDD')

        self.client.force_authenticate(user=prof)
        response = self.client.get('/api/dossiers-enseignants/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['enseignant'], prof.id)

    def test_teacher_cannot_write_dossier(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        self.client.force_authenticate(user=prof)
        response = self.client.post('/api/dossiers-enseignants/', {'enseignant': prof.id, 'type_contrat': 'CDI'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class EmploiDuTempsConflictTests(APITestCase):
    def test_same_teacher_overlapping_slot_rejected(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        admin = f.make_user(role=User.Role.ADMIN, ecole=classe.annee_scolaire.ecole)
        EmploiDuTemps.objects.create(
            classe=classe, matiere=matiere, enseignant=prof, jour='LUN',
            heure_debut='08:00', heure_fin='10:00',
        )
        autre_classe = f.make_classe(annee_scolaire=classe.annee_scolaire)
        autre_matiere = f.make_matiere(filiere=autre_classe.filiere, niveau=autre_classe.niveau, enseignant=prof)

        self.client.force_authenticate(user=admin)
        response = self.client.post('/api/emplois-du-temps/', {
            'classe': autre_classe.id, 'matiere': autre_matiere.id, 'enseignant': prof.id,
            'jour': 'LUN', 'heure_debut': '09:00', 'heure_fin': '11:00',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_overlapping_slot_for_same_teacher_accepted(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        admin = f.make_user(role=User.Role.ADMIN, ecole=classe.annee_scolaire.ecole)
        EmploiDuTemps.objects.create(
            classe=classe, matiere=matiere, enseignant=prof, jour='LUN',
            heure_debut='08:00', heure_fin='10:00',
        )

        self.client.force_authenticate(user=admin)
        response = self.client.post('/api/emplois-du-temps/', {
            'classe': classe.id, 'matiere': matiere.id, 'enseignant': prof.id,
            'jour': 'LUN', 'heure_debut': '10:00', 'heure_fin': '11:00',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_split_groups_can_overlap_same_classe(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        admin = f.make_user(role=User.Role.ADMIN, ecole=classe.annee_scolaire.ecole)
        EmploiDuTemps.objects.create(
            classe=classe, matiere=matiere, jour='LUN', heure_debut='08:00', heure_fin='10:00', groupe='Groupe A',
        )

        self.client.force_authenticate(user=admin)
        response = self.client.post('/api/emplois-du-temps/', {
            'classe': classe.id, 'matiere': matiere.id, 'jour': 'LUN',
            'heure_debut': '08:00', 'heure_fin': '10:00', 'groupe': 'Groupe B',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class EvenementCalendrierTests(APITestCase):
    def test_admin_can_create_and_all_staff_can_read(self):
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.force_authenticate(user=admin)
        response = self.client.post('/api/evenements-calendrier/', {
            'titre': 'Vacances de Noël', 'type_evenement': 'VACANCES',
            'date_debut': '2026-12-20', 'date_fin': '2027-01-05',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        self.client.force_authenticate(user=prof)
        response = self.client.get('/api/evenements-calendrier/')
        self.assertEqual(len(response.data), 1)

    def test_teacher_cannot_create(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        self.client.force_authenticate(user=prof)
        response = self.client.post('/api/evenements-calendrier/', {
            'titre': 'Réunion', 'type_evenement': 'REUNION', 'date_debut': '2026-02-01', 'date_fin': '2026-02-01',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DocumentJustificatifEtudiantTests(APITestCase):
    def test_admin_can_upload_document(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        etudiant = f.make_etudiant()
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)

        fichier = SimpleUploadedFile('acte.pdf', b'%PDF-1.4 contenu factice', content_type='application/pdf')
        response = self.client.post('/api/documents-etudiants/', {
            'etudiant': etudiant.id, 'type_document': 'ACTE_NAISSANCE', 'fichier': fichier,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_student_cannot_upload_document(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        self.client.force_authenticate(user=etudiant.utilisateur)

        fichier = SimpleUploadedFile('acte.pdf', b'%PDF-1.4', content_type='application/pdf')
        response = self.client.post('/api/documents-etudiants/', {
            'etudiant': etudiant.id, 'type_document': 'ACTE_NAISSANCE', 'fichier': fichier,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_can_view_his_own_documents(self):
        from application.models import DocumentJustificatifEtudiant
        from django.core.files.base import ContentFile

        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        DocumentJustificatifEtudiant.objects.create(
            etudiant=etudiant, type_document='ACTE_NAISSANCE', fichier=ContentFile(b'data', name='acte.pdf'),
        )

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get('/api/documents-etudiants/')
        self.assertEqual(len(response.data), 1)


class ClasseSectionAndMatiereCouleurTests(APITestCase):
    def test_classe_serializer_exposes_section(self):
        classe = f.make_classe(section='Bilingue')
        admin = f.make_user(role=User.Role.ADMIN, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=admin)
        response = self.client.get(f'/api/classes/{classe.id}/')
        self.assertEqual(response.data['section'], 'Bilingue')

    def test_matiere_serializer_exposes_couleur_default(self):
        matiere = f.make_matiere()
        admin = f.make_user(role=User.Role.ADMIN, ecole=matiere.niveau.ecole)
        self.client.force_authenticate(user=admin)
        response = self.client.get(f'/api/matieres/{matiere.id}/')
        self.assertEqual(response.data['couleur'], '#6366f1')
