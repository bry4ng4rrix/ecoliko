from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase

from application.models import Classe, Matiere, User
from application.services import jours_feries, moyenne, scoping
from . import factories as f


class MoyenneMatiereTests(TestCase):
    def test_returns_none_without_notes(self):
        etudiant = f.make_etudiant()
        matiere = f.make_matiere()
        trimestre = f.make_trimestre()

        self.assertIsNone(moyenne.moyenne_matiere(etudiant, matiere, trimestre))

    def test_averages_notes_of_same_matiere(self):
        etudiant = f.make_etudiant()
        matiere = f.make_matiere()
        trimestre = f.make_trimestre()
        from application.models import Note
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=12, type_evaluation='CC1')
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=16, type_evaluation='CC2')

        self.assertEqual(moyenne.moyenne_matiere(etudiant, matiere, trimestre), Decimal('14.00'))


class MoyenneTrimestreTests(TestCase):
    def test_weighted_by_matiere_coefficient(self):
        ecole = f.make_ecole()
        filiere = f.make_filiere(ecole=ecole)
        niveau = f.make_niveau(ecole=ecole)
        etudiant = f.make_etudiant(ecole=ecole)
        trimestre = f.make_trimestre()

        maths = f.make_matiere(filiere=filiere, niveau=niveau, coefficient=4)
        sport = f.make_matiere(filiere=filiere, niveau=niveau, coefficient=1)

        from application.models import Note
        Note.objects.create(etudiant=etudiant, matiere=maths, trimestre=trimestre, valeur=10, type_evaluation='CC')
        Note.objects.create(etudiant=etudiant, matiere=sport, trimestre=trimestre, valeur=18, type_evaluation='CC')

        # (10*4 + 18*1) / (4+1) = 58/5 = 11.6
        self.assertEqual(moyenne.moyenne_trimestre(etudiant, trimestre), Decimal('11.60'))

    def test_none_when_no_notes(self):
        etudiant = f.make_etudiant()
        trimestre = f.make_trimestre()
        self.assertIsNone(moyenne.moyenne_trimestre(etudiant, trimestre))


class MoyenneGeneraleTests(TestCase):
    def test_averages_trimestre_moyennes(self):
        ecole = f.make_ecole()
        annee = f.make_annee_scolaire(ecole=ecole)
        filiere = f.make_filiere(ecole=ecole)
        niveau = f.make_niveau(ecole=ecole)
        etudiant = f.make_etudiant(ecole=ecole)
        matiere = f.make_matiere(filiere=filiere, niveau=niveau, coefficient=1)

        t1 = f.make_trimestre(annee_scolaire=annee, numero=1)
        t2 = f.make_trimestre(annee_scolaire=annee, numero=2)

        from application.models import Note
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=t1, valeur=10, type_evaluation='CC')
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=t2, valeur=14, type_evaluation='CC')

        self.assertEqual(moyenne.moyenne_generale(etudiant, annee), Decimal('12.00'))


class ClassementTests(TestCase):
    def test_orders_students_from_best_to_worst(self):
        classe = f.make_classe()
        trimestre = f.make_trimestre(annee_scolaire=classe.annee_scolaire)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)

        bon = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        moyen = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=bon, classe=classe)
        f.make_inscription(etudiant=moyen, classe=classe)

        from application.models import Note
        Note.objects.create(etudiant=bon, matiere=matiere, trimestre=trimestre, valeur=18, type_evaluation='CC')
        Note.objects.create(etudiant=moyen, matiere=matiere, trimestre=trimestre, valeur=9, type_evaluation='CC')

        resultats = moyenne.classement(classe, trimestre)

        self.assertEqual([e for _, e, _ in resultats], [bon, moyen])
        self.assertEqual(resultats[0][0], 1)


class ScopingTests(TestCase):
    def test_classes_du_professeur_matches_filiere_niveau_pair(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()

        autre_classe = f.make_classe()  # sans lien avec ce prof

        resultat = list(scoping.classes_du_professeur(prof))

        self.assertIn(classe, resultat)
        self.assertNotIn(autre_classe, resultat)

    def test_no_matiere_returns_empty_queryset(self):
        prof = f.make_user(role=User.Role.ENSEIGNANT)
        self.assertEqual(list(scoping.classes_du_professeur(prof)), [])

    def test_etudiants_du_professeur_only_lists_his_students(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()

        etudiant_du_prof = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant_du_prof, classe=classe)
        etudiant_ailleurs = f.make_etudiant()

        resultat = list(scoping.etudiants_du_professeur(prof))

        self.assertIn(etudiant_du_prof, resultat)
        self.assertNotIn(etudiant_ailleurs, resultat)

    def test_classes_du_professeur_includes_direct_classe_enseignants_assignment(self):
        """Un prof affecté à une classe via `Classe.enseignants` (sans y avoir de matière

        de référence via filière/niveau) doit quand même y avoir accès — voir
        PersonnelPanel "Classes qu'il peut enseigner".
        """
        classe = f.make_classe()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        classe.enseignants.add(prof)

        autre_classe = f.make_classe()

        resultat = list(scoping.classes_du_professeur(prof))

        self.assertIn(classe, resultat)
        self.assertNotIn(autre_classe, resultat)

    def test_classe_sans_niveau_filiere_ne_matche_pas_via_matiere_sans_niveau_filiere(self):
        """Une matière sans filière/niveau (ex: catalogue créé sans ces champs) ne doit pas

        être traitée comme un joker donnant accès à toutes les classes elles-mêmes sans
        filière/niveau — seule l'affectation directe (`Classe.enseignants`) doit compter.
        Régression : le couple (None, None) matchait `Q(filiere_id=None, niveau_id=None)`.
        """
        annee = f.make_annee_scolaire()
        classe_affectee = Classe.objects.create(annee_scolaire=annee, niveau=None, filiere=None, nom='Classe A')
        autre_classe = Classe.objects.create(annee_scolaire=annee, niveau=None, filiere=None, nom='Classe B')

        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=annee.ecole)
        Matiere.objects.create(
            ecole=annee.ecole, code='MATX', intitule='Matière sans niveau', filiere=None, niveau=None,
            enseignant=prof,
        )
        classe_affectee.enseignants.add(prof)

        resultat = list(scoping.classes_du_professeur(prof))

        self.assertIn(classe_affectee, resultat)
        self.assertNotIn(autre_classe, resultat)

    def test_etudiants_du_professeur_includes_students_from_direct_classe_assignment(self):
        classe = f.make_classe()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        classe.enseignants.add(prof)

        etudiant_du_prof = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant_du_prof, classe=classe)
        etudiant_ailleurs = f.make_etudiant()

        resultat = list(scoping.etudiants_du_professeur(prof))

        self.assertIn(etudiant_du_prof, resultat)
        self.assertNotIn(etudiant_ailleurs, resultat)


