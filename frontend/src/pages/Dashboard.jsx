import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Home, Users, BookOpen, Calendar, FileText, Bell, Settings,
  GraduationCap, UserCog, ClipboardList, DollarSign, BarChart3
} from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()
  
  // Simulation : à remplacer par un vrai contexte d'auth (useAuth, Redux, etc.)
  const user = {
    firstName: 'Manampisoa',
    lastName: 'Rakoto',
    role: 'RESPONSABLE', // ← change ici pour tester : ETUDIANT / ENSEIGNANT / RESPONSABLE / SECRETARIAT / ADMIN
    email: 'responsable@lycee.mg'
  }

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    // À remplacer par vraie déconnexion (clear token, etc.)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  // Navigation par rôle
  const getNavItems = () => {
    const commonItems = [
      { icon: Home, label: 'Tableau de bord', path: '/dashboard', visibleFor: ['ETUDIANT', 'ENSEIGNANT', 'RESPONSABLE', 'SECRETARIAT', 'ADMIN'] },
      { icon: Bell, label: 'Notifications', path: '/notifications', visibleFor: ['ETUDIANT', 'ENSEIGNANT', 'RESPONSABLE', 'SECRETARIAT', 'ADMIN'] },
      { icon: Settings, label: 'Paramètres', path: '/settings', visibleFor: ['ETUDIANT', 'ENSEIGNANT', 'RESPONSABLE', 'SECRETARIAT', 'ADMIN'] },
    ]

    const roleSpecific = {
      ETUDIANT: [
        { icon: BookOpen, label: 'Mes notes', path: '/student/notes' },
        { icon: Calendar, label: 'Emploi du temps', path: '/student/timetable' },
        { icon: FileText, label: 'Bulletins', path: '/student/bulletins' },
        { icon: DollarSign, label: 'Mes paiements', path: '/student/paiements' },
      ],
      ENSEIGNANT: [
        { icon: BookOpen, label: 'Mes classes', path: '/teacher/classes' },
        { icon: ClipboardList, label: 'Saisie notes', path: '/teacher/notes' },
        { icon: Calendar, label: 'Appel & présences', path: '/teacher/presences' },
      ],
      RESPONSABLE: [
        { icon: GraduationCap, label: 'Élèves & classes', path: '/responsable/eleves' },
        { icon: BarChart3, label: 'Statistiques', path: '/responsable/stats' },
        { icon: ClipboardList, label: 'Conseil de classe', path: '/responsable/conseil' },
        { icon: FileText, label: 'Bulletins globaux', path: '/responsable/bulletins' },
      ],
      SECRETARIAT: [
        { icon: Users, label: 'Gestion élèves', path: '/secretariat/eleves' },
        { icon: DollarSign, label: 'Frais & paiements', path: '/secretariat/paiements' },
        { icon: FileText, label: 'Documents', path: '/secretariat/documents' },
        { icon: Calendar, label: 'Absences globales', path: '/secretariat/absences' },
      ],
      ADMIN: [
        { icon: Users, label: 'Utilisateurs', path: '/admin/utilisateurs' },
        { icon: GraduationCap, label: 'Classes & matières', path: '/admin/classes' },
        { icon: DollarSign, label: 'Finances', path: '/admin/finances' },
        { icon: Settings, label: 'Configuration', path: '/admin/config' },
      ],
    }

    return [
      ...commonItems.filter(item => item.visibleFor.includes(user.role)),
      ...(roleSpecific[user.role] || []),
    ]
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            <h1 className="text-xl font-bold text-indigo-700">SIG-Lycée</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">{user.role}</p>
        </div>

        <nav className="mt-6 px-3 space-y-1">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay mobile quand sidebar ouverte */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header mobile */}
        <header className="bg-white shadow-sm lg:hidden">
          <div className="px-4 py-3 flex justify-between items-center">
            <button onClick={() => setSidebarOpen(true)}>
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-indigo-700">SIG-Lycée</h1>
            <div className="w-6 h-6" /> {/* Espace vide */}
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Bienvenue, {user.firstName} {user.lastName}
            </h2>

            {/* Cartes selon rôle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.role === 'ETUDIANT' && (
                <>
                  <DashboardCard icon={BookOpen} title="Dernières notes" value="Moyenne : 14.2/20" color="indigo" />
                  <DashboardCard icon={Calendar} title="Prochain cours" value="Mathématiques - 14h00" color="blue" />
                  <DashboardCard icon={DollarSign} title="Solde à payer" value="150 000 Ar" color="red" />
                </>
              )}

              {user.role === 'ENSEIGNANT' && (
                <>
                  <DashboardCard icon={Users} title="Élèves suivis" value="28 élèves" color="green" />
                  <DashboardCard icon={ClipboardList} title="Notes à saisir" value="Classe 3ème A" color="purple" />
                  <DashboardCard icon={Calendar} title="Prochain appel" value="Aujourd'hui 8h" color="orange" />
                </>
              )}

              {user.role === 'RESPONSABLE' && (
                <>
                  <DashboardCard icon={BarChart3} title="Taux de réussite" value="78%" color="indigo" />
                  <DashboardCard icon={GraduationCap} title="Élèves en difficulté" value="12 élèves" color="red" />
                  <DashboardCard icon={FileText} title="Bulletins à valider" value="3 classes" color="blue" />
                </>
              )}

              {user.role === 'SECRETARIAT' && (
                <>
                  <DashboardCard icon={Users} title="Inscriptions en attente" value="8 dossiers" color="amber" />
                  <DashboardCard icon={DollarSign} title="Recettes du mois" value="2 450 000 Ar" color="green" />
                  <DashboardCard icon={FileText} title="Documents à délivrer" value="15 demandes" color="purple" />
                </>
              )}

              {user.role === 'ADMIN' && (
                <>
                  <DashboardCard icon={Users} title="Utilisateurs actifs" value="342" color="indigo" />
                  <DashboardCard icon={BarChart3} title="Statistiques globales" value="Voir rapport" color="blue" />
                  <DashboardCard icon={Settings} title="Configuration" value="Gérer paramètres" color="gray" />
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Composant réutilisable pour cartes
function DashboardCard({ icon: Icon, title, value, color }) {
  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    amber: 'bg-amber-100 text-amber-700',
    gray: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className={`rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${colorClasses[color] || 'bg-gray-100 text-gray-700'}`}>
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-white/80">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-xl md:text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard