"""Génération de la carte d'écolage : reçu récapitulatif des paiements de scolarité d'un

étudiant pour une année scolaire (frais généraux + suivi mensuel), au format PDF.
"""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..models import PaiementEcolage
from .finance import dossier_financier

MOIS_LABELS = {
    1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
    7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}


def generer_carte_ecolage_pdf(etudiant, annee_scolaire) -> bytes:
    dossier = dossier_financier(etudiant, annee_scolaire)
    inscription = etudiant.inscriptions.filter(annee_scolaire=annee_scolaire).select_related('classe').first()
    classe_nom = inscription.classe.nom if inscription else '—'

    paiements = {
        p.mois_couvert: p
        for p in PaiementEcolage.objects.filter(etudiant=etudiant, annee_scolaire=annee_scolaire)
        .order_by('mois_couvert')
    }

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(etudiant.ecole.nom, styles['Title']),
        Paragraph(f"Carte d'écolage — {annee_scolaire.libelle}", styles['Heading2']),
        Spacer(1, 0.5 * cm),
    ]

    infos = [
        ['Élève', f"{etudiant.nom.upper()} {etudiant.prenom}"],
        ['Matricule', etudiant.matricule],
        ['Classe', classe_nom],
    ]
    table_infos = Table(infos, colWidths=[4 * cm, 10 * cm])
    table_infos.setStyle(TableStyle([('FONTSIZE', (0, 0), (-1, -1), 10)]))
    elements.append(table_infos)
    elements.append(Spacer(1, 0.5 * cm))

    resume = [
        ['Total dû', 'Total payé', 'Reste à payer', 'Statut'],
        [
            f"{dossier['total_du']:,.0f} Ar".replace(',', ' '),
            f"{dossier['total_paye']:,.0f} Ar".replace(',', ' '),
            f"{dossier['reste_du']:,.0f} Ar".replace(',', ' '),
            dossier['statut'],
        ],
    ]
    table_resume = Table(resume, colWidths=[3.5 * cm] * 4)
    table_resume.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(table_resume)
    elements.append(Spacer(1, 0.8 * cm))

    elements.append(Paragraph('Suivi mensuel', styles['Heading3']))
    lignes = [['Mois', 'Montant', 'Date', 'Statut']]
    for mois in range(1, 13):
        paiement = paiements.get(mois)
        if paiement:
            lignes.append([
                MOIS_LABELS[mois], f"{paiement.montant:,.0f} Ar".replace(',', ' '),
                paiement.date_paiement.strftime('%d/%m/%Y'), paiement.get_statut_display(),
            ])
        else:
            lignes.append([MOIS_LABELS[mois], '—', '—', 'Non payé'])

    table_mensuel = Table(lignes, colWidths=[3.5 * cm, 3.5 * cm, 3.5 * cm, 3.5 * cm])
    table_mensuel.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table_mensuel)

    doc.build(elements)
    return buffer.getvalue()
