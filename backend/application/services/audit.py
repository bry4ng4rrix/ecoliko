"""Écriture du journal d'audit (voir `models.AuditLog`).

Point d'entrée unique utilisé par les signaux : centralise la création des entrées pour
que le format reste cohérent quel que soit le modèle observé.
"""
from ..models import AuditLog


def enregistrer(*, ecole, action, modele, objet_id, objet_repr, utilisateur=None):
    if ecole is None:
        return None
    return AuditLog.objects.create(
        ecole=ecole, utilisateur=utilisateur, action=action,
        modele=modele, objet_id=objet_id, objet_repr=objet_repr[:255],
    )
