import { useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource, useResourceList } from '@/hooks/useResource'
import { classeService, messageService, staffService } from '@/services'
import { Button } from '@/components/ui/button'

const STAFF_ROLES = ['ADMIN', 'RESPONSABLE', 'ENSEIGNANT', 'SECRETARIAT']

export function MessageriePanel() {
  const { user } = useAuth()
  const [replyTo, setReplyTo] = useState(null)
  const [form, setForm] = useState({ destinataire: '', objet: '', contenu: '' })

  const { data: messages, isLoading } = useResourceList('messages', messageService)
  const { data: personnel } = useResourceList('personnel', staffService, { enabled: STAFF_ROLES.includes(user?.role) })
  const { data: classes } = useResourceList('classes', classeService, { enabled: user?.role === 'ENSEIGNANT' })
  const createMessage = useCreateResource('messages', messageService)

  const peutComposer = STAFF_ROLES.includes(user?.role)
  const delegues = user?.role === 'ENSEIGNANT'
    ? (classes ?? [])
      .filter((c) => c.delegue_utilisateur)
      .map((c) => ({ id: c.delegue_utilisateur, first_name: c.delegue_nom, last_name: '', role: `Délégué ${c.nom}` }))
    : []
  const annuaire = [...(personnel ?? []).filter((p) => p.id !== user?.id), ...delegues]

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const ouvrirReponse = (message) => {
    const autre = message.expediteur === user.id ? message.destinataire : message.expediteur
    const autreNom = message.expediteur === user.id ? message.destinataire_nom : message.expediteur_nom
    setReplyTo({ id: autre, nom: autreNom })
    setForm({ destinataire: String(autre), objet: `Re: ${message.objet}`, contenu: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createMessage.mutateAsync({
        destinataire: Number(form.destinataire), objet: form.objet, contenu: form.contenu,
      })
      toast.success('Message envoyé.')
      setForm({ destinataire: '', objet: '', contenu: '' })
      setReplyTo(null)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'envoi.")
    }
  }

  return (
    <div className="space-y-6">
      {(peutComposer || replyTo) && (
        <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h2 className="font-semibold text-sm">{replyTo ? `Répondre à ${replyTo.nom}` : 'Nouveau message'}</h2>
          {peutComposer && !replyTo && (
            <select
              name="destinataire" value={form.destinataire} onChange={handleChange} required
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choisir un destinataire</option>
              {annuaire.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.role})</option>)}
            </select>
          )}
          <input
            name="objet" value={form.objet} onChange={handleChange} placeholder="Objet" required
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            name="contenu" value={form.contenu} onChange={handleChange} placeholder="Votre message..." required rows={3}
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={createMessage.isPending} className="gap-2">
              <Send className="w-4 h-4" /> Envoyer
            </Button>
            {replyTo && (
              <Button type="button" variant="secondary" onClick={() => { setReplyTo(null); setForm({ destinataire: '', objet: '', contenu: '' }) }}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      )}

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (messages ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun message.</p>
        )}
        {(messages ?? []).map((m) => {
          const recu = m.destinataire === user?.id
          return (
            <div key={m.id} className={`bg-card rounded-lg border border-border p-4 ${recu && !m.est_lu ? 'border-primary' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-sm">
                  {recu ? `De : ${m.expediteur_nom}` : `À : ${m.destinataire_nom}`}
                </p>
                <span className="text-xs text-muted-foreground">{new Date(m.date_envoi).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="text-sm font-medium">{m.objet}</p>
              <p className="text-sm text-muted-foreground mt-1">{m.contenu}</p>
              {recu && (
                <button onClick={() => ouvrirReponse(m)} className="text-xs text-primary hover:underline mt-2">
                  Répondre
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
