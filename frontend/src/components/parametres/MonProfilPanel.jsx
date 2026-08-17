import { useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/ui/user-avatar'

/** Formulaire de profil personnel (nom, coordonnées, photo) réutilisé par tous les rôles

 * (admin, secrétariat, parent...) — même mécanisme que l'onglet Paramètres enseignant.
 */
export function MonProfilPanel() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    first_name: user?.first_name ?? '', last_name: user?.last_name ?? '',
    email: user?.email ?? '', telephone: user?.telephone ?? '',
  })
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => payload.append(key, value ?? ''))
      if (photo) payload.append('photo', photo)

      const updated = await authService.updateProfile(payload)
      setUser(updated)
      setPhoto(null)
      toast.success('Profil mis à jour.')
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Erreur lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <UserAvatar
          photo={photo ? URL.createObjectURL(photo) : user?.photo}
          name={`${form.first_name} ${form.last_name}`}
          className="w-20 h-20"
        />
        <div>
          <Label htmlFor="photo" className="block mb-2">Photo de profil</Label>
          <Input
            id="photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="text-sm text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-muted file:text-foreground file:text-sm h-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom</Label>
          <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nom</Label>
          <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone" name="telephone" value={form.telephone} onChange={handleChange}
            placeholder="+261 XX XX XX XX"
          />
        </div>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </Button>
    </form>
  )
}
