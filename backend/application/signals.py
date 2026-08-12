"""Déclencheurs des notifications système (Observer) : réagit aux événements métier

sans que les vues/services aient besoin de connaître le système de notification.

Les transitions (validation d'un bulletin, traitement d'une demande de document) sont
détectées via `update_fields`, que les services correspondants renseignent explicitement
(`services.bulletin.valider_bulletin`, `services.documents.valider_demande`/`refuser_demande`) —
ça évite de renotifier à chaque resauvegarde sans rapport (ex: régénération d'un bulletin).
"""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import (
    Annonce, AuditLog, Bulletin, CahierTexte, DemandeDocument, EvenementDisciplinaire, Message, Note,
    PaiementEcolage, PresenceCours,
)
from .services import audit as audit_service
from .services import devoirs as devoirs_service
from .services import notifications as notif_service


@receiver(post_save, sender=Note)
def on_note_created(sender, instance, created, **kwargs):
    if created:
        notif_service.notifier_nouvelle_note(instance)
    audit_service.enregistrer(
        ecole=instance.etudiant.ecole, utilisateur=instance.saisie_par,
        action=AuditLog.Action.CREATION if created else AuditLog.Action.MODIFICATION,
        modele='Note', objet_id=instance.id, objet_repr=str(instance),
    )


@receiver(post_delete, sender=Note)
def on_note_deleted(sender, instance, **kwargs):
    audit_service.enregistrer(
        ecole=instance.etudiant.ecole, utilisateur=instance.saisie_par,
        action=AuditLog.Action.SUPPRESSION, modele='Note', objet_id=instance.id, objet_repr=str(instance),
    )


@receiver(post_save, sender=PaiementEcolage)
def on_paiement_created(sender, instance, created, **kwargs):
    if created and instance.statut == PaiementEcolage.StatutPaiement.PAYE:
        notif_service.notifier_paiement(instance)
    audit_service.enregistrer(
        ecole=instance.etudiant.ecole, utilisateur=instance.cree_par,
        action=AuditLog.Action.CREATION if created else AuditLog.Action.MODIFICATION,
        modele='PaiementEcolage', objet_id=instance.id, objet_repr=str(instance),
    )


@receiver(post_delete, sender=PaiementEcolage)
def on_paiement_deleted(sender, instance, **kwargs):
    audit_service.enregistrer(
        ecole=instance.etudiant.ecole, utilisateur=instance.cree_par,
        action=AuditLog.Action.SUPPRESSION, modele='PaiementEcolage', objet_id=instance.id, objet_repr=str(instance),
    )


@receiver(post_save, sender=Bulletin)
def on_bulletin_validated(sender, instance, created, update_fields, **kwargs):
    if instance.est_valide and update_fields and 'est_valide' in update_fields:
        notif_service.notifier_bulletin_valide(instance)
        audit_service.enregistrer(
            ecole=instance.etudiant.ecole, utilisateur=instance.valide_par,
            action=AuditLog.Action.MODIFICATION, modele='Bulletin', objet_id=instance.id, objet_repr=str(instance),
        )


@receiver(post_save, sender=DemandeDocument)
def on_demande_document_traitee(sender, instance, created, update_fields, **kwargs):
    if created:
        audit_service.enregistrer(
            ecole=instance.etudiant.ecole, utilisateur=instance.demande_par,
            action=AuditLog.Action.CREATION, modele='DemandeDocument', objet_id=instance.id, objet_repr=str(instance),
        )
    if update_fields and 'statut' in update_fields:
        notif_service.notifier_document_traite(instance)
        audit_service.enregistrer(
            ecole=instance.etudiant.ecole, utilisateur=instance.traite_par,
            action=AuditLog.Action.MODIFICATION, modele='DemandeDocument', objet_id=instance.id, objet_repr=str(instance),
        )


@receiver(post_save, sender=Annonce)
def on_annonce_created(sender, instance, created, **kwargs):
    if created:
        notif_service.notifier_annonce(instance)


@receiver(post_save, sender=Message)
def on_message_created(sender, instance, created, **kwargs):
    if created:
        notif_service.notifier_message(instance)


@receiver(post_save, sender=CahierTexte)
def on_cahier_texte_created(sender, instance, created, **kwargs):
    devoirs_service.synchroniser_evenement_calendrier(instance)
    if created:
        notif_service.notifier_nouveau_devoir(instance)


@receiver(post_save, sender=PresenceCours)
def on_presence_created(sender, instance, created, **kwargs):
    if created and instance.statut in (PresenceCours.StatutPresence.ABSENT, PresenceCours.StatutPresence.RETARD):
        notif_service.notifier_absence(instance)


@receiver(post_save, sender=EvenementDisciplinaire)
def on_evenement_disciplinaire_created(sender, instance, created, **kwargs):
    if created:
        notif_service.notifier_evenement_disciplinaire(instance)
        audit_service.enregistrer(
            ecole=instance.etudiant.ecole, utilisateur=instance.cree_par,
            action=AuditLog.Action.CREATION, modele='EvenementDisciplinaire',
            objet_id=instance.id, objet_repr=str(instance),
        )
