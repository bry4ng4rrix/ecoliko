import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useResourceList } from '@/hooks/useResource'
import { classeService, fetchClassement, fetchClassementAnnuel, trimestreService } from '@/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'

const FILTRES_REUSSITE = [
  { value: '', label: 'Tous les élèves' },
  { value: 'ADMIS', label: 'Admis (moyenne ≥ 10)' },
  { value: 'REDOUBLE', label: 'Redouble (moyenne < 10)' },
]

export function NotesEvaluationsPanel() {
  const [classeId, setClasseId] = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [filtreReussite, setFiltreReussite] = useState('')
  const [vue, setVue] = useState('trimestriel') // 'trimestriel' | 'annuel'

  const { data: classes } = useResourceList('classes', classeService)
  const { data: trimestres } = useResourceList('trimestres', trimestreService)

  const classeSelectionnee = (classes ?? []).find((c) => String(c.id) === classeId)
  const trimestresDeLaClasse = classeSelectionnee
    ? (trimestres ?? []).filter((t) => t.annee_scolaire === classeSelectionnee.annee_scolaire)
    : []

  // Sélectionne automatiquement la classe et le trimestre actif dès que les listes arrivent.
  useEffect(() => {
    if (!classeId && classes?.length) setClasseId(String(classes[0].id))
  }, [classes, classeId])

  useEffect(() => {
    if (!classeSelectionnee || trimestreId) return
    const actif = trimestresDeLaClasse.find((t) => t.est_actif)
    if (actif) setTrimestreId(String(actif.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeSelectionnee?.id, trimestres])

  const { data: classementTrimestriel, isLoading: chargeTrimestriel } = useQuery({
    queryKey: ['classement', classeId, trimestreId],
    queryFn: () => fetchClassement(Number(classeId), Number(trimestreId)),
    enabled: vue === 'trimestriel' && Boolean(classeId && trimestreId),
  })
  const { data: classementAnnuel, isLoading: chargeAnnuel } = useQuery({
    queryKey: ['classement-annuel', classeId],
    queryFn: () => fetchClassementAnnuel(Number(classeId)),
    enabled: vue === 'annuel' && Boolean(classeId),
  })

  const classement = vue === 'annuel' ? classementAnnuel : classementTrimestriel
  const isLoading = vue === 'annuel' ? chargeAnnuel : chargeTrimestriel
  const pretAAfficher = vue === 'annuel' ? Boolean(classeId) : Boolean(classeId && trimestreId)

  const lignes = useMemo(() => {
    const source = classement ?? []
    if (!filtreReussite) return source
    return source.filter((l) => {
      const moyenne = l.moyenne === null || l.moyenne === undefined ? null : Number(l.moyenne)
      if (moyenne === null) return false
      return filtreReussite === 'ADMIS' ? moyenne >= 10 : moyenne < 10
    })
  }, [classement, filtreReussite])

  const columns = useMemo(() => [
    { accessorKey: 'rang', header: 'Rang' },
    { accessorKey: 'nom_complet', header: 'Élève' },
    {
      accessorKey: 'moyenne', header: vue === 'annuel' ? 'Moyenne générale annuelle' : 'Moyenne',
      cell: ({ row }) => row.original.moyenne === null || row.original.moyenne === undefined
        ? <span className="text-muted-foreground">—</span>
        : <span className="font-mono">{Number(row.original.moyenne).toFixed(2)} / 20</span>,
    },
    {
      id: 'statut', header: vue === 'annuel' ? 'Décision' : 'Statut', enableSorting: false,
      cell: ({ row }) => {
        const moyenne = row.original.moyenne === null || row.original.moyenne === undefined ? null : Number(row.original.moyenne)
        if (moyenne === null) return <Badge variant="secondary">Pas de notes</Badge>
        return moyenne >= 10
          ? <Badge className="bg-green-600 hover:bg-green-600">{vue === 'annuel' ? 'Passant' : 'Admis'}</Badge>
          : <Badge variant="destructive">Redouble</Badge>
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [vue])

  const effectifAdmis = (classement ?? []).filter((l) => l.moyenne !== null && Number(l.moyenne) >= 10).length
  const effectifRedouble = (classement ?? []).filter((l) => l.moyenne !== null && Number(l.moyenne) < 10).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notes & Évaluations</h1>
        <p className="text-muted-foreground mt-1">
          {vue === 'annuel'
            ? 'Bilan annuel : moyenne générale des 3 trimestres et décision de passage en classe supérieure.'
            : 'Classement et moyennes par classe et par trimestre'}
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" variant={vue === 'trimestriel' ? 'default' : 'outline'} onClick={() => setVue('trimestriel')}>
          Par trimestre
        </Button>
        <Button type="button" size="sm" variant={vue === 'annuel' ? 'default' : 'outline'} onClick={() => setVue('annuel')}>
          Bilan annuel (passage / redoublement)
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Classe</label>
          <select
            value={classeId} onChange={(e) => { setClasseId(e.target.value); setTrimestreId('') }}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        {vue === 'trimestriel' && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Trimestre</label>
            <select
              value={trimestreId} onChange={(e) => setTrimestreId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choisir un trimestre</option>
              {trimestresDeLaClasse.map((t) => (
                <option key={t.id} value={t.id}>Trimestre {t.numero}{t.est_actif ? ' (actif)' : ''}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Réussite</label>
          <select
            value={filtreReussite} onChange={(e) => setFiltreReussite(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {FILTRES_REUSSITE.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {pretAAfficher && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <p className="text-sm text-muted-foreground">Élèves de la classe</p>
            <p className="text-3xl font-bold mt-2">{(classement ?? []).length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <p className="text-sm text-muted-foreground">{vue === 'annuel' ? 'Passants (≥ 10)' : 'Admis (≥ 10)'}</p>
            <p className="text-3xl font-bold mt-2 text-green-600">{effectifAdmis}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <p className="text-sm text-muted-foreground">Redoublent (&lt; 10)</p>
            <p className="text-3xl font-bold mt-2 text-red-600">{effectifRedouble}</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6">
        {!pretAAfficher ? (
          <p className="text-sm text-muted-foreground">
            {vue === 'annuel' ? 'Choisissez une classe pour voir le bilan annuel.' : 'Choisissez une classe et un trimestre pour voir le classement.'}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={lignes}
            isLoading={isLoading}
            searchPlaceholder="Rechercher un élève..."
            emptyMessage="Aucun résultat pour ce filtre."
          />
        )}
      </div>
    </div>
  )
}
