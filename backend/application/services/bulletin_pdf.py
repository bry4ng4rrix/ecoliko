"""Mise en page PDF d'un bulletin (reportlab : pur Python, sans dépendance système).

Séparé de `bulletin.py` : ce module ne fait que du rendu, à partir d'un `Bulletin`
déjà calculé — aucune règle métier ici.
"""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..models import Note
from . import moyenne as moyenne_service


def generer_pdf_bulletin(bulletin) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    elements = []

    ecole = bulletin.etudiant.ecole
    elements.append(Paragraph(ecole.nom, styles['Title']))
    periode = f"Trimestre {bulletin.trimestre.numero}" if bulletin.trimestre else 'Bulletin annuel'
    elements.append(Paragraph(f"{periode} — {bulletin.annee_scolaire.libelle}", styles['Heading2']))
    elements.append(Spacer(1, 0.5 * cm))

    infos = [
        ['Élève', bulletin.etudiant.get_full_name()],
        ['Matricule', bulletin.etudiant.matricule],
        ['Classe', bulletin.classe.nom],
    ]
    table_infos = Table(infos, colWidths=[4 * cm, 10 * cm])
    table_infos.setStyle(TableStyle([('FONTSIZE', (0, 0), (-1, -1), 10)]))
    elements.append(table_infos)
    elements.append(Spacer(1, 0.5 * cm))

    if bulletin.trimestre:
        notes = Note.objects.filter(
            etudiant=bulletin.etudiant, trimestre=bulletin.trimestre
        ).select_related('matiere')
        par_matiere = {}
        for note in notes:
            par_matiere.setdefault(note.matiere, []).append(note.valeur)
        rows = [['Matière', 'Coefficient', 'Moyenne']]
        for matiere, valeurs in par_matiere.items():
            moyenne_matiere = sum(valeurs) / len(valeurs)
            rows.append([matiere.intitule, str(matiere.coefficient), f"{moyenne_matiere:.2f}"])
    else:
        rows = [['Période', 'Moyenne']]
        for trimestre in bulletin.annee_scolaire.trimestres.order_by('numero'):
            moyenne_trimestre = moyenne_service.moyenne_trimestre(bulletin.etudiant, trimestre)
            rows.append([
                f"Trimestre {trimestre.numero}",
                f"{moyenne_trimestre:.2f}" if moyenne_trimestre is not None else '—',
            ])

    table_notes = Table(rows, colWidths=[8 * cm, 3 * cm, 3 * cm] if bulletin.trimestre else [8 * cm, 3 * cm])
    table_notes.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(table_notes)
    elements.append(Spacer(1, 0.5 * cm))

    resume = [
        ['Moyenne générale', f"{bulletin.moyenne_generale:.2f}/20" if bulletin.moyenne_generale is not None else '—'],
        ['Rang', f"{bulletin.rang}/{bulletin.effectif_classe}" if bulletin.rang else '—'],
        ['Mention', bulletin.get_mention_display()],
    ]
    if not bulletin.trimestre:
        resume.append(['Décision', bulletin.get_decision_display()])
    table_resume = Table(resume, colWidths=[6 * cm, 6 * cm])
    table_resume.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ]))
    elements.append(table_resume)

    elements.append(Spacer(1, 1 * cm))
    statut = 'Validé' if bulletin.est_valide else 'Non validé'
    elements.append(Paragraph(f"Statut : {statut}", styles['Normal']))

    doc.build(elements)
    return buffer.getvalue()
