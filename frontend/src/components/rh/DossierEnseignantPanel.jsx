import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useAnneeActive } from '@/hooks/useAnneeActive'
import {
  useCreateResource, useResourceList, useUpdateResource,
} from '@/hooks/useResource'
import { dossierEnseignantService, paiementSalaireService, staffService } from '@/services'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserAvatar } from '@/components/ui/user-avatar'

const TYPE_CONTRAT_LABELS = { CDI: 'CDI', CDD: 'CDD', VACATAIRE: 'Vacataire', STAGIAIRE: 'Stagiaire' }

const EMPTY_FORM = {
  enseignant: '', type_contrat: 'CDI', date_embauche: '', diplomes: '', salaire: '', volume_horaire_hebdo: '',
}

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const MODES_PAIEMENT = ['Espèces', 'Virement', 'Chèque', 'Mobile Money']

const STATUT_VARIANT = { PAYE: 'default', EN_ATTENTE: 'secondary', ANNULE: 'secondary' }

export function DossierEnseignantPanel() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [enseignantPaiements, setEnseignantPaiements] = useState(null)

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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar photo={d.enseignant_photo} name={d.enseignant_nom} className="w-7 h-7" />
                    <span>{d.enseignant_nom}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{TYPE_CONTRAT_LABELS[d.type_contrat] ?? '—'}</td>
                <td className="px-4 py-3">{d.date_embauche ?? '—'}</td>
                <td className="px-4 py-3">{d.volume_horaire_hebdo ? `${d.volume_horaire_hebdo} h/sem` : '—'}</td>
                <td className="px-4 py-3 text-center space-x-3">
                  <button className="text-primary hover:underline text-xs" onClick={() => startEdit(d.enseignant)}>
                    Modifier
                  </button>
                  <button
                    className="text-primary hover:underline text-xs"
                    onClick={() => setEnseignantPaiements({ id: d.enseignant, nom: d.enseignant_nom, salaire: d.salaire })}
                  >
                    Paiements
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {enseignantPaiements && (
        <PaiementsSalaireDialog enseignant={enseignantPaiements} onClose={() => setEnseignantPaiements(null)} />
      )}
    </div>
  )
}

function PaiementsSalaireDialog({ enseignant, onClose }) {
  const anneeActive = useAnneeActive()
  const queryClient = useQueryClient()
  const { data: paiements, isLoading } = useResourceList('paiements-salaire', paiementSalaireService)
  const createPaiement = useCreateResource('paiements-salaire', paiementSalaireService)
  const updatePaiement = useUpdateResource('paiements-salaire', paiementSalaireService)

  const mesPaiements = (paiements ?? []).filter(
    (p) => p.membre === enseignant.id && p.annee_scolaire === anneeActive?.id
  )
  const paiementsParMois = (mois) => mesPaiements.filter((p) => p.mois_couvert === mois)

  const dateEcheancePourMois = (mois) => {
    const anneeDebut = new Date(anneeActive.date_debut).getFullYear()
    const annee = mois >= 9 ? anneeDebut : anneeDebut + 1
    return `${annee}-${String(mois).padStart(2, '0')}-05`
  }

  const invalider = () => queryClient.invalidateQueries({ queryKey: ['paiements-salaire'] })

  const handleMarquerPaye = async (mois, modePaiement) => {
    const existant = paiementsParMois(mois)[0]
    try {
      if (existant) {
        await updatePaiement.mutateAsync({ id: existant.id, payload: { statut: 'PAYE', mode_paiement: modePaiement } })
      } else {
        await createPaiement.mutateAsync({
          membre: enseignant.id, annee_scolaire: anneeActive.id, montant: enseignant.salaire ?? 0,
          mois_couvert: mois, date_paiement: dateEcheancePourMois(mois), mode_paiement: modePaiement, statut: 'PAYE',
        })
      }
      invalider()
      toast.success('Mois marqué comme payé.')
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Erreur lors de la mise à jour.')
    }
  }

  const handleMarquerNonPaye = async (mois) => {
    const existant = paiementsParMois(mois)[0]
    if (!existant) return
    try {
      await updatePaiement.mutateAsync({ id: existant.id, payload: { statut: 'EN_ATTENTE' } })
      invalider()
      toast.success('Mois marqué comme non payé.')
    } catch {
      toast.error('Erreur lors de la mise à jour.')
    }
  }

  const totalPaye = mesPaiements.filter((p) => p.statut === 'PAYE').reduce((s, p) => s + Number(p.montant), 0)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Paiements de salaire — {enseignant.nom}</DialogTitle>
        </DialogHeader>

        {!anneeActive ? (
          <p className="text-sm text-muted-foreground">Aucune année scolaire active.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Salaire mensuel</p>
                <p className="text-lg font-bold">
                  {enseignant.salaire ? `${Number(enseignant.salaire).toLocaleString('fr-FR')} Ar` : 'Non renseigné'}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total versé cette année</p>
                <p className="text-lg font-bold text-green-600">{totalPaye.toLocaleString('fr-FR')} Ar</p>
              </div>
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Mois</th>
                    <th className="px-3 py-2 text-left">Montant</th>
                    <th className="px-3 py-2 text-left">Mode</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOIS_LABELS.map((label, i) => {
                    const mois = i + 1
                    const paiement = paiementsParMois(mois)[0]
                    const dejaPaye = paiement?.statut === 'PAYE'
                    return (
                      <tr key={mois}>
                        <td className="px-3 py-2">{label}</td>
                        <td className="px-3 py-2 font-mono">
                          {paiement ? `${Number(paiement.montant).toLocaleString('fr-FR')} Ar` : '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{paiement?.mode_paiement ?? '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={paiement ? (STATUT_VARIANT[paiement.statut] ?? 'secondary') : 'secondary'}>
                            {paiement ? paiement.statut : 'Non payé'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {dejaPaye ? (
                            <button
                              type="button" onClick={() => handleMarquerNonPaye(mois)}
                              className="text-xs px-2 py-1 bg-red-500/20 text-red-700 rounded hover:bg-red-500/30 font-medium"
                            >
                              Marquer non payé
                            </button>
                          ) : (
                            <select
                              defaultValue=""
                              onChange={(e) => { if (e.target.value) handleMarquerPaye(mois, e.target.value) }}
                              className="text-xs px-2 py-1 bg-green-500/20 text-green-700 rounded font-medium border-0 cursor-pointer"
                            >
                              <option value="" disabled>Marquer payé...</option>
                              {MODES_PAIEMENT.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                            </select>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
