"""Construction des notifications système. Déclenché par les signaux (`../signals.py`),

jamais appelé directement depuis une vue : la logique "qui prévenir de quoi" vit ici.
"""
from ..models import Bulletin, DemandeDocument, Notification, PaiementEcolage, TuteurEtudiant


def _destinataires_etudiant(etudiant) -> list[int]:
    """IDs du compte de l'étudiant (s'il existe) + de tous ses parents/tuteurs."""
    destinataires = []
    if etudiant.utilisateur_id:
        destinataires.append(etudiant.utilisateur_id)
    destinataires.extend(
        TuteurEtudiant.objects.filter(etudiant=etudiant).values_list('parent_id', flat=True)
    )
    return destinataires


def _creer(destinataire_id, type_notification, titre, message=''):
    if not destinataire_id:
        return
    Notification.objects.create(
        destinataire_id=destinataire_id, type_notification=type_notification, titre=titre, message=message,
    )


def notifier_nouvelle_note(note):
    for dest_id in _destinataires_etudiant(note.etudiant):
        _creer(dest_id, Notification.Type.NOTE, f"Nouvelle note en {note.matiere.intitule}", f"{note.valeur}/20")


def notifier_paiement(paiement: PaiementEcolage):
    for dest_id in _destinataires_etudiant(paiement.etudiant):
        _creer(dest_id, Notification.Type.PAIEMENT, 'Paiement enregistré', f"{paiement.montant} {paiement.etudiant.ecole.devise}")


def notifier_bulletin_valide(bulletin: Bulletin):
    for dest_id in _destinataires_etudiant(bulletin.etudiant):
        _creer(dest_id, Notification.Type.BULLETIN, 'Bulletin disponible', str(bulletin))


def notifier_document_traite(demande: DemandeDocument):
    titre = 'Document disponible' if demande.statut == DemandeDocument.Statut.VALIDE else 'Demande de document refusée'
    for dest_id in _destinataires_etudiant(demande.etudiant):
        _creer(dest_id, Notification.Type.DOCUMENT, titre, demande.get_type_document_display())


def notifier_annonce(annonce):
    from ..models import Etudiant, TuteurEtudiant as Tuteur, User

    portee = annonce.Portee
    if annonce.portee == portee.ETABLISSEMENT:
        destinataires = User.objects.filter(ecole=annonce.ecole).values_list('id', flat=True)
    elif annonce.portee == portee.ENSEIGNANTS:
        destinataires = User.objects.filter(ecole=annonce.ecole, role=User.Role.ENSEIGNANT).values_list('id', flat=True)
    elif annonce.portee == portee.PARENTS:
        destinataires = User.objects.filter(ecole=annonce.ecole, role=User.Role.PARENT).values_list('id', flat=True)
    elif annonce.portee == portee.CLASSE and annonce.classe_id:
        etudiants = Etudiant.objects.filter(inscriptions__classe=annonce.classe).distinct()
        eleves_ids = [e.utilisateur_id for e in etudiants if e.utilisateur_id]
        parents_ids = list(Tuteur.objects.filter(etudiant__in=etudiants).values_list('parent_id', flat=True))
        destinataires = eleves_ids + parents_ids
    else:
        destinataires = []

    for dest_id in destinataires:
        _creer(dest_id, Notification.Type.ANNONCE, annonce.titre, annonce.contenu[:200])


def notifier_message(message):
    _creer(message.destinataire_id, Notification.Type.MESSAGE, f"Message de {message.expediteur.get_full_name()}", message.objet)


def notifier_nouveau_devoir(cahier_texte):
    from ..models import Etudiant

    if not cahier_texte.travail_a_faire:
        return
    etudiants = Etudiant.objects.filter(inscriptions__classe=cahier_texte.classe).distinct()
    eleves_ids = [e.utilisateur_id for e in etudiants if e.utilisateur_id]
    parents_ids = list(TuteurEtudiant.objects.filter(etudiant__in=etudiants).values_list('parent_id', flat=True))
    for dest_id in eleves_ids + parents_ids:
        _creer(
            dest_id, Notification.Type.DEVOIR, f"Nouveau devoir en {cahier_texte.matiere.intitule}",
            cahier_texte.travail_a_faire[:200],
        )


def notifier_absence(presence):
    from ..models import PresenceCours

    def _hhmm(valeur):
        return valeur.strftime('%H:%M') if hasattr(valeur, 'strftime') else str(valeur)[:5]

    libelle = 'Retard' if presence.statut == PresenceCours.StatutPresence.RETARD else 'Absence'
    for dest_id in _destinataires_etudiant(presence.etudiant):
        _creer(
            dest_id, Notification.Type.ABSENCE, f"{libelle} en {presence.matiere.intitule}",
            f"{presence.date_cours} — {_hhmm(presence.heure_debut)}-{_hhmm(presence.heure_fin)}",
        )


def notifier_evenement_disciplinaire(evenement):
    for dest_id in _destinataires_etudiant(evenement.etudiant):
        _creer(
            dest_id, Notification.Type.DISCIPLINE, evenement.get_type_evenement_display(),
            evenement.description[:200],
        )
