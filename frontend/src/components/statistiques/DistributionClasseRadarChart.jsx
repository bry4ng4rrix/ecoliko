import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

// Une seule série (effectif) : couleur catégorielle slot-1, pas de légende (le titre de la
// carte porte déjà le sens du graphique).
const chartConfig = {
  effectif: { label: 'Élèves', theme: { light: '#2a78d6', dark: '#3987e5' } },
}

export function DistributionClasseRadarChart({ classes }) {
  const data = (classes ?? []).map((c) => ({ classe: c.nom, effectif: c.effectif }))

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Aucune classe pour l'année scolaire active.</p>
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[320px]">
      <RadarChart data={data}>
        <ChartTooltip content={<ChartTooltipContent />} />
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="classe" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
        <Radar
          dataKey="effectif" fill="var(--color-effectif)" fillOpacity={0.3}
          stroke="var(--color-effectif)" strokeWidth={2} dot={{ r: 4, fillOpacity: 1 }}
        />
      </RadarChart>
    </ChartContainer>
  )
}
