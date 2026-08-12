"""Gestion des devoirs (basés sur `CahierTexte.travail_a_faire`) : synchronisation avec le

calendrier de la classe et rappels quotidiens aux élèves/parents concernés tant que
l'échéance n'est pas passée.
"""
from datetime import timedelta

from django.utils import timezone

from ..models import CahierTexte, EvenementCalendrier, Etudiant, Notification, RappelDevoirEnvoye, TuteurEtudiant


def _creer_notification(destinataire_id, titre, message):
    if not destinataire_id:
        return
    Notification.objects.create(
        destinataire_id=destinataire_id, type_notification=Notification.Type.RAPPEL_DEVOIR,
        titre=titre, message=message,
    )


def synchroniser_evenement_calendrier(cahier_texte: CahierTexte) -> None:
    """Crée/actualise l'événement de calendrier (visible uniquement par la classe) reflétant

    l'échéance du devoir, ou le supprime si le devoir a été retiré/annulé.
    """
    a_un_devoir = bool(cahier_texte.travail_a_faire) and cahier_texte.date_echeance_travail is not None
    if not a_un_devoir:
        EvenementCalendrier.objects.filter(cahier_texte=cahier_texte).delete()
        return

    EvenementCalendrier.objects.update_or_create(
        cahier_texte=cahier_texte,
        defaults={
            'ecole': cahier_texte.classe.annee_scolaire.ecole,
            'classe': cahier_texte.classe,
            'titre': f"Devoir — {cahier_texte.matiere.intitule}",
            'type_evenement': EvenementCalendrier.TypeEvenement.DEVOIR,
            'date_debut': cahier_texte.date_echeance_travail,
            'date_fin': cahier_texte.date_echeance_travail,
            'description': cahier_texte.travail_a_faire,
            'cree_par': cahier_texte.enseignant,
        },
    )


def _destinataires_classe(classe) -> list[int]:
    etudiants = Etudiant.objects.filter(inscriptions__classe=classe).distinct()
    eleves_ids = [e.utilisateur_id for e in etudiants if e.utilisateur_id]
    parents_ids = list(TuteurEtudiant.objects.filter(etudiant__in=etudiants).values_list('parent_id', flat=True))
    return eleves_ids + parents_ids


def envoyer_rappels_devoirs(jours_avant: int = 3) -> dict:
    """Envoie un rappel aux élèves/parents pour chaque devoir dont l'échéance tombe dans les

    `jours_avant` prochains jours (aujourd'hui inclus, pas encore passée). Idempotent pour la
    journée courante : un même destinataire ne reçoit qu'un seul rappel par devoir et par jour,
    même si la commande est relancée plusieurs fois (voir `RappelDevoirEnvoye`).
    """
    aujourdhui = timezone.localdate()
    date_limite = aujourdhui + timedelta(days=jours_avant)

    devoirs = CahierTexte.objects.filter(
        travail_a_faire__isnull=False, date_echeance_travail__gte=aujourdhui, date_echeance_travail__lte=date_limite,
    ).exclude(travail_a_faire='').select_related('classe', 'matiere')

    rappels_envoyes = 0
    devoirs_traites = 0
    for devoir in devoirs:
        devoirs_traites += 1
        jours_restants = (devoir.date_echeance_travail - aujourdhui).days
        libelle_delai = "aujourd'hui" if jours_restants == 0 else f"dans {jours_restants} jour{'s' if jours_restants > 1 else ''}"

        for destinataire_id in _destinataires_classe(devoir.classe):
            _, cree = RappelDevoirEnvoye.objects.get_or_create(
                cahier_texte=devoir, destinataire_id=destinataire_id, date_envoi=aujourdhui,
            )
            if not cree:
                continue
            _creer_notification(
                destinataire_id,
                f"Rappel — devoir de {devoir.matiere.intitule} à rendre {libelle_delai}",
                devoir.travail_a_faire[:200],
            )
            rappels_envoyes += 1

    return {'devoirs_concernes': devoirs_traites, 'rappels_envoyes': rappels_envoyes}
