from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from application.models import AuditLog, DemandeDocument, Note, PaiementEcolage, User
from application.services.documents import valider_demande
from . import factories as f


class NoteAuditTests(APITestCase):
    def test_creating_note_writes_audit_entry(self):
        etudiant = f.make_etudiant()
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=etudiant.ecole))
        trimestre = f.make_trimestre()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=etudiant.ecole)

        note = Note.objects.create(
            etudiant=etudiant, matiere=matiere, trimestre=trimestre,
            valeur=15, type_evaluation='CC1', saisie_par=prof,
        )

        entry = AuditLog.objects.get(modele='Note', objet_id=note.id)
        self.assertEqual(entry.action, AuditLog.Action.CREATION)
        self.assertEqual(entry.utilisateur, prof)
        self.assertEqual(entry.ecole, etudiant.ecole)

    def test_deleting_note_writes_audit_entry(self):
        etudiant = f.make_etudiant()
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=etudiant.ecole))
        trimestre = f.make_trimestre()
        note = Note.objects.create(
            etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=10, type_evaluation='CC1',
        )
        note_id = note.id
        note.delete()

        entry = AuditLog.objects.get(modele='Note', objet_id=note_id, action=AuditLog.Action.SUPPRESSION)
        self.assertIsNotNone(entry)


class PaiementAuditTests(APITestCase):
    def test_creating_paiement_writes_audit_entry(self):
        etudiant = f.make_etudiant()
        annee = f.make_annee_scolaire(ecole=etudiant.ecole)
        secretaire = f.make_user(role=User.Role.SECRETARIAT, ecole=etudiant.ecole)

        paiement = PaiementEcolage.objects.create(
            etudiant=etudiant, annee_scolaire=annee, montant=Decimal('50000'),
            date_echeance='2026-01-01', mois_couvert=1, cree_par=secretaire,
        )

        entry = AuditLog.objects.get(modele='PaiementEcolage', objet_id=paiement.id)
        self.assertEqual(entry.action, AuditLog.Action.CREATION)
        self.assertEqual(entry.utilisateur, secretaire)


class DemandeDocumentAuditTests(APITestCase):
    def test_creation_and_validation_write_two_audit_entries(self):
        etudiant = f.make_etudiant()
        annee = f.make_annee_scolaire(ecole=etudiant.ecole)
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)

        demande = DemandeDocument.objects.create(
            etudiant=etudiant, annee_scolaire=annee,
            type_document=DemandeDocument.TypeDocument.CERTIFICAT_SCOLARITE, demande_par=admin,
        )
        valider_demande(demande, traite_par=admin)

        entries = AuditLog.objects.filter(modele='DemandeDocument', objet_id=demande.id).order_by('date_action')
        self.assertEqual(list(entries.values_list('action', flat=True)), [
            AuditLog.Action.CREATION, AuditLog.Action.MODIFICATION,
        ])


class AuditLogViewSetTests(APITestCase):
    def test_only_admin_can_list_audit_logs(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_only_sees_own_ecole_logs(self):
        ecole_a = f.make_ecole()
        ecole_b = f.make_ecole()
        etudiant_a = f.make_etudiant(ecole=ecole_a)
        etudiant_b = f.make_etudiant(ecole=ecole_b)
        matiere_a = f.make_matiere(niveau=f.make_niveau(ecole=ecole_a))
        matiere_b = f.make_matiere(niveau=f.make_niveau(ecole=ecole_b))
        trimestre_a = f.make_trimestre(annee_scolaire=f.make_annee_scolaire(ecole=ecole_a))
        trimestre_b = f.make_trimestre(annee_scolaire=f.make_annee_scolaire(ecole=ecole_b))
        Note.objects.create(etudiant=etudiant_a, matiere=matiere_a, trimestre=trimestre_a, valeur=10, type_evaluation='CC1')
        Note.objects.create(etudiant=etudiant_b, matiere=matiere_b, trimestre=trimestre_b, valeur=10, type_evaluation='CC1')

        admin_a = f.make_user(role=User.Role.ADMIN, ecole=ecole_a)
        self.client.force_authenticate(user=admin_a)

        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ecoles_vues = {AuditLog.objects.get(pk=row['id']).ecole_id for row in response.data}
        self.assertEqual(ecoles_vues, {ecole_a.id})
