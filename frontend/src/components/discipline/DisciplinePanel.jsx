import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource, useResourceList } from '@/hooks/useResource'
import { disciplineService, etudiantService } from '@/services'
import { Button } from '@/components/ui/button'

const TYPE_LABELS = {
  OBSERVATION: 'Observation', AVERTISSEMENT: 'Avertissement', SANCTION: 'Sanction',
  EXCLUSION: 'Exclusion', CONVOCATION: 'Convocation', RETENUE: 'Retenue',
}
const GRAVITE_LABELS = { MINEURE: 'Mineure', MODEREE: 'Modérée', GRAVE: 'Grave' }
const GRAVITE_COLORS = {
  MINEURE: 'bg-gray-500/20 text-gray-700', MODEREE: 'bg-orange-500/20 text-orange-700',
  GRAVE: 'bg-red-500/20 text-red-700',
}

const EMPTY_FORM = {
  etudiant: '', type_evenement: 'OBSERVATION', gravite: 'MINEURE',
  description: '', date_evenement: new Date().toISOString().slice(0, 10),
}

const STAFF_ROLES = ['ADMIN', 'RESPONSABLE', 'ENSEIGNANT', 'SECRETARIAT']

export function DisciplinePanel() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: evenements, isLoading } = useResourceList('discipline', disciplineService)
  const { data: etudiants } = useResourceList('etudiants', etudiantService, { enabled: STAFF_ROLES.includes(user?.role) })
  const createEvenement = useCreateResource('discipline', disciplineService)

  const peutAjouter = STAFF_ROLES.includes(user?.role)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createEvenement.mutateAsync({ ...form, etudiant: Number(form.etudiant) })
      toast.success('Événement enregistré.')
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement.")
    }
  }

  return (
    <div className="space-y-4">
      {peutAjouter && !showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvel événement
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <select
            name="etudiant" value={form.etudiant} onChange={handleChange} required
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Choisir un étudiant</option>
            {(etudiants ?? []).map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
          </select>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              name="type_evenement" value={form.type_evenement} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(TYPE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <select
              name="gravite" value={form.gravite} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(GRAVITE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <input
              type="date" name="date_evenement" value={form.date_evenement} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <textarea
            name="description" value={form.description} onChange={handleChange} required rows={2}
            placeholder="Description de l'événement..."
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createEvenement.isPending}>Enregistrer</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (evenements ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun événement disciplinaire.</p>
        )}
        {(evenements ?? []).map((ev) => (
          <div key={ev.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex justify-between items-start mb-1">
              <p className="font-semibold text-sm">{TYPE_LABELS[ev.type_evenement]} — {ev.etudiant_nom}</p>
              <span className={`text-xs px-2 py-1 rounded font-medium ${GRAVITE_COLORS[ev.gravite]}`}>
                {GRAVITE_LABELS[ev.gravite]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{ev.description}</p>
            <p className="text-xs text-muted-foreground mt-2">{ev.date_evenement} · {ev.cree_par_nom ?? 'Système'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
