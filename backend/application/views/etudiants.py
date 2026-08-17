from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import AnneeScolaire, DemandeDocument, Etudiant, Inscription, TuteurEtudiant, User
from ..permissions import EcoleScopedQuerysetMixin, IsAdminOrSecretariat, IsStaffPedagogique
from ..serializers import EtudiantSerializer, InscriptionSerializer, TuteurEtudiantSerializer
from ..services import scoping
from ..services.carte_ecolage import generer_carte_ecolage_pdf
from ..services.carte_etudiant import generer_carte_etudiant_pdf
from ..services.documents import generer_pdf_document
from ..services.facture_ecolage import generer_facture_ecolage_pdf
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
        # Administrative writes and certificate generation remain admin/secretariat-only
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'certificat_scolarite'):
            return [permissions.IsAuthenticated(), IsAdminOrSecretariat()]
        # Allow authenticated users (including parents scoped via get_queryset) to download carte_ecolage
        if self.action in ('carte_ecolage', 'facture_ecolage'):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['patch'], url_path='suivi-inscription', permission_classes=[IsAdminOrSecretariat])
    def suivi_inscription(self, request, pk=None):
        """Met à jour le suivi de paiement des droits d'inscription/réinscription pour l'étudiant.

        Corps possible: `{ "frais_inscription_paye": true, "notes": "..." }`.
        """
        etudiant = self.get_object()
        utilisateur = etudiant.utilisateur
        if utilisateur is None:
            return Response({'detail': "Étudiant sans compte utilisateur associé."}, status=400)

        from ..models import DemandeInscriptionSuivi
        from ..serializers import DemandeInscriptionSuiviSerializer

        suivi, _ = DemandeInscriptionSuivi.objects.get_or_create(utilisateur=utilisateur)
        serializer = DemandeInscriptionSuiviSerializer(suivi, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'suivi': serializer.data})

    @action(detail=True, methods=['post'], url_path='certificat-scolarite')
    def certificat_scolarite(self, request, pk=None):
        """Génère directement un certificat de scolarité PDF (validé d'office par l'admin/bureau)."""
        etudiant = self.get_object()
        annee = AnneeScolaire.objects.filter(ecole=etudiant.ecole, est_active=True).first()
        if annee is None:
            return Response({'detail': "Aucune année scolaire active pour cet établissement."}, status=400)

        demande = DemandeDocument.objects.create(
            etudiant=etudiant, annee_scolaire=annee,
            type_document=DemandeDocument.TypeDocument.CERTIFICAT_SCOLARITE,
            statut=DemandeDocument.Statut.VALIDE, demande_par=request.user, traite_par=request.user,
            date_traitement=timezone.now(),
        )
        pdf_bytes = generer_pdf_document(demande)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="certificat_scolarite_{etudiant.matricule}.pdf"'
        return response

    @action(detail=True, methods=['get'], url_path='carte-ecolage')
    def carte_ecolage(self, request, pk=None):
        """Carte d'écolage PDF : reçu récapitulatif des paiements de l'étudiant pour l'année active."""
        etudiant = self.get_object()
        annee = AnneeScolaire.objects.filter(ecole=etudiant.ecole, est_active=True).first()
        if annee is None:
            return Response({'detail': "Aucune année scolaire active pour cet établissement."}, status=400)

        pdf_bytes = generer_carte_ecolage_pdf(etudiant, annee)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="carte_ecolage_{etudiant.matricule}.pdf"'
        return response

    @action(detail=True, methods=['get'], url_path='facture-ecolage')
    def facture_ecolage(self, request, pk=None):
        """Facture PDF pour un mois d'écolage impayé ou le droit d'inscription (?mois= ou ?type=inscription)."""
        etudiant = self.get_object()
        annee_id = request.query_params.get('annee_scolaire')
        if not annee_id:
            return Response({'detail': "Paramètre 'annee_scolaire' requis."}, status=400)

        annee = AnneeScolaire.objects.filter(pk=annee_id, ecole_id=etudiant.ecole_id).first()
        if annee is None:
            return Response({'detail': 'Année scolaire introuvable.'}, status=404)

        type_facture = request.query_params.get('type')
        mois_param = request.query_params.get('mois')
        allow_paye = request.query_params.get('allow_paye') in ('1', 'true', 'yes', 'True')

        try:
            if type_facture == 'inscription':
                pdf_bytes = generer_facture_ecolage_pdf(etudiant, annee, inscription=True, allow_paye=allow_paye)
                suffix = 'inscription'
            else:
                if not mois_param:
                    return Response({'detail': "Paramètre 'mois' requis (1-12) ou type=inscription."}, status=400)
                mois = int(mois_param)
                pdf_bytes = generer_facture_ecolage_pdf(etudiant, annee, mois_couvert=mois, allow_paye=allow_paye)
                suffix = f"mois_{mois:02d}"
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="facture_ecolage_{etudiant.matricule}_{suffix}.pdf"'
        return response

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
    """Un étudiant/parent peut consulter (lecture seule) les inscriptions de son propre

    dossier / celui de ses enfants — nécessaire pour calculer les tarifs d'écolage côté
    élève/parent (classe, niveau, filière de l'inscription active). L'écriture reste
    réservée à l'admin/secrétariat, la lecture "large" (tout établissement) au personnel
    pédagogique.
    """
    queryset = Inscription.objects.select_related('etudiant', 'classe', 'annee_scolaire')
    serializer_class = InscriptionSerializer
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
        return qs  # ADMIN / RESPONSABLE / ENSEIGNANT / SECRETARIAT : cf. get_permissions

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminOrSecretariat()]
        if self.action in ('list', 'retrieve'):
            role = getattr(self.request.user, 'role', None)
            if role in (User.Role.ETUDIANT, User.Role.PARENT):
                return [permissions.IsAuthenticated()]
            return [permissions.IsAuthenticated(), IsStaffPedagogique()]
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
