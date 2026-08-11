'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Home, Users, BookOpen, Clock, Database, MessageSquare, Menu, X, UserPlus } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useResourceList } from '@/hooks/useResource'
import { demandeDocumentService, etudiantService } from '@/services'
import { NotificationBell } from '@/components/NotificationBell'
import { AnnoncesPanel } from '@/components/communication/AnnoncesPanel'
import { MessageriePanel } from '@/components/communication/MessageriePanel'
import { ClassesPanel } from '@/components/academique/ClassesPanel'
import { SallesPanel } from '@/components/academique/SallesPanel'
import { MatieresPanel } from '@/components/academique/MatieresPanel'
import { EmploiDuTempsCalendar } from '@/components/academique/EmploiDuTempsCalendar'
import { EvenementsCalendrierPanel } from '@/components/calendrier/EvenementsCalendrierPanel'
import { PaiementsPanel } from '@/components/finance/PaiementsPanel'
import { DocumentsValidationPanel } from '@/components/documents/DocumentsValidationPanel'
import { AttendancePanel } from '@/components/presences/AttendancePanel'
import { DisciplinePanel } from '@/components/discipline/DisciplinePanel'
import { DemandesInscriptionPanel } from '@/components/inscriptions/DemandesInscriptionPanel'
import { AnneesScolairesPanel } from '@/components/parametres/AnneesScolairesPanel'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

function SecretariatDashboard() {
  const [activeTab, setActiveTab] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    { id: 'home', label: 'Tableau de bord', icon: Home },
    { id: 'etudiants', label: 'Étudiants', icon: Users },
    { id: 'inscriptions', label: "Demandes d'inscription", icon: UserPlus },
    { id: 'academique', label: 'Gestion Académique', icon: BookOpen },
    { id: 'presence', label: 'Présence & Absences', icon: Clock },
    { id: 'administratif', label: 'Paiements & Documents', icon: Database },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login/', { replace: true })
  }

  const Overview = () => {
    const { data: etudiants } = useResourceList('etudiants', etudiantService)
    const { data: demandes } = useResourceList('demandes-documents', demandeDocumentService)
    const enAttente = (demandes ?? []).filter((d) => d.statut === 'EN_ATTENTE')

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-1">Bienvenue, {user ? `${user.first_name} ${user.last_name}` : ''}</h2>
          <p className="opacity-90">Bureau administratif — {user?.email}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <p className="text-sm text-muted-foreground">Étudiants</p>
            <p className="text-3xl font-bold mt-2">{etudiants?.length ?? '…'}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <p className="text-sm text-muted-foreground">Documents en attente</p>
            <p className="text-3xl font-bold mt-2 text-orange-600">{enAttente.length}</p>
          </div>
        </div>
      </div>
    )
  }

  const EtudiantsList = () => {
    const { data: etudiants, isLoading } = useResourceList('etudiants', etudiantService)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Étudiants</h1>
          <p className="text-muted-foreground mt-1">Consultation des profils des étudiants de l'établissement</p>
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matricule</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Chargement...</TableCell></TableRow>
              )}
              {!isLoading && etudiants?.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun étudiant.</TableCell></TableRow>
              )}
              {etudiants?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.matricule}</TableCell>
                  <TableCell className="font-medium">{s.prenom} {s.nom}</TableCell>
                  <TableCell>{s.classe_actuelle ?? '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{s.statut}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const AcademicManagement = () => {
    const [activeSubTab, setActiveSubTab] = useState('classes')
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion Académique</h1>
          <p className="text-muted-foreground mt-1">Classes, matières et emplois du temps</p>
        </div>
        <div className="flex gap-2 border-b border-border">
          {['classes', 'matieres', 'salles', 'emplois', 'calendrier', 'annee-scolaire'].map(tab => (
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
              {tab === 'emplois' && 'Emplois du temps'}
              {tab === 'calendrier' && 'Vacances / Examens / Événements'}
              {tab === 'annee-scolaire' && 'Année scolaire'}
            </button>
          ))}
        </div>
        {activeSubTab === 'classes' && <ClassesPanel />}
        {activeSubTab === 'matieres' && <MatieresPanel />}
        {activeSubTab === 'salles' && <SallesPanel />}
        {activeSubTab === 'emplois' && <EmploiDuTempsCalendar />}
        {activeSubTab === 'calendrier' && <EvenementsCalendrierPanel />}
        {activeSubTab === 'annee-scolaire' && <AnneesScolairesPanel />}
      </div>
    )
  }

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
          <h1 className="text-3xl font-bold">Paiements & Documents</h1>
          <p className="text-muted-foreground mt-1">Écolage et demandes de documents administratifs</p>
        </div>
        <div className="flex gap-2 border-b border-border">
          {['paiements', 'documents'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'paiements' && 'Paiements'}
              {tab === 'documents' && 'Documents'}
            </button>
          ))}
        </div>
        {activeSubTab === 'paiements' && <PaiementsPanel />}
        {activeSubTab === 'documents' && <DocumentsValidationPanel />}
      </div>
    )
  }

  const Communication = () => {
    const [activeSubTab, setActiveSubTab] = useState('annonces')
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Communication</h1>
          <p className="text-muted-foreground mt-1">Annonces et messagerie interne</p>
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

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-card border-r border-border transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-border">
          {sidebarOpen && <h1 className="font-bold text-lg">SIG-Lycée</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && item.label}
              </button>
            )
          })}
        </nav>
        <div className="p-2 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && 'Déconnexion'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Bureau administratif</p>
          </div>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'home' && <Overview />}
          {activeTab === 'etudiants' && <EtudiantsList />}
          {activeTab === 'inscriptions' && <DemandesInscriptionPanel />}
          {activeTab === 'academique' && <AcademicManagement />}
          {activeTab === 'presence' && <AttendanceAbsence />}
          {activeTab === 'administratif' && <AdministrativeManagement />}
          {activeTab === 'communication' && <Communication />}
        </main>
      </div>
    </div>
  )
}

export default SecretariatDashboard
