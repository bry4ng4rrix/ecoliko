from django.http import HttpResponse
from rest_framework import permissions, viewsets
from rest_framework.decorators import action

from ..models import Etudiant, Inscription, TuteurEtudiant, User
from ..permissions import EcoleScopedQuerysetMixin, IsAdminOrSecretariat, IsStaffPedagogique
from ..serializers import EtudiantSerializer, InscriptionSerializer, TuteurEtudiantSerializer
from ..services import scoping
from ..services.carte_etudiant import generer_carte_etudiant_pdf
from ..services.identite import codebarre_etudiant_png, qrcode_etudiant_png


class EtudiantViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    """Accès scopé par rôle : un enseignant ne voit que ses élèves, un étudiant/parent

    ne voit que son propre dossier / celui de ses enfants.
    """
    queryset = Etudiant.objects.select_related('ecole', 'utilisateur')
    serializer_class = EtudiantSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        role = getattr(user, 'role', None)
        if role == User.Role.ENSEIGNANT:
            return qs.filter(pk__in=scoping.etudiants_du_professeur(user).values('pk'))
        if role == User.Role.ETUDIANT:
            return qs.filter(utilisateur=user)
        if role == User.Role.PARENT:
            return qs.filter(tuteurs__parent=user).distinct()
        return qs  # ADMIN / RESPONSABLE / SECRETARIAT : tout l'établissement

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminOrSecretariat()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def qrcode(self, request, pk=None):
        """QR code d'identification de l'étudiant (carte scolaire)."""
        etudiant = self.get_object()
        return HttpResponse(qrcode_etudiant_png(etudiant), content_type='image/png')

    @action(detail=True, methods=['get'], url_path='codebarre')
    def codebarre(self, request, pk=None):
        """Code-barres (Code128) du matricule de l'étudiant."""
        etudiant = self.get_object()
        return HttpResponse(codebarre_etudiant_png(etudiant), content_type='image/png')

    @action(detail=True, methods=['get'], url_path='carte')
    def carte(self, request, pk=None):
        """Carte d'étudiant PDF (format CR80), photo + matricule + QR code."""
        etudiant = self.get_object()
        pdf_bytes = generer_carte_etudiant_pdf(etudiant)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="carte_{etudiant.matricule}.pdf"'
        return response


class InscriptionViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Inscription.objects.select_related('etudiant', 'classe', 'annee_scolaire')
    serializer_class = InscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffPedagogique]
    ecole_field = 'etudiant__ecole_id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminOrSecretariat()]
        return [permissions.IsAuthenticated(), IsStaffPedagogique()]


class TuteurEtudiantViewSet(EcoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = TuteurEtudiant.objects.select_related('parent', 'etudiant')
    serializer_class = TuteurEtudiantSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'etudiant__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_superuser and getattr(user, 'role', None) == User.Role.PARENT:
            return qs.filter(parent=user)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminOrSecretariat()]
        return [permissions.IsAuthenticated()]
