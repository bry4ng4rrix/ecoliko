"""Règles métier de bascule d'année scolaire / trimestre actifs.

Une seule année scolaire active par établissement, un seul trimestre actif par année
(contraintes en base) : ces fonctions garantissent la bascule atomique de l'ancien vers
le nouveau, sans jamais violer ces contraintes.
"""
from django.db import transaction

from ..models import AnneeScolaire, Trimestre


@transaction.atomic
def activer_annee_scolaire(annee: AnneeScolaire) -> AnneeScolaire:
    AnneeScolaire.objects.filter(
        ecole_id=annee.ecole_id, est_active=True
    ).exclude(pk=annee.pk).update(est_active=False)

    annee.est_active = True
    annee.statut = AnneeScolaire.Statut.EN_COURS
    annee.save(update_fields=['est_active', 'statut'])
    return annee


@transaction.atomic
def activer_trimestre(trimestre: Trimestre) -> Trimestre:
    Trimestre.objects.filter(
        annee_scolaire_id=trimestre.annee_scolaire_id, est_actif=True
    ).exclude(pk=trimestre.pk).update(est_actif=False)

    trimestre.est_actif = True
    trimestre.save(update_fields=['est_actif'])
    return trimestre
