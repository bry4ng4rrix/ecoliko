import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource } from '@/hooks/useResource'
import { messageGroupeClasseService } from '@/services'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'

const ROLE_LABELS = { ENSEIGNANT: 'Prof', ETUDIANT: 'Élève', PARENT: 'Parent' }

/** Chat de groupe d'une classe, propre au professeur connecté (un fil par classe qu'il

 * enseigne) — élèves de la classe et leurs parents peuvent y participer. Rafraîchi par
 * sondage (pas d'infrastructure websocket dans ce projet) toutes les 5 secondes.
 */
export function ChatClassePanel({ classeId, enseignantId, classeNom }) {
  const { user } = useAuth()
  const [contenu, setContenu] = useState('')
  const finListeRef = useRef(null)
  const queryClient = useQueryClient()

  const params = { classe: classeId, enseignant: enseignantId }
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages-groupe-classe', 'list', params],
    queryFn: () => messageGroupeClasseService.list(params),
    enabled: Boolean(classeId && enseignantId),
    refetchInterval: 5000,
  })
  const envoyerMessage = useCreateResource('messages-groupe-classe', messageGroupeClasseService)

  useEffect(() => {
    finListeRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!contenu.trim()) return
    try {
      await envoyerMessage.mutateAsync({ classe: classeId, enseignant: enseignantId, contenu: contenu.trim() })
      setContenu('')
      queryClient.invalidateQueries({ queryKey: ['messages-groupe-classe'] })
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'envoi.")
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border flex flex-col h-[480px]">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm">Chat de classe — {classeNom}</h2>
        <p className="text-xs text-muted-foreground">Visible par vous, les élèves de la classe et leurs parents.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (messages ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-6">
            Aucun message pour l'instant — lancez la discussion !
          </p>
        )}
        {(messages ?? []).map((m) => {
          const estMoi = m.auteur === user?.id
          return (
            <div key={m.id} className={`flex items-end gap-2 ${estMoi ? 'flex-row-reverse' : ''}`}>
              <UserAvatar photo={m.auteur_photo} name={m.auteur_nom} className="w-7 h-7 flex-shrink-0" />
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                estMoi ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
              }`}>
                {!estMoi && (
                  <p className="text-xs font-semibold opacity-80">
                    {m.auteur_nom} <span className="opacity-60">· {ROLE_LABELS[m.auteur_role] ?? m.auteur_role}</span>
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.contenu}</p>
                <p className={`text-[10px] mt-1 ${estMoi ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(m.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={finListeRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
        <input
          value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Écrire un message..."
          className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" size="sm" disabled={envoyerMessage.isPending || !contenu.trim()} className="gap-2">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
