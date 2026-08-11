import { useState } from 'react'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useDeleteResource, useResourceList, useUpdateResource } from '@/hooks/useResource'
import { salleService } from '@/services'
import { Button } from '@/components/ui/button'

const EMPTY_FORM = { nom: '', capacite: 40, type_salle: '' }
const EMPTY_LIGNE = () => ({ nom: '', capacite: 40, type_salle: '' })
const TYPES_SALLE = ['Salle de classe', 'Laboratoire', 'Cantine', 'Chapelle']

export function SallesPanel() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [lignes, setLignes] = useState([EMPTY_LIGNE()])

  const { data: salles, isLoading } = useResourceList('salles', salleService)
  const createSalle = useCreateResource('salles', salleService)
  const updateSalle = useUpdateResource('salles', salleService)
  const deleteSalle = useDeleteResource('salles', salleService)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleLigneChange = (index, field, value) => {
    setLignes((prev) => prev.map((ligne, i) => (i === index ? { ...ligne, [field]: value } : ligne)))
  }

  const ajouterLigne = () => setLignes((prev) => [...prev, EMPTY_LIGNE()])
  const retirerLigne = (index) => setLignes((prev) => prev.filter((_, i) => i !== index))

  const startEdit = (s) => {
    setEditing(s.id)
    setForm({ nom: s.nom, capacite: s.capacite, type_salle: s.type_salle ?? '' })
    setShowForm(true)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setLignes([EMPTY_LIGNE()])
    setEditing(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const payload = { nom: form.nom, capacite: Number(form.capacite), type_salle: form.type_salle || null }
        await updateSalle.mutateAsync({ id: editing, payload })
        toast.success('Salle mise à jour.')
      } else {
        const lignesValides = lignes.filter((l) => l.nom.trim() !== '')
        if (lignesValides.length === 0) {
          toast.error('Renseignez au moins un nom de salle.')
          return
        }
        await Promise.all(lignesValides.map((l) => createSalle.mutateAsync({
          nom: l.nom, capacite: Number(l.capacite), type_salle: l.type_salle || null,
        })))
        toast.success(`${lignesValides.length} salle${lignesValides.length > 1 ? 's' : ''} créée${lignesValides.length > 1 ? 's' : ''}.`)
      }
      resetForm()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteSalle.mutateAsync(id)
      toast.success('Salle supprimée.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvelle salle
        </Button>
      )}

      {showForm && editing && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              name="nom" value={form.nom} onChange={handleChange} placeholder="Nom (ex: Salle 12)" required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              name="capacite" type="number" min="1" value={form.capacite} onChange={handleChange}
              placeholder="Capacité"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              name="type_salle" value={form.type_salle} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Type (facultatif)</option>
              {TYPES_SALLE.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updateSalle.isPending}>Enregistrer</Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      )}

      {showForm && !editing && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Ajoutez plusieurs salles en une seule fois : renseignez chaque ligne puis cliquez sur « + » pour en ajouter une nouvelle.
          </p>
          <div className="space-y-2">
            {lignes.map((ligne, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <input
                  value={ligne.nom} onChange={(e) => handleLigneChange(index, 'nom', e.target.value)}
                  placeholder="Nom (ex: Salle A)" required
                  className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="number" min="1" value={ligne.capacite}
                  onChange={(e) => handleLigneChange(index, 'capacite', e.target.value)}
                  placeholder="Capacité"
                  className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                  value={ligne.type_salle} onChange={(e) => handleLigneChange(index, 'type_salle', e.target.value)}
                  className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Type (facultatif)</option>
                  {TYPES_SALLE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  type="button" onClick={() => retirerLigne(index)} disabled={lignes.length === 1}
                  className="p-2 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed justify-self-start"
                  title="Retirer cette ligne"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={ajouterLigne}>
            <Plus className="w-4 h-4" /> Ajouter une salle
          </Button>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="submit" size="sm" disabled={createSalle.isPending}>
              Créer {lignes.length > 1 ? `les ${lignes.length} salles` : 'la salle'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (salles ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune salle enregistrée.</p>
        )}
        {(salles ?? []).map((s) => (
          <div key={s.id} className="border border-border rounded-lg p-4 flex justify-between items-start">
            <div>
              <p className="font-semibold">{s.nom}</p>
              <p className="text-sm text-muted-foreground">{s.type_salle || 'Salle de classe'} · Capacité {s.capacite}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(s)} className="p-1.5 hover:bg-muted rounded">
                <Edit2 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-muted rounded">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
