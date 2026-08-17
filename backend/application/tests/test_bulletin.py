from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from application.models import Bulletin, Note, User
from application.services.bulletin import generer_bulletin
from application.services.bulletin_pdf import generer_pdf_bulletin
from . import factories as f


class GenererBulletinServiceTests(APITestCase):
    def test_trimestriel_computes_moyenne_mention_and_rang(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        trimestre = f.make_trimestre(annee_scolaire=annee)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau, coefficient=1)

        bon = f.make_etudiant(ecole=annee.ecole)
        moyen = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=bon, classe=classe)
        f.make_inscription(etudiant=moyen, classe=classe)
        Note.objects.create(etudiant=bon, matiere=matiere, trimestre=trimestre, valeur=17, type_evaluation='CC')
        Note.objects.create(etudiant=moyen, matiere=matiere, trimestre=trimestre, valeur=9, type_evaluation='CC')

        bulletin = generer_bulletin(bon, annee, trimestre)

        self.assertEqual(bulletin.moyenne_generale, Decimal('17.00'))
        self.assertEqual(bulletin.rang, 1)
        self.assertEqual(bulletin.effectif_classe, 2)
        self.assertEqual(bulletin.mention, Bulletin.Mention.FELICITATIONS)
        self.assertEqual(bulletin.decision, Bulletin.Decision.NON_APPLICABLE)

    def test_annuel_computes_decision(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        t1 = f.make_trimestre(annee_scolaire=annee, numero=1)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau, coefficient=1)
        etudiant = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=t1, valeur=8, type_evaluation='CC')

        bulletin = generer_bulletin(etudiant, annee, trimestre=None)

        self.assertEqual(bulletin.moyenne_generale, Decimal('8.00'))
        self.assertEqual(bulletin.decision, Bulletin.Decision.REDOUBLE)

    def test_regenerating_updates_existing_bulletin_instead_of_duplicating(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        trimestre = f.make_trimestre(annee_scolaire=annee)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau, coefficient=1)
        etudiant = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=10, type_evaluation='CC')

        generer_bulletin(etudiant, annee, trimestre)
        Note.objects.filter(etudiant=etudiant).update(valeur=15)
        generer_bulletin(etudiant, annee, trimestre)

        self.assertEqual(Bulletin.objects.filter(etudiant=etudiant, trimestre=trimestre).count(), 1)
        self.assertEqual(Bulletin.objects.get(etudiant=etudiant, trimestre=trimestre).moyenne_generale, Decimal('15.00'))

    def test_pdf_generation_produces_bytes(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        trimestre = f.make_trimestre(annee_scolaire=annee)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau, coefficient=1)
        etudiant = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=12, type_evaluation='CC')

        bulletin = generer_bulletin(etudiant, annee, trimestre)
        pdf_bytes = generer_pdf_bulletin(bulletin)

        self.assertTrue(pdf_bytes.startswith(b'%PDF'))


class BulletinApiTests(APITestCase):
    def test_enseignant_can_generate_bulletin_for_his_classe(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        trimestre = f.make_trimestre(annee_scolaire=annee)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=annee.ecole)
        matiere.enseignant = prof
        matiere.save()
        etudiant = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=13, type_evaluation='CC')

        self.client.force_authenticate(user=prof)
        response = self.client.post('/api/bulletins/generer/', {
            'etudiant': etudiant.id, 'annee_scolaire': annee.id, 'trimestre': trimestre.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_etudiant_cannot_generate_bulletin(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=classe.annee_scolaire.ecole)
        etudiant.save()

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.post('/api/bulletins/generer/', {
            'etudiant': etudiant.id, 'annee_scolaire': classe.annee_scolaire.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enseignant_cannot_validate_bulletin(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        etudiant = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        bulletin = generer_bulletin(etudiant, annee, trimestre=None)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=annee.ecole)

        self.client.force_authenticate(user=prof)
        response = self.client.post(f'/api/bulletins/{bulletin.id}/valider/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_responsable_can_validate_bulletin(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        etudiant = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        bulletin = generer_bulletin(etudiant, annee, trimestre=None)
        responsable = f.make_user(role=User.Role.RESPONSABLE, ecole=annee.ecole)

        self.client.force_authenticate(user=responsable)
        response = self.client.post(f'/api/bulletins/{bulletin.id}/valider/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        bulletin.refresh_from_db()
        self.assertTrue(bulletin.est_valide)
        self.assertEqual(bulletin.valide_par, responsable)

    def test_etudiant_can_download_his_own_bulletin_pdf(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        etudiant = f.make_etudiant(ecole=annee.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=annee.ecole)
        etudiant.save()
        f.make_inscription(etudiant=etudiant, classe=classe)
        bulletin = generer_bulletin(etudiant, annee, trimestre=None)

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get(f'/api/bulletins/{bulletin.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_etudiant_cannot_download_another_students_bulletin(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        etudiant = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        bulletin = generer_bulletin(etudiant, annee, trimestre=None)

        autre_etudiant_user = f.make_user(role=User.Role.ETUDIANT, ecole=annee.ecole)
        self.client.force_authenticate(user=autre_etudiant_user)
        response = self.client.get(f'/api/bulletins/{bulletin.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
