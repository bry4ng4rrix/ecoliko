"""Calcul du dossier financier d'un étudiant (règle 3.5 / 6.2 du cahier des charges).

Reste à payer = frais totaux (inscription + écolage) - total payé.
Statut : PAYE (100%), PARTIEL (0% < payé < 100%), IMPAYE (0%).
"""
from decimal import Decimal

from django.db.models import Sum

from ..models import Etudiant, AnneeScolaire, FraisScolarite, PaiementEcolage


def frais_attendus(etudiant: Etudiant, annee_scolaire: AnneeScolaire) -> Decimal:
    """Montant total dû (inscription + écolage annuel) pour cet étudiant sur cette année.

    Priorité au tarif renseigné directement sur la classe (`Classe.frais_ecolage_mensuel` /
    `frais_inscription`) ; à défaut, tarif configuré par niveau/filière (`FraisScolarite`,
    pour compatibilité avec les établissements déjà configurés ainsi). 0 si rien n'est renseigné.
    """
    inscription = etudiant.inscriptions.filter(annee_scolaire=annee_scolaire).select_related('classe').first()
    if inscription is None:
        return Decimal('0')
    classe = inscription.classe

    if classe.frais_ecolage_mensuel is not None or classe.frais_inscription is not None:
        return (classe.frais_inscription or Decimal('0')) + (classe.frais_ecolage_mensuel or Decimal('0')) * 12

    tarif = FraisScolarite.objects.filter(
        annee_scolaire=annee_scolaire, niveau=classe.niveau, filiere=classe.filiere
    ).first()
    if tarif is None:
        return Decimal('0')

    return tarif.montant_inscription + tarif.montant_annuel


def dossier_financier(etudiant: Etudiant, annee_scolaire: AnneeScolaire) -> dict:
    total_du = frais_attendus(etudiant, annee_scolaire)
    total_paye = PaiementEcolage.objects.filter(
        etudiant=etudiant, annee_scolaire=annee_scolaire, statut=PaiementEcolage.StatutPaiement.PAYE
    ).aggregate(total=Sum('montant'))['total'] or Decimal('0')

    reste_du = max(total_du - total_paye, Decimal('0'))

    if total_du == 0:
        statut = 'NON_CONFIGURE'
    elif total_paye <= 0:
        statut = 'IMPAYE'
    elif total_paye >= total_du:
        statut = 'PAYE'
    else:
        statut = 'PARTIEL'

    return {
        'total_du': total_du,
        'total_paye': total_paye,
        'reste_du': reste_du,
        'statut': statut,
    }


def synthese_ecole(ecole, annee_scolaire: AnneeScolaire) -> dict:
    """Dossier financier de tous les étudiants inscrits d'un établissement pour une année.

    Vue de synthèse pour le tableau de bord administratif (revenus collectés, dettes, taux de recouvrement).
    """
    etudiants = Etudiant.objects.filter(
        ecole=ecole, inscriptions__annee_scolaire=annee_scolaire
    ).distinct().order_by('nom', 'prenom')

    lignes = []
    total_du_ecole = Decimal('0')
    total_paye_ecole = Decimal('0')
    for etudiant in etudiants:
        dossier = dossier_financier(etudiant, annee_scolaire)
        lignes.append({'etudiant': etudiant, **dossier})
        total_du_ecole += dossier['total_du']
        total_paye_ecole += dossier['total_paye']

    taux_recouvrement = (total_paye_ecole / total_du_ecole * 100) if total_du_ecole else None

    return {
        'total_du': total_du_ecole,
        'total_paye': total_paye_ecole,
        'reste_du': total_du_ecole - total_paye_ecole,
        'taux_recouvrement': taux_recouvrement,
        'etudiants_endettes': [l for l in lignes if l['reste_du'] > 0],
    }
