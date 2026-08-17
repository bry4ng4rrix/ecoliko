from datetime import date

from django.test import TestCase

from application.services.facture_ecolage import date_echeance_pour_mois
from . import factories as f


class DateEcheancePourMoisTests(TestCase):
    def test_defaults_to_september_start_and_day_5(self):
        annee = f.make_annee_scolaire(date_debut=date(2026, 9, 1))
        self.assertEqual(date_echeance_pour_mois(annee, 9), date(2026, 9, 5))
        self.assertEqual(date_echeance_pour_mois(annee, 1), date(2027, 1, 5))

    def test_custom_calendrier_scolaire(self):
        """Un établissement qui démarre son année en octobre, échéance le 10 du mois."""
        annee = f.make_annee_scolaire(
            date_debut=date(2026, 10, 1), mois_debut_annee_scolaire=10, jour_echeance_mensuelle=10,
        )
        self.assertEqual(date_echeance_pour_mois(annee, 10), date(2026, 10, 10))
        self.assertEqual(date_echeance_pour_mois(annee, 9), date(2027, 9, 10))

    def test_mois_debut_janvier_reste_sur_annee_civile_de_depart(self):
        """mois_debut_annee_scolaire=1 : tous les mois (1-12) tombent sur la même année civile."""
        annee = f.make_annee_scolaire(date_debut=date(2026, 1, 1), mois_debut_annee_scolaire=1)
        self.assertEqual(date_echeance_pour_mois(annee, 1), date(2026, 1, 5))
        self.assertEqual(date_echeance_pour_mois(annee, 12), date(2026, 12, 5))
