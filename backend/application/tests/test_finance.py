from datetime import date
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from application.models import FraisScolarite, PaiementEcolage, User
from application.services.finance import dossier_financier
from . import factories as f


class DossierFinancierServiceTests(APITestCase):
    def test_no_tarif_configured_returns_zero_du(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)

        resultat = dossier_financier(etudiant, classe.annee_scolaire)

        self.assertEqual(resultat['total_du'], Decimal('0'))
        self.assertEqual(resultat['statut'], 'NON_CONFIGURE')

    def test_impaye_when_nothing_paid(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        FraisScolarite.objects.create(
            annee_scolaire=classe.annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
            montant_inscription=Decimal('50000'), montant_annuel=Decimal('500000'),
        )

        resultat = dossier_financier(etudiant, classe.annee_scolaire)

        self.assertEqual(resultat['total_du'], Decimal('550000'))
        self.assertEqual(resultat['reste_du'], Decimal('550000'))
        self.assertEqual(resultat['statut'], 'IMPAYE')

    def test_partiel_then_paye(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        FraisScolarite.objects.create(
            annee_scolaire=classe.annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
            montant_inscription=Decimal('0'), montant_annuel=Decimal('500000'),
        )
        PaiementEcolage.objects.create(
            etudiant=etudiant, annee_scolaire=classe.annee_scolaire, montant=Decimal('200000'),
            date_echeance='2025-10-01', mois_couvert=10, statut=PaiementEcolage.StatutPaiement.PAYE,
        )

        resultat = dossier_financier(etudiant, classe.annee_scolaire)
        self.assertEqual(resultat['statut'], 'PARTIEL')
        self.assertEqual(resultat['reste_du'], Decimal('300000'))

        PaiementEcolage.objects.create(
            etudiant=etudiant, annee_scolaire=classe.annee_scolaire, montant=Decimal('300000'),
            date_echeance='2025-11-01', mois_couvert=11, statut=PaiementEcolage.StatutPaiement.PAYE,
        )
        resultat = dossier_financier(etudiant, classe.annee_scolaire)
        self.assertEqual(resultat['statut'], 'PAYE')
        self.assertEqual(resultat['reste_du'], Decimal('0'))

    def test_classe_frais_ecolage_takes_priority_over_frais_scolarite(self):
        """Si l'écolage est renseigné directement sur la classe, il prime sur le tarif niveau/filière."""
        classe = f.make_classe(frais_ecolage_mensuel=Decimal('100000'), frais_inscription=Decimal('20000'))
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        FraisScolarite.objects.create(
            annee_scolaire=classe.annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
            montant_inscription=Decimal('999999'), montant_annuel=Decimal('999999'),
        )

        resultat = dossier_financier(etudiant, classe.annee_scolaire)

        self.assertEqual(resultat['total_du'], Decimal('1220000'))  # 20000 + 100000*12
        self.assertEqual(resultat['statut'], 'IMPAYE')

    def test_nouvel_eleve_paie_frais_inscription_pas_reinscription(self):
        classe = f.make_classe(frais_ecolage_mensuel=Decimal('50000'), frais_inscription=Decimal('20000'),
                                frais_reinscription=Decimal('5000'))
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)  # première inscription, jamais inscrit avant

        resultat = dossier_financier(etudiant, classe.annee_scolaire)

        self.assertEqual(resultat['total_du'], Decimal('620000'))  # 20000 (inscription) + 50000*12

    def test_eleve_deja_inscrit_paie_frais_reinscription(self):
        ecole = f.make_ecole()
        annee_precedente = f.make_annee_scolaire(
            ecole=ecole, date_debut=date(2024, 9, 1), date_fin=date(2025, 6, 30), est_active=False,
        )
        classe_precedente = f.make_classe(annee_scolaire=annee_precedente)
        etudiant = f.make_etudiant(ecole=ecole)
        f.make_inscription(etudiant=etudiant, classe=classe_precedente, annee_scolaire=annee_precedente)

        annee_courante = f.make_annee_scolaire(ecole=ecole, date_debut=date(2025, 9, 1), date_fin=date(2026, 6, 30))
        classe_courante = f.make_classe(
            annee_scolaire=annee_courante, frais_ecolage_mensuel=Decimal('50000'),
            frais_inscription=Decimal('20000'), frais_reinscription=Decimal('5000'),
        )
        f.make_inscription(etudiant=etudiant, classe=classe_courante, annee_scolaire=annee_courante)

        resultat = dossier_financier(etudiant, annee_courante)

        self.assertEqual(resultat['total_du'], Decimal('605000'))  # 5000 (réinscription) + 50000*12

    def test_falls_back_to_frais_scolarite_when_classe_has_no_tarif(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        FraisScolarite.objects.create(
            annee_scolaire=classe.annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
            montant_inscription=Decimal('50000'), montant_annuel=Decimal('500000'),
        )

        resultat = dossier_financier(etudiant, classe.annee_scolaire)

        self.assertEqual(resultat['total_du'], Decimal('550000'))

    def test_en_attente_payments_dont_count_towards_paid(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        FraisScolarite.objects.create(
            annee_scolaire=classe.annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
            montant_inscription=Decimal('0'), montant_annuel=Decimal('500000'),
        )
        PaiementEcolage.objects.create(
            etudiant=etudiant, annee_scolaire=classe.annee_scolaire, montant=Decimal('500000'),
            date_echeance='2025-10-01', mois_couvert=10, statut=PaiementEcolage.StatutPaiement.EN_ATTENTE,
        )

        resultat = dossier_financier(etudiant, classe.annee_scolaire)
        self.assertEqual(resultat['statut'], 'IMPAYE')


class PaiementApiTests(APITestCase):
    def test_secretariat_can_create_paiement(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        secretaire = f.make_user(role=User.Role.SECRETARIAT, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=secretaire)

        response = self.client.post('/api/paiements/', {
            'etudiant': etudiant.id, 'annee_scolaire': classe.annee_scolaire.id, 'montant': '150000',
            'date_echeance': '2025-10-05', 'mois_couvert': 10, 'statut': 'PAYE',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        paiement = PaiementEcolage.objects.get(pk=response.data['id'])
        self.assertEqual(paiement.cree_par, secretaire)
        self.assertEqual(paiement.secretaire, secretaire)

    def test_enseignant_cannot_create_paiement(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/paiements/', {
            'etudiant': etudiant.id, 'annee_scolaire': classe.annee_scolaire.id, 'montant': '150000',
            'date_echeance': '2025-10-05', 'mois_couvert': 10,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_only_sees_own_child_payments(self):
        classe = f.make_classe()
        mon_enfant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        autre_enfant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        parent = f.make_user(role=User.Role.PARENT, ecole=classe.annee_scolaire.ecole)

        from application.models import TuteurEtudiant
        TuteurEtudiant.objects.create(parent=parent, etudiant=mon_enfant, relation='PERE')

        PaiementEcolage.objects.create(
            etudiant=mon_enfant, annee_scolaire=classe.annee_scolaire, montant=Decimal('100000'),
            date_echeance='2025-10-01', mois_couvert=10,
        )
        PaiementEcolage.objects.create(
            etudiant=autre_enfant, annee_scolaire=classe.annee_scolaire, montant=Decimal('100000'),
            date_echeance='2025-10-01', mois_couvert=10,
        )

        self.client.force_authenticate(user=parent)
        response = self.client.get('/api/paiements/')
        etudiants_vus = {p['etudiant'] for p in response.data}
        self.assertEqual(etudiants_vus, {mon_enfant.id})

    def test_dossier_endpoint_returns_computed_totals(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        FraisScolarite.objects.create(
            annee_scolaire=classe.annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
            montant_inscription=Decimal('0'), montant_annuel=Decimal('400000'),
        )
        admin = f.make_user(role=User.Role.ADMIN, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.get('/api/paiements/dossier/', {
            'etudiant': etudiant.id, 'annee_scolaire': classe.annee_scolaire.id,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['total_du'], '400000.00')
        self.assertEqual(response.data['statut'], 'IMPAYE')

    def test_enseignant_cannot_access_synthese(self):
        classe = f.make_classe()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.get('/api/paiements/synthese/', {'annee_scolaire': classe.annee_scolaire.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_synthese_lists_only_indebted_students(self):
        classe = f.make_classe()
        ecole = classe.annee_scolaire.ecole
        endette = f.make_etudiant(ecole=ecole)
        f.make_inscription(etudiant=endette, classe=classe)
        a_jour = f.make_etudiant(ecole=ecole)
        f.make_inscription(etudiant=a_jour, classe=classe)

        FraisScolarite.objects.create(
            annee_scolaire=classe.annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
            montant_inscription=Decimal('0'), montant_annuel=Decimal('300000'),
        )
        PaiementEcolage.objects.create(
            etudiant=a_jour, annee_scolaire=classe.annee_scolaire, montant=Decimal('300000'),
            date_echeance='2025-10-01', mois_couvert=10, statut=PaiementEcolage.StatutPaiement.PAYE,
        )

        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.get('/api/paiements/synthese/', {'annee_scolaire': classe.annee_scolaire.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        endettes_ids = {e['etudiant'] for e in response.data['etudiants_endettes']}
        self.assertEqual(endettes_ids, {endette.id})
        self.assertEqual(response.data['total_paye'], '300000.00')
        self.assertEqual(response.data['total_du'], '600000.00')
