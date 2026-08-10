import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, UserPlus, Loader2, School, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/apiClient'
import { authService } from '@/services/authService'

const MODES = {
  JOIN: 'join',
  CREATE: 'create',
}

function Register() {
  const [mode, setMode] = useState(MODES.JOIN)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md md:max-w-lg">
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-lg">
              <UserPlus className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Inscription SIG-Lycée
            </h1>
          </div>
          <p className="text-indigo-200 text-base md:text-lg">
            {mode === MODES.JOIN ? 'Créez votre compte élève ou parent' : 'Créez le compte de votre établissement'}
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/30 p-6 md:p-8 border border-white/10">
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode(MODES.JOIN); setError(''); setSuccess('') }}
              className={`flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-semibold transition-colors ${
                mode === MODES.JOIN ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <School className="w-4 h-4" /> Élève / Parent
            </button>
            <button
              type="button"
              onClick={() => { setMode(MODES.CREATE); setError(''); setSuccess('') }}
              className={`flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-semibold transition-colors ${
                mode === MODES.CREATE ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4" /> Créer un établissement
            </button>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">!</div>
              {error}
            </div>
          )}

          {mode === MODES.JOIN ? (
            <JoinForm setError={setError} setSuccess={setSuccess} loading={loading} setLoading={setLoading} />
          ) : (
            <CreateEcoleForm setError={setError} setSuccess={setSuccess} loading={loading} setLoading={setLoading} navigate={navigate} />
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <button onClick={() => navigate('/login')} className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
              Se connecter
            </button>
          </div>
        </div>

        <p className="text-center text-indigo-200/80 text-sm mt-8">
          © {new Date().getFullYear()} SIG-Lycée • Tous droits réservés
        </p>
      </div>
    </div>
  )
}

