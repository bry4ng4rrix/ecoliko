import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { useResourceList } from '@/hooks/useResource'
import { notificationService } from '@/services'
import { apiClient } from '@/lib/apiClient'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

const TYPE_LABELS = {
  NOTE: 'Note', ABSENCE: 'Absence', PAIEMENT: 'Paiement', BULLETIN: 'Bulletin',
  DOCUMENT: 'Document', ANNONCE: 'Annonce', MESSAGE: 'Message',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications, refetch } = useResourceList('notifications', notificationService)
  const queryClient = useQueryClient()

  const nonLues = (notifications ?? []).filter((n) => !n.est_lue)

  const marquerLue = async (id) => {
    await apiClient.post(`/notifications/${id}/marquer-lue/`)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const marquerToutLu = async () => {
    await apiClient.post('/notifications/tout-marquer-lu/')
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) refetch() }}>
      <PopoverTrigger asChild>
        <button className="p-2 hover:bg-muted rounded-lg relative">
          <Bell className="w-5 h-5" />
          {nonLues.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <p className="font-semibold text-sm">Notifications</p>
          {nonLues.length > 0 && (
            <Button variant="ghost" size="sm" onClick={marquerToutLu} className="h-auto py-1 text-xs">
              Tout marquer lu
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {(notifications ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Aucune notification.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.est_lue && marquerLue(n.id)}
                className={`w-full text-left p-3 border-b border-border last:border-0 hover:bg-muted/50 ${n.est_lue ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-primary">{TYPE_LABELS[n.type_notification] ?? n.type_notification}</span>
                  {!n.est_lue && <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />}
                </div>
                <p className="text-sm font-medium mt-0.5">{n.titre}</p>
                {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