class JoursFeriesParsingTests(TestCase):
    def test_parser_evenements_ics_extracts_date_titre_uid(self):
        texte = (
            "BEGIN:VCALENDAR\n"
            "BEGIN:VEVENT\n"
            "DTSTART;VALUE=DATE:20260815\n"
            "DTEND;VALUE=DATE:20260816\n"
            "UID:20260815_abc123@google.com\n"
            "SUMMARY:Assumption of Mary\n"
            "END:VEVENT\n"
            "BEGIN:VEVENT\n"
            "DTSTART;VALUE=DATE:20260626\n"
            "UID:20260626_def456@google.com\n"
            "SUMMARY:Independence Day\n"
            "END:VEVENT\n"
            "END:VCALENDAR\n"
        )
        evenements = jours_feries._parser_evenements_ics(texte)
        self.assertEqual(len(evenements), 2)
        self.assertEqual(evenements[0]['date'], date(2026, 8, 15))
        self.assertEqual(evenements[0]['uid'], '20260815_abc123@google.com')
        self.assertEqual(evenements[0]['titre'], 'Assumption of Mary')
        self.assertEqual(evenements[1]['titre'], 'Independence Day')

    def test_deplier_lignes_recolle_les_lignes_continuees(self):
        # RFC 5545 : l'espace en tête de ligne de continuation est le marqueur de « fold »
        # lui-même, pas un caractère de contenu — il est donc supprimé, pas réinséré.
        texte = "SUMMARY:Une fête très\n longue sur deux lignes\nUID:xyz"
        lignes = jours_feries._deplier_lignes(texte)
        self.assertIn('SUMMARY:Une fête trèslongue sur deux lignes', lignes)

    def test_recuperer_jours_feries_madagascar_filtre_par_intervalle(self):
        texte_ics = (
            "BEGIN:VCALENDAR\n"
            "BEGIN:VEVENT\nDTSTART;VALUE=DATE:20250101\nUID:u1\nSUMMARY:New Year's Day\nEND:VEVENT\n"
            "BEGIN:VEVENT\nDTSTART;VALUE=DATE:20260815\nUID:u2\nSUMMARY:Assumption\nEND:VEVENT\n"
            "END:VCALENDAR\n"
        )
        mock_reponse = MagicMock()
        mock_reponse.read.return_value = texte_ics.encode('utf-8')
        mock_reponse.__enter__.return_value = mock_reponse

        with patch('application.services.jours_feries.urllib.request.urlopen', return_value=mock_reponse):
            resultat = jours_feries.recuperer_jours_feries_madagascar(date(2026, 8, 1), date(2026, 8, 31))

        self.assertEqual(len(resultat), 1)
        self.assertEqual(resultat[0]['titre'], 'Assumption')

    def test_recuperer_jours_feries_traduit_les_intitules_connus_en_francais(self):
        texte_ics = (
            "BEGIN:VCALENDAR\n"
            "BEGIN:VEVENT\nDTSTART;VALUE=DATE:20270101\nUID:u1\nSUMMARY:New Year's Day\nEND:VEVENT\n"
            "BEGIN:VEVENT\nDTSTART;VALUE=DATE:20270101\nUID:u2\nSUMMARY:Independence Day\nEND:VEVENT\n"
            "BEGIN:VEVENT\nDTSTART;VALUE=DATE:20270101\nUID:u3\nSUMMARY:Terme inconnu\nEND:VEVENT\n"
            "END:VCALENDAR\n"
        )
        mock_reponse = MagicMock()
        mock_reponse.read.return_value = texte_ics.encode('utf-8')
        mock_reponse.__enter__.return_value = mock_reponse

        with patch('application.services.jours_feries.urllib.request.urlopen', return_value=mock_reponse):
            resultat = jours_feries.recuperer_jours_feries_madagascar(date(2027, 1, 1), date(2027, 1, 1))

        titres = {e['titre'] for e in resultat}
        self.assertIn("Jour de l'An", titres)
        self.assertIn("Fête de l'Indépendance", titres)
        # Un intitulé non répertorié dans la table de traduction est laissé tel quel plutôt
        # que d'être supprimé ou de faire planter la synchronisation.
        self.assertIn('Terme inconnu', titres)

    def test_recuperer_jours_feries_leve_erreur_metier_si_source_injoignable(self):
        with patch(
            'application.services.jours_feries.urllib.request.urlopen',
            side_effect=jours_feries.urllib.error.URLError('DNS failure'),
        ):
            with self.assertRaises(jours_feries.ErreurRecuperationJoursFeries):
                jours_feries.recuperer_jours_feries_madagascar(date(2026, 8, 1), date(2026, 8, 31))
