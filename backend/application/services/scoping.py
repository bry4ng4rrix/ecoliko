"""Règles métier déterminant à quelles classes/étudiants un enseignant a accès.

Un enseignant a accès à une classe s'il enseigne au moins une matière correspondant
à la paire (filière, niveau) de cette classe, OU s'il y est explicitement affecté
comme intervenant (voir `Classe.enseignants`, assigné depuis "Gestion des Profs").
"""
from django.db.models import Q, QuerySet

from ..models import Classe, Etudiant, Matiere, User


def classes_du_professeur(user: User) -> QuerySet:
    """Classes accessibles à un enseignant : matière correspondante ou affectation directe."""
    pairs = Matiere.objects.filter(enseignant=user, est_active=True).values_list('filiere_id', 'niveau_id')

    query = Q(pk__in=user.classes_enseignees.values('pk'))
    for filiere_id, niveau_id in pairs:
        query |= Q(filiere_id=filiere_id, niveau_id=niveau_id)

    return Classe.objects.filter(query).distinct()


def etudiants_du_professeur(user: User) -> QuerySet:
    """Étudiants inscrits dans une classe accessible à l'enseignant."""
    classes = classes_du_professeur(user)
    return Etudiant.objects.filter(inscriptions__classe__in=classes).distinct()


def matieres_du_professeur(user: User) -> QuerySet:
    return Matiere.objects.filter(enseignant=user, est_active=True)
