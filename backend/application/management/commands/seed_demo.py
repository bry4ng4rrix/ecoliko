from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from application.models import (
    AnneeScolaire, Classe, EmploiDuTemps, Ecole, Etudiant, Filiere, FraisScolarite, Inscription, Matiere,
    Niveau, Note, PaiementEcolage, Salle, Trimestre, TuteurEtudiant, User,
)
from application.services.gestion_scolaire import activer_annee_scolaire, activer_trimestre


class Command(BaseCommand):
    help = "Crée un jeu de données de démonstration (un établissement, une année scolaire, une classe, des comptes)."

    def add_arguments(self, parser):
        parser.add_argument('--password', default='Demo1234!', help='Mot de passe commun pour tous les comptes créés.')

    @transaction.atomic
    def handle(self, *args, password, **options):
        if Ecole.objects.filter(code='LYC-DEMO').exists():
            self.stdout.write(self.style.WARNING("Le jeu de données 'LYC-DEMO' existe déjà, rien à faire."))
            return

        ecole = Ecole.objects.create(nom='Lycée de Démonstration', code='LYC-DEMO', devise='Ar')

        annee = AnneeScolaire.objects.create(
            ecole=ecole, libelle='2025-2026', date_debut=date(2025, 9, 1), date_fin=date(2026, 6, 30),
        )
        activer_annee_scolaire(annee)

        t1 = Trimestre.objects.create(annee_scolaire=annee, numero=1, date_debut=date(2025, 9, 1), date_fin=date(2025, 12, 15))
        Trimestre.objects.create(annee_scolaire=annee, numero=2, date_debut=date(2026, 1, 5), date_fin=date(2026, 3, 20))
        Trimestre.objects.create(annee_scolaire=annee, numero=3, date_debut=date(2026, 3, 30), date_fin=date(2026, 6, 20))
        activer_trimestre(t1)

        niveau_2nde = Niveau.objects.create(ecole=ecole, code='2ND', intitule='Seconde', ordre=1)
        filiere_s = Filiere.objects.create(ecole=ecole, code='S', intitule='Scientifique')
        salle = Salle.objects.create(ecole=ecole, nom='Salle 12', capacite=40, type_salle='Salle de classe')

        admin = User.objects.create_user(
            email='admin@lyc-demo.mg', password=password, first_name='Rakoto', last_name='Andrianina',
            role=User.Role.ADMIN, ecole=ecole, is_active=True,
        )
        prof = User.objects.create_user(
            email='prof@lyc-demo.mg', password=password, first_name='Hery', last_name='Rasoanaivo',
            role=User.Role.ENSEIGNANT, ecole=ecole, is_active=True,
        )
        responsable = User.objects.create_user(
            email='responsable@lyc-demo.mg', password=password, first_name='Voahangy', last_name='Rabe',
            role=User.Role.RESPONSABLE, ecole=ecole, is_active=True,
        )

        classe = Classe.objects.create(
            annee_scolaire=annee, niveau=niveau_2nde, filiere=filiere_s, nom='2nde S1',
            titulaire=prof, salle=salle,
        )

        maths = Matiere.objects.create(
            code='MATH', intitule='Mathématiques', coefficient=4,
            filiere=filiere_s, niveau=niveau_2nde, enseignant=prof,
        )
        physique = Matiere.objects.create(
            code='PHYS', intitule='Physique-Chimie', coefficient=3,
            filiere=filiere_s, niveau=niveau_2nde, enseignant=prof,
        )

        EmploiDuTemps.objects.create(
            classe=classe, matiere=maths, enseignant=prof, jour='LUN',
            heure_debut='08:00', heure_fin='10:00', salle=salle, cree_par=admin,
        )
        EmploiDuTemps.objects.create(
            classe=classe, matiere=physique, enseignant=prof, jour='MER',
            heure_debut='10:00', heure_fin='12:00', salle=salle, cree_par=admin,
        )

        eleve_user = User.objects.create_user(
            email='eleve@lyc-demo.mg', password=password, first_name='Fitia', last_name='Randria',
            role=User.Role.ETUDIANT, ecole=ecole, is_active=True,
        )
        etudiant = Etudiant.objects.create(
            ecole=ecole, utilisateur=eleve_user, matricule='2025-S-0001', nom='Randria', prenom='Fitia',
            date_naissance=date(2009, 4, 12), lieu_naissance='Antananarivo', genre='F',
        )
        Etudiant.objects.create(
            ecole=ecole, matricule='2025-S-0002', nom='Rakotondrabe', prenom='Tojo',
            date_naissance=date(2009, 7, 3), lieu_naissance='Antananarivo', genre='H',
        )
        for e in Etudiant.objects.filter(ecole=ecole):
            Inscription.objects.create(etudiant=e, classe=classe, annee_scolaire=annee)

        parent_user = User.objects.create_user(
            email='parent@lyc-demo.mg', password=password, first_name='Njaka', last_name='Randria',
            role=User.Role.PARENT, ecole=ecole, is_active=True,
        )
        TuteurEtudiant.objects.create(parent=parent_user, etudiant=etudiant, relation='PERE', est_contact_principal=True)

        Note.objects.create(etudiant=etudiant, matiere=maths, trimestre=t1, valeur=14, type_evaluation='Contrôle 1', saisie_par=prof)
        Note.objects.create(etudiant=etudiant, matiere=maths, trimestre=t1, valeur=16, type_evaluation='Contrôle 2', saisie_par=prof)

        FraisScolarite.objects.create(
            annee_scolaire=annee, niveau=niveau_2nde, filiere=filiere_s,
            montant_inscription=50_000, montant_annuel=600_000,
        )
        autre_etudiant = Etudiant.objects.get(matricule='2025-S-0002')
        PaiementEcolage.objects.create(
            etudiant=etudiant, annee_scolaire=annee, montant=650_000, date_echeance=date(2025, 9, 30),
            mois_couvert=9, statut=PaiementEcolage.StatutPaiement.PAYE, mode_paiement='Virement',
            cree_par=admin, secretaire=admin,
        )
        PaiementEcolage.objects.create(
            etudiant=autre_etudiant, annee_scolaire=annee, montant=200_000, date_echeance=date(2025, 9, 30),
            mois_couvert=9, statut=PaiementEcolage.StatutPaiement.PAYE, mode_paiement='Espèces',
            cree_par=admin, secretaire=admin,
        )

        self.stdout.write(self.style.SUCCESS(
            f"Jeu de données créé. Mot de passe commun : '{password}'.\n"
            f"  admin@lyc-demo.mg (ADMIN)\n"
            f"  responsable@lyc-demo.mg (RESPONSABLE)\n"
            f"  prof@lyc-demo.mg (ENSEIGNANT)\n"
            f"  eleve@lyc-demo.mg (ETUDIANT)\n"
            f"  parent@lyc-demo.mg (PARENT)"
        ))
