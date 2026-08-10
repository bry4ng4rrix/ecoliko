import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource, useDeleteResource, useResourceList } from '@/hooks/useResource'
import { evenementCalendrierService } from '@/services'
import { Button } from '@/components/ui/button'

const TYPE_LABELS = { VACANCES: 'Vacances', EXAMEN: 'Examen', EVENEMENT: 'Événement', REUNION: 'Réunion' }
const TYPE_COLORS = {
  VACANCES: 'bg-blue-500/20 text-blue-700', EXAMEN: 'bg-red-500/20 text-red-700',
  EVENEMENT: 'bg-purple-500/20 text-purple-700', REUNION: 'bg-amber-500/20 text-amber-700',
}

const EMPTY_FORM = { titre: '', type_evenement: 'EVENEMENT', date_debut: '', date_fin: '', description: '' }

const STAFF_ROLES = ['ADMIN', 'RESPONSABLE', 'SECRETARIAT']

export function EvenementsCalendrierPanel() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: evenements, isLoading } = useResourceList('evenements-calendrier', evenementCalendrierService)
  const createEvenement = useCreateResource('evenements-calendrier', evenementCalendrierService)
  const deleteEvenement = useDeleteResource('evenements-calendrier', evenementCalendrierService)

  const peutGerer = STAFF_ROLES.includes(user?.role)
  const aVenir = [...(evenements ?? [])].sort((a, b) => a.date_debut.localeCompare(b.date_debut))

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createEvenement.mutateAsync({ ...form, date_fin: form.date_fin || form.date_debut })
      toast.success('Événement ajouté.')
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'ajout.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteEvenement.mutateAsync(id)
      toast.success('Événement supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="space-y-4">
      {peutGerer && !showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvel événement
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="titre" value={form.titre} onChange={handleChange} placeholder="Titre" required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              name="type_evenement" value={form.type_evenement} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(TYPE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Date de début</label>
              <input
                type="date" name="date_debut" value={form.date_debut} onChange={handleChange} required
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date de fin (optionnel)</label>
              <input
                type="date" name="date_fin" value={form.date_fin} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <textarea
            name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Description (optionnel)"
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createEvenement.isPending}>Ajouter</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && aVenir.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun événement au calendrier.</p>
        )}
        {aVenir.map((ev) => (
          <div key={ev.id} className="bg-card border border-border rounded-lg p-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-1 rounded font-medium ${TYPE_COLORS[ev.type_evenement]}`}>
                  {TYPE_LABELS[ev.type_evenement]}
                </span>
                <p className="font-semibold text-sm">{ev.titre}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {ev.date_debut}{ev.date_fin !== ev.date_debut ? ` → ${ev.date_fin}` : ''}
              </p>
              {ev.description && <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>}
            </div>
            {peutGerer && (
              <button onClick={() => handleDelete(ev.id)} className="p-1.5 hover:bg-muted rounded">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
