import { apiClient } from "@/lib/apiClient"
import { createResourceService } from "./resourceService"

export const ecoleService = createResourceService("/ecoles")
export const anneeScolaireService = createResourceService("/annees-scolaires")
export const trimestreService = createResourceService("/trimestres")
export const niveauService = createResourceService("/niveaux")
export const filiereService = createResourceService("/filieres")
export const salleService = createResourceService("/salles")
export const classeService = createResourceService("/classes")
export const etudiantService = createResourceService("/etudiants")
export const inscriptionService = createResourceService("/inscriptions")
export const tuteurService = createResourceService("/tuteurs")
export const matiereService = createResourceService("/matieres")
export const noteService = createResourceService("/notes")
export const staffService = createResourceService("/personnel")
export const fraisScolariteService = createResourceService("/frais-scolarite")
export const paiementService = createResourceService("/paiements")
export const presenceService = createResourceService("/presences")
export const emploiDuTempsService = createResourceService("/emplois-du-temps")
export const bulletinService = createResourceService("/bulletins")
export const demandeDocumentService = createResourceService("/demandes-documents")
export const messageService = createResourceService("/messages")
export const annonceService = createResourceService("/annonces")
export const notificationService = createResourceService("/notifications")
export const auditLogService = createResourceService("/audit-logs")
export const cahierTexteService = createResourceService("/cahier-textes")
export const disciplineService = createResourceService("/discipline")
export const dossierEnseignantService = createResourceService("/dossiers-enseignants")
export const paiementSalaireService = createResourceService("/paiements-salaire")
export const evenementCalendrierService = createResourceService("/evenements-calendrier")
export const documentEtudiantService = createResourceService("/documents-etudiants")
export const messageGroupeClasseService = createResourceService("/messages-groupe-classe")
export const documentDevoirService = createResourceService("/documents-devoirs")
export const discussionClasseService = createResourceService("/discussions-classe")

/** Ouvre ou ferme la discussion de groupe d'une classe (bascule réservée au professeur concerné). */
export async function definirDiscussionClasse(classeId, enseignantId, estOuverte) {
  const { data } = await apiClient.post('/discussions-classe/definir/', {
    classe: classeId, enseignant: enseignantId, est_ouverte: estOuverte,
  })
  return data
}

export { authService } from "./authService"

/** Importe les jours fériés de Madagascar (source externe) sur la période de l'année scolaire active. */
export async function synchroniserJoursFeries() {
  const { data } = await apiClient.post("/evenements-calendrier/synchroniser-jours-feries/")
  return data
}

/** Déclenche l'envoi immédiat des rappels de devoirs à échéance proche (à défaut de cron configuré). */
export async function envoyerRappelsDevoirs(joursAvant = 3) {
  const { data } = await apiClient.post("/cahier-textes/envoyer-rappels/", { jours_avant: joursAvant })
  return data
}

/** Calcule (ou recalcule) le bulletin d'un étudiant. `trimestre` omis/null = bulletin annuel. */
export async function genererBulletin({ etudiant, annee_scolaire, trimestre }) {
  const { data } = await apiClient.post("/bulletins/generer/", { etudiant, annee_scolaire, trimestre })
  return data
}

export async function validerBulletin(bulletinId) {
  const { data } = await apiClient.post(`/bulletins/${bulletinId}/valider/`)
  return data
}

async function telechargerPdf(url, nomFichier) {
  const response = await apiClient.get(url, { responseType: 'blob' })
  const objectUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = nomFichier
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}

async function telechargerPdfPost(url, nomFichier) {
  const response = await apiClient.post(url, null, { responseType: 'blob' })
  const objectUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = nomFichier
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}

/** Télécharge le PDF d'un bulletin et déclenche le téléchargement dans le navigateur. */
export async function telechargerBulletinPdf(bulletinId, nomFichier = 'bulletin.pdf') {
  return telechargerPdf(`/bulletins/${bulletinId}/pdf/`, nomFichier)
}

export async function validerDemandeDocument(demandeId) {
  const { data } = await apiClient.post(`/demandes-documents/${demandeId}/valider/`)
  return data
}

export async function refuserDemandeDocument(demandeId, motif) {
  const { data } = await apiClient.post(`/demandes-documents/${demandeId}/refuser/`, { motif })
  return data
}

/** Télécharge le PDF d'un document administratif validé. */
export async function telechargerDocumentPdf(demandeId, nomFichier = 'document.pdf') {
  return telechargerPdf(`/demandes-documents/${demandeId}/pdf/`, nomFichier)
}

/** Saisie groupée de l'appel pour un cours entier. */
export async function enregistrerAppel(payload) {
  const { data } = await apiClient.post("/presences/appel/", payload)
  return data
}

/** Dossier financier (total dû/payé/reste) d'un étudiant pour une année (calcul centralisé côté backend). */
export async function fetchDossierFinancier(etudiantId, anneeScolaireId) {
  if (!etudiantId || !anneeScolaireId) return null
  const { data } = await apiClient.get("/paiements/dossier/", {
    params: { etudiant: etudiantId, annee_scolaire: anneeScolaireId },
  })
  return data
}

