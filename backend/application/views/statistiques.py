from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AnneeScolaire, Trimestre
from ..permissions import IsAdminOrResponsable
from ..services import statistiques as stats_service


class StatistiquesView(APIView):
    """Synthèse statistique de l'établissement (effectifs, moyennes par classe, taux de

    réussite, taux de présence) pour une année scolaire, optionnellement un trimestre.
    Réservée à l'admin et au responsable pédagogique.
    """
    permission_classes = [IsAdminOrResponsable]

    def get(self, request):
        annee_id = request.query_params.get('annee_scolaire')
        trimestre_id = request.query_params.get('trimestre')

        annee = AnneeScolaire.objects.filter(pk=annee_id, ecole=request.user.ecole).first()
        if annee is None:
            return Response({'detail': "Année scolaire introuvable pour cet établissement."}, status=404)

        trimestre = None
        if trimestre_id:
            trimestre = Trimestre.objects.filter(pk=trimestre_id, annee_scolaire=annee).first()
            if trimestre is None:
                return Response({'detail': "Trimestre introuvable pour cette année scolaire."}, status=404)

        return Response(stats_service.synthese_statistiques(annee, trimestre))
