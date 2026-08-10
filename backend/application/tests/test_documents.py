from rest_framework import status
from rest_framework.test import APITestCase

from application.models import DemandeDocument, User
from . import factories as f


class DemandeDocumentApiTests(APITestCase):
    def test_etudiant_can_request_document_for_himself(self):
        annee = f.make_annee_scolaire()
        etudiant = f.make_etudiant(ecole=annee.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=annee.ecole)
        etudiant.save()

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.post('/api/demandes-documents/', {
            'etudiant': etudiant.id, 'annee_scolaire': annee.id, 'type_document': 'CERTIFICAT_SCOLARITE',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['statut'], 'EN_ATTENTE')

    def test_etudiant_cannot_request_document_for_another_student(self):
        annee = f.make_annee_scolaire()
        etudiant = f.make_etudiant(ecole=annee.ecole)
        moi_user = f.make_user(role=User.Role.ETUDIANT, ecole=annee.ecole)

        self.client.force_authenticate(user=moi_user)
        response = self.client.post('/api/demandes-documents/', {
            'etudiant': etudiant.id, 'annee_scolaire': annee.id, 'type_document': 'CERTIFICAT_SCOLARITE',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pdf_unavailable_before_validation(self):
        annee = f.make_annee_scolaire()
        etudiant = f.make_etudiant(ecole=annee.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=annee.ecole)
        etudiant.save()
        demande = DemandeDocument.objects.create(
            etudiant=etudiant, annee_scolaire=annee, type_document='ATTESTATION',
        )

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get(f'/api/demandes-documents/{demande.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_validates_then_pdf_becomes_available(self):
        annee = f.make_annee_scolaire()
        etudiant = f.make_etudiant(ecole=annee.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=annee.ecole)
        etudiant.save()
        demande = DemandeDocument.objects.create(
            etudiant=etudiant, annee_scolaire=annee, type_document='CERTIFICAT_SCOLARITE',
        )
        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)

        self.client.force_authenticate(user=admin)
        response = self.client.post(f'/api/demandes-documents/{demande.id}/valider/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get(f'/api/demandes-documents/{demande.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_enseignant_cannot_validate(self):
        annee = f.make_annee_scolaire()
        etudiant = f.make_etudiant(ecole=annee.ecole)
        demande = DemandeDocument.objects.create(
            etudiant=etudiant, annee_scolaire=annee, type_document='ATTESTATION',
        )
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=annee.ecole)

        self.client.force_authenticate(user=prof)
        response = self.client.post(f'/api/demandes-documents/{demande.id}/valider/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_refuser_sets_motif_and_statut(self):
        annee = f.make_annee_scolaire()
        etudiant = f.make_etudiant(ecole=annee.ecole)
        demande = DemandeDocument.objects.create(
            etudiant=etudiant, annee_scolaire=annee, type_document='ATTESTATION',
        )
        secretaire = f.make_user(role=User.Role.SECRETARIAT, ecole=annee.ecole)

        self.client.force_authenticate(user=secretaire)
        response = self.client.post(f'/api/demandes-documents/{demande.id}/refuser/', {'motif': 'Dossier incomplet'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, 'REFUSE')
        self.assertEqual(demande.motif_refus, 'Dossier incomplet')
