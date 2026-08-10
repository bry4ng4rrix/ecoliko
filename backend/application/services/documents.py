"""Workflow de demande de document administratif et génération du PDF associé.

Le PDF n'est jamais stocké : il est régénéré à la demande à partir des données courantes,
ce qui évite tout risque de désynchronisation (ex: changement de classe après génération).
"""
from io import BytesIO

from django.db import transaction
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from ..models import DemandeDocument


@transaction.atomic
def valider_demande(demande: DemandeDocument, traite_par) -> DemandeDocument:
    demande.statut = DemandeDocument.Statut.VALIDE
    demande.traite_par = traite_par
    demande.date_traitement = timezone.now()
    demande.motif_refus = None
    demande.save(update_fields=['statut', 'traite_par', 'date_traitement', 'motif_refus'])
    return demande


@transaction.atomic
def refuser_demande(demande: DemandeDocument, traite_par, motif: str) -> DemandeDocument:
    demande.statut = DemandeDocument.Statut.REFUSE
    demande.traite_par = traite_par
    demande.date_traitement = timezone.now()
    demande.motif_refus = motif
    demande.save(update_fields=['statut', 'traite_par', 'date_traitement', 'motif_refus'])
    return demande


_TEXTES = {
    DemandeDocument.TypeDocument.CERTIFICAT_SCOLARITE: (
        'CERTIFICAT DE SCOLARITÉ',
        "Nous soussignés certifions que l'élève désigné ci-dessous est régulièrement inscrit "
        "dans notre établissement au titre de l'année scolaire {annee}.",
    ),
    DemandeDocument.TypeDocument.ATTESTATION: (
        'ATTESTATION DE FRÉQUENTATION',
        "Nous attestons que l'élève désigné ci-dessous fréquente régulièrement notre "
        "établissement au titre de l'année scolaire {annee}.",
    ),
    DemandeDocument.TypeDocument.CERTIFICAT_REUSSITE: (
        'CERTIFICAT DE RÉUSSITE',
        "Nous certifions que l'élève désigné ci-dessous a satisfait aux conditions de "
        "passage pour l'année scolaire {annee}.",
    ),
}


def generer_pdf_document(demande: DemandeDocument) -> bytes:
    if demande.statut != DemandeDocument.Statut.VALIDE:
        raise ValueError('Seule une demande validée peut être téléchargée.')

    titre, texte = _TEXTES[demande.type_document]
    etudiant = demande.etudiant

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(etudiant.ecole.nom, styles['Title']),
        Spacer(1, 1 * cm),
        Paragraph(titre, styles['Heading1']),
        Spacer(1, 1 * cm),
        Paragraph(texte.format(annee=demande.annee_scolaire.libelle), styles['Normal']),
        Spacer(1, 1 * cm),
        Paragraph(f"Nom : {etudiant.nom.upper()}", styles['Normal']),
        Paragraph(f"Prénom : {etudiant.prenom}", styles['Normal']),
        Paragraph(f"Matricule : {etudiant.matricule}", styles['Normal']),
        Paragraph(f"Date de naissance : {etudiant.date_naissance.strftime('%d/%m/%Y')}", styles['Normal']),
        Spacer(1, 2 * cm),
        Paragraph(f"Délivré le {timezone.now().strftime('%d/%m/%Y')}, pour servir et valoir ce que de droit.", styles['Normal']),
    ]
    doc.build(elements)
    return buffer.getvalue()
