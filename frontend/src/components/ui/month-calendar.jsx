import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
export const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

/** Renvoie le mois {mois, annee} suivant/précédent celui donné (dir = -1 | 1), ou le mois courant si dir === 'aujourdhui'. */
export function moisSuivant({ mois, annee }, dir) {
  if (dir === 'aujourdhui') {
    const now = new Date()
    return { mois: now.getMonth(), annee: now.getFullYear() }
  }
  let m = mois + dir
  let a = annee
  if (m < 0) { m = 11; a -= 1 }
  if (m > 11) { m = 0; a += 1 }
  return { mois: m, annee: a }
}

/**
 * Calendrier mensuel générique façon agenda (type Google Calendar) : navigation
 * mois par mois, grille Dim–Sam, événements affichés en barres colorées par jour.
 * `events`: [{ date: 'YYYY-MM-DD', label, color: classe Tailwind bg-*, title? }]
 */
export function MonthCalendar({ mois, annee, onNavigate, events }) {
  const decalage = new Date(annee, mois, 1).getDay()
  const nbJours = new Date(annee, mois + 1, 0).getDate()

  const cellules = []
  for (let i = 0; i < decalage; i++) cellules.push(null)
  for (let j = 1; j <= nbJours; j++) cellules.push(j)
  while (cellules.length % 7 !== 0) cellules.push(null)

  const aujourdhui = new Date()
  const estAujourdhui = (jour) =>
    jour && aujourdhui.getFullYear() === annee && aujourdhui.getMonth() === mois && aujourdhui.getDate() === jour

  const eventsPourJour = (jour) => {
    if (!jour) return []
    const dateStr = `${annee}-${String(mois + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
    return events.filter((e) => e.date === dateStr)
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onNavigate('aujourdhui')}>Aujourd'hui</Button>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate(-1)} className="p-1.5 hover:bg-muted rounded" aria-label="Mois précédent">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-semibold w-44 text-center">{MOIS_NOMS[mois]} {annee}</h3>
          <button onClick={() => onNavigate(1)} className="p-1.5 hover:bg-muted rounded" aria-label="Mois suivant">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="w-20 hidden sm:block" />
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {JOURS_COURTS.map((j) => (
          <div key={j} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">{j}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cellules.map((jour, idx) => {
          const evts = eventsPourJour(jour)
          return (
            <div key={idx} className={`min-h-[90px] border-b border-r border-border p-1.5 ${jour ? '' : 'bg-muted/20'}`}>
              {jour && (
                <>
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      estAujourdhui(jour) ? 'bg-primary text-primary-foreground' : ''
                    }`}
                  >
                    {jour}
                  </span>
                  <div className="mt-1 space-y-1">
                    {evts.map((e, i) => (
                      <div
                        key={i} title={e.title}
                        className={`rounded px-1.5 py-1 text-[11px] font-medium truncate text-white ${e.color}`}
                      >
                        {e.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
