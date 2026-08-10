import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource, useResourceList } from '@/hooks/useResource'
import { cahierTexteService, classeService, matiereService } from '@/services'
import { Button } from '@/components/ui/button'

const EMPTY_FORM = {
  classe: '', matiere: '', date_seance: '', contenu_seance: '', travail_a_faire: '', date_echeance_travail: '',
  lien: '',
}

export function CahierTextePanel() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pieceJointe, setPieceJointe] = useState(null)

  const { data: entrees, isLoading } = useResourceList('cahier-textes', cahierTexteService)
  const { data: classes } = useResourceList('classes', classeService, { enabled: user?.role === 'ENSEIGNANT' })
  const { data: matieres } = useResourceList('matieres', matiereService, { enabled: user?.role === 'ENSEIGNANT' })
  const createEntree = useCreateResource('cahier-textes', cahierTexteService)

  const peutAjouter = user?.role === 'ENSEIGNANT'
  const mesMatieres = (matieres ?? []).filter((m) => m.enseignant === user?.id)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = new FormData()
      payload.append('classe', form.classe)
      payload.append('matiere', form.matiere)
      payload.append('date_seance', form.date_seance)
      payload.append('contenu_seance', form.contenu_seance)
      if (form.travail_a_faire) payload.append('travail_a_faire', form.travail_a_faire)
      if (form.date_echeance_travail) payload.append('date_echeance_travail', form.date_echeance_travail)
      if (form.lien) payload.append('lien', form.lien)
      if (pieceJointe) payload.append('piece_jointe', pieceJointe)

      await createEntree.mutateAsync(payload)
      toast.success('Entrée ajoutée au cahier de textes.')
      setForm(EMPTY_FORM)
      setPieceJointe(null)
      setShowForm(false)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'ajout.")
    }
  }

  return (
    <div className="space-y-4">
      {peutAjouter && !showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvelle entrée
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <input
              name="date_seance" type="date" value={form.date_seance} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <textarea
            name="contenu_seance" value={form.contenu_seance} onChange={handleChange} required rows={2}
            placeholder="Contenu de la séance..."
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            name="travail_a_faire" value={form.travail_a_faire} onChange={handleChange} rows={2}
            placeholder="Travail à faire (optionnel)..."
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div>
            <label className="text-xs text-muted-foreground">Date d'échéance du travail</label>
            <input
              name="date_echeance_travail" type="date" value={form.date_echeance_travail} onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="lien" type="url" value={form.lien} onChange={handleChange} placeholder="Lien externe (optionnel)"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div>
              <label className="text-xs text-muted-foreground">Pièce jointe (optionnel)</label>
              <input
                type="file" onChange={(e) => setPieceJointe(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createEntree.isPending}>Ajouter</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (entrees ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune entrée dans le cahier de textes.</p>
        )}
        {(entrees ?? []).map((entree) => (
          <div key={entree.id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex justify-between items-start mb-1">
              <p className="font-semibold">{entree.matiere_intitule} — {entree.classe_nom}</p>
              <span className="text-xs text-muted-foreground">{entree.date_seance}</span>
            </div>
            <p className="text-sm text-muted-foreground">{entree.contenu_seance}</p>
            {entree.travail_a_faire && (
              <div className="mt-2 bg-primary/10 rounded-lg p-2">
                <p className="text-xs font-semibold text-primary">Travail à faire</p>
                <p className="text-sm">{entree.travail_a_faire}</p>
                {entree.date_echeance_travail && (
                  <p className="text-xs text-muted-foreground mt-1">Pour le {entree.date_echeance_travail}</p>
                )}
              </div>
            )}
            {(entree.piece_jointe || entree.lien) && (
              <div className="flex gap-3 mt-2">
                {entree.piece_jointe && (
                  <a href={entree.piece_jointe} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    Pièce jointe
                  </a>
                )}
                {entree.lien && (
                  <a href={entree.lien} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    Lien
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
