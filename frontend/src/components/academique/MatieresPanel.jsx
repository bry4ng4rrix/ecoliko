import { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource, useDeleteResource, useResourceList, useUpdateResource } from '@/hooks/useResource'
import { matiereService, staffService } from '@/services'
import { Button } from '@/components/ui/button'

const EMPTY_FORM = { intitule: '', enseignant: '', couleur: '#6366f1' }

export function MatieresPanel() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: matieres, isLoading } = useResourceList('matieres', matiereService)
  const { data: personnel } = useResourceList('personnel', staffService)
  const createMatiere = useCreateResource('matieres', matiereService)
  const updateMatiere = useUpdateResource('matieres', matiereService)
  const deleteMatiere = useDeleteResource('matieres', matiereService)

  const enseignants = (personnel ?? []).filter((p) => p.role === 'ENSEIGNANT')
  const isBureau = user?.role === 'ADMIN' || user?.role === 'SECRETARIAT'

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const startEdit = (m) => {
    setEditing(m.id)
    setForm({
      intitule: m.intitule, enseignant: m.enseignant ? String(m.enseignant) : '', couleur: m.couleur ?? '#6366f1',
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      intitule: form.intitule, enseignant: form.enseignant ? Number(form.enseignant) : null, couleur: form.couleur,
    }
    try {
      if (editing) {
        await updateMatiere.mutateAsync({ id: editing, payload })
        toast.success('Matière mise à jour.')
      } else {
        await createMatiere.mutateAsync(payload)
        toast.success('Matière créée.')
      }
      resetForm()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMatiere.mutateAsync(id)
      toast.success('Matière supprimée.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvelle matière
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="intitule" value={form.intitule} onChange={handleChange} placeholder="Nom de la matière" required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              name="enseignant" value={form.enseignant} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Aucun enseignant assigné</option>
              {enseignants.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Couleur (emploi du temps)</label>
            <input
              name="couleur" type="color" value={form.couleur} onChange={handleChange}
              className="h-9 w-14 rounded-lg border border-border bg-muted cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createMatiere.isPending || updateMatiere.isPending}>
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (matieres ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune matière enregistrée.</p>
        )}
        {(matieres ?? []).map((m) => (
          <div key={m.id} className="border border-border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.couleur }} />
                <p className="font-semibold">{m.intitule}</p>
              </div>
              {(isBureau || m.enseignant === user?.id) && (
                <div className="flex gap-1">
                  <button onClick={() => startEdit(m)} className="p-1.5 hover:bg-muted rounded">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-muted rounded">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Enseignant: {m.enseignant_nom ?? 'Non assigné'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
