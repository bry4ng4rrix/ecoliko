import re

from rest_framework import serializers

from ..models import Matiere, Note
from .base import ValidatedModelSerializer


def _generer_code_matiere(intitule, ecole):
    """Code court dérivé de l'intitulé (ex: "Mathématiques" -> "MATH"), désambiguïsé

    par établissement si besoin (ex: "MATH2") — évite de demander ce champ technique
    à l'utilisateur alors qu'il ne sert qu'à l'affichage/tri.
    """
    base = re.sub(r'[^A-Za-z]', '', intitule).upper()[:8] or 'MATIERE'
    code = base
    suffixe = 1
    while Matiere.objects.filter(ecole=ecole, code=code).exists():
        suffixe += 1
        code = f"{base[:10 - len(str(suffixe))]}{suffixe}"
    return code


class MatiereSerializer(ValidatedModelSerializer):
    enseignant_nom = serializers.SerializerMethodField()
    enseignant_photo = serializers.ImageField(source='enseignant.photo', read_only=True, default=None)

    class Meta:
        model = Matiere
        fields = (
            'id', 'ecole', 'code', 'intitule', 'description', 'coefficient', 'couleur',
            'filiere', 'niveau', 'enseignant', 'enseignant_nom', 'enseignant_photo', 'est_active',
        )
        read_only_fields = ('ecole',)
        # Le validateur unique_together auto-généré par DRF force TOUS les champs du tuple
        # (donc `code`) à devenir "required", même avec blank=True sur le modèle — cassant le
        # formulaire simplifié. L'unicité est déjà gérée explicitement par
        # `_generer_code_matiere` (et en dernier recours par la contrainte DB elle-même).
        validators = []

    def get_enseignant_nom(self, obj):
        return obj.enseignant.get_full_name() if obj.enseignant else None

    def validate(self, attrs):
        # `ecole` est read-only (forcé côté serveur, jamais fourni par le client) mais
        # `Matiere.clean()` (appelé par ValidatedModelSerializer.validate ci-dessous) vérifie
        # la cohérence établissement de `filiere`/`niveau` par rapport à `ecole` : il faut donc
        # l'injecter avant l'appel, sous peine de comparer contre un `ecole_id` vide sur
        # l'instance jetable et de rejeter à tort un niveau/filière pourtant valide.
        ecole = self.instance.ecole if self.instance else self.context['request'].user.ecole
        attrs = {**attrs, 'ecole': ecole}

        code = attrs.get('code')
        if code:
            conflit = Matiere.objects.filter(ecole=ecole, code=code)
            if self.instance:
                conflit = conflit.exclude(pk=self.instance.pk)
            if conflit.exists():
                raise serializers.ValidationError({'code': "Ce code est déjà utilisé dans l'établissement."})

        return super().validate(attrs)

    def create(self, validated_data):
        if not validated_data.get('code'):
            validated_data['code'] = _generer_code_matiere(validated_data['intitule'], validated_data['ecole'])
        return super().create(validated_data)


class NoteSerializer(ValidatedModelSerializer):
    class Meta:
        model = Note
        fields = (
            'id', 'etudiant', 'matiere', 'trimestre', 'valeur', 'date_evaluation',
            'type_evaluation', 'commentaire', 'saisie_par', 'date_creation', 'date_modification',
        )
        read_only_fields = ('saisie_par', 'date_creation', 'date_modification')

    def create(self, validated_data):
        validated_data['saisie_par'] = self.context['request'].user
        return super().create(validated_data)
