import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Globe, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource, useDeleteResource, useResourceList } from '@/hooks/useResource'
import { evenementCalendrierService, synchroniserJoursFeries } from '@/services'
import { Button } from '@/components/ui/button'
import { MonthCalendar, moisSuivant } from '@/components/ui/month-calendar'

const TYPE_LABELS = {
  VACANCES: 'Vacances', EXAMEN: 'Examen', EVENEMENT: 'Événement', REUNION: 'Réunion', JOUR_FERIE: 'Jour férié',
}
const TYPE_COLORS = {
  VACANCES: 'bg-blue-600', EXAMEN: 'bg-red-600', EVENEMENT: 'bg-purple-600', REUNION: 'bg-amber-600',
  JOUR_FERIE: 'bg-emerald-600',
}

const EMPTY_FORM = { titre: '', type_evenement: 'EVENEMENT', date_debut: '', date_fin: '', description: '' }

const STAFF_ROLES = ['ADMIN', 'RESPONSABLE', 'SECRETARIAT']

/** Ajoute `jours` jours calendaires à une date 'YYYY-MM-DD'. Reste entièrement en UTC (Date.UTC +
 * setUTCDate) pour éviter tout décalage : convertir une date locale à minuit vers l'ISO string
 * (UTC) fait sauter au jour précédent dès que le fuseau local est en avance sur UTC (ex: EAT/UTC+3). */
function ajouterJours(dateStr, jours) {
  const [annee, mois, jour] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(annee, mois - 1, jour))
  d.setUTCDate(d.getUTCDate() + jours)
  return d.toISOString().slice(0, 10)
}

export function EvenementsCalendrierPanel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [syncEnCours, setSyncEnCours] = useState(false)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { mois: now.getMonth(), annee: now.getFullYear() }
  })

  const { data: evenements, isLoading } = useResourceList('evenements-calendrier', evenementCalendrierService)
  const createEvenement = useCreateResource('evenements-calendrier', evenementCalendrierService)
  const deleteEvenement = useDeleteResource('evenements-calendrier', evenementCalendrierService)

  const peutGerer = STAFF_ROLES.includes(user?.role)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSync = async () => {
    setSyncEnCours(true)
    try {
      const resultat = await synchroniserJoursFeries()
      queryClient.invalidateQueries({ queryKey: ['evenements-calendrier'] })
      toast.success(
        resultat.crees > 0
          ? `${resultat.crees} jour${resultat.crees > 1 ? 's' : ''} férié${resultat.crees > 1 ? 's' : ''} importé${resultat.crees > 1 ? 's' : ''}.`
          : 'Déjà à jour — aucun nouveau jour férié.'
      )
    } catch (err) {
      const data = err.response?.data
      toast.error(data?.detail ?? 'Erreur lors de la synchronisation des jours fériés.')
    } finally {
      setSyncEnCours(false)
    }
  }

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

  // Ce ne sont pas des cours : chaque événement est étalé sur toutes ses journées (date_debut →
  // date_fin) comme une simple marque au calendrier, indépendante de l'emploi du temps hebdomadaire.
  const events = []
  for (const ev of evenements ?? []) {
    let jour = ev.date_debut
    let garde = 0
    while (jour <= ev.date_fin && garde < 366) {
      events.push({
        date: jour, label: `${TYPE_LABELS[ev.type_evenement]} — ${ev.titre}`,
        color: TYPE_COLORS[ev.type_evenement] ?? 'bg-gray-500', title: ev.description || ev.titre,
        id: ev.id, ev,
      })
      jour = ajouterJours(jour, 1)
      garde += 1
    }
  }

  return (
    <div className="space-y-4">
      {peutGerer && (
        <div className="flex flex-wrap gap-2">
          {!showForm && (
            <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Nouvel événement
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={handleSync} disabled={syncEnCours}>
            <Globe className="w-4 h-4" />
            {syncEnCours ? 'Synchronisation...' : 'Synchroniser les jours fériés (Madagascar)'}
          </Button>
        </div>
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

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(TYPE_LABELS).map(([code, label]) => (
          <span key={code} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[code]}`} />
            {label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <MonthCalendar
          mois={cursor.mois} annee={cursor.annee}
          onNavigate={(dir) => setCursor((prev) => moisSuivant(prev, dir))}
          events={peutGerer ? events.map((e) => ({
            ...e,
            label: (
              <span className="flex items-center justify-between gap-1">
                <span className="truncate">{e.label}</span>
                <button
                  onClick={(evt) => { evt.stopPropagation(); handleDelete(e.id) }}
                  className="opacity-70 hover:opacity-100 flex-shrink-0"
                  title="Supprimer cet événement"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ),
          })) : events}
        />
      )}
    </div>
  )
}
