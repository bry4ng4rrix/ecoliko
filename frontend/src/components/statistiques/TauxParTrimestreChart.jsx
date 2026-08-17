import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { useAnneeActive } from '@/hooks/useAnneeActive'
import { useResourceList } from '@/hooks/useResource'
import { fetchStatistiques, trimestreService } from '@/services'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

// Statuts fixes (bon/avertissement/critique) — jamais la palette catégorielle — car chaque
// série a un sens intrinsèque de qualité (réussite = bon, absence = critique, retard = alerte).
const chartConfig = {
  reussite: { label: 'Taux de réussite', color: '#0ca30c' },
  retard: { label: 'Taux de retard', color: '#fab219' },
  absence: { label: "Taux d'absence", color: '#d03b3b' },
}

export function TauxParTrimestreChart() {
  const anneeActive = useAnneeActive()
  const { data: trimestres } = useResourceList('trimestres', trimestreService)

  const trimestresDeLAnnee = (trimestres ?? [])
    .filter((t) => t.annee_scolaire === anneeActive?.id)
    .sort((a, b) => a.numero - b.numero)
  const idsKey = trimestresDeLAnnee.map((t) => t.id).join(',')

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['statistiques-par-trimestre', anneeActive?.id, idsKey],
    queryFn: async () => {
      const resultats = await Promise.all(trimestresDeLAnnee.map((t) => fetchStatistiques(anneeActive.id, t.id)))
      return trimestresDeLAnnee.map((t, i) => ({
        trimestre: `T${t.numero}`,
        reussite: resultats[i].taux_reussite ?? 0,
        retard: resultats[i].taux_retard ?? 0,
        absence: resultats[i].taux_absence ?? 0,
      }))
    },
    enabled: Boolean(anneeActive?.id) && trimestresDeLAnnee.length > 0,
  })

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Taux par trimestre</CardTitle>
        <CardDescription>
          Réussite, absence et retard{anneeActive ? ` — année ${anneeActive.libelle}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : !chartData?.length ? (
          <p className="text-sm text-muted-foreground">Aucun trimestre pour l'année active.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={chartData} margin={{ left: 4, right: 12, top: 12 }}>
              <defs>
                {Object.keys(chartConfig).map((key) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.03} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="trimestre" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false} axisLine={false} tickMargin={8} width={40}
                domain={[0, 100]} tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area dataKey="reussite" type="monotone" fill={`url(#fill-reussite)`} stroke="var(--color-reussite)" strokeWidth={2} />
              <Area dataKey="retard" type="monotone" fill={`url(#fill-retard)`} stroke="var(--color-retard)" strokeWidth={2} />
              <Area dataKey="absence" type="monotone" fill={`url(#fill-absence)`} stroke="var(--color-absence)" strokeWidth={2} />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
