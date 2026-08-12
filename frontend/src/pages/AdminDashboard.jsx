'use client'

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Users, BookOpen, Settings, BarChart3, Clock, FileText,
  MessageSquare, Menu, X, Edit2, Trash2, TrendingUp, TrendingDown,
  Calendar, CheckCircle, AlertCircle, Home, Layers, Gauge, Database, UserPlus, ShieldAlert
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

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { logout, user } = useAuth()
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Bienvenue sur la plateforme SIG-Lycée</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Distribution par classe</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingClasses ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : classes?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {classes.map((cls) => (
                  <div key={cls.id} className="bg-muted rounded-xl p-4 text-center border border-border/50 hover:shadow-sm transition-all">
                    <p className="font-semibold text-primary">{cls.nom}</p>
                    <p className="text-3xl font-extrabold mt-2 text-indigo-600 dark:text-indigo-400">{cls.effectif}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">élèves</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune classe pour l'année scolaire active.</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const TeachersManagement = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Profs</h1>
          <p className="text-muted-foreground mt-1">Comptes enseignants et dossiers RH</p>
        </div>

        <Tabs defaultValue="comptes" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="comptes">Comptes</TabsTrigger>
            <TabsTrigger value="rh">Dossiers RH</TabsTrigger>
          </TabsList>
          <TabsContent value="comptes" className="mt-4">
            <PersonnelPanel roleFilter="ENSEIGNANT" title="Enseignants" />
          </TabsContent>
          <TabsContent value="rh" className="mt-4">
            <DossierEnseignantPanel />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const EmploiDuTempsManagement = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emploi du Temps</h1>
          <p className="text-muted-foreground mt-1">Planning hebdomadaire et calendrier</p>
        </div>

        <Tabs defaultValue="calendrier" className="w-full">
          <TabsList className="grid w-full max-w-[480px] grid-cols-2">
            <TabsTrigger value="calendrier">Programme Scolaire</TabsTrigger>
            <TabsTrigger value="planning">Planning hebdomadaire</TabsTrigger>
          </TabsList>
          <TabsContent value="calendrier" className="mt-4">
            <EvenementsCalendrierPanel />
          </TabsContent>
          <TabsContent value="planning" className="mt-4">
            <EmploiDuTempsCalendar />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const AcademicManagement = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion Académique</h1>
          <p className="text-muted-foreground mt-1">Classes, matières et salles</p>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="flex flex-wrap h-auto w-fit p-1 bg-muted rounded-lg">
            <TabsTrigger value="classes" className="px-4 py-2">Classes</TabsTrigger>
            <TabsTrigger value="matieres" className="px-4 py-2">Matières</TabsTrigger>
            <TabsTrigger value="salles" className="px-4 py-2">Salles</TabsTrigger>
            <TabsTrigger value="annee-scolaire" className="px-4 py-2">Année scolaire</TabsTrigger>
          </TabsList>
          <TabsContent value="classes" className="mt-4">
            <ClassesPanel />
          </TabsContent>
          <TabsContent value="matieres" className="mt-4">
            <MatieresPanel />
          </TabsContent>
          <TabsContent value="salles" className="mt-4">
            <SallesPanel />
          </TabsContent>
          <TabsContent value="annee-scolaire" className="mt-4">
            <AnneesScolairesPanel />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const GradesEvaluation = () => <NotesEvaluationsPanel />

  const AttendanceAbsence = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Présence & Absences</h1>
          <p className="text-muted-foreground mt-1">Suivi, justification et vie scolaire</p>
        </div>

        <Tabs defaultValue="presences" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="presences">Présences</TabsTrigger>
            <TabsTrigger value="discipline">Vie scolaire</TabsTrigger>
          </TabsList>
          <TabsContent value="presences" className="mt-4">
            <AttendancePanel />
          </TabsContent>
          <TabsContent value="discipline" className="mt-4">
            <DisciplinePanel />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const AdministrativeManagement = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion Administrative</h1>
          <p className="text-muted-foreground mt-1">Paiements, documents et utilisateurs</p>
        </div>

        <Tabs defaultValue="paiements" className="w-full">
          <TabsList className="flex flex-wrap h-auto w-fit p-1 bg-muted rounded-lg">
            <TabsTrigger value="paiements" className="px-4 py-2">Paiements</TabsTrigger>
            <TabsTrigger value="documents" className="px-4 py-2">Documents</TabsTrigger>
            <TabsTrigger value="utilisateurs" className="px-4 py-2">Utilisateurs</TabsTrigger>
            <TabsTrigger value="audit" className="px-4 py-2">Journal d'audit</TabsTrigger>
          </TabsList>
          <TabsContent value="paiements" className="mt-4">
            <PaiementsPanel />
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <DocumentsValidationPanel />
          </TabsContent>
          <TabsContent value="utilisateurs" className="mt-4">
            <PersonnelPanel />
          </TabsContent>
          <TabsContent value="audit" className="mt-4">
            <AuditLogPanel />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const Communication = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
          <p className="text-muted-foreground mt-1">Annonces et messagerie interne</p>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="notifications">Annonces</TabsTrigger>
            <TabsTrigger value="messagerie">Messagerie</TabsTrigger>
          </TabsList>
          <TabsContent value="notifications" className="mt-4">
            <AnnoncesPanel />
          </TabsContent>
          <TabsContent value="messagerie" className="mt-4">
            <MessageriePanel />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const Reports = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapports & Statistiques</h1>
        <p className="text-muted-foreground mt-1">Analyses de l'établissement</p>
      </div>
      <StatistiquesPanel />
    </div>
  )

  const SystemSettings = () => {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres système</h1>
          <p className="text-muted-foreground mt-1">Configuration et gestion du système</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Informations de l'établissement</CardTitle>
          </CardHeader>
          <CardContent>
            <EcoleInfoPanel />
          </CardContent>
        </Card>

        <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3 border border-border">
          <ShieldAlert className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            La gestion de l'année scolaire se trouve désormais dans l'onglet <span className="font-semibold text-primary">Gestion Académique</span>.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Règles académiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="moyenne_min">Moyenne minimale d'admission</Label>
                <Input type="number" id="moyenne_min" defaultValue="10" className="focus-visible:ring-indigo-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seuil_abs">Seuil d'exclusion absences (%)</Label>
                <Input type="number" id="seuil_abs" defaultValue="20" className="focus-visible:ring-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Filières et niveaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Scientifique', 'Littéraire', 'Technique'].map((filiere, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-xl border border-border/40 hover:bg-muted/70 transition-colors">
                <p className="font-medium text-sm">{filiere}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6">Enregistrer</Button>
          <Button variant="outline" className="px-6">Annuler</Button>
        </div>
      </div>
    )
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
              <p className="text-xs text-muted-foreground">Système Informatisé de Gestion • Admin</p>
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
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'
          } bg-sidebar border-r border-sidebar-border overflow-y-auto transition-all duration-300 hidden md:block h-full flex-shrink-0`}>
          <nav className="p-4 space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon
              const isSelected = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${isSelected
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
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            {trend && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                <p className={`text-[10px] font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{change}</p>
              </div>
            )}
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/50 rounded-xl p-3 border border-indigo-100/50 dark:border-indigo-900/30">
            <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdminDashboard
