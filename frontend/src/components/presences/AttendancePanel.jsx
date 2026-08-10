import { toast } from 'sonner'

import { useResourceList } from '@/hooks/useResource'
import { presenceService, refuserJustification, validerJustification } from '@/services'
import { Button } from '@/components/ui/button'

export function AttendancePanel() {
  const { data: presences, isLoading, refetch } = useResourceList('presences', presenceService)
  const total = presences?.length ?? 0
  const compteurs = (presences ?? []).reduce((acc, p) => ({ ...acc, [p.statut]: (acc[p.statut] ?? 0) + 1 }), {})
  const tauxPresence = total ? ((compteurs.P ?? 0) / total * 100).toFixed(1) : null
  const nonJustifiees = (presences ?? []).filter((p) => p.statut === 'A' && !p.justificatif)
  const enAttente = (presences ?? []).filter((p) => p.justification_statut === 'EN_ATTENTE')

  const handleValider = async (id) => {
    try {
      await validerJustification(id)
      toast.success('Justificatif accepté.')
      refetch()
    } catch {
      toast.error('Erreur lors de la validation.')
    }
  }

  const handleRefuser = async (id) => {
    try {
      await refuserJustification(id)
      toast.success('Justificatif refusé.')
      refetch()
    } catch {
      toast.error('Erreur lors du refus.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Taux présence général</p>
          <p className="text-3xl font-bold mt-2">{isLoading ? '…' : (tauxPresence != null ? `${tauxPresence}%` : '—')}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Absences enregistrées</p>
          <p className="text-3xl font-bold mt-2">{isLoading ? '…' : compteurs.A ?? 0}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Non justifiées</p>
          <p className="text-3xl font-bold mt-2 text-orange-600">{isLoading ? '…' : nonJustifiees.length}</p>
        </div>
      </div>

      {enAttente.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold mb-4">Justificatifs en attente</h2>
          <div className="space-y-3">
            {enAttente.map((item) => (
              <div key={item.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{item.etudiant_nom}</p>
                  <p className="text-sm text-muted-foreground">{item.date_cours} - {item.matiere_intitule}</p>
                  <p className="text-sm mt-1">{item.justificatif}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleValider(item.id)}>Accepter</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleRefuser(item.id)}>Refuser</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Absences non justifiées</h2>
        {!isLoading && nonJustifiees.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune absence non justifiée.</p>
        )}
        <div className="space-y-3">
          {nonJustifiees.map((item) => (
            <div key={item.id} className="border border-border rounded-lg p-4">
              <p className="font-semibold">{item.etudiant_nom}</p>
              <p className="text-sm text-muted-foreground">{item.date_cours} - {item.matiere_intitule}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
