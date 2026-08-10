import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useResourceList } from '@/hooks/useResource'
import { activerAnneeScolaire, anneeScolaireService } from '@/services'
import { Button } from '@/components/ui/button'

const EMPTY_FORM = { libelle: '', date_debut: '', date_fin: '' }

export function AnneesScolairesPanel() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [activatingId, setActivatingId] = useState(null)
  const queryClient = useQueryClient()

  const { data: annees, isLoading } = useResourceList('annees-scolaires', anneeScolaireService)
  const createAnnee = useCreateResource('annees-scolaires', anneeScolaireService)

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

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvelle année scolaire
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
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
        {(annees ?? []).map((a) => (
          <div key={a.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">{a.libelle}</p>
              <p className="text-xs text-muted-foreground">{a.date_debut} → {a.date_fin} · {a.statut}</p>
            </div>
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
          </div>
        ))}
      </div>
    </div>
  )
}
