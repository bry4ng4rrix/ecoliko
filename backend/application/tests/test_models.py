from datetime import date

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from application.models import AnneeScolaire, User
from . import factories as f


class UserManagerTests(TestCase):
    def test_create_superuser_sets_admin_role_and_flags(self):
        user = User.objects.create_superuser(email='root@example.com', password='Test1234!')

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, User.Role.ADMIN)

    def test_create_superuser_rejects_is_staff_false(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(email='root2@example.com', password='x', is_staff=False)

    def test_create_user_etudiant_is_inactive_by_default(self):
        user = User.objects.create_user(
            email='eleve@example.com', password='x', role='ETUDIANT', first_name='A', last_name='B'
        )
        self.assertFalse(user.is_active)


class AnneeScolaireTests(TestCase):
    def test_only_one_active_annee_par_ecole(self):
        ecole = f.make_ecole()
        f.make_annee_scolaire(ecole=ecole, libelle='2024-2025', est_active=True)

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                f.make_annee_scolaire(ecole=ecole, libelle='2025-2026', est_active=True)

    def test_two_ecoles_can_each_have_an_active_annee(self):
        f.make_annee_scolaire(libelle='2025-2026', est_active=True)
        f.make_annee_scolaire(libelle='2025-2026', est_active=True)  # école différente
        self.assertEqual(AnneeScolaire.objects.filter(est_active=True).count(), 2)

    def test_clean_rejects_date_fin_before_date_debut(self):
        annee = AnneeScolaire(
            ecole=f.make_ecole(), libelle='2025-2026',
            date_debut=date(2025, 9, 1), date_fin=date(2025, 8, 1),
        )
        with self.assertRaises(ValidationError):
            annee.full_clean()


class ClasseTests(TestCase):
    def test_clean_rejects_niveau_from_other_ecole(self):
        annee = f.make_annee_scolaire()
        niveau_autre_ecole = f.make_niveau()  # école différente par défaut

        from application.models import Classe
        classe = Classe(annee_scolaire=annee, niveau=niveau_autre_ecole, nom='2nde A')
        with self.assertRaises(ValidationError):
            classe.full_clean()

    def test_effectif_counts_only_active_inscriptions(self):
        classe = f.make_classe()
        etudiant1 = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        etudiant2 = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant1, classe=classe, statut='ACTIVE')
        f.make_inscription(etudiant=etudiant2, classe=classe, statut='ABANDON')

        self.assertEqual(classe.effectif, 1)


class EtudiantTests(TestCase):
    def test_inscription_courante_returns_active_year_only(self):
        etudiant = f.make_etudiant()
        classe_active = f.make_classe(annee_scolaire=f.make_annee_scolaire(ecole=etudiant.ecole, est_active=True))
        f.make_inscription(etudiant=etudiant, classe=classe_active)

        self.assertEqual(etudiant.inscription_courante.classe, classe_active)

    def test_inscription_courante_none_when_no_active_year(self):
        etudiant = f.make_etudiant()
        annee_inactive = f.make_annee_scolaire(ecole=etudiant.ecole, est_active=False)
        classe = f.make_classe(annee_scolaire=annee_inactive)
        f.make_inscription(etudiant=etudiant, classe=classe)

        self.assertIsNone(etudiant.inscription_courante)
