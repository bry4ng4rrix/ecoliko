from rest_framework import serializers

from ..models import Annonce, Message, Notification
from .base import ValidatedModelSerializer


class MessageSerializer(ValidatedModelSerializer):
    expediteur_nom = serializers.CharField(source='expediteur.get_full_name', read_only=True)
    destinataire_nom = serializers.CharField(source='destinataire.get_full_name', read_only=True)

    class Meta:
        model = Message
        fields = (
            'id', 'expediteur', 'expediteur_nom', 'destinataire', 'destinataire_nom',
            'objet', 'contenu', 'est_lu', 'date_envoi',
        )
        read_only_fields = ('expediteur', 'est_lu', 'date_envoi')

    def create(self, validated_data):
        validated_data['expediteur'] = self.context['request'].user
        return super().create(validated_data)


class AnnonceSerializer(ValidatedModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True, default=None)
    classe_nom = serializers.CharField(source='classe.nom', read_only=True, default=None)

    class Meta:
        model = Annonce
        fields = (
            'id', 'ecole', 'classe', 'classe_nom', 'portee', 'titre', 'contenu',
            'auteur', 'auteur_nom', 'date_publication',
        )
        read_only_fields = ('ecole', 'auteur', 'date_publication')

    def create(self, validated_data):
        validated_data['ecole'] = self.context['request'].user.ecole
        validated_data['auteur'] = self.context['request'].user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Créée uniquement par les signaux (voir `signals.py`), jamais par un utilisateur : lecture seule."""

    class Meta:
        model = Notification
        fields = ('id', 'type_notification', 'titre', 'message', 'est_lue', 'date_creation')
        read_only_fields = fields