/** Synthèse financière de l'établissement (revenus, dettes, taux de recouvrement) — réservé au personnel. */
export async function fetchSyntheseFinanciere(anneeScolaireId) {
  if (!anneeScolaireId) return null
  const { data } = await apiClient.get("/paiements/synthese/", { params: { annee_scolaire: anneeScolaireId } })
  return data
}

/** Moyenne pondérée par coefficient d'un étudiant pour un trimestre (calcul centralisé côté backend). */
export async function fetchMoyenneTrimestre(etudiantId, trimestreId) {
  if (!etudiantId || !trimestreId) return null
  const { data } = await apiClient.get("/notes/moyenne/", { params: { etudiant: etudiantId, trimestre: trimestreId } })
  return data.moyenne
}

/** Classement d'une classe pour un trimestre (calcul centralisé côté backend). */
export async function fetchClassement(classeId, trimestreId) {
  if (!classeId || !trimestreId) return []
  const { data } = await apiClient.get(`/classes/${classeId}/classement/`, { params: { trimestre: trimestreId } })
  return data
}

/** Bilan annuel d'une classe (moyenne générale des 3 trimestres) : décision de passage/redoublement. */
export async function fetchClassementAnnuel(classeId) {
  if (!classeId) return []
  const { data } = await apiClient.get(`/classes/${classeId}/classement-annuel/`)
  return data
}

/** Synthèse statistique de l'établissement (effectifs, moyennes, taux de réussite/présence). */
export async function fetchStatistiques(anneeScolaireId, trimestreId) {
  if (!anneeScolaireId) return null
  const { data } = await apiClient.get('/statistiques/', {
    params: { annee_scolaire: anneeScolaireId, trimestre: trimestreId || undefined },
  })
  return data
}

/** Récupère une image (QR code / code-barres) protégée par JWT sous forme d'URL affichable. */
async function fetchImageObjectUrl(url) {
  const response = await apiClient.get(url, { responseType: 'blob' })
  return window.URL.createObjectURL(new Blob([response.data], { type: 'image/png' }))
}

export const fetchEtudiantQrCodeUrl = (etudiantId) => fetchImageObjectUrl(`/etudiants/${etudiantId}/qrcode/`)
export const fetchEtudiantCodeBarreUrl = (etudiantId) => fetchImageObjectUrl(`/etudiants/${etudiantId}/codebarre/`)

/** Télécharge la carte d'étudiant PDF (photo, matricule, QR code). */
export async function telechargerCarteEtudiant(etudiantId, nomFichier = 'carte_etudiant.pdf') {
  return telechargerPdf(`/etudiants/${etudiantId}/carte/`, nomFichier)
}

/** Génère et télécharge un certificat de scolarité PDF (validé d'office par l'admin/bureau). */
export async function genererCertificatScolarite(etudiantId, nomFichier = 'certificat_scolarite.pdf') {
  return telechargerPdfPost(`/etudiants/${etudiantId}/certificat-scolarite/`, nomFichier)
}

/** Télécharge la carte d'écolage PDF (reçu récapitulatif des paiements pour l'année active). */
export async function telechargerCarteEcolage(etudiantId, nomFichier = 'carte_ecolage.pdf') {
  return telechargerPdf(`/etudiants/${etudiantId}/carte-ecolage/`, nomFichier)
}

/** Justification d'une absence/retard par l'étudiant concerné (ou son parent). */
export async function soumettreJustification(presenceId, justificatif) {
  const { data } = await apiClient.post(`/presences/${presenceId}/justifier/`, { justificatif })
  return data
}

export async function validerJustification(presenceId) {
  const { data } = await apiClient.post(`/presences/${presenceId}/valider-justification/`)
  return data
}

export async function refuserJustification(presenceId) {
  const { data } = await apiClient.post(`/presences/${presenceId}/refuser-justification/`)
  return data
}

/** Active une année scolaire (désactive automatiquement l'ancienne, côté backend). */
export async function activerAnneeScolaire(anneeScolaireId) {
  const { data } = await apiClient.post(`/annees-scolaires/${anneeScolaireId}/activer/`)
  return data
}

export const demandeInscriptionService = createResourceService("/demandes-inscription")
export const pieceJointeInscriptionService = createResourceService("/pieces-jointes-inscription")

/** Valide une demande d'inscription auto-soumise (active le compte). */
export async function validerDemandeInscription(id) {
  const { data } = await apiClient.post(`/demandes-inscription/${id}/valider/`)
  return data
}

/** Rejette une demande d'inscription auto-soumise (supprime définitivement le compte en attente). */
export async function rejeterDemandeInscription(id) {
  await apiClient.post(`/demandes-inscription/${id}/rejeter/`)
}

/** Met à jour le suivi (statut de paiement des frais d'inscription, notes) d'une demande. */
export async function mettreAJourSuiviInscription(id, payload) {
  const { data } = await apiClient.patch(`/demandes-inscription/${id}/suivi/`, payload)
  return data
}
