import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-white mx-auto mb-6 opacity-80" />
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4">Page non trouvée</h2>
        <p className="text-blue-100 mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  )
}

export default NotFound
