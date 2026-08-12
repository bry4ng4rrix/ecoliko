import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Home, Users, BookOpen, Calendar, FileText, Bell, Settings,
  GraduationCap, UserCog, ClipboardList, DollarSign, BarChart3, Menu, X
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { NotificationBell } from '@/components/NotificationBell'

function Dashboard() {
  const navigate = useNavigate()
  
  // Simulation : à remplacer par un vrai contexte d'auth (useAuth, Redux, etc.)
  const user = {
    firstName: 'Manampisoa',
    lastName: 'Rakoto',
    role: 'RESPONSABLE', // ← change ici pour tester : ETUDIANT / ENSEIGNANT / RESPONSABLE / SECRETARIAT / ADMIN
    email: 'responsable@lycee.mg'
  }

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
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
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-full flex-shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          {sidebarOpen && <h1 className="font-bold text-lg text-indigo-600 dark:text-indigo-400">SIG-Lycée</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-sidebar-accent rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5 text-slate-500" /> : <Menu className="w-5 h-5 text-slate-500" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <item.icon className="w-5 h-5 flex-shrink-0 text-slate-500" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">SIG-Lycée</h1>
            <p className="text-xs text-muted-foreground">Portail de simulation • {user.role}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">
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
    indigo: 'border-indigo-100 bg-indigo-50/50 text-indigo-900 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300',
    blue: 'border-blue-100 bg-blue-50/50 text-blue-900 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300',
    green: 'border-green-100 bg-green-50/50 text-green-900 dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-300',
    red: 'border-red-100 bg-red-50/50 text-red-900 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300',
    purple: 'border-purple-100 bg-purple-50/50 text-purple-900 dark:border-purple-900/30 dark:bg-purple-950/20 dark:text-purple-300',
    orange: 'border-orange-100 bg-orange-50/50 text-orange-900 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300',
    amber: 'border-amber-100 bg-amber-50/50 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300',
    gray: 'border-slate-100 bg-slate-50/50 text-slate-900 dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-300',
  }

  return (
    <Card className={`border shadow-sm hover:shadow-md transition-shadow ${colorClasses[color] || 'border-slate-100 text-slate-900'}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
            <p className="text-2xl font-extrabold mt-1">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default Dashboard