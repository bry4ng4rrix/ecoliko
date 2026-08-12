from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import EvenementCalendrier, User
from ..permissions import EcoleScopedQuerysetMixin, ReadOnlyOrAdminOrSecretariat
from ..serializers import EvenementCalendrierSerializer
from ..services import scoping
from ..services.jours_feries import ErreurRecuperationJoursFeries, recuperer_jours_feries_madagascar


class EvenementCalendrierViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Vacances, examens, événements et réunions affichés en plus des cours.

    Lecture ouverte à tout le monde dans l'établissement (événements sans classe) ; un
    événement rattaché à une classe (ex: échéance de devoir) n'est visible que par cette
    classe (étudiant/parent) ou l'enseignant qui l'enseigne. Écriture réservée à l'admin/bureau.
    """
    queryset = EvenementCalendrier.objects.all()
    serializer_class = EvenementCalendrierSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdminOrSecretariat]
    ecole_field = 'ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        role = getattr(user, 'role', None)
        if role == User.Role.ETUDIANT:
            return qs.filter(Q(classe__isnull=True) | Q(classe__inscriptions__etudiant__utilisateur=user)).distinct()
        if role == User.Role.PARENT:
            return qs.filter(
                Q(classe__isnull=True) | Q(classe__inscriptions__etudiant__tuteurs__parent=user)
            ).distinct()
        if role == User.Role.ENSEIGNANT:
            return qs.filter(
                Q(classe__isnull=True) | Q(classe__in=scoping.classes_du_professeur(user))
            ).distinct()
        return qs  # ADMIN / RESPONSABLE / SECRETARIAT

    @action(detail=False, methods=['post'], url_path='synchroniser-jours-feries')
    def synchroniser_jours_feries(self, request):
        """Importe tous les jours fériés de Madagascar disponibles dans la source externe

        (plusieurs années, passées et futures — pas seulement l'année scolaire active), pour
        qu'ils apparaissent en naviguant le calendrier sur n'importe quel mois. Idempotent :
        une resynchronisation ne recrée pas les jours fériés déjà importés (dédoublonnage par
        `source_externe`) — elle met à jour leur intitulé/description si la source a changé.
        """
        ecole = request.user.ecole

        try:
            jours_feries = recuperer_jours_feries_madagascar()
        except ErreurRecuperationJoursFeries as exc:
            return Response({'detail': str(exc)}, status=502)

        crees = 0
        for jf in jours_feries:
            _, a_ete_cree = EvenementCalendrier.objects.update_or_create(
                ecole=ecole, source_externe=jf['uid'],
                defaults={
                    'titre': jf['titre'], 'type_evenement': EvenementCalendrier.TypeEvenement.JOUR_FERIE,
                    'date_debut': jf['date'], 'date_fin': jf['date'],
                    'description': jf.get('description') or 'Jour férié (source : calendrier public Madagascar)',
                    'cree_par': request.user,
                },
            )
            if a_ete_cree:
                crees += 1

        return Response({
            'total_trouves': len(jours_feries), 'crees': crees, 'deja_existants': len(jours_feries) - crees,
        })
