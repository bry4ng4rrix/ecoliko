'use client'

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Users, BookOpen, Settings, BarChart3, Clock, FileText,
  MessageSquare, Menu, X, Edit2, Trash2, TrendingUp, TrendingDown,
  Calendar, CheckCircle, AlertCircle, Home, Layers, Gauge, Database, UserPlus
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useResourceList } from '@/hooks/useResource'
import { classeService, etudiantService, staffService } from '@/services'
import { NotificationBell } from '@/components/NotificationBell'
import { AnnoncesPanel } from '@/components/communication/AnnoncesPanel'
import { MessageriePanel } from '@/components/communication/MessageriePanel'
import { ClassesPanel } from '@/components/academique/ClassesPanel'
import { MatieresPanel } from '@/components/academique/MatieresPanel'
import { EmploiDuTempsCalendar } from '@/components/academique/EmploiDuTempsCalendar'
import { PaiementsPanel } from '@/components/finance/PaiementsPanel'
import { DocumentsValidationPanel } from '@/components/documents/DocumentsValidationPanel'
import { PersonnelPanel } from '@/components/personnel/PersonnelPanel'
import { AttendancePanel } from '@/components/presences/AttendancePanel'
import { AuditLogPanel } from '@/components/audit/AuditLogPanel'
import { StatistiquesPanel } from '@/components/statistiques/StatistiquesPanel'
import { EtudiantsPanel } from '@/components/etudiants/EtudiantsPanel'
import { SallesPanel } from '@/components/academique/SallesPanel'
import { DisciplinePanel } from '@/components/discipline/DisciplinePanel'
import { DossierEnseignantPanel } from '@/components/rh/DossierEnseignantPanel'
import { EvenementsCalendrierPanel } from '@/components/calendrier/EvenementsCalendrierPanel'
import { AnneesScolairesPanel } from '@/components/parametres/AnneesScolairesPanel'
import { EcoleInfoPanel } from '@/components/parametres/EcoleInfoPanel'
import { DemandesInscriptionPanel } from '@/components/inscriptions/DemandesInscriptionPanel'
import { NotesEvaluationsPanel } from '@/components/notes/NotesEvaluationsPanel'

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    { id: 'home', label: 'Tableau de bord', icon: Home },
    { id: 'etudiants', label: 'Gestion Étudiants', icon: Users },
    { id: 'inscriptions', label: "Demandes d'inscription", icon: UserPlus },
    { id: 'enseignants', label: 'Gestion des Profs', icon: BookOpen },
    { id: 'academique', label: 'Gestion Académique', icon: Layers },
    { id: 'emploi-du-temps', label: 'Emploi du Temps', icon: Calendar },
    { id: 'notes', label: 'Notes & Évaluations', icon: Gauge },
    { id: 'presence', label: 'Présence & Absences', icon: Clock },
    { id: 'admin', label: 'Gestion Administrative', icon: Database },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'rapports', label: 'Rapports & Stats', icon: BarChart3 },
    { id: 'parametres', label: 'Paramètres', icon: Settings }
  ]

  const handleLogout = () => {
    logout()
    navigate('/login/', { replace: true })
  }

  const DashboardOverview = () => {
    const { data: etudiants, isLoading: loadingEtudiants } = useResourceList('etudiants', etudiantService)
    const { data: personnel, isLoading: loadingPersonnel } = useResourceList('personnel', staffService)
    const { data: classes, isLoading: loadingClasses } = useResourceList('classes', classeService)

    const nbEnseignants = personnel?.filter((p) => p.role === 'ENSEIGNANT').length

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Bienvenue sur la plateforme SIG-Lycée</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Élèves inscrits"
            value={loadingEtudiants ? '…' : (etudiants?.length ?? 0).toLocaleString()}
            icon={Users}
          />
          <StatCard
            title="Enseignants"
            value={loadingPersonnel ? '…' : (nbEnseignants ?? 0).toLocaleString()}
            icon={BookOpen}
          />
          <StatCard
            title="Classes actives"
            value={loadingClasses ? '…' : (classes?.length ?? 0).toLocaleString()}
            icon={Layers}
          />
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold mb-4">Distribution par classe</h2>
          {loadingClasses ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : classes?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-muted rounded-lg p-4 text-center">
                  <p className="font-semibold text-primary">{cls.nom}</p>
                  <p className="text-2xl font-bold mt-2">{cls.effectif}</p>
                  <p className="text-xs text-muted-foreground mt-1">élèves</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune classe pour l'année scolaire active.</p>
          )}
        </div>
      </div>
    )
  }

  const TeachersManagement = () => {
    const [activeSubTab, setActiveSubTab] = useState('comptes')
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Profs</h1>
          <p className="text-muted-foreground mt-1">Comptes enseignants et dossiers RH</p>
        </div>
        <div className="flex gap-2 border-b border-border">
          {['comptes', 'rh'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'comptes' && 'Comptes'}
              {tab === 'rh' && 'Dossiers RH'}
            </button>
          ))}
        </div>
        {activeSubTab === 'comptes' && <PersonnelPanel roleFilter="ENSEIGNANT" title="Enseignants" />}
        {activeSubTab === 'rh' && <DossierEnseignantPanel />}
      </div>
    )
  }

  const EmploiDuTempsManagement = () => {
    const [activeSubTab, setActiveSubTab] = useState('planning')
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Emploi du Temps</h1>
          <p className="text-muted-foreground mt-1">Planning hebdomadaire et calendrier</p>
        </div>
        <div className="flex gap-2 border-b border-border">
          {['planning', 'calendrier'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'planning' && 'Planning hebdomadaire'}
              {tab === 'calendrier' && 'Vacances / Examens / Événements'}
            </button>
          ))}
        </div>
        {activeSubTab === 'planning' && <EmploiDuTempsCalendar />}
        {activeSubTab === 'calendrier' && <EvenementsCalendrierPanel />}
      </div>
    )
  }

  const AcademicManagement = () => {
    const [activeSubTab, setActiveSubTab] = useState('classes')

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion Académique</h1>
          <p className="text-muted-foreground mt-1">Classes, matières et salles</p>
        </div>

        <div className="flex gap-2 border-b border-border">
          {['classes', 'matieres', 'salles', 'annee-scolaire'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'classes' && 'Classes'}
              {tab === 'matieres' && 'Matières'}
              {tab === 'salles' && 'Salles'}
              {tab === 'annee-scolaire' && 'Année scolaire'}
            </button>
          ))}
        </div>

        {activeSubTab === 'classes' && <ClassesPanel />}
        {activeSubTab === 'matieres' && <MatieresPanel />}
        {activeSubTab === 'salles' && <SallesPanel />}
        {activeSubTab === 'annee-scolaire' && <AnneesScolairesPanel />}
      </div>
    )
  }

  const GradesEvaluation = () => <NotesEvaluationsPanel />

  const AttendanceAbsence = () => {
    const [activeSubTab, setActiveSubTab] = useState('presences')
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Présence & Absences</h1>
          <p className="text-muted-foreground mt-1">Suivi, justification et vie scolaire</p>
        </div>
        <div className="flex gap-2 border-b border-border">
          {['presences', 'discipline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'presences' && 'Présences'}
              {tab === 'discipline' && 'Vie scolaire'}
            </button>
          ))}
        </div>
        {activeSubTab === 'presences' && <AttendancePanel />}
        {activeSubTab === 'discipline' && <DisciplinePanel />}
      </div>
    )
  }

  const AdministrativeManagement = () => {
    const [activeSubTab, setActiveSubTab] = useState('paiements')

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion Administrative</h1>
          <p className="text-muted-foreground mt-1">Paiements, documents et utilisateurs</p>
        </div>

        <div className="flex gap-2 border-b border-border">
          {['paiements', 'documents', 'utilisateurs', 'audit'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'paiements' && 'Paiements'}
              {tab === 'documents' && 'Documents'}
              {tab === 'utilisateurs' && 'Utilisateurs'}
              {tab === 'audit' && "Journal d'audit"}
            </button>
          ))}
        </div>

        {activeSubTab === 'paiements' && <PaiementsPanel />}
        {activeSubTab === 'documents' && <DocumentsValidationPanel />}
        {activeSubTab === 'utilisateurs' && <PersonnelPanel />}
        {activeSubTab === 'audit' && <AuditLogPanel />}
      </div>
    )
  }

  const Communication = () => {
    const [activeSubTab, setActiveSubTab] = useState('notifications')

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Communication</h1>
          <p className="text-muted-foreground mt-1">Annonces et messagerie interne</p>
        </div>

        <div className="flex gap-2 border-b border-border">
          {['notifications', 'messagerie'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'notifications' && 'Annonces'}
              {tab === 'messagerie' && 'Messagerie'}
            </button>
          ))}
        </div>

        {activeSubTab === 'notifications' && <AnnoncesPanel />}
        {activeSubTab === 'messagerie' && <MessageriePanel />}
      </div>
    )
  }

  const Reports = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rapports & Statistiques</h1>
        <p className="text-muted-foreground mt-1">Analyses de l'établissement</p>
      </div>

      <StatistiquesPanel />
    </div>
  )

  const SystemSettings = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres système</h1>
          <p className="text-muted-foreground mt-1">Configuration et gestion du système</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold mb-6">Informations de l'établissement</h2>
          <EcoleInfoPanel />
        </div>

        <p className="text-sm text-muted-foreground">
          La gestion de l'année scolaire se trouve désormais dans <span className="font-semibold">Gestion Académique</span>.
        </p>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold mb-6">Règles académiques</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Moyenne minimale</label>
                <input type="number" defaultValue="10" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Seuil absences (%)</label>
                <input type="number" defaultValue="20" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold mb-6">Filières et niveaux</h2>
          <div className="space-y-3">
            {['Scientifique', 'Littéraire', 'Technique'].map((filiere, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <p className="font-medium">{filiere}</p>
                <div className="flex gap-2">
                  <button className="text-primary text-sm hover:underline"><Edit2 className="w-4 h-4 inline" /></button>
                  <button className="text-destructive text-sm hover:underline"><Trash2 className="w-4 h-4 inline" /></button>
                </div>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-primary">SIG-Lycée</h1>
              <p className="text-xs text-muted-foreground">Système Informatisé de Gestion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-muted rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-sidebar border-r border-sidebar-border overflow-y-auto transition-all duration-300 hidden md:block fixed md:relative h-[calc(100vh-73px)]`}>
          <nav className="p-4 space-y-2">
            {menuItems.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                    activeTab === item.id
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto md:ml-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === 'home' && <DashboardOverview />}
            {activeTab === 'etudiants' && <EtudiantsPanel />}
            {activeTab === 'inscriptions' && <DemandesInscriptionPanel />}
            {activeTab === 'enseignants' && <TeachersManagement />}
            {activeTab === 'academique' && <AcademicManagement />}
            {activeTab === 'emploi-du-temps' && <EmploiDuTempsManagement />}
            {activeTab === 'notes' && <GradesEvaluation />}
            {activeTab === 'presence' && <AttendanceAbsence />}
            {activeTab === 'admin' && <AdministrativeManagement />}
            {activeTab === 'communication' && <Communication />}
            {activeTab === 'rapports' && <Reports />}
            {activeTab === 'parametres' && <SystemSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}

function StatCard({ title, value, change, icon: Icon, trend }) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
              <p className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{change}</p>
            </div>
          )}
        </div>
        <div className="bg-primary/10 rounded-lg p-3">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
