import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useCreateResource, useResourceList } from '@/hooks/useResource'
import { annonceService, classeService } from '@/services'
import { Button } from '@/components/ui/button'

const PORTEE_LABELS = {
  ETABLISSEMENT: "Tout l'établissement", CLASSE: 'Une classe', ENSEIGNANTS: 'Les enseignants', PARENTS: 'Les parents',
}

const STAFF_ROLES = ['ADMIN', 'RESPONSABLE', 'ENSEIGNANT', 'SECRETARIAT']

export function AnnoncesPanel() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titre: '', contenu: '', portee: 'ETABLISSEMENT', classe: '' })

  const { data: annonces, isLoading } = useResourceList('annonces', annonceService)
  const { data: classes } = useResourceList('classes', classeService)
  const createAnnonce = useCreateResource('annonces', annonceService)

  const peutPublier = STAFF_ROLES.includes(user?.role)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createAnnonce.mutateAsync({
        titre: form.titre,
        contenu: form.contenu,
        portee: form.portee,
        classe: form.portee === 'CLASSE' ? Number(form.classe) : null,
      })
      toast.success('Annonce publiée.')
      setShowForm(false)
      setForm({ titre: '', contenu: '', portee: 'ETABLISSEMENT', classe: '' })
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de la publication.")
    }
  }

  return (
    <div className="space-y-4">
      {peutPublier && (
        <Button onClick={() => setShowForm((v) => !v)} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Nouvelle annonce
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-4 space-y-3">
          <input
            name="titre" value={form.titre} onChange={handleChange} placeholder="Titre" required
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            name="contenu" value={form.contenu} onChange={handleChange} placeholder="Contenu" required rows={3}
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-3">
            <select
              name="portee" value={form.portee} onChange={handleChange}
              className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(PORTEE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            {form.portee === 'CLASSE' && (
              <select
                name="classe" value={form.classe} onChange={handleChange} required
                className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Choisir une classe</option>
                {(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            )}
          </div>
          <Button type="submit" disabled={createAnnonce.isPending} className="w-full">Publier</Button>
        </form>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (annonces ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune annonce.</p>
        )}
        {(annonces ?? []).map((a) => (
          <div key={a.id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex justify-between items-start mb-1">
              <p className="font-semibold">{a.titre}</p>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{PORTEE_LABELS[a.portee]}</span>
            </div>
            <p className="text-sm text-muted-foreground">{a.contenu}</p>
            <p className="text-xs text-muted-foreground mt-2">{a.auteur_nom ?? 'Système'} · {new Date(a.date_publication).toLocaleDateString('fr-FR')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
