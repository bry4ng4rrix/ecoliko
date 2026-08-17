'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { AlertCircle, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

import { useAnneeActive } from '@/hooks/useAnneeActive'
import { useResourceList } from '@/hooks/useResource'
import { fetchSyntheseFinanciere, paiementSalaireService, paiementService } from '@/services'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

// Revenus (encaissements élèves) vs dépenses (salaires versés) : deux identités catégorielles,
// pas des statuts bon/mauvais — palette validée CVD-safe (light + dark), cf. skill dataviz.
const chartConfig = {
  revenus: { label: 'Revenus (écolage encaissé)', color: '#16a34a' },
  depenses: { label: 'Dépenses (salaires versés)', color: '#6366f1' },
}

const formatMontant = (v) => `${Number(v).toLocaleString('fr-FR')} Ar`
const formatCompact = (v) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

/** Additionne les montants payés (statut PAYE) par mois couvert (1-12) pour une liste de paiements. */
function sommeParMois(lignes) {
  const totaux = Array(12).fill(0)
  for (const ligne of lignes) {
    if (ligne.statut !== 'PAYE') continue
    const index = (ligne.mois_couvert ?? 0) - 1
    if (index >= 0 && index < 12) totaux[index] += Number(ligne.montant) || 0
  }
  return totaux
}

export function FinanceOverviewChart() {
  const anneeActive = useAnneeActive()

  const { data: synthese, isLoading: loadingSynthese } = useQuery({
    queryKey: ['synthese-financiere', anneeActive?.id],
    queryFn: () => fetchSyntheseFinanciere(anneeActive.id),
    enabled: Boolean(anneeActive?.id),
  })
  const { data: paiements, isLoading: loadingPaiements } = useResourceList('paiements', paiementService)
  const { data: paiementsSalaire, isLoading: loadingSalaires } = useResourceList('paiements-salaire', paiementSalaireService)

  const isLoading = loadingSynthese || loadingPaiements || loadingSalaires

  const { chartData, totalDepenses } = useMemo(() => {
    const paiementsAnnee = (paiements ?? []).filter((p) => p.annee_scolaire === anneeActive?.id)
    const salairesAnnee = (paiementsSalaire ?? []).filter((p) => p.annee_scolaire === anneeActive?.id)

    const revenusParMois = sommeParMois(paiementsAnnee)
    const depensesParMois = sommeParMois(salairesAnnee)

    return {
      chartData: MOIS_LABELS.map((mois, i) => ({ mois, revenus: revenusParMois[i], depenses: depensesParMois[i] })),
      totalDepenses: depensesParMois.reduce((a, b) => a + b, 0),
    }
  }, [paiements, paiementsSalaire, anneeActive?.id])

  const totalRevenus = Number(synthese?.total_paye ?? 0)
  const totalDettes = Number(synthese?.reste_du ?? 0)
  const soldeNet = totalRevenus - totalDepenses

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Revenus perçus" icon={TrendingUp} tone="green"
          value={isLoading ? '…' : formatMontant(totalRevenus)}
        />
        <StatCard
          title="Dépenses (salaires)" icon={TrendingDown} tone="indigo"
          value={isLoading ? '…' : formatMontant(totalDepenses)}
        />
        <StatCard
          title="Dettes des élèves" icon={AlertCircle} tone="red"
          value={isLoading ? '…' : formatMontant(totalDettes)}
        />
        <StatCard
          title="Solde net" icon={Wallet} tone={soldeNet >= 0 ? 'green' : 'red'}
          value={isLoading ? '…' : formatMontant(soldeNet)}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Revenus vs dépenses</CardTitle>
          <CardDescription>
            Écolage encaissé et salaires versés, par mois{anneeActive ? ` — année ${anneeActive.libelle}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 12, top: 12 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="mois" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} tickFormatter={formatCompact} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="revenus" fill="var(--color-revenus)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenses" fill="var(--color-depenses)" radius={[4, 4, 0, 0]} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const TONE_CLASSES = {
  green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-100/50 dark:border-green-900/30',
  indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100/50 dark:border-indigo-900/30',
  red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-100/50 dark:border-red-900/30',
}

function StatCard({ title, value, icon: Icon, tone = 'indigo' }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
          </div>
          <div className={`rounded-xl p-3 border ${TONE_CLASSES[tone]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
