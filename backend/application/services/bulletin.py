"""Calcul et validation du bulletin scolaire (règles 3.3 / 3.9 du cahier des charges).

La génération PDF (mise en page) est séparée dans `bulletin_pdf.py` : ce module ne
s'occupe que des calculs (moyenne, rang, mention, décision), déjà couverts par
`services.moyenne` pour la partie arithmétique.
"""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from ..models import Bulletin, Etudiant
from . import moyenne as moyenne_service


def _mention_pour(moyenne):
    if moyenne is None:
        return Bulletin.Mention.AUCUNE
    if moyenne >= 16:
        return Bulletin.Mention.FELICITATIONS
    if moyenne >= 14:
        return Bulletin.Mention.ENCOURAGEMENTS
    if moyenne >= 12:
        return Bulletin.Mention.TABLEAU_HONNEUR
    return Bulletin.Mention.AUCUNE


def _decision_pour(moyenne):
    if moyenne is None:
        return Bulletin.Decision.NON_APPLICABLE
    return Bulletin.Decision.ADMIS if moyenne >= 10 else Bulletin.Decision.AJOURNE


def _classement_annuel(classe, annee_scolaire):
    """Classement basé sur la moyenne générale annuelle (indépendant de `moyenne.classement`,

    qui classe par trimestre)."""
    etudiants = Etudiant.objects.filter(
        inscriptions__classe=classe, inscriptions__annee_scolaire=annee_scolaire
    ).distinct()
    resultats = [(e, moyenne_service.moyenne_generale(e, annee_scolaire)) for e in etudiants]
    resultats.sort(key=lambda pair: (pair[1] is None, -(pair[1] or Decimal('0'))))
    return [(rang, e, m) for rang, (e, m) in enumerate(resultats, start=1)]


@transaction.atomic
def generer_bulletin(etudiant: Etudiant, annee_scolaire, trimestre=None) -> Bulletin:
    """Calcule et enregistre le bulletin d'un étudiant (`trimestre=None` -> bulletin annuel).

    Régénérer un bulletin déjà existant (même étudiant/année/trimestre) met à jour ses valeurs.
    """
    inscription = etudiant.inscriptions.filter(annee_scolaire=annee_scolaire).select_related('classe').first()
    if inscription is None:
        raise ValueError("Cet étudiant n'a pas d'inscription pour cette année scolaire.")
    classe = inscription.classe

    if trimestre is not None:
        moyenne = moyenne_service.moyenne_trimestre(etudiant, trimestre)
        classement = moyenne_service.classement(classe, trimestre)
    else:
        moyenne = moyenne_service.moyenne_generale(etudiant, annee_scolaire)
        classement = _classement_annuel(classe, annee_scolaire)

    rang = next((rang for rang, e, _ in classement if e.id == etudiant.id), None)

    bulletin, _created = Bulletin.objects.update_or_create(
        etudiant=etudiant, annee_scolaire=annee_scolaire, trimestre=trimestre,
        defaults={
            'classe': classe,
            'moyenne_generale': moyenne,
            'rang': rang,
            'effectif_classe': len(classement),
            'mention': _mention_pour(moyenne),
            'decision': _decision_pour(moyenne) if trimestre is None else Bulletin.Decision.NON_APPLICABLE,
        },
    )
    return bulletin


@transaction.atomic
def valider_bulletin(bulletin: Bulletin, valide_par) -> Bulletin:
    bulletin.est_valide = True
    bulletin.valide_par = valide_par
    bulletin.date_validation = timezone.now()
    bulletin.save(update_fields=['est_valide', 'valide_par', 'date_validation'])
    return bulletin
