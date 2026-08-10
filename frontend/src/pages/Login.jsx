import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail, BookOpen, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_HOME } from '@/components/ProtectedRoute'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      const from = location.state?.from?.pathname
      navigate(from ?? ROLE_HOME[user.role] ?? '/', { replace: true })
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.detail ||
        data?.non_field_errors?.[0] ||
        'Identifiants incorrects ou compte inactif'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md md:max-w-lg">
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-lg">
              <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              SIG-Lycée
            </h1>
          </div>
          <p className="text-indigo-200 text-base md:text-lg font-medium">
            Système de Gestion Scolaire
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/30 p-6 md:p-8 border border-white/10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                !
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email ou matricule</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="exemple@lycee.mg ou matricule"
                  autoComplete="username"
                  required
                  className="pl-11 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pl-11 h-12 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{' '}
            <a href="/register" className="text-indigo-600 hover:underline font-medium">
              Créer un compte
            </a>
          </p>
        </div>

        <p className="text-center text-indigo-200/80 text-sm mt-8">
          © {new Date().getFullYear()} SIG-Lycée • Tous droits réservés
        </p>
      </div>
    </div>
  )
}

export default Login
