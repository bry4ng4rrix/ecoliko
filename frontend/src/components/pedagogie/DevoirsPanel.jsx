import { useEffect, useRef, useState } from 'react'
import { Bell, Camera, Loader2, Plus, ScanText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource, useDeleteResource, useResourceList } from '@/hooks/useResource'
import { cahierTexteService, classeService, envoyerRappelsDevoirs, matiereService } from '@/services'
import { Button } from '@/components/ui/button'
import { ChatClassePanel } from '@/components/pedagogie/ChatClassePanel'
import { DocumentsDevoirSection } from '@/components/pedagogie/DocumentsDevoirSection'

const EMPTY_FORM = {
  classe: '', matiere: '', travail_a_faire: '', date_echeance_travail: '', heure_echeance_travail: '', lien: '',
}

/** Décompte vers une échéance (date + heure), mis à jour chaque seconde. */
function useCompteARebours(dateEcheance, heureEcheance) {
  const [maintenant, setMaintenant] = useState(() => new Date())

  useEffect(() => {
    const intervalle = setInterval(() => setMaintenant(new Date()), 1000)
    return () => clearInterval(intervalle)
  }, [])

  if (!dateEcheance) return null
  const cible = new Date(`${dateEcheance}T${heureEcheance ? `${heureEcheance.slice(0, 5)}:00` : '23:59:59'}`)
  const diffMs = cible.getTime() - maintenant.getTime()
  if (diffMs <= 0) return { termine: true }

  return {
    termine: false,
    jours: Math.floor(diffMs / 86400000),
    heures: Math.floor((diffMs / 3600000) % 24),
    minutes: Math.floor((diffMs / 60000) % 60),
    secondes: Math.floor((diffMs / 1000) % 60),
  }
}

function CompteARebours({ dateEcheance, heureEcheance }) {
  const compte = useCompteARebours(dateEcheance, heureEcheance)
  if (!compte) return null
  if (compte.termine) {
    return <span className="text-xs font-semibold text-red-600">Délai dépassé</span>
  }
  const parts = []
  if (compte.jours > 0) parts.push(`${compte.jours}j`)
  parts.push(`${String(compte.heures).padStart(2, '0')}h`)
  parts.push(`${String(compte.minutes).padStart(2, '0')}min`)
  if (compte.jours === 0) parts.push(`${String(compte.secondes).padStart(2, '0')}s`)
  return <span className="text-xs font-semibold text-primary">{parts.join(' ')} restants</span>
}

/** Gestion des devoirs par l'enseignant : envoi par classe avec date/heure de rendu — basé sur

 * `CahierTexte.travail_a_faire`, donc automatiquement synchronisé au calendrier de la classe
 * et notifié aux élèves/parents (voir `services.devoirs` côté backend). Permet aussi de joindre
 * une photo (galerie ou appareil photo) et d'extraire le texte d'un document scanné par OCR
 * (Tesseract.js, exécuté entièrement dans le navigateur — aucune clé API requise).
 */
