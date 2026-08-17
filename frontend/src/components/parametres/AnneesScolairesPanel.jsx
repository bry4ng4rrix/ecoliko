import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useResourceList, useUpdateResource } from '@/hooks/useResource'
import { activerAnneeScolaire, anneeScolaireService } from '@/services'
import { Button } from '@/components/ui/button'

const EMPTY_FORM = { libelle: '', date_debut: '', date_fin: '', mois_debut_annee_scolaire: 9, jour_echeance_mensuelle: 5 }

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

/** Ordre des 12 mois du cycle scolaire à partir du mois de début (1-12). */
function cycleDepuis(moisDebut) {
  return Array.from({ length: 12 }, (_, i) => ((moisDebut - 1 + i) % 12) + 1)
}

/** Sélecteur visuel du calendrier scolaire : mois de début du cycle (grille 12 mois) + jour
 * d'échéance mensuelle. Utilisé aussi bien à la création qu'à la modification d'une année. */
function CalendrierScolaireEditor({ moisDebut, jourEcheance, onChangeMoisDebut, onChangeJourEcheance }) {
  const cycle = cycleDepuis(moisDebut)
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground mb-2">
          Mois de début du cycle scolaire — les 12 mois s'enchaînent à partir de ce mois.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {MOIS_NOMS.map((nom, i) => {
            const numeroMois = i + 1
            const position = cycle.indexOf(numeroMois) + 1
            const estDebut = numeroMois === moisDebut
            return (
              <button
                key={numeroMois}
                type="button"
                onClick={() => onChangeMoisDebut(numeroMois)}
                className={`relative px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  estDebut
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {nom.slice(0, 3)}
                <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center ${
                  estDebut ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                  {position}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground whitespace-nowrap">Jour d'échéance mensuelle</label>
        <input
          type="number" min="1" max="28" value={jourEcheance}
          onChange={(e) => onChangeJourEcheance(Number(e.target.value))}
          className="w-20 px-2 py-1 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  )
}

export function AnneesScolairesPanel() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [activatingId, setActivatingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const queryClient = useQueryClient()

  const { data: annees, isLoading } = useResourceList('annees-scolaires', anneeScolaireService)
  const createAnnee = useCreateResource('annees-scolaires', anneeScolaireService)
  const updateAnnee = useUpdateResource('annees-scolaires', anneeScolaireService)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createAnnee.mutateAsync(form)
      toast.success('Année scolaire créée.')
      resetForm()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement.")
    }
  }

  const handleActiver = async (id) => {
    setActivatingId(id)
    try {
      await activerAnneeScolaire(id)
      queryClient.invalidateQueries({ queryKey: ['annees-scolaires'] })
      toast.success('Année scolaire activée.')
    } catch {
      toast.error("Erreur lors de l'activation.")
    } finally {
      setActivatingId(null)
    }
  }

  const handleChangerCalendrier = async (annee, patch) => {
    try {
      await updateAnnee.mutateAsync({ id: annee.id, payload: patch })
      toast.success('Calendrier scolaire mis à jour — reflété automatiquement sur les écolages.')
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Erreur lors de la mise à jour du calendrier.')
    }
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvelle année scolaire
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted/50 border border-border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              name="libelle" value={form.libelle} onChange={handleChange} placeholder="Libellé (ex: 2026-2027)" required
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              name="date_debut" type="date" value={form.date_debut} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              name="date_fin" type="date" value={form.date_fin} onChange={handleChange} required
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Calendrier scolaire (écolage)
            </p>
            <CalendrierScolaireEditor
              moisDebut={form.mois_debut_annee_scolaire}
              jourEcheance={form.jour_echeance_mensuelle}
              onChangeMoisDebut={(m) => setForm((prev) => ({ ...prev, mois_debut_annee_scolaire: m }))}
              onChangeJourEcheance={(j) => setForm((prev) => ({ ...prev, jour_echeance_mensuelle: j }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createAnnee.isPending}>Créer</Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (annees ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune année scolaire enregistrée.</p>
        )}
        {(annees ?? []).map((a) => {
          const estOuvert = expandedId === a.id
          return (
            <div key={a.id} className="bg-muted rounded-lg overflow-hidden">
              <div className="flex justify-between items-center p-3">
                <div>
                  <p className="font-medium">{a.libelle}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.date_debut} → {a.date_fin} · {a.statut} · cycle {MOIS_NOMS[(a.mois_debut_annee_scolaire ?? 9) - 1]}, échéance le {a.jour_echeance_mensuelle ?? 5}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.est_active ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-primary">
                      <CheckCircle className="w-4 h-4" /> Active
                    </span>
                  ) : (
                    <Button
                      size="sm" variant="outline" disabled={activatingId === a.id}
                      onClick={() => handleActiver(a.id)}
                    >
                      Activer
                    </Button>
                  )}
                  <Button
                    size="sm" variant="ghost" className="gap-1"
                    onClick={() => setExpandedId(estOuvert ? null : a.id)}
                  >
                    <CalendarDays className="w-4 h-4" />
                    {estOuvert ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              {estOuvert && (
                <div className="p-3 pt-0 border-t border-border/50 bg-background/50">
                  <p className="text-xs text-muted-foreground py-2">
                    Modifier le calendrier scolaire de cette année — appliqué automatiquement aux
                    échéances de l'écolage (carte d'écolage, factures, calendrier des impayés).
                  </p>
                  <CalendrierScolaireEditor
                    moisDebut={a.mois_debut_annee_scolaire ?? 9}
                    jourEcheance={a.jour_echeance_mensuelle ?? 5}
                    onChangeMoisDebut={(m) => handleChangerCalendrier(a, { mois_debut_annee_scolaire: m })}
                    onChangeJourEcheance={(j) => handleChangerCalendrier(a, { jour_echeance_mensuelle: j })}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
