import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Layers, BarChart3, Clock } from 'lucide-react'

import { useAnneeActive } from '@/hooks/useAnneeActive'
import { useResourceList } from '@/hooks/useResource'
import { fetchStatistiques, trimestreService } from '@/services'

export function StatistiquesPanel() {
  const anneeActive = useAnneeActive()
  const { data: trimestres } = useResourceList('trimestres', trimestreService)
  const [trimestreId, setTrimestreId] = useState('')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistiques', anneeActive?.id, trimestreId],
    queryFn: () => fetchStatistiques(anneeActive.id, trimestreId || null),
    enabled: Boolean(anneeActive?.id),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={trimestreId} onChange={(e) => setTrimestreId(e.target.value)}
          className="px-4 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Année complète</option>
          {(trimestres ?? []).map((t) => <option key={t.id} value={t.id}>Trimestre {t.numero}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Taux de réussite</h3>
          </div>
          <p className="text-3xl font-bold">
            {isLoading ? '…' : (stats?.taux_reussite != null ? `${stats.taux_reussite}%` : '—')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.nb_evalues != null ? `Sur ${stats.nb_evalues} élève(s) évalué(s)` : ''}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Taux de présence</h3>
          </div>
          <p className="text-3xl font-bold">
            {isLoading ? '…' : (stats?.taux_presence != null ? `${stats.taux_presence}%` : '—')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.total_seances != null ? `Sur ${stats.total_seances} séance(s) enregistrée(s)` : ''}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Effectifs et moyennes par classe</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left">Classe</th>
                <th className="px-4 py-2 text-center">Effectif</th>
                <th className="px-4 py-2 text-center">Moyenne générale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={3} className="px-4 py-3 text-center text-muted-foreground">Chargement...</td></tr>
              )}
              {!isLoading && (stats?.effectifs_par_classe ?? []).length === 0 && (
                <tr><td colSpan={3} className="px-4 py-3 text-center text-muted-foreground">Aucune classe.</td></tr>
              )}
              {(stats?.effectifs_par_classe ?? []).map((eff) => {
                const moy = (stats?.moyennes_par_classe ?? []).find((m) => m.classe_id === eff.classe_id)
                return (
                  <tr key={eff.classe_id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{eff.classe_nom}</td>
                    <td className="px-4 py-3 text-center">{eff.effectif}</td>
                    <td className="px-4 py-3 text-center">{moy?.moyenne != null ? `${moy.moyenne}/20` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
