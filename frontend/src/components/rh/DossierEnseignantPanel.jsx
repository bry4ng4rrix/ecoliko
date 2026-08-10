import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useResourceList, useUpdateResource } from '@/hooks/useResource'
import { dossierEnseignantService, staffService } from '@/services'
import { Button } from '@/components/ui/button'

const TYPE_CONTRAT_LABELS = { CDI: 'CDI', CDD: 'CDD', VACATAIRE: 'Vacataire', STAGIAIRE: 'Stagiaire' }

const EMPTY_FORM = {
  enseignant: '', type_contrat: 'CDI', date_embauche: '', diplomes: '', salaire: '', volume_horaire_hebdo: '',
}

export function DossierEnseignantPanel() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: personnel } = useResourceList('personnel', staffService)
  const { data: dossiers, isLoading } = useResourceList('dossiers-enseignants', dossierEnseignantService)
  const createDossier = useCreateResource('dossiers-enseignants', dossierEnseignantService)
  const updateDossier = useUpdateResource('dossiers-enseignants', dossierEnseignantService)

  const enseignants = (personnel ?? []).filter((p) => p.role === 'ENSEIGNANT')

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const dossierExistant = (enseignantId) => (dossiers ?? []).find((d) => d.enseignant === enseignantId)

  const startEdit = (enseignantId) => {
    const existant = dossierExistant(enseignantId)
    setForm({
      enseignant: String(enseignantId),
      type_contrat: existant?.type_contrat ?? 'CDI',
      date_embauche: existant?.date_embauche ?? '',
      diplomes: existant?.diplomes ?? '',
      salaire: existant?.salaire ?? '',
      volume_horaire_hebdo: existant?.volume_horaire_hebdo ?? '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const existant = dossierExistant(Number(form.enseignant))
    const payload = {
      enseignant: Number(form.enseignant), type_contrat: form.type_contrat,
      date_embauche: form.date_embauche || null, diplomes: form.diplomes || null,
      salaire: form.salaire || null, volume_horaire_hebdo: form.volume_horaire_hebdo || null,
    }
    try {
      if (existant) {
        await updateDossier.mutateAsync({ id: existant.id, payload })
      } else {
        await createDossier.mutateAsync(payload)
      }
      toast.success('Dossier RH enregistré.')
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement.")
    }
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Dossier RH d'un enseignant
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <select
            name="enseignant" value={form.enseignant} onChange={(e) => { handleChange(e); startEdit(Number(e.target.value)) }}
            required className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Choisir un enseignant</option>
            {enseignants.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              name="type_contrat" value={form.type_contrat} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(TYPE_CONTRAT_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <input
              type="date" name="date_embauche" value={form.date_embauche} onChange={handleChange}
              placeholder="Date d'embauche"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              name="volume_horaire_hebdo" type="number" step="0.5" min="0" value={form.volume_horaire_hebdo} onChange={handleChange}
              placeholder="Volume horaire/semaine"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <input
            name="salaire" type="number" step="0.01" min="0" value={form.salaire} onChange={handleChange}
            placeholder="Salaire"
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            name="diplomes" value={form.diplomes} onChange={handleChange} rows={2} placeholder="Diplômes"
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createDossier.isPending || updateDossier.isPending}>Enregistrer</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-2 text-left">Enseignant</th>
              <th className="px-4 py-2 text-left">Contrat</th>
              <th className="px-4 py-2 text-left">Embauche</th>
              <th className="px-4 py-2 text-left">Volume horaire</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">Chargement...</td></tr>
            )}
            {!isLoading && (dossiers ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">Aucun dossier RH.</td></tr>
            )}
            {(dossiers ?? []).map((d) => (
              <tr key={d.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">{d.enseignant_nom}</td>
                <td className="px-4 py-3">{TYPE_CONTRAT_LABELS[d.type_contrat] ?? '—'}</td>
                <td className="px-4 py-3">{d.date_embauche ?? '—'}</td>
                <td className="px-4 py-3">{d.volume_horaire_hebdo ? `${d.volume_horaire_hebdo} h/sem` : '—'}</td>
                <td className="px-4 py-3 text-center">
                  <button className="text-primary hover:underline text-xs" onClick={() => startEdit(d.enseignant)}>
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