export function DevoirsPanel() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pieceJointe, setPieceJointe] = useState(null)
  const [envoiRappelsEnCours, setEnvoiRappelsEnCours] = useState(false)
  const [ocrEnCours, setOcrEnCours] = useState(false)
  const [classeChat, setClasseChat] = useState('')
  const camInputRef = useRef(null)
  const ocrInputRef = useRef(null)

  const { data: devoirsBruts, isLoading } = useResourceList('cahier-textes', cahierTexteService)
  const { data: classes } = useResourceList('classes', classeService)
  const { data: matieres } = useResourceList('matieres', matiereService)
  const createDevoir = useCreateResource('cahier-textes', cahierTexteService)
  const deleteDevoir = useDeleteResource('cahier-textes', cahierTexteService)

  const mesMatieres = (matieres ?? []).filter((m) => m.enseignant === user?.id)
  const devoirs = (devoirsBruts ?? [])
    .filter((d) => d.travail_a_faire)
    .sort((a, b) => `${a.date_echeance_travail ?? ''}${a.heure_echeance_travail ?? ''}`.localeCompare(
      `${b.date_echeance_travail ?? ''}${b.heure_echeance_travail ?? ''}`
    ))

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = new FormData()
      payload.append('classe', form.classe)
      payload.append('matiere', form.matiere)
      payload.append('date_seance', new Date().toISOString().slice(0, 10))
      payload.append('travail_a_faire', form.travail_a_faire)
      payload.append('date_echeance_travail', form.date_echeance_travail)
      if (form.heure_echeance_travail) payload.append('heure_echeance_travail', form.heure_echeance_travail)
      if (form.lien) payload.append('lien', form.lien)
      if (pieceJointe) payload.append('piece_jointe', pieceJointe)

      await createDevoir.mutateAsync(payload)
      toast.success('Devoir envoyé à la classe.')
      setForm(EMPTY_FORM)
      setPieceJointe(null)
      setShowForm(false)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'envoi.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteDevoir.mutateAsync(id)
      toast.success('Devoir supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  const handleEnvoyerRappels = async () => {
    setEnvoiRappelsEnCours(true)
    try {
      const resultat = await envoyerRappelsDevoirs(3)
      toast.success(
        resultat.rappels_envoyes > 0
          ? `${resultat.rappels_envoyes} rappel(s) envoyé(s).`
          : 'Aucun nouveau rappel à envoyer (déjà à jour).'
      )
    } catch {
      toast.error("Erreur lors de l'envoi des rappels.")
    } finally {
      setEnvoiRappelsEnCours(false)
    }
  }

  const handleScanOcr = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return

    setOcrEnCours(true)
    toast.info('Analyse du document en cours...')
    try {
      const { recognize } = await import('tesseract.js')
      // Fichiers hébergés localement (public/tesseract/) plutôt que sur le CDN par défaut de
      // Tesseract.js : évite toute dépendance à un réseau externe (jsdelivr) au moment du scan.
      const { data } = await recognize(fichier, 'fra', {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/tesseract-core',
        langPath: '/tesseract/lang-data',
      })
      const texte = data.text.trim()
      if (!texte) {
        toast.warning('Aucun texte détecté sur ce document.')
        return
      }
      setForm((prev) => ({
        ...prev, travail_a_faire: prev.travail_a_faire ? `${prev.travail_a_faire}\n${texte}` : texte,
      }))
      toast.success('Texte extrait et ajouté au devoir.')
    } catch (err) {
      console.error('Erreur OCR:', err)
      toast.error(`Erreur lors de la lecture du document (OCR)${err?.message ? ` : ${err.message}` : ''}.`)
    } finally {
      setOcrEnCours(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Gestion des devoirs</h1>
          <p className="text-muted-foreground mt-1">
            Envoyez un devoir à une classe avec une date et une heure de rendu — synchronisé au calendrier de la
            classe, avec rappels automatiques à l'approche de l'échéance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={handleEnvoyerRappels} disabled={envoiRappelsEnCours}>
            <Bell className="w-4 h-4" />
            {envoiRappelsEnCours ? 'Envoi...' : 'Envoyer les rappels maintenant'}
          </Button>
          {!showForm && (
            <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Nouveau devoir
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              name="classe" value={form.classe} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choisir une classe</option>
              {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select
              name="matiere" value={form.matiere} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choisir une matière</option>
              {mesMatieres.map((m) => <option key={m.id} value={m.id}>{m.intitule}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Description du devoir</label>
              <input ref={ocrInputRef} type="file" accept="image/*" capture="environment" onChange={handleScanOcr} className="hidden" />
              <Button
                type="button" size="sm" variant="outline" className="gap-2 h-7 px-2 text-xs"
                onClick={() => ocrInputRef.current?.click()} disabled={ocrEnCours}
              >
                {ocrEnCours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5" />}
                {ocrEnCours ? 'Analyse...' : 'Scanner un document (OCR)'}
              </Button>
            </div>
            <textarea
              name="travail_a_faire" value={form.travail_a_faire} onChange={handleChange} required rows={3}
              placeholder="Description du devoir... (ou scannez un énoncé papier avec le bouton ci-dessus)"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Date de rendu</label>
              <input
                name="date_echeance_travail" type="date" value={form.date_echeance_travail} onChange={handleChange} required
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Heure de rendu (optionnel)</label>
              <input
                name="heure_echeance_travail" type="time" value={form.heure_echeance_travail} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="lien" type="url" value={form.lien} onChange={handleChange} placeholder="Lien externe (optionnel)"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div>
              <label className="text-xs text-muted-foreground">
                Pièce jointe (optionnel) {pieceJointe && <span className="text-primary">— {pieceJointe.name}</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="file" onChange={(e) => setPieceJointe(e.target.files?.[0] ?? null)}
                  className="flex-1 min-w-0 text-sm file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground"
                />
                <input
                  ref={camInputRef} type="file" accept="image/*" capture="environment"
                  onChange={(e) => setPieceJointe(e.target.files?.[0] ?? null)} className="hidden"
                />
                <Button
                  type="button" size="sm" variant="outline" className="gap-2 flex-shrink-0"
                  onClick={() => camInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4" /> Photo
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createDevoir.isPending}>Envoyer à la classe</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && devoirs.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun devoir envoyé pour le moment.</p>
        )}
        {devoirs.map((d) => (
          <div key={d.id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <p className="font-semibold">{d.matiere_intitule} — {d.classe_nom}</p>
                <p className="text-sm text-muted-foreground mt-1">{d.travail_a_faire}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    À rendre le {d.date_echeance_travail}
                    {d.heure_echeance_travail && ` à ${d.heure_echeance_travail.slice(0, 5)}`}
                  </p>
                  <CompteARebours dateEcheance={d.date_echeance_travail} heureEcheance={d.heure_echeance_travail} />
                </div>
                {(d.piece_jointe || d.lien) && (
                  <div className="flex gap-3 mt-2">
                    {d.piece_jointe && (
                      <a href={d.piece_jointe} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                        Pièce jointe
                      </a>
                    )}
                    {d.lien && (
                      <a href={d.lien} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                        Lien
                      </a>
                    )}
                  </div>
                )}
                <DocumentsDevoirSection cahierTexteId={d.id} />
              </div>
              <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-muted rounded flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold">Chat de classe</h2>
          <select
            value={classeChat} onChange={(e) => setClasseChat(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Choisir une classe</option>
            {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        {classeChat ? (
          <ChatClassePanel
            classeId={Number(classeChat)} enseignantId={user?.id}
            classeNom={(classes ?? []).find((c) => c.id === Number(classeChat))?.nom ?? ''}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sélectionnez une classe pour ouvrir son chat de groupe.</p>
        )}
      </div>
    </div>
  )
}
