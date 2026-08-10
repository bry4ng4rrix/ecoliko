from django.http import HttpResponse
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import DemandeDocument, User
from ..permissions import EcoleScopedQuerysetMixin, IsAdminOrSecretariat
from ..serializers import DemandeDocumentSerializer, RefuserDemandeSerializer
from ..services.documents import generer_pdf_document, refuser_demande, valider_demande


class DemandeDocumentViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Un étudiant ne peut demander un document que pour lui-même ; validation réservée au personnel."""
    queryset = DemandeDocument.objects.select_related('etudiant', 'annee_scolaire', 'demande_par', 'traite_par')
    serializer_class = DemandeDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'etudiant__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        role = getattr(user, 'role', None)
        if role == User.Role.ETUDIANT:
            return qs.filter(etudiant__utilisateur=user)
        if role == User.Role.PARENT:
            return qs.filter(etudiant__tuteurs__parent=user).distinct()
        return qs  # ADMIN / RESPONSABLE / SECRETARIAT

    def get_permissions(self):
        if self.action in ('valider', 'refuser'):
            return [permissions.IsAuthenticated(), IsAdminOrSecretariat()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        role = getattr(user, 'role', None)
        if role == User.Role.ETUDIANT:
            etudiant = serializer.validated_data.get('etudiant')
            if etudiant is None or etudiant.utilisateur_id != user.id:
                raise PermissionDenied("Vous ne pouvez demander un document que pour vous-même.")
        serializer.save()

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        demande = self.get_object()
        valider_demande(demande, request.user)
        return Response(DemandeDocumentSerializer(demande).data)

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        serializer = RefuserDemandeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        demande = self.get_object()
        refuser_demande(demande, request.user, serializer.validated_data.get('motif', ''))
        return Response(DemandeDocumentSerializer(demande).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        demande = self.get_object()
        try:
            pdf_bytes = generer_pdf_document(demande)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{demande.type_document.lower()}_{demande.etudiant.matricule}.pdf"'
        return response
