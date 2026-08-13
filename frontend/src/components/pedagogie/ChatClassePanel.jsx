import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Lock, Paperclip, Send, Unlock, X } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource } from '@/hooks/useResource'
import { definirDiscussionClasse, discussionClasseService, messageGroupeClasseService } from '@/services'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'

const ROLE_LABELS = { ENSEIGNANT: 'Prof', ETUDIANT: 'Élève', PARENT: 'Parent' }
const EXTENSIONS_IMAGE = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

function estImage(url) {
  const chemin = (url ?? '').split('?')[0].toLowerCase()
  return EXTENSIONS_IMAGE.some((ext) => chemin.endsWith(ext))
}

/** Chat de groupe d'une classe, propre au professeur connecté (un fil par classe qu'il

 * enseigne) — élèves de la classe et leurs parents peuvent y participer. Rafraîchi par
 * sondage (pas d'infrastructure websocket dans ce projet) toutes les 5 secondes. Le
 * professeur peut ouvrir/fermer la discussion : fermée, les élèves/parents restent en
 * lecture seule, lui peut toujours écrire. Chaque message peut porter une pièce jointe
 * (image, PDF, document...), avec ou sans texte.
 */
export function ChatClassePanel({ classeId, enseignantId, classeNom }) {
  const { user } = useAuth()
  const [contenu, setContenu] = useState('')
  const [fichierJoint, setFichierJoint] = useState(null)
  const [toggleEnCours, setToggleEnCours] = useState(false)
  const finListeRef = useRef(null)
  const fichierInputRef = useRef(null)
  const queryClient = useQueryClient()
  const estProf = user?.id === enseignantId

  const params = { classe: classeId, enseignant: enseignantId }
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages-groupe-classe', 'list', params],
    queryFn: () => messageGroupeClasseService.list(params),
    enabled: Boolean(classeId && enseignantId),
    refetchInterval: 5000,
  })
  const { data: discussions } = useQuery({
    queryKey: ['discussions-classe', 'list', params],
    queryFn: () => discussionClasseService.list(params),
    enabled: Boolean(classeId && enseignantId),
    refetchInterval: 5000,
  })
  const envoyerMessage = useCreateResource('messages-groupe-classe', messageGroupeClasseService)

  // Pas d'enregistrement = discussion ouverte par défaut (même règle que côté backend).
  const estOuverte = discussions?.[0]?.est_ouverte ?? true
  const peutEcrire = estProf || estOuverte
  const peutEnvoyer = Boolean(contenu.trim() || fichierJoint)

  useEffect(() => {
    finListeRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!peutEnvoyer) return
    try {
      const payload = new FormData()
      payload.append('classe', classeId)
      payload.append('enseignant', enseignantId)
      if (contenu.trim()) payload.append('contenu', contenu.trim())
      if (fichierJoint) payload.append('fichier', fichierJoint)

      await envoyerMessage.mutateAsync(payload)
      setContenu('')
      setFichierJoint(null)
      queryClient.invalidateQueries({ queryKey: ['messages-groupe-classe'] })
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'envoi.")
    }
  }

  const handleToggleDiscussion = async () => {
    setToggleEnCours(true)
    try {
      await definirDiscussionClasse(classeId, enseignantId, !estOuverte)
      queryClient.invalidateQueries({ queryKey: ['discussions-classe'] })
      toast.success(estOuverte ? 'Discussion fermée : les élèves ne peuvent plus répondre.' : 'Discussion rouverte.')
    } catch (err) {
      const data = err.response?.data
      toast.error(data?.detail ?? 'Erreur lors du changement de statut.')
    } finally {
      setToggleEnCours(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border flex flex-col h-[480px]">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sm">Chat de classe — {classeNom}</h2>
          <p className="text-xs text-muted-foreground">Visible par vous, les élèves de la classe et leurs parents.</p>
        </div>
        {estProf && (
          <Button
            type="button" size="sm" variant={estOuverte ? 'outline' : 'secondary'} className="gap-2 flex-shrink-0"
            onClick={handleToggleDiscussion} disabled={toggleEnCours}
          >
            {estOuverte ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {estOuverte ? 'Fermer la discussion' : 'Ouvrir la discussion'}
          </Button>
        )}
      </div>

      {!estOuverte && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 text-xs font-medium">
          Discussion fermée par le professeur — {estProf ? 'seul vous pouvez écrire.' : 'lecture seule pour le moment.'}
        </div>
      )}

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
                {m.fichier && (
                  estImage(m.fichier) ? (
                    <a href={m.fichier} target="_blank" rel="noreferrer">
                      <img src={m.fichier} alt="Pièce jointe" className="rounded-lg max-w-full max-h-48 mb-1 mt-1" />
                    </a>
                  ) : (
                    <a
                      href={m.fichier} target="_blank" rel="noreferrer"
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 mb-1 mt-1 text-xs underline ${
                        estMoi ? 'bg-primary-foreground/10' : 'bg-background'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{decodeURIComponent(m.fichier.split('/').pop())}</span>
                    </a>
                  )
                )}
                {m.contenu && <p className="whitespace-pre-wrap break-words">{m.contenu}</p>}
                <p className={`text-[10px] mt-1 ${estMoi ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(m.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={finListeRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border space-y-2">
        {fichierJoint && (
          <div className="flex items-center justify-between gap-2 bg-muted rounded-lg px-2 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 truncate">
              <Paperclip className="w-3.5 h-3.5 flex-shrink-0" /> {fichierJoint.name}
            </span>
            <button type="button" onClick={() => setFichierJoint(null)} className="flex-shrink-0 hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fichierInputRef} type="file" onChange={(e) => setFichierJoint(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <Button
            type="button" size="sm" variant="outline" className="flex-shrink-0"
            onClick={() => fichierInputRef.current?.click()} disabled={!peutEcrire}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            value={contenu} onChange={(e) => setContenu(e.target.value)}
            placeholder={peutEcrire ? 'Écrire un message...' : 'Discussion fermée par le professeur'}
            disabled={!peutEcrire}
            className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          />
          <Button type="submit" size="sm" disabled={!peutEcrire || envoyerMessage.isPending || !peutEnvoyer} className="gap-2">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
