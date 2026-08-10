"""Génération de la carte d'étudiant (PDF format CR80, taille d'une carte bancaire).

Assemble les éléments déjà disponibles (photo, QR code — voir `identite.py`) sur une
mise en page imprimable, recto uniquement.
"""
from io import BytesIO

from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from .identite import qrcode_etudiant_png

CARTE_LARGEUR = 85.6 * mm
CARTE_HAUTEUR = 54 * mm


def generer_carte_etudiant_pdf(etudiant) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=landscape((CARTE_LARGEUR, CARTE_HAUTEUR)))
    largeur, hauteur = landscape((CARTE_LARGEUR, CARTE_HAUTEUR))

    ecole = etudiant.ecole
    inscription = etudiant.inscription_courante
    classe_nom = inscription.classe.nom if inscription else '—'

    # Bandeau d'en-tête
    pdf.setFillColorRGB(0.24, 0.29, 0.9)
    pdf.rect(0, hauteur - 12 * mm, largeur, 12 * mm, fill=1, stroke=0)
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont('Helvetica-Bold', 9)
    pdf.drawString(4 * mm, hauteur - 8 * mm, ecole.nom[:38])
    pdf.setFont('Helvetica', 6.5)
    pdf.drawString(4 * mm, hauteur - 11 * mm, "Carte d'étudiant")

    # Photo (ou cadre vide si absente)
    photo_x, photo_y, photo_taille = 4 * mm, hauteur - 34 * mm, 20 * mm
    pdf.setStrokeColorRGB(0.7, 0.7, 0.7)
    pdf.rect(photo_x, photo_y, photo_taille, photo_taille, fill=0, stroke=1)
    if etudiant.photo:
        try:
            pdf.drawImage(
                ImageReader(etudiant.photo.path), photo_x, photo_y, width=photo_taille, height=photo_taille,
                preserveAspectRatio=True, anchor='c',
            )
        except (FileNotFoundError, ValueError):
            pass

    # Identité
    texte_x = photo_x + photo_taille + 4 * mm
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(texte_x, hauteur - 17 * mm, etudiant.get_full_name()[:28])
    pdf.setFont('Helvetica', 7.5)
    pdf.drawString(texte_x, hauteur - 22 * mm, f"Matricule : {etudiant.matricule}")
    pdf.drawString(texte_x, hauteur - 26.5 * mm, f"Classe : {classe_nom}")
    pdf.drawString(texte_x, hauteur - 31 * mm, f"Né(e) le : {etudiant.date_naissance.strftime('%d/%m/%Y')}")

    # QR code
    qr_taille = 16 * mm
    qr_image = ImageReader(BytesIO(qrcode_etudiant_png(etudiant)))
    pdf.drawImage(qr_image, largeur - qr_taille - 4 * mm, 4 * mm, width=qr_taille, height=qr_taille)

    pdf.setFont('Helvetica-Oblique', 6)
    pdf.setFillColorRGB(0.4, 0.4, 0.4)
    pdf.drawString(4 * mm, 3 * mm, 'En cas de perte, merci de restituer cette carte à l\'établissement.')

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
