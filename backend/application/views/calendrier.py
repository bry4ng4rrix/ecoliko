from rest_framework import permissions, viewsets

from ..models import EvenementCalendrier
from ..permissions import EcoleScopedQuerysetMixin, ReadOnlyOrAdminOrSecretariat
from ..serializers import EvenementCalendrierSerializer


class EvenementCalendrierViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Vacances, examens, événements et réunions affichés en plus des cours.

    Lecture ouverte à tout le monde dans l'établissement ; écriture réservée à l'admin/bureau.
    """
    queryset = EvenementCalendrier.objects.all()
    serializer_class = EvenementCalendrierSerializer
    permission_classes = [permissions.IsAuthenticated, ReadOnlyOrAdminOrSecretariat]
    ecole_field = 'ecole_id'
