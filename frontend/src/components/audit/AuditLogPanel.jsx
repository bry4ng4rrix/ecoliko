import { useResourceList } from '@/hooks/useResource'
import { auditLogService } from '@/services'

const ACTION_LABELS = { CREATION: 'Création', MODIFICATION: 'Modification', SUPPRESSION: 'Suppression' }
const ACTION_COLORS = {
  CREATION: 'bg-green-500/20 text-green-700', MODIFICATION: 'bg-blue-500/20 text-blue-700',
  SUPPRESSION: 'bg-red-500/20 text-red-700',
}

export function AuditLogPanel() {
  const { data: logs, isLoading } = useResourceList('audit-logs', auditLogService)

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted border-b border-border">
          <tr>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Action</th>
            <th className="px-4 py-2 text-left">Élément</th>
            <th className="px-4 py-2 text-left">Par</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr><td colSpan={4} className="px-4 py-3 text-center text-muted-foreground">Chargement...</td></tr>
          )}
          {!isLoading && (logs ?? []).length === 0 && (
            <tr><td colSpan={4} className="px-4 py-3 text-center text-muted-foreground">Aucune entrée.</td></tr>
          )}
          {(logs ?? []).map((entry) => (
            <tr key={entry.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 whitespace-nowrap">{new Date(entry.date_action).toLocaleString('fr-FR')}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded font-medium ${ACTION_COLORS[entry.action]}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
              </td>
              <td className="px-4 py-3">{entry.modele} — {entry.objet_repr}</td>
              <td className="px-4 py-3">{entry.utilisateur_nom ?? 'Système'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
