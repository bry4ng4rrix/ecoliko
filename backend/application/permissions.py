"""Politiques d'autorisation par rôle et cloisonnement multi-établissement.

Aucune règle métier d'autorisation ne doit être écrite directement dans les vues :
elle est centralisée ici et appliquée via `permission_classes` / `get_queryset`.
"""
from rest_framework import permissions

from .models import Matiere


class RolePermission(permissions.BasePermission):
    """Permission de base : autorise uniquement les rôles listés dans `allowed_roles`.

    Un super-utilisateur (plateforme) passe toujours.
    """
    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.role in self.allowed_roles


class IsAdmin(RolePermission):
    allowed_roles = ('ADMIN',)


class IsResponsablePedagogique(RolePermission):
    allowed_roles = ('RESPONSABLE',)


class IsEnseignant(RolePermission):
    allowed_roles = ('ENSEIGNANT',)


class IsSecretariat(RolePermission):
    allowed_roles = ('SECRETARIAT',)


class IsEtudiant(RolePermission):
    allowed_roles = ('ETUDIANT',)


class IsAdminOrResponsable(RolePermission):
    allowed_roles = ('ADMIN', 'RESPONSABLE')


class IsAdminOrSecretariat(RolePermission):
    allowed_roles = ('ADMIN', 'SECRETARIAT')


class IsStaffPedagogique(RolePermission):
    """Personnel administratif/pédagogique (tout rôle sauf étudiant)."""
    allowed_roles = ('ADMIN', 'RESPONSABLE', 'ENSEIGNANT', 'SECRETARIAT')


class IsPlatformSuperUser(permissions.BasePermission):
    """Réservé au super-utilisateur plateforme (création/suppression d'établissements)."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class ReadOnlyOrAdmin(permissions.BasePermission):
    """Lecture pour tout utilisateur authentifié de l'établissement, écriture réservée à l'admin."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.is_superuser or user.role == 'ADMIN'


class ReadOnlyOrAdminOrSecretariat(permissions.BasePermission):
    """Lecture pour tout utilisateur authentifié ; écriture pour l'admin ET le bureau administratif

    (secrétariat) : ce dernier gère au quotidien les matières, les classes et l'emploi du temps.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.is_superuser or user.role in ('ADMIN', 'SECRETARIAT')


class CanAccessDossierEnseignant(permissions.BasePermission):
    """Dossier RH sensible (salaire, contrat...) : écriture réservée à l'admin ; lecture

    ouverte à l'admin et à l'enseignant concerné (le queryset de la vue filtre déjà ce
    dernier sur son propre dossier).
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return user.is_superuser or user.role in ('ADMIN', 'ENSEIGNANT')
        return user.is_superuser or user.role == 'ADMIN'


class CanManageMatiereScopedResource(permissions.BasePermission):
    """Un enseignant ne peut créer/modifier/supprimer que les ressources (notes, présences,

    ...) rattachées à ses propres matières. Base commune : toute sous-classe hérite du
    même contrôle, on ne le réécrit pas à chaque nouvelle ressource "matière + enseignant".
    """
    # Actions où request.data contient un champ 'matiere' à vérifier avant tout accès objet
    # (création simple ou saisie groupée type "appel").
    creation_like_actions = ('create',)

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.role == 'ADMIN':
            return True
        if user.role != 'ENSEIGNANT':
            return False
        if view.action in self.creation_like_actions:
            return Matiere.objects.filter(pk=request.data.get('matiere'), enseignant=user).exists()
        return True  # les actions detail sont bornées par has_object_permission

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser or user.role == 'ADMIN':
            return True
        return obj.matiere.enseignant_id == user.id


class CanManageMatiere(permissions.BasePermission):
    """Gestion du catalogue des matières : l'admin et le bureau gèrent tout ; un enseignant

    peut créer les matières qu'il enseigne (auto-assignées) et ne modifier/supprimer que
    les siennes — jamais celles d'un collègue.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if user.is_superuser or user.role in ('ADMIN', 'SECRETARIAT'):
            return True
        if user.role != 'ENSEIGNANT':
            return False
        if view.action == 'create':
            enseignant_id = request.data.get('enseignant')
            return enseignant_id in (None, '', user.id, str(user.id))
        return True  # actions detail bornées par has_object_permission

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser or user.role in ('ADMIN', 'SECRETARIAT'):
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.enseignant_id == user.id


class CanManageNote(CanManageMatiereScopedResource):
    pass


class CanManagePresence(CanManageMatiereScopedResource):
    creation_like_actions = ('create', 'appel')


class CanManageCahierTexte(CanManageMatiereScopedResource):
    pass


class IsSameEcole(permissions.BasePermission):
    """Vérification au niveau objet : l'objet doit appartenir à l'établissement de l'utilisateur."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        obj_ecole_id = getattr(obj, 'ecole_id', None)
        if obj_ecole_id is None:
            ecole = getattr(obj, 'ecole', None)
            obj_ecole_id = ecole.id if ecole else None
        return obj_ecole_id is not None and obj_ecole_id == user.ecole_id


class EcoleScopedQuerysetMixin:
    """Restreint automatiquement le queryset d'un ViewSet à l'établissement de l'utilisateur.

    `ecole_field` est le chemin (avec `__`) vers l'identifiant de l'établissement
    depuis le modèle du ViewSet, ex: 'ecole_id', 'annee_scolaire__ecole_id',
    'matiere__filiere__ecole_id'.
    """
    ecole_field = 'ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_superuser:
            return qs
        if not user.ecole_id:
            return qs.none()
        return qs.filter(**{self.ecole_field: user.ecole_id})
