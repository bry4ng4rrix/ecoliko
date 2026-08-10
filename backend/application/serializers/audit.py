from rest_framework import serializers

from ..models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.CharField(source='utilisateur.get_full_name', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = (
            'id', 'utilisateur', 'utilisateur_nom', 'action', 'modele', 'objet_id', 'objet_repr', 'date_action',
        )
        read_only_fields = fields
