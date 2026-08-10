import { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useDeleteResource, useResourceList, useUpdateResource } from '@/hooks/useResource'
import { salleService } from '@/services'
import { Button } from '@/components/ui/button'

const EMPTY_FORM = { nom: '', capacite: 40, type_salle: '' }

export function SallesPanel() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: salles, isLoading } = useResourceList('salles', salleService)
  const createSalle = useCreateResource('salles', salleService)
  const updateSalle = useUpdateResource('salles', salleService)
  const deleteSalle = useDeleteResource('salles', salleService)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const startEdit = (s) => {
    setEditing(s.id)
    setForm({ nom: s.nom, capacite: s.capacite, type_salle: s.type_salle ?? '' })
    setShowForm(true)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { nom: form.nom, capacite: Number(form.capacite), type_salle: form.type_salle || null }
    try {
      if (editing) {
        await updateSalle.mutateAsync({ id: editing, payload })
        toast.success('Salle mise à jour.')
      } else {
        await createSalle.mutateAsync(payload)
        toast.success('Salle créée.')
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

      {showForm && (
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
            <input
              name="type_salle" value={form.type_salle} onChange={handleChange}
              placeholder="Type (ex: Laboratoire, facultatif)"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createSalle.isPending || updateSalle.isPending}>
              {editing ? 'Enregistrer' : 'Créer'}
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
