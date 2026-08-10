"""Agrégations statistiques pour le tableau de bord Rapports (admin/responsable).

Toute la logique de calcul est ici, jamais dans les vues — même principe que `finance`
et `moyenne` : les vues se contentent d'appeler ces fonctions et de sérialiser le résultat.
"""
from decimal import Decimal
from typing import Optional

from ..models import Classe, Etudiant, Inscription, PresenceCours, Trimestre
from .moyenne import moyenne_generale, moyenne_trimestre

SEUIL_REUSSITE = Decimal('10')


def effectifs_par_classe(annee_scolaire) -> list[dict]:
    classes = Classe.objects.filter(annee_scolaire=annee_scolaire).order_by('niveau__ordre', 'nom')
    return [{'classe_id': c.id, 'classe_nom': c.nom, 'effectif': c.effectif} for c in classes]


def _moyenne_etudiant(etudiant: Etudiant, annee_scolaire, trimestre: Optional[Trimestre]):
    if trimestre is not None:
        return moyenne_trimestre(etudiant, trimestre)
    return moyenne_generale(etudiant, annee_scolaire)


def moyennes_par_classe(annee_scolaire, trimestre: Optional[Trimestre] = None) -> list[dict]:
    resultats = []
    for classe in Classe.objects.filter(annee_scolaire=annee_scolaire).order_by('niveau__ordre', 'nom'):
        etudiants = Etudiant.objects.filter(
            inscriptions__classe=classe, inscriptions__statut=Inscription.StatutInscription.ACTIVE
        ).distinct()
        moyennes = [m for m in (_moyenne_etudiant(e, annee_scolaire, trimestre) for e in etudiants) if m is not None]
        moyenne_classe = (sum(moyennes, Decimal('0')) / len(moyennes)) if moyennes else None
        resultats.append({
            'classe_id': classe.id, 'classe_nom': classe.nom,
            'moyenne': round(moyenne_classe, 2) if moyenne_classe is not None else None,
            'nb_notes': len(moyennes),
        })
    return resultats


def taux_reussite(annee_scolaire, trimestre: Optional[Trimestre] = None) -> dict:
    """Part des étudiants actifs dont la moyenne atteint le seuil de réussite (10/20)."""
    etudiants = Etudiant.objects.filter(
        inscriptions__annee_scolaire=annee_scolaire, inscriptions__statut=Inscription.StatutInscription.ACTIVE
    ).distinct()
    moyennes = [m for m in (_moyenne_etudiant(e, annee_scolaire, trimestre) for e in etudiants) if m is not None]
    if not moyennes:
        return {'taux_reussite': None, 'nb_evalues': 0}
    reussis = sum(1 for m in moyennes if m >= SEUIL_REUSSITE)
    return {'taux_reussite': round(reussis / len(moyennes) * 100, 1), 'nb_evalues': len(moyennes)}


def taux_presence(annee_scolaire) -> dict:
    qs = PresenceCours.objects.filter(etudiant__inscriptions__annee_scolaire=annee_scolaire).distinct()
    total = qs.count()
    if not total:
        return {'taux_presence': None, 'total_seances': 0}
    presents = qs.filter(statut=PresenceCours.StatutPresence.PRESENT).count()
    return {'taux_presence': round(presents / total * 100, 1), 'total_seances': total}


def synthese_statistiques(annee_scolaire, trimestre: Optional[Trimestre] = None) -> dict:
    return {
        'effectifs_par_classe': effectifs_par_classe(annee_scolaire),
        'moyennes_par_classe': moyennes_par_classe(annee_scolaire, trimestre),
        **taux_reussite(annee_scolaire, trimestre),
        **taux_presence(annee_scolaire),
    }
