"""Calcul des moyennes, indépendant de toute vue/serializer (règle 6.1 du cahier des charges).

- moyenne_matiere   : moyenne simple des notes d'un étudiant dans une matière, pour un trimestre.
- moyenne_trimestre : moyenne des moyennes de matières, pondérée par le coefficient de chaque matière.
- moyenne_generale  : moyenne des moyennes de trimestres, sur une année scolaire.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.db.models import Avg

from ..models import AnneeScolaire, Classe, Etudiant, Matiere, Note, Trimestre


def _round2(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def moyenne_matiere(etudiant: Etudiant, matiere: Matiere, trimestre: Trimestre) -> Optional[Decimal]:
    """Moyenne d'un étudiant dans une matière, pour un trimestre donné."""
    result = Note.objects.filter(
        etudiant=etudiant, matiere=matiere, trimestre=trimestre
    ).aggregate(moyenne=Avg('valeur'))['moyenne']
    return _round2(result) if result is not None else None


def moyenne_trimestre(etudiant: Etudiant, trimestre: Trimestre) -> Optional[Decimal]:
    """Moyenne générale d'un étudiant pour un trimestre, pondérée par les coefficients des matières.

    Une seule requête agrégée (groupée par matière) pour éviter le N+1.
    """
    rows = (
        Note.objects.filter(etudiant=etudiant, trimestre=trimestre)
        .values('matiere_id', 'matiere__coefficient')
        .annotate(moyenne=Avg('valeur'))
    )

    total_pondere = Decimal('0')
    total_coefficients = Decimal('0')
    for row in rows:
        coefficient = Decimal(row['matiere__coefficient'])
        total_pondere += Decimal(str(row['moyenne'])) * coefficient
        total_coefficients += coefficient

    if total_coefficients == 0:
        return None
    return _round2(total_pondere / total_coefficients)


def moyenne_generale(etudiant: Etudiant, annee_scolaire: AnneeScolaire) -> Optional[Decimal]:
    """Moyenne générale annuelle : moyenne des moyennes de trimestres."""
    trimestres = Trimestre.objects.filter(annee_scolaire=annee_scolaire)
    moyennes = [
        m for m in (moyenne_trimestre(etudiant, t) for t in trimestres) if m is not None
    ]
    if not moyennes:
        return None
    return _round2(sum(moyennes, Decimal('0')) / len(moyennes))


def classement(classe: Classe, trimestre: Trimestre) -> list:
    """Classement des étudiants actifs d'une classe pour un trimestre, du meilleur au moins bon.

    Retourne une liste de tuples (rang, etudiant, moyenne) ; moyenne=None placé en fin de liste.
    """
    etudiants = Etudiant.objects.filter(
        inscriptions__classe=classe, inscriptions__annee_scolaire=trimestre.annee_scolaire
    ).distinct()

    resultats = [(etudiant, moyenne_trimestre(etudiant, trimestre)) for etudiant in etudiants]
    resultats.sort(key=lambda pair: (pair[1] is None, -(pair[1] or Decimal('0'))))

    return [(rang, etudiant, moyenne) for rang, (etudiant, moyenne) in enumerate(resultats, start=1)]
