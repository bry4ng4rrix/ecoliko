from django.http import HttpResponse
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import AnneeScolaire, Bulletin, Etudiant, Trimestre, User
from ..permissions import EcoleScopedQuerysetMixin, IsAdminOrResponsable, IsStaffPedagogique
from ..serializers import BulletinSerializer, GenererBulletinSerializer
from ..services import scoping
from ..services.bulletin import generer_bulletin, valider_bulletin
from ..services.bulletin_pdf import generer_pdf_bulletin


class BulletinViewSet(EcoleScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """Lecture scopée par rôle ; création exclusivement via l'action `generer` (calculée, jamais saisie)."""
    queryset = Bulletin.objects.select_related('etudiant', 'classe', 'annee_scolaire', 'trimestre')
    serializer_class = BulletinSerializer
    permission_classes = [permissions.IsAuthenticated]
    ecole_field = 'etudiant__ecole_id'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, 'role', None)
        if not user.is_superuser:
            if role == User.Role.ETUDIANT:
                qs = qs.filter(etudiant__utilisateur=user)
            elif role == User.Role.PARENT:
                qs = qs.filter(etudiant__tuteurs__parent=user).distinct()
            elif role == User.Role.ENSEIGNANT:
                qs = qs.filter(classe__in=scoping.classes_du_professeur(user))
            # ADMIN / RESPONSABLE / SECRETARIAT : tout l'établissement

        # `?etudiant=`/`?trimestre=`/`?annee_scolaire=` restreignent la liste (même bug de
        # filtre manquant que PaiementEcolageViewSet/NoteViewSet).
        etudiant_id = self.request.query_params.get('etudiant')
        if etudiant_id:
            qs = qs.filter(etudiant_id=etudiant_id)
        trimestre_id = self.request.query_params.get('trimestre')
        if trimestre_id:
            qs = qs.filter(trimestre_id=trimestre_id)
        annee_scolaire_id = self.request.query_params.get('annee_scolaire')
        if annee_scolaire_id:
            qs = qs.filter(annee_scolaire_id=annee_scolaire_id)
        return qs

    def get_permissions(self):
        if self.action == 'generer':
            return [permissions.IsAuthenticated(), IsStaffPedagogique()]
        if self.action == 'valider':
            return [permissions.IsAuthenticated(), IsAdminOrResponsable()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def generer(self, request):
        """Calcule (ou recalcule) le bulletin d'un étudiant (?etudiant, annee_scolaire, trimestre?)."""
        serializer = GenererBulletinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        user = request.user
        etudiants = Etudiant.objects.all() if user.is_superuser else Etudiant.objects.filter(ecole_id=user.ecole_id)
        etudiant = etudiants.filter(pk=payload['etudiant']).first()
        if etudiant is None:
            return Response({'detail': 'Étudiant introuvable.'}, status=404)

        annee = AnneeScolaire.objects.filter(pk=payload['annee_scolaire'], ecole_id=etudiant.ecole_id).first()
        if annee is None:
            return Response({'detail': 'Année scolaire introuvable.'}, status=404)

        trimestre = None
        if payload.get('trimestre'):
            trimestre = Trimestre.objects.filter(pk=payload['trimestre'], annee_scolaire=annee).first()
            if trimestre is None:
                return Response({'detail': 'Trimestre introuvable.'}, status=404)

        try:
            bulletin = generer_bulletin(etudiant, annee, trimestre)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)

        return Response(BulletinSerializer(bulletin).data, status=201)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        bulletin = self.get_object()
        valider_bulletin(bulletin, request.user)
        return Response(BulletinSerializer(bulletin).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        bulletin = self.get_object()
        pdf_bytes = generer_pdf_bulletin(bulletin)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="bulletin_{bulletin.etudiant.matricule}_{bulletin.pk}.pdf"'
        return response
