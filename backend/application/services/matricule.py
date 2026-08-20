"""Génération du matricule des étudiants créés via l'auto-inscription publique.

Contrairement à la création manuelle par un membre du personnel (`EtudiantsPanel` / le
formulaire "Nouvel étudiant"), où le matricule reste un champ libre saisi à la main, un
utilisateur public non vérifié ne peut pas choisir le sien : collision possible avec un
matricule déjà attribué, format invalide, etc. Voir `Etudiant.matricule`
(format documenté : ANNEE-CODE-XXXX).
"""
from django.utils import timezone

from ..models import Etudiant


def generer_matricule(ecole) -> str:
    """Prochain matricule disponible pour cet établissement, sur l'année civile courante."""
    annee = timezone.localdate().year
    code = (ecole.code or 'ETU')[:3].upper()
    prefixe = f'{annee}-{code}-'

    dernier = (
        Etudiant.objects.filter(ecole=ecole, matricule__startswith=prefixe)
        .order_by('-matricule')
        .values_list('matricule', flat=True)
        .first()
    )
    sequence = 1
    if dernier:
        try:
            sequence = int(dernier.rsplit('-', 1)[-1]) + 1
        except ValueError:
            sequence = 1

    return f'{prefixe}{sequence:04d}'
