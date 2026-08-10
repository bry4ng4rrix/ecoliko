"""Règles métier de la vie scolaire (présences)."""
from django.db import transaction

from ..models import Matiere, PresenceCours


@transaction.atomic
def enregistrer_appel(matiere: Matiere, date_cours, heure_debut, heure_fin, entrees, cree_par):
    """Enregistre l'appel d'un cours pour plusieurs étudiants en une seule opération.

    `entrees` : liste de dicts {'etudiant': id, 'statut': code}. Ré-appeler pour la même
    matière/date met simplement à jour les lignes existantes (correction d'un appel).
    """
    resultats = []
    for entree in entrees:
        presence, _created = PresenceCours.objects.update_or_create(
            etudiant_id=entree['etudiant'], matiere=matiere, date_cours=date_cours,
            defaults={
                'heure_debut': heure_debut, 'heure_fin': heure_fin,
                'statut': entree['statut'], 'cree_par': cree_par,
            },
        )
        resultats.append(presence)
    return resultats
