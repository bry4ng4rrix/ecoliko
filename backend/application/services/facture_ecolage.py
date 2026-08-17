"""Génération de factures d'écolage (mensuelles ou droit d'inscription) au format PDF."""
from datetime import date
from decimal import Decimal
from io import BytesIO

from django.db.models import Sum
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..models import FraisScolarite, PaiementEcolage
from .finance import est_reinscription

MOIS_LABELS = {
    1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
    7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}


def date_echeance_pour_mois(annee_scolaire, mois_couvert: int) -> date:
    annee_debut = annee_scolaire.date_debut.year
    annee = annee_debut if mois_couvert >= 9 else annee_debut + 1
    return date(annee, mois_couvert, 5)


def montant_ecolage_mensuel(etudiant, annee_scolaire) -> Decimal | None:
    inscription = etudiant.inscriptions.filter(annee_scolaire=annee_scolaire).select_related('classe').first()
    if inscription is None:
        return None
    classe = inscription.classe
    if classe.frais_ecolage_mensuel is not None:
        return classe.frais_ecolage_mensuel
    tarif = FraisScolarite.objects.filter(
        annee_scolaire=annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
    ).first()
    if tarif is None:
        return None
    return tarif.montant_annuel / Decimal('12')


def montant_droit_inscription(etudiant, annee_scolaire) -> Decimal | None:
    inscription = etudiant.inscriptions.filter(annee_scolaire=annee_scolaire).select_related('classe').first()
    if inscription is None:
        return None
    classe = inscription.classe
    tarif_classe_renseigne = (
        classe.frais_ecolage_mensuel is not None
        or classe.frais_inscription is not None
        or classe.frais_reinscription is not None
    )
    if tarif_classe_renseigne:
        if est_reinscription(etudiant, annee_scolaire) and classe.frais_reinscription is not None:
            return classe.frais_reinscription
        return classe.frais_inscription
    tarif = FraisScolarite.objects.filter(
        annee_scolaire=annee_scolaire, niveau=classe.niveau, filiere=classe.filiere,
    ).first()
    return tarif.montant_inscription if tarif else None


def _total_paye(etudiant, annee_scolaire) -> Decimal:
    return PaiementEcolage.objects.filter(
        etudiant=etudiant,
        annee_scolaire=annee_scolaire,
        statut=PaiementEcolage.StatutPaiement.PAYE,
    ).aggregate(total=Sum('montant'))['total'] or Decimal('0')


def est_mois_paye(etudiant, annee_scolaire, mois_couvert: int) -> bool:
    return PaiementEcolage.objects.filter(
        etudiant=etudiant,
        annee_scolaire=annee_scolaire,
        mois_couvert=mois_couvert,
        statut=PaiementEcolage.StatutPaiement.PAYE,
    ).exists()


def est_inscription_payee(etudiant, annee_scolaire) -> bool:
    montant = montant_droit_inscription(etudiant, annee_scolaire)
    if montant is None:
        return False
    return _total_paye(etudiant, annee_scolaire) >= montant


def generer_facture_ecolage_pdf(etudiant, annee_scolaire, *, mois_couvert: int | None = None, inscription: bool = False, allow_paye: bool = False) -> bytes:
    """Génère une facture PDF pour un mois d'écolage ou le droit d'inscription.

    If `allow_paye` is True, the function will generate the document even when the
    corresponding month or inscription is already marked as paid (useful for
    producing a receipt after payment).
    """
    if inscription:
        if not allow_paye and est_inscription_payee(etudiant, annee_scolaire):
            raise ValueError("Le droit d'inscription est déjà payé.")
        montant = montant_droit_inscription(etudiant, annee_scolaire)
        if montant is None:
            raise ValueError("Aucun tarif d'inscription configuré.")
        libelle = "Droit de réinscription" if est_reinscription(etudiant, annee_scolaire) else "Droit d'inscription"
        echeance = annee_scolaire.date_debut
        reference = f"INS-{etudiant.matricule}-{annee_scolaire.id}"
    else:
        if mois_couvert is None or not 1 <= mois_couvert <= 12:
            raise ValueError("Le mois couvert doit être entre 1 et 12.")
        if not allow_paye and est_mois_paye(etudiant, annee_scolaire, mois_couvert):
            raise ValueError("Ce mois est déjà payé.")
        montant = montant_ecolage_mensuel(etudiant, annee_scolaire)
        if montant is None:
            raise ValueError("Aucun tarif d'écolage mensuel configuré.")
        libelle = f"Écolage — {MOIS_LABELS[mois_couvert]}"
        echeance = date_echeance_pour_mois(annee_scolaire, mois_couvert)
        reference = f"ECO-{etudiant.matricule}-{annee_scolaire.id}-{mois_couvert:02d}"

    inscription_obj = etudiant.inscriptions.filter(annee_scolaire=annee_scolaire).select_related('classe').first()
    classe_nom = inscription_obj.classe.nom if inscription_obj else '—'

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(etudiant.ecole.nom, styles['Title']),
        Paragraph(f"Facture d'écolage — {annee_scolaire.libelle}", styles['Heading2']),
        Spacer(1, 0.5 * cm),
    ]

    infos = [
        ['Référence', reference],
        ['Élève', f"{etudiant.nom.upper()} {etudiant.prenom}"],
        ['Matricule', etudiant.matricule],
        ['Classe', classe_nom],
        ['Date d\'échéance', echeance.strftime('%d/%m/%Y')],
    ]
    table_infos = Table(infos, colWidths=[4 * cm, 10 * cm])
    table_infos.setStyle(TableStyle([('FONTSIZE', (0, 0), (-1, -1), 10)]))
    elements.append(table_infos)
    elements.append(Spacer(1, 0.8 * cm))

    lignes = [
        ['Désignation', 'Montant'],
        [libelle, f"{montant:,.0f} Ar".replace(',', ' ')],
    ]
    table_lignes = Table(lignes, colWidths=[10 * cm, 4 * cm])
    table_lignes.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(table_lignes)
    elements.append(Spacer(1, 0.5 * cm))
    elements.append(Paragraph(
        "Document généré automatiquement. Merci de régler cette facture avant la date d'échéance indiquée.",
        styles['Normal'],
    ))

    doc.build(elements)
    return buffer.getvalue()
