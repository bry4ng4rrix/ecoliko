from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class ValidatedModelSerializer(serializers.ModelSerializer):
    """DRF n'appelle jamais `Model.clean()` : ce mixin le fait explicitement, sur

    une instance jetable (jamais `self.instance` directement), pour que les règles
    métier centralisées dans les modèles s'appliquent aussi via l'API.
    """

    def validate(self, attrs):
        model_class = self.Meta.model
        if self.instance is not None:
            instance = model_class(pk=self.instance.pk)
            for field in self.instance._meta.fields:
                setattr(instance, field.attname, getattr(self.instance, field.attname))
        else:
            instance = model_class()

        for key, value in attrs.items():
            setattr(instance, key, value)

        try:
            instance.clean()
        except DjangoValidationError as exc:
            if hasattr(exc, 'message_dict'):
                raise serializers.ValidationError(exc.message_dict)
            raise serializers.ValidationError({'non_field_errors': exc.messages})

        return attrs
