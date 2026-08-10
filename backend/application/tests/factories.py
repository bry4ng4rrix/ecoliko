"""Petits helpers de construction d'objets pour les tests (pas de dépendance externe type factory_boy)."""
from datetime import date

from application.models import (
    AnneeScolaire, Classe, Ecole, Etudiant, Filiere, Inscription, Matiere, Niveau, Trimestre, User,
)

_compteur = {'n': 0}
_UNSET = object()


def _next_id():
    _compteur['n'] += 1
    return _compteur['n']


def make_ecole(**kwargs):
    n = _next_id()
    defaults = {'nom': f'Lycée Test {n}', 'code': f'LYC{n}'}
    defaults.update(kwargs)
    return Ecole.objects.create(**defaults)


def make_annee_scolaire(ecole=None, **kwargs):
    ecole = ecole or make_ecole()
    n = _next_id()
    defaults = {
        'ecole': ecole,
        'libelle': f'2025-2026-{n}',
        'date_debut': date(2025, 9, 1),
        'date_fin': date(2026, 6, 30),
        'est_active': True,
    }
    defaults.update(kwargs)
    return AnneeScolaire.objects.create(**defaults)


def make_trimestre(annee_scolaire=None, numero=1, **kwargs):
    annee_scolaire = annee_scolaire or make_annee_scolaire()
    defaults = {
        'annee_scolaire': annee_scolaire,
        'numero': numero,
        'date_debut': date(2025, 9, 1),
        'date_fin': date(2025, 12, 15),
    }
    defaults.update(kwargs)
    return Trimestre.objects.create(**defaults)


def make_niveau(ecole=None, **kwargs):
    ecole = ecole or make_ecole()
    n = _next_id()
    defaults = {'ecole': ecole, 'code': f'NIV{n}', 'intitule': f'Niveau {n}', 'ordre': n}
    defaults.update(kwargs)
    return Niveau.objects.create(**defaults)


def make_filiere(ecole=None, **kwargs):
    ecole = ecole or make_ecole()
    n = _next_id()
    defaults = {'ecole': ecole, 'code': f'FIL{n}', 'intitule': f'Filière {n}'}
    defaults.update(kwargs)
    return Filiere.objects.create(**defaults)


def make_classe(annee_scolaire=None, niveau=None, filiere=None, **kwargs):
    annee_scolaire = annee_scolaire or make_annee_scolaire()
    niveau = niveau or make_niveau(ecole=annee_scolaire.ecole)
    n = _next_id()
    defaults = {
        'annee_scolaire': annee_scolaire, 'niveau': niveau, 'filiere': filiere, 'nom': f'Classe {n}',
    }
    defaults.update(kwargs)
    return Classe.objects.create(**defaults)


def make_etudiant(ecole=None, **kwargs):
    ecole = ecole or make_ecole()
    n = _next_id()
    defaults = {
        'ecole': ecole, 'matricule': f'MAT{n}', 'nom': f'Nom{n}', 'prenom': f'Prenom{n}',
        'date_naissance': date(2008, 1, 1), 'lieu_naissance': 'Antananarivo', 'genre': 'H',
    }
    defaults.update(kwargs)
    return Etudiant.objects.create(**defaults)


def make_inscription(etudiant=None, classe=None, **kwargs):
    classe = classe or make_classe()
    etudiant = etudiant or make_etudiant(ecole=classe.annee_scolaire.ecole)
    defaults = {'etudiant': etudiant, 'classe': classe, 'annee_scolaire': classe.annee_scolaire}
    defaults.update(kwargs)
    return Inscription.objects.create(**defaults)


def make_matiere(filiere=_UNSET, niveau=None, **kwargs):
    if filiere is _UNSET:
        filiere = make_filiere()
    niveau = niveau or make_niveau(ecole=(filiere.ecole if filiere else make_ecole()))
    n = _next_id()
    defaults = {
        'code': f'MAT{n}', 'intitule': f'Matière {n}', 'filiere': filiere, 'niveau': niveau,
        'ecole': niveau.ecole,
    }
    defaults.update(kwargs)
    return Matiere.objects.create(**defaults)


def make_user(role=User.Role.ADMIN, ecole=None, **kwargs):
    n = _next_id()
    defaults = {
        'email': f'user{n}@example.com', 'first_name': f'Prenom{n}', 'last_name': f'Nom{n}',
        'role': role, 'ecole': ecole, 'is_active': True,
    }
    defaults.update(kwargs)
    return User.objects.create_user(password='Test1234!', **defaults)
