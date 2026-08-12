'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Users, BookOpen, BarChart3, Clock, FileText, MessageSquare,
  Menu, X, Download, TrendingUp, TrendingDown, Calendar,
  AlertCircle, Home, Settings, Plus, Bell, MoreVertical, CreditCard, CheckCircle, Eye
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useResourceList } from '@/hooks/useResource'
import { classeService, etudiantService } from '@/services'
import { NotificationBell } from '@/components/NotificationBell'
import { AnnoncesPanel } from '@/components/communication/AnnoncesPanel'
import { MessageriePanel } from '@/components/communication/MessageriePanel'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function PedagogicalCoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    { id: 'home', label: 'Tableau de bord', icon: Home },
    { id: 'academique', label: 'Gestion Académique', icon: BookOpen },
    { id: 'notes', label: 'Notes & Évaluations', icon: BarChart3 },
    { id: 'presence', label: 'Présence & Absences', icon: Clock },
    { id: 'etudiants', label: 'Gestion Étudiants', icon: Users },
    { id: 'paiements', label: 'Paiements Écollages', icon: CreditCard },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'rapports', label: 'Rapports Pédagogiques', icon: FileText },
    { id: 'parametres', label: 'Paramètres', icon: Settings }
  ]

  const handleLogout = () => {
    logout()
    navigate('/login/', { replace: true })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20 flex-shrink-0">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">SIG-Lycée</h1>
              <p className="text-xs text-muted-foreground">
                {user ? `${user.first_name} ${user.last_name}` : 'Responsable Pédagogique'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-muted rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-sidebar border-r border-sidebar-border overflow-y-auto transition-all duration-300 hidden md:block h-full flex-shrink-0`}>
          <nav className="p-4 space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon
              const isSelected = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === 'home' && <CoordinatorOverview />}
            {activeTab === 'academique' && <AcademicManagement />}
            {activeTab === 'notes' && <GradesManagement />}
            {activeTab === 'presence' && <AttendanceAnalysis />}
            {activeTab === 'etudiants' && <StudentTracking />}
            {activeTab === 'paiements' && <div>Payment Management Component Placeholder</div>}
            {activeTab === 'communication' && <CommunicationModule />}
            {activeTab === 'rapports' && <PedagogicalReports />}
            {activeTab === 'parametres' && <CoordinatorSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ============ COORDINATOR OVERVIEW ============
function CoordinatorOverview() {
  const { data: classes, isLoading: loadingClasses } = useResourceList('classes', classeService)
  const { data: etudiants, isLoading: loadingEtudiants } = useResourceList('etudiants', etudiantService)

  const parNiveau = {}
  for (const cls of classes ?? []) {
    const key = cls.niveau_intitule
    if (!parNiveau[key]) parNiveau[key] = { classes: 0, eleves: 0 }
    parNiveau[key].classes += 1
    parNiveau[key].eleves += cls.effectif
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord pédagogique</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de la supervision académique</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard title="Classes supervisées" value={loadingClasses ? '…' : classes?.length ?? 0} icon={BookOpen} />
        <MetricCard title="Élèves total" value={loadingEtudiants ? '…' : etudiants?.length ?? 0} icon={Users} />
      </div>

      {/* Streams Overview */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Vue d'ensemble par niveau</h2>
        {Object.keys(parNiveau).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune classe pour l'année scolaire active.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(parNiveau).map(([niveau, stats]) => (
              <div key={niveau} className="border border-border rounded-lg p-4">
                <p className="text-lg font-bold mb-3">{niveau}</p>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Classes:</span> {stats.classes}</p>
                  <p><span className="text-muted-foreground">Élèves:</span> {stats.eleves}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon: Icon }) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-3">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  )
}

// ============ ACADEMIC MANAGEMENT ============
function AcademicManagement() {
  const [activeSubTab, setActiveSubTab] = useState('classes')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion Académique</h1>
        <p className="text-muted-foreground mt-1">Supervision des classes, matières, programmes et emplois du temps</p>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto pb-2">
        {['classes', 'matieres', 'emplois', 'enseignants'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${
              activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {tab === 'classes' && 'Classes'}
            {tab === 'matieres' && 'Matières'}
            {tab === 'emplois' && 'Emplois du temps'}
            {tab === 'enseignants' && 'Attribution enseignants'}
          </button>
        ))}
      </div>

      {activeSubTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['2nde A', '2nde B', '1ère S', '1ère L', 'Terminale C', 'Terminale D'].map((cls, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">{cls}</h3>
                <button className="text-muted-foreground hover:text-foreground"><MoreVertical className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <p><span className="text-muted-foreground">Élèves:</span> 35</p>
                <p><span className="text-muted-foreground">Prof principal:</span> À assigner</p>
                <p><span className="text-muted-foreground">Moyenne:</span> <span className="font-semibold">13.2/20</span></p>
              </div>
              <button className="w-full px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-sm font-medium">Voir détails</button>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'matieres' && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Matières et programmes</h2>
          <div className="space-y-3">
            {[
              { subject: 'Mathématiques', level: '2nde', hours: 4, status: 'Configuré' },
              { subject: 'Mathématiques', level: '1ère', hours: 5, status: 'Configuré' },
              { subject: 'Français', level: '2nde', hours: 4, status: 'En cours' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">{item.subject} - Niveau {item.level}</p>
                  <p className="text-sm text-muted-foreground">{item.hours}h/semaine</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  item.status === 'Configuré' ? 'bg-green-500/20 text-green-600' : 'bg-orange-500/20 text-orange-600'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'emplois' && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Optimisation des emplois du temps</h2>
          <p className="text-muted-foreground mb-4">Visualisez et optimisez les emplois du temps par filière</p>
          <div className="flex gap-2">
            <select className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Filière</option>
              <option>Scientifique</option>
              <option>Littéraire</option>
            </select>
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">Voir emploi du temps</button>
          </div>
        </div>
      )}

      {activeSubTab === 'enseignants' && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Attribution des enseignants</h2>
          <div className="space-y-3">
            {[
              { class: '2nde A', subject: 'Mathématiques', teacher: 'En attente', status: 'À assigner' },
              { class: '1ère S', subject: 'Physique', teacher: 'M. Dupont', status: 'Validé' },
              { class: 'Terminale C', subject: 'Chimie', teacher: 'Mme Martin', status: 'Validé' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">{item.class} - {item.subject}</p>
                  <p className="text-sm text-muted-foreground">{item.teacher}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  item.status === 'Validé' ? 'bg-green-500/20 text-green-600' : 'bg-orange-500/20 text-orange-600'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============ GRADES MANAGEMENT ============
function GradesManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notes & Évaluations</h1>
        <p className="text-muted-foreground mt-1">Consultation et validation des notes et bulletins</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Bulletins validés</p>
          <p className="text-3xl font-bold mt-2">285</p>
          <p className="text-xs text-green-600 mt-1">Trimestre complet</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">En attente de validation</p>
          <p className="text-3xl font-bold mt-2">45</p>
          <p className="text-xs text-orange-600 mt-1">À traiter</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Moyenne générale</p>
          <p className="text-3xl font-bold mt-2">13.2</p>
          <p className="text-xs text-blue-600 mt-1">Tous niveaux</p>
        </div>
      </div>

      {/* Performance by Level */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Performances par niveau</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Niveau</th>
                <th className="px-4 py-3 text-center font-semibold">Moyenne</th>
                <th className="px-4 py-3 text-center font-semibold">Meilleur</th>
                <th className="px-4 py-3 text-center font-semibold">Faible</th>
                <th className="px-4 py-3 text-center font-semibold">Tendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { level: '2nde', avg: 12.5, best: 18.2, low: 8.5, trend: 'Stable' },
                { level: '1ère', avg: 13.8, best: 19.1, low: 9.2, trend: 'Hausse' },
                { level: 'Terminale', avg: 14.1, best: 19.8, low: 10.1, trend: 'Hausse' }
              ].map((row, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-semibold">{row.level}</td>
                  <td className="px-4 py-3 text-center font-bold">{row.avg}/20</td>
                  <td className="px-4 py-3 text-center text-green-600">{row.best}</td>
                  <td className="px-4 py-3 text-center text-red-600">{row.low}</td>
                  <td className="px-4 py-3 text-center">{row.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulletins Validation */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Bulletins en attente de validation</h2>
        <div className="space-y-2">
          {[
            { class: '2nde A', count: 15, period: 'Trimestre 1' },
            { class: '1ère S', count: 28, period: 'Trimestre 1' },
            { class: 'Terminale C', count: 2, period: 'Trimestre 1' }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">{item.class} - {item.period}</p>
                <p className="text-sm text-muted-foreground">{item.count} bulletins</p>
              </div>
              <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-sm font-medium">Valider</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ ATTENDANCE ANALYSIS ============
function AttendanceAnalysis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Présence & Absences</h1>
        <p className="text-muted-foreground mt-1">Analyse des tendances d'absentéisme par classe et filière</p>
      </div>

      {/* Attendance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Taux présence global</p>
          <p className="text-4xl font-bold mt-2 text-green-600">94.1%</p>
          <p className="text-xs text-muted-foreground mt-1">Excellent</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Absences totales</p>
          <p className="text-4xl font-bold mt-2">127</p>
          <p className="text-xs text-muted-foreground mt-1">Cette semaine</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">À justifier</p>
          <p className="text-4xl font-bold mt-2 text-orange-600">18</p>
          <p className="text-xs text-muted-foreground mt-1">En attente</p>
        </div>
      </div>

      {/* Attendance by Class */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Assiduité par classe</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Classe</th>
                <th className="px-4 py-3 text-center font-semibold">Présences</th>
                <th className="px-4 py-3 text-center font-semibold">Absences</th>
                <th className="px-4 py-3 text-center font-semibold">Taux</th>
                <th className="px-4 py-3 text-center font-semibold">Tendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { class: '2nde A', present: 135, absent: 8, rate: 94.4, trend: 'Stable' },
                { class: '2nde B', present: 128, absent: 7, rate: 94.8, trend: 'Hausse' },
                { class: '1ère S', present: 140, absent: 9, rate: 93.9, trend: 'Baisse' },
                { class: 'Terminale C', present: 124, absent: 1, rate: 99.2, trend: 'Stable' }
              ].map((row, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-semibold">{row.class}</td>
                  <td className="px-4 py-3 text-center">{row.present}</td>
                  <td className="px-4 py-3 text-center">{row.absent}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-bold">{row.rate}%</td>
                  <td className="px-4 py-3 text-center text-sm">{row.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Absence Trends */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Tendances d'absentéisme</h2>
        <div className="space-y-3">
          {[
            { issue: 'Jours d\'absence concentrés le lundi', level: 'Moyen' },
            { issue: 'Absence anormale en 1ère S', level: 'Élevé' },
            { issue: 'Tardivité récurrente en 2nde B', level: 'Faible' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                item.level === 'Élevé' ? 'text-destructive' : item.level === 'Moyen' ? 'text-orange-500' : 'text-yellow-500'
              }`} />
              <div className="flex-1">
                <p className="font-semibold text-sm">{item.issue}</p>
                <p className="text-xs text-muted-foreground">Priorité: {item.level}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ STUDENT TRACKING ============
function StudentTracking() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion des Étudiants</h1>
        <p className="text-muted-foreground mt-1">Suivi des parcours et historiques académiques</p>
      </div>

      {/* Academic Paths */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Suivi des parcours académiques</h2>
        <div className="space-y-3">
          {[
            { student: 'Jean Dupont', current: '2nde C', path: '6ème → 3ème → 2nde', status: 'Normal' },
            { student: 'Marie Jean', current: '1ère S', path: 'Saut 5ème → 1ère S', status: 'Saut de classe' },
            { student: 'Paul Rakoto', current: '2nde A', path: 'Redoublement 2nde', status: 'Redoublement' }
          ].map((item, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{item.student}</p>
                  <p className="text-sm text-muted-foreground">Classe: {item.current}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  item.status === 'Normal' ? 'bg-green-500/20 text-green-600' : 'bg-blue-500/20 text-blue-600'
                }`}>
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{item.path}</p>
            </div>
          ))}
        </div>
      </div>

      {/* At Risk Students */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Élèves à suivre</h2>
        <div className="space-y-3">
          {[
            { student: 'Ahmed Ben', issue: 'Moyenne < 10', class: '2nde A' },
            { student: 'Fatima Ahmed', issue: 'Absences nombreuses', class: '1ère S' },
            { student: 'Marc Dupuis', issue: 'Retards fréquents', class: 'Terminale C' }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">{item.student}</p>
                <p className="text-sm text-destructive">{item.issue}</p>
              </div>
              <p className="text-sm text-muted-foreground">{item.class}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ COMMUNICATION MODULE ============
function CommunicationModule() {
  const [activeSubTab, setActiveSubTab] = useState('annonces')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Communication</h1>
        <p className="text-muted-foreground mt-1">Annonces pédagogiques et messagerie</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {['annonces', 'messagerie'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {tab === 'annonces' && 'Annonces'}
            {tab === 'messagerie' && 'Messagerie'}
          </button>
        ))}
      </div>

      {activeSubTab === 'annonces' && <AnnoncesPanel />}
      {activeSubTab === 'messagerie' && <MessageriePanel />}
    </div>
  )
}

// ============ PEDAGOGICAL REPORTS ============
function PedagogicalReports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rapports Pédagogiques</h1>
        <p className="text-muted-foreground mt-1">Analyses et statistiques académiques par filière</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Performances par filière', description: 'Comparaison des moyennes par stream' },
          { title: 'Assiduité par classe', description: 'Suivi des absences et tendances' },
          { title: 'Progression trimestrielle', description: 'Évolution des notes sur l\'année' },
          { title: 'Rapport d\'orientation', description: 'Suivi des redoublements et parcours' }
        ].map((report, i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold mb-2">{report.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-sm font-medium">Voir</button>
              <button className="flex-1 px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 text-sm font-medium flex items-center justify-center gap-1">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-4">Rapport personnalisé</h2>
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Filière</option>
              <option>Scientifique</option>
              <option>Littéraire</option>
            </select>
            <select className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Période</option>
              <option>Trimestre 1</option>
              <option>Année complète</option>
            </select>
            <button type="button" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">Générer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ COORDINATOR SETTINGS ============
function CoordinatorSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gestion de votre profil et préférences</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-6">Informations personnelles</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Prénom</label>
              <input type="text" defaultValue="Pierre" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nom</label>
              <input type="text" defaultValue="Bernard" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input type="email" defaultValue="pierre.bernard@lycee.ma" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Spécialité pédagogique</label>
              <input type="text" defaultValue="Mathématiques" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-6">Filières supervisées</h2>
        <div className="space-y-3">
          {['Scientifique', 'Littéraire', 'Technique'].map(stream => (
            <div key={stream} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <p className="font-medium">{stream}</p>
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">Enregistrer</button>
        <button className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium">Annuler</button>
      </div>
    </div>
  )
}

// ============ PAYMENT MANAGEMENT ============
function PaymentManagement() {
  const [selectedStream, setSelectedStream] = useState('Scientifique')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const paymentData = {
    'Scientifique': [
      { id: 1, student: 'Jean Dupont', class: '2nde C', totalFees: 500000, paid: 500000, status: 'Payé', paymentDate: '2026-01-15' },
      { id: 2, student: 'Marie Jean', class: '2nde C', totalFees: 500000, paid: 250000, status: 'Partiel', paymentDate: '2026-01-10' },
      { id: 3, student: 'Paul Rakoto', class: '1ère S', totalFees: 500000, paid: 0, status: 'Impayé', paymentDate: null }
    ],
    'Littéraire': [
      { id: 4, student: 'Sophie Martin', class: '2nde L', totalFees: 450000, paid: 450000, status: 'Payé', paymentDate: '2026-01-12' },
      { id: 5, student: 'Luc Bernard', class: '1ère L', totalFees: 450000, paid: 225000, status: 'Partiel', paymentDate: '2026-01-05' }
    ]
  }

  const currentData = paymentData[selectedStream] || []
  const filteredData = filterStatus === 'all' 
    ? currentData 
    : currentData.filter(item => item.status.toLowerCase() === filterStatus.toLowerCase())

  // Calculate statistics
  const totalFees = currentData.reduce((sum, item) => sum + item.totalFees, 0)
  const totalPaid = currentData.reduce((sum, item) => sum + item.paid, 0)
  const totalDue = totalFees - totalPaid
  const collectionRate = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : 0

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Paiements d'Écollages</h1>
          <p className="text-muted-foreground mt-1">Suivi et gestion des frais de scolarité par filière</p>
        </div>
        <button
          onClick={() => setShowPaymentForm(!showPaymentForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
        >
          <Plus className="w-4 h-4" /> Enregistrer un paiement
        </button>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Frais totaux" 
          value={`${(totalFees / 1000000).toFixed(1)}M Ar`}
          icon={CreditCard}
        />
        <StatCard 
          title="Montant collecté" 
          value={`${(totalPaid / 1000000).toFixed(1)}M Ar`}
          icon={CheckCircle}
          trend="up"
        />
        <StatCard 
          title="Montant dû" 
          value={`${(totalDue / 1000000).toFixed(1)}M Ar`}
          icon={AlertCircle}
        />
        <StatCard 
          title="Taux recouvrement" 
          value={`${collectionRate}%`}
          icon={BarChart3}
        />
      </div>

      {/* Payment Recording Form */}
      {showPaymentForm && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Enregistrer un nouveau paiement</h2>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Filière</label>
                <select className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Scientifique</option>
                  <option>Littéraire</option>
                  <option>Technique</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Élève</label>
                <select className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Sélectionner un élève</option>
                  {currentData.map(item => <option key={item.id}>{item.student}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Montant payé (Ar)</label>
                <input type="number" placeholder="50000" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Date de paiement</label>
                <input type="date" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Mode de paiement</label>
                <select className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Espèces</option>
                  <option>Chèque</option>
                  <option>Virement bancaire</option>
                  <option>Mobile Money</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">Enregistrer le paiement</button>
              <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Selection */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            {['Scientifique', 'Littéraire', 'Technique'].map(stream => (
              <button
                key={stream}
                onClick={() => setSelectedStream(stream)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStream === stream
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {stream}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'Payé', 'Partiel', 'Impayé'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status === 'all' ? 'all' : status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterStatus === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {status === 'all' ? 'Tous' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Élève</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Classe</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Frais totaux</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Montant payé</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Reste à payer</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.map(item => (
              <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium">{item.student}</td>
                <td className="px-6 py-4 text-sm">{item.class}</td>
                <td className="px-6 py-4 text-sm font-semibold text-right">{(item.totalFees / 1000).toFixed(0)}k</td>
                <td className="px-6 py-4 text-sm font-semibold text-right text-green-600">{(item.paid / 1000).toFixed(0)}k</td>
                <td className="px-6 py-4 text-sm font-semibold text-right text-destructive">{((item.totalFees - item.paid) / 1000).toFixed(0)}k</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.status === 'Payé' 
                      ? 'bg-green-500/20 text-green-600'
                      : item.status === 'Partiel'
                      ? 'bg-orange-500/20 text-orange-600'
                      : 'bg-red-500/20 text-red-600'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="text-primary hover:underline text-sm flex items-center justify-center gap-1">
                    <Eye className="w-4 h-4" /> Détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Breakdown by Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Paiements complétés
          </h3>
          <div className="space-y-2">
            {currentData.filter(item => item.status === 'Payé').map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <p>{item.student}</p>
                <p className="font-semibold text-green-600">{(item.paid / 1000).toFixed(0)}k</p>
              </div>
            ))}
            {currentData.filter(item => item.status === 'Payé').length === 0 && (
              <p className="text-muted-foreground text-sm">Aucun</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Paiements partiels
          </h3>
          <div className="space-y-2">
            {currentData.filter(item => item.status === 'Partiel').map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <p>{item.student}</p>
                <p className="font-semibold text-orange-600">
                  {(item.paid / 1000).toFixed(0)}k / {(item.totalFees / 1000).toFixed(0)}k
                </p>
              </div>
            ))}
            {currentData.filter(item => item.status === 'Partiel').length === 0 && (
              <p className="text-muted-foreground text-sm">Aucun</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Impayés
          </h3>
          <div className="space-y-2">
            {currentData.filter(item => item.status === 'Impayé').map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <p>{item.student}</p>
                <p className="font-semibold text-red-600">{(item.totalFees / 1000).toFixed(0)}k</p>
              </div>
            ))}
            {currentData.filter(item => item.status === 'Impayé').length === 0 && (
              <p className="text-muted-foreground text-sm">Aucun</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-4">Historique récent des paiements</h2>
        <div className="space-y-3">
          {[
            { student: 'Jean Dupont', amount: '500k', date: '2026-01-15', method: 'Espèces' },
            { student: 'Marie Jean', amount: '250k', date: '2026-01-10', method: 'Virement bancaire' },
            { student: 'Sophie Martin', amount: '450k', date: '2026-01-12', method: 'Chèque' }
          ].map((payment, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-semibold text-sm">{payment.student}</p>
                <p className="text-xs text-muted-foreground">{payment.date} • {payment.method}</p>
              </div>
              <p className="font-bold text-green-600">{payment.amount}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Export Reports */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-4">Rapports de paiement</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-2 px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg font-medium text-sm transition-colors">
            <Download className="w-4 h-4" /> Exporter tous les paiements
          </button>
          <button className="flex items-center gap-2 px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg font-medium text-sm transition-colors">
            <Download className="w-4 h-4" /> Exporter impayés
          </button>
          <button className="flex items-center gap-2 px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg font-medium text-sm transition-colors">
            <Download className="w-4 h-4" /> Relevé par filière
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, trend }) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-3">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  )
}

export default PedagogicalCoordinatorDashboard