function JoinForm({ setError, setSuccess, loading, setLoading }) {
  const [formData, setFormData] = useState({
    email: '', password: '', first_name: '', last_name: '',
    role: 'ETUDIANT', genre: 'H', ecole: '',
  })
  const [ecoles, setEcoles] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    apiClient.get('/ecoles/publiques/').then(({ data }) => setEcoles(data)).catch(() => setEcoles([]))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.ecole) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    try {
      await authService.register({
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: formData.role,
        genre: formData.genre,
        ecole: Number(formData.ecole),
      })

      setSuccess("Inscription réussie ! Votre compte doit être activé par l'administration de l'établissement avant de pouvoir vous connecter.")
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.role?.[0] ||
        data?.ecole?.[0] ||
        data?.non_field_errors?.[0] ||
        data?.detail ||
        'Erreur lors de l\'inscription'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">Prénom *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="first_name" name="first_name" value={formData.first_name} onChange={handleChange}
              placeholder="Votre prénom" required className="pl-11 h-12 rounded-xl"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Nom *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="last_name" name="last_name" value={formData.last_name} onChange={handleChange}
              placeholder="Votre nom" required className="pl-11 h-12 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            id="email" type="email" name="email" value={formData.email} onChange={handleChange}
            placeholder="exemple@lycee.mg" required autoComplete="email" className="pl-11 h-12 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe *</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            id="password" type="password" name="password" value={formData.password} onChange={handleChange}
            placeholder="Au moins 6 caractères" required autoComplete="new-password" className="pl-11 h-12 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ecole">Établissement *</Label>
        <select
          id="ecole" name="ecole" value={formData.ecole} onChange={handleChange} required
          className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="" disabled>Sélectionnez votre établissement</option>
          {ecoles.map((ecole) => (
            <option key={ecole.id} value={ecole.id}>{ecole.nom}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Vous êtes *</Label>
        <select
          id="role" name="role" value={formData.role} onChange={handleChange} required
          className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="ETUDIANT">Élève</option>
          <option value="PARENT">Parent</option>
        </select>
        <p className="text-xs text-gray-500">
          Les comptes du personnel (enseignant, administration...) sont créés par l'établissement.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="genre">Genre</Label>
        <select
          id="genre" name="genre" value={formData.genre} onChange={handleChange}
          className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="H">Masculin</option>
          <option value="F">Féminin</option>
          <option value="A">Autre / Non précisé</option>
        </select>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {loading ? 'Inscription en cours...' : 'Créer mon compte'}
      </Button>
    </form>
  )
}

function CreateEcoleForm({ setError, setSuccess, loading, setLoading, navigate }) {
  const [formData, setFormData] = useState({
    ecole_nom: '', ecole_code: '', ecole_adresse: '', ecole_telephone: '', ecole_email: '',
    admin_first_name: '', admin_last_name: '', admin_email: '', admin_password: '', admin_telephone: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.ecole_nom || !formData.ecole_code || !formData.admin_email || !formData.admin_password
      || !formData.admin_first_name || !formData.admin_last_name) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (formData.admin_password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    try {
      await authService.registerEcole({
        ecole_nom: formData.ecole_nom.trim(),
        ecole_code: formData.ecole_code.trim(),
        ecole_adresse: formData.ecole_adresse.trim(),
        ecole_telephone: formData.ecole_telephone.trim(),
        ecole_email: formData.ecole_email.trim(),
        admin_first_name: formData.admin_first_name.trim(),
        admin_last_name: formData.admin_last_name.trim(),
        admin_email: formData.admin_email.trim(),
        admin_password: formData.admin_password,
        admin_telephone: formData.admin_telephone.trim(),
      })

      setSuccess('Établissement créé ! Vous pouvez vous connecter dès maintenant avec votre compte administrateur.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.ecole_code?.[0] ||
        data?.ecole_nom?.[0] ||
        data?.admin_email?.[0] ||
        data?.admin_password?.[0] ||
        data?.non_field_errors?.[0] ||
        data?.detail ||
        'Erreur lors de la création de l\'établissement'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Établissement</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="ecole_nom">Nom de l'établissement *</Label>
            <Input
              id="ecole_nom" name="ecole_nom" value={formData.ecole_nom} onChange={handleChange}
              placeholder="Lycée Saint-Michel" required className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecole_code">Code établissement *</Label>
            <Input
              id="ecole_code" name="ecole_code" value={formData.ecole_code} onChange={handleChange}
              placeholder="LYC-SM" required className="h-12 rounded-xl"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ecole_adresse">Adresse</Label>
          <Input
            id="ecole_adresse" name="ecole_adresse" value={formData.ecole_adresse} onChange={handleChange}
            placeholder="Adresse de l'établissement" className="h-12 rounded-xl"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="ecole_telephone">Téléphone établissement</Label>
            <Input
              id="ecole_telephone" name="ecole_telephone" value={formData.ecole_telephone} onChange={handleChange}
              placeholder="+261 34 00 000 00" className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecole_email">Email établissement</Label>
            <Input
              id="ecole_email" type="email" name="ecole_email" value={formData.ecole_email} onChange={handleChange}
              placeholder="contact@etablissement.mg" className="h-12 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-3">Votre compte administrateur</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="admin_first_name">Prénom *</Label>
            <Input
              id="admin_first_name" name="admin_first_name" value={formData.admin_first_name} onChange={handleChange}
              placeholder="Votre prénom" required className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin_last_name">Nom *</Label>
            <Input
              id="admin_last_name" name="admin_last_name" value={formData.admin_last_name} onChange={handleChange}
              placeholder="Votre nom" required className="h-12 rounded-xl"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin_email">Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="admin_email" type="email" name="admin_email" value={formData.admin_email} onChange={handleChange}
              placeholder="admin@etablissement.mg" required autoComplete="email" className="pl-11 h-12 rounded-xl"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin_password">Mot de passe *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="admin_password" type="password" name="admin_password" value={formData.admin_password} onChange={handleChange}
              placeholder="Au moins 6 caractères" required autoComplete="new-password" className="pl-11 h-12 rounded-xl"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin_telephone">Téléphone</Label>
          <Input
            id="admin_telephone" name="admin_telephone" value={formData.admin_telephone} onChange={handleChange}
            placeholder="+261 34 00 000 00" className="h-12 rounded-xl"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Vous serez administrateur de cet établissement avec un accès complet. Vous pourrez ensuite créer les comptes
        du personnel (enseignants, secrétariat, responsables pédagogiques) depuis votre tableau de bord.
      </p>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {loading ? 'Création en cours...' : "Créer mon établissement"}
      </Button>
    </form>
  )
}

export default Register
