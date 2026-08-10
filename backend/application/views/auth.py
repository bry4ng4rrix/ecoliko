from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from ..models import DemandeInscriptionSuivi, User
from ..permissions import EcoleScopedQuerysetMixin, IsAdmin, IsAdminOrSecretariat, IsStaffPedagogique
from ..serializers import (
    CustomTokenObtainPairSerializer, DemandeInscriptionSerializer, DemandeInscriptionSuiviSerializer,
    EcoleAdminRegisterSerializer, RegisterSerializer, StaffCreateSerializer, UserSerializer,
)
from ..serializers.academique import EcoleSerializer


class RegisterView(generics.CreateAPIView):
    """Auto-inscription publique (Étudiant / Parent uniquement, compte inactif à la création)."""
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            'message': (
                "Compte créé. Il doit être activé par un administrateur de "
                "l'établissement avant la première connexion."
            ),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class RegisterEcoleView(generics.CreateAPIView):
    """Auto-inscription publique d'un administrateur fondateur : crée un nouvel établissement.

    Contrairement à `RegisterView`, le compte créé ici est actif immédiatement (rôle ADMIN).
    """
    permission_classes = (AllowAny,)
    serializer_class = EcoleAdminRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ecole, admin = serializer.save()

        return Response({
            'message': "Établissement et compte administrateur créés. Vous pouvez vous connecter.",
            'ecole': EcoleSerializer(ecole).data,
            'user': UserSerializer(admin).data,
        }, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Profil de l'utilisateur connecté (lecture/écriture de ses propres données)."""
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.GenericAPIView):
    """Changement de mot de passe par l'utilisateur connecté (ex: après un premier

    login avec le mot de passe temporaire, voir `User.must_change_password`).
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        ancien = request.data.get('ancien_mot_de_passe')
        nouveau = request.data.get('nouveau_mot_de_passe')

        if not ancien or not nouveau:
            return Response(
                {'detail': "Les champs 'ancien_mot_de_passe' et 'nouveau_mot_de_passe' sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(ancien):
            return Response({'ancien_mot_de_passe': "Mot de passe actuel incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        if len(nouveau) < 8:
            return Response(
                {'nouveau_mot_de_passe': "Le nouveau mot de passe doit contenir au moins 8 caractères."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(nouveau)
        request.user.must_change_password = False
        request.user.save(update_fields=['password', 'must_change_password'])
        return Response({'detail': 'Mot de passe mis à jour.'})


class StaffViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Gestion du personnel (Admin/Enseignant/Responsable/Secrétariat) d'un établissement.

    Écriture réservée à l'administrateur ; lecture ouverte à tout le personnel (nécessaire
    pour l'annuaire de la messagerie interne). L'établissement d'un compte créé ici est
    toujours celui de l'admin qui le crée (jamais fourni par le client).
    """
    ecole_field = 'ecole_id'
    queryset = User.objects.exclude(role=User.Role.ETUDIANT).exclude(role=User.Role.PARENT)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsStaffPedagogique()]

    def get_serializer_class(self):
        if self.action == 'create':
            return StaffCreateSerializer
        return UserSerializer


class DemandeInscriptionViewSet(EcoleScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """Comptes auto-inscrits (rôle Étudiant/Parent, voir `RegisterView`) en attente

    d'activation par un administrateur ou le secrétariat : consultation du dossier
    soumis, puis validation (active le compte) ou rejet (supprime la demande).
    """
    queryset = User.objects.filter(role__in=(User.Role.ETUDIANT, User.Role.PARENT), is_active=False)
    serializer_class = DemandeInscriptionSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSecretariat]
    ecole_field = 'ecole_id'

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        compte = self.get_object()
        compte.is_active = True
        compte.save(update_fields=['is_active'])
        return Response(DemandeInscriptionSerializer(compte).data)

    @action(detail=True, methods=['post'])
    def rejeter(self, request, pk=None):
        compte = self.get_object()
        compte.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'])
    def suivi(self, request, pk=None):
        """Renseigne le statut de paiement des frais d'inscription (voir `DemandeInscriptionSuivi`)."""
        compte = self.get_object()
        suivi, _cree = DemandeInscriptionSuivi.objects.get_or_create(utilisateur=compte)
        serializer = DemandeInscriptionSuiviSerializer(suivi, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(DemandeInscriptionSerializer(compte).data)
