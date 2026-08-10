from rest_framework import permissions, viewsets

from ..models import AuditLog
from ..permissions import EcoleScopedQuerysetMixin, IsAdmin
from ..serializers import AuditLogSerializer


class AuditLogViewSet(EcoleScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """Consultation du journal d'audit : réservée à l'administrateur de l'établissement."""
    queryset = AuditLog.objects.select_related('utilisateur')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    ecole_field = 'ecole_id'
