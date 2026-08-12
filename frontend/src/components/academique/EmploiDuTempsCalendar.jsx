import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useDeleteResource, useResourceList } from '@/hooks/useResource'
import { classeService, emploiDuTempsService, matiereService, salleService, staffService } from '@/services'
import { Button } from '@/components/ui/button'

const JOURS = [
  { code: 'LUN', label: 'Lundi' }, { code: 'MAR', label: 'Mardi' }, { code: 'MER', label: 'Mercredi' },
  { code: 'JEU', label: 'Jeudi' }, { code: 'VEN', label: 'Vendredi' }, { code: 'SAM', label: 'Samedi' },
]

const EMPTY_FORM = {
  jour: 'LUN', matiere: '', enseignant: '', heure_debut: '08:00', heure_fin: '09:00', salle: '', groupe: '',
}

export function EmploiDuTempsCalendar() {
  const [classeId, setClasseId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: classes } = useResourceList('classes', classeService)
  const { data: matieres } = useResourceList('matieres', matiereService)
  const { data: salles } = useResourceList('salles', salleService)
  const { data: personnel } = useResourceList('personnel', staffService)
  const { data: emploiDuTemps, isLoading } = useResourceList('emplois-du-temps', emploiDuTempsService)
  const createSlot = useCreateResource('emplois-du-temps', emploiDuTempsService)
  const deleteSlot = useDeleteResource('emplois-du-temps', emploiDuTempsService)

  const enseignants = (personnel ?? []).filter((p) => p.role === 'ENSEIGNANT')
  const slotsClasse = (emploiDuTemps ?? []).filter((s) => String(s.classe) === String(classeId))
  const creneaux = [...new Set(slotsClasse.map((s) => `${s.heure_debut}|${s.heure_fin}`))]
    .sort()
    .map((cle) => {
      const [heure_debut, heure_fin] = cle.split('|')
      return { heure_debut, heure_fin }
    })

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!classeId) return
    try {
      await createSlot.mutateAsync({
        classe: Number(classeId), matiere: Number(form.matiere),
        enseignant: form.enseignant ? Number(form.enseignant) : null,
        jour: form.jour, heure_debut: form.heure_debut, heure_fin: form.heure_fin,
        salle: form.salle ? Number(form.salle) : null,
        groupe: form.groupe || null,
      })
      toast.success('Créneau ajouté.')
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'ajout.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteSlot.mutateAsync(id)
      toast.success('Créneau supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={classeId} onChange={(e) => setClasseId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Choisir une classe</option>
          {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        {classeId && (
          <Button size="sm" className="gap-2" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4" /> Ajouter un créneau
          </Button>
        )}
      </div>

      {showForm && classeId && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              name="jour" value={form.jour} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {JOURS.map((j) => <option key={j.code} value={j.code}>{j.label}</option>)}
            </select>
            <select
              name="matiere" value={form.matiere} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choisir une matière</option>
              {(matieres ?? []).map((m) => <option key={m.id} value={m.id}>{m.intitule}</option>)}
            </select>
            <select
              name="enseignant" value={form.enseignant} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sans enseignant assigné</option>
              {enseignants.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="time" name="heure_debut" value={form.heure_debut} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="time" name="heure_fin" value={form.heure_fin} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              name="salle" value={form.salle} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sans salle</option>
              {(salles ?? []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          <input
            name="groupe" value={form.groupe} onChange={handleChange}
            placeholder="Groupe (ex: Groupe A — facultatif, pour un cours en sous-groupe)"
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createSlot.isPending}>Ajouter</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {!classeId && <p className="text-sm text-muted-foreground">Sélectionnez une classe pour voir son emploi du temps.</p>}

      {classeId && isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}

      {classeId && !isLoading && (
        creneaux.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun créneau enregistré pour cette classe.</p>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-3 text-left font-semibold border border-border w-24">Horaire</th>
                  {JOURS.map((j) => (
                    <th key={j.code} className="px-3 py-3 text-center font-semibold border border-border">{j.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creneaux.map(({ heure_debut, heure_fin }) => (
                  <tr key={heure_debut}>
                    <td className="px-3 py-2 border border-border text-xs font-medium text-muted-foreground whitespace-nowrap align-top">
                      {heure_debut.slice(0, 5)}–{heure_fin.slice(0, 5)}
                    </td>
                    {JOURS.map((jour) => {
                      const slot = slotsClasse.find((s) => s.jour === jour.code && s.heure_debut === heure_debut)
                      return (
                        <td key={jour.code} className="border border-border p-1 align-top min-w-[140px]">
                          {slot && (
                            <div
                              className="rounded-lg p-2 text-xs relative group"
                              style={{ backgroundColor: `${slot.matiere_couleur ?? '#6366f1'}22` }}
                            >
                              <button
                                onClick={() => handleDelete(slot.id)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Supprimer ce créneau"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                              <p className="font-semibold">{slot.matiere_intitule}</p>
                              {slot.groupe && <p className="font-medium">{slot.groupe}</p>}
                              {slot.enseignant_nom && <p className="text-muted-foreground">{slot.enseignant_nom}</p>}
                              {slot.salle_nom && <p className="text-muted-foreground">{slot.salle_nom}</p>}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
