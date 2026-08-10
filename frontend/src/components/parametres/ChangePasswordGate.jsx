import { useState } from 'react'
import { Lock, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'

/**
 * Bloque l'accès au tableau de bord tant que `user.must_change_password` est vrai
 * (compte créé par un administrateur avec le mot de passe temporaire "12345678").
 */
export function ChangePasswordGate({ children }) {
  const { user, setUser } = useAuth()
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user?.must_change_password) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (nouveau.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (nouveau !== confirmation) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }

    setLoading(true)
    try {
      await authService.changePassword(ancien, nouveau)
      setUser((prev) => ({ ...prev, must_change_password: false }))
      toast.success('Mot de passe mis à jour.')
    } catch (err) {
      const data = err.response?.data
      setError(data?.ancien_mot_de_passe || data?.nouveau_mot_de_passe || data?.detail || 'Erreur lors du changement de mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-lg">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">SIG-Lycée</h1>
          </div>
          <p className="text-indigo-200 text-base font-medium">
            Première connexion — veuillez choisir un nouveau mot de passe
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/30 p-6 md:p-8 border border-white/10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="ancien">Mot de passe temporaire</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="ancien" type="password" value={ancien}
                  onChange={(e) => setAncien(e.target.value)}
                  autoComplete="current-password" required className="pl-11 h-12 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nouveau">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="nouveau" type="password" value={nouveau}
                  onChange={(e) => setNouveau(e.target.value)}
                  autoComplete="new-password" required className="pl-11 h-12 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmation">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmation" type="password" value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="new-password" required className="pl-11 h-12 rounded-xl"
                />
              </div>
            </div>
            <Button
              type="submit" disabled={loading}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
