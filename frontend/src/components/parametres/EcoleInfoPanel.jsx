import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useResourceList, useUpdateResource } from '@/hooks/useResource'
import { ecoleService } from '@/services'
import { Button } from '@/components/ui/button'

const EMPTY_FORM = { nom: '', adresse: '', telephone: '', email: '', devise: '' }

export function EcoleInfoPanel() {
  const { data: ecoles, isLoading } = useResourceList('ecoles', ecoleService)
  const updateEcole = useUpdateResource('ecoles', ecoleService)
  const ecole = ecoles?.[0]

  const [form, setForm] = useState(EMPTY_FORM)
  const [logo, setLogo] = useState(null)

  useEffect(() => {
    if (ecole) {
      setForm({
        nom: ecole.nom ?? '', adresse: ecole.adresse ?? '', telephone: ecole.telephone ?? '',
        email: ecole.email ?? '', devise: ecole.devise ?? '',
      })
    }
  }, [ecole])

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ecole) return
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => payload.append(key, value ?? ''))
      if (logo) payload.append('logo', logo)

      await updateEcole.mutateAsync({ id: ecole.id, payload })
      toast.success('Informations de l\'établissement mises à jour.')
      setLogo(null)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Erreur lors de la mise à jour.')
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>
  if (!ecole) return <p className="text-sm text-muted-foreground">Aucun établissement associé à ce compte.</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        {ecole.logo && (
          <img src={ecole.logo} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />
        )}
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-2">Logo</label>
          <input
            type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            className="text-sm text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-muted file:text-foreground file:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Nom de l'établissement</label>
          <input
            name="nom" value={form.nom} onChange={handleChange} required
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Code établissement</label>
          <input
            disabled value={ecole.code}
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-muted-foreground"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Adresse</label>
        <textarea
          name="adresse" value={form.adresse} onChange={handleChange} rows={2}
          className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Téléphone</label>
          <input
            name="telephone" value={form.telephone} onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Email</label>
          <input
            name="email" type="email" value={form.email} onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Devise (monnaie)</label>
          <input
            name="devise" value={form.devise} onChange={handleChange} placeholder="Ar"
            className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <Button type="submit" disabled={updateEcole.isPending}>
        {updateEcole.isPending ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </form>
  )
}
