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
    """Décision de passage annuel : moyenne générale (3 trimestres) < 10 ⇒ redouble."""
    if moyenne is None:
        return Bulletin.Decision.NON_APPLICABLE
    return Bulletin.Decision.ADMIS if moyenne >= 10 else Bulletin.Decision.REDOUBLE


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
        classement = moyenne_service.classement_annuel(classe, annee_scolaire)

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
