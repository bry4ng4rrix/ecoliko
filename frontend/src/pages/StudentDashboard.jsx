'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LogOut, User, BookOpen, BarChart3, Clock, FileText,
  MessageSquare, Menu, X, Download, Eye, Bell, Home, Calendar, AlertCircle
} from 'lucide-react'

import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useAnneeActive } from '@/hooks/useAnneeActive'
import { useCreateResource, useResourceList } from '@/hooks/useResource'
import {
  bulletinService, cahierTexteService, classeService, demandeDocumentService, emploiDuTempsService,
  etudiantService, fetchDossierFinancier, fetchMoyenneTrimestre, fraisScolariteService, matiereService,
  noteService, paiementService, presenceService,
  soumettreJustification, telechargerBulletinPdf, telechargerDocumentPdf, trimestreService,
} from '@/services'
import { Button } from '@/components/ui/button'
import { MonthCalendar } from '@/components/ui/month-calendar'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/ui/user-avatar'
import { NotificationBell } from '@/components/NotificationBell'
import { AnnoncesPanel } from '@/components/communication/AnnoncesPanel'
import { MessageriePanel } from '@/components/communication/MessageriePanel'
import { CahierTextePanel } from '@/components/pedagogie/CahierTextePanel'

/** L'API /etudiants/ est déjà scopée côté backend au dossier du seul élève connecté. */
function useMonDossier() {
  const { data } = useResourceList('etudiants', etudiantService)
  return data?.[0] ?? null
}

function useTrimestreActif() {
  const { data: trimestres } = useResourceList('trimestres', trimestreService)
  return trimestres?.find((t) => t.est_actif) ?? trimestres?.[0] ?? null
}

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    { id: 'home', label: 'Tableau de bord', icon: Home },
    { id: 'profil', label: 'Mon Profil', icon: User },
    { id: 'academique', label: 'Gestion Académique', icon: BookOpen },
    { id: 'edt', label: 'Emploi du Temps', icon: Calendar },
    { id: 'devoirs', label: 'Devoirs', icon: FileText },
    { id: 'notes', label: 'Notes & Résultats', icon: BarChart3 },
    { id: 'presence', label: 'Présence', icon: Clock },
    { id: 'admin', label: 'Gestion Administrative', icon: FileText },
    { id: 'communication', label: 'Communications', icon: MessageSquare },
    { id: 'documents', label: 'Mes Documents', icon: FileText }
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
              <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">SIG-Lycée Étudiant</h1>
              <p className="text-xs text-muted-foreground">
                {user ? `${user.first_name} ${user.last_name}` : 'Portail Étudiant Sécurisé'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserAvatar photo={user?.photo} name={user ? `${user.first_name} ${user.last_name}` : ''} className="w-9 h-9" />
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
            {activeTab === 'home' && <StudentDashboardOverview />}
            {activeTab === 'profil' && <StudentProfile />}
            {activeTab === 'academique' && <AcademicManagement />}
            {activeTab === 'edt' && <StudentEmploiDuTemps />}
            {activeTab === 'devoirs' && <StudentDevoirs />}
            {activeTab === 'notes' && <GradesResults />}
            {activeTab === 'presence' && <AttendanceTracking />}
            {activeTab === 'admin' && <AdministrativeStatus />}
            {activeTab === 'communication' && <Communications />}
            {activeTab === 'documents' && <MyDocuments />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ============ DASHBOARD OVERVIEW ============
function StudentDashboardOverview() {
  const dossier = useMonDossier()
  const trimestreActif = useTrimestreActif()
  const { data: notes } = useResourceList('notes', noteService)
  const { data: matieres } = useResourceList('matieres', matiereService)

  const { data: moyenne } = useQuery({
    queryKey: ['moyenne', dossier?.id, trimestreActif?.id],
    queryFn: () => fetchMoyenneTrimestre(dossier.id, trimestreActif.id),
    enabled: Boolean(dossier?.id && trimestreActif?.id),
  })

  const nomMatiere = (id) => matieres?.find((m) => m.id === id)?.intitule ?? `Matière ${id}`

  const notesParMatiere = {}
  for (const n of notes ?? []) {
    if (n.trimestre !== trimestreActif?.id) continue
    if (!notesParMatiere[n.matiere]) notesParMatiere[n.matiere] = []
    notesParMatiere[n.matiere].push(Number(n.valeur))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Bienvenue sur votre portail étudiant sécurisé</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Classe" value={dossier?.classe_actuelle ?? '—'} icon={BookOpen} />
        <InfoCard
          title={`Moyenne ${trimestreActif ? `Trimestre ${trimestreActif.numero}` : 'générale'}`}
          value={moyenne != null ? `${moyenne}/20` : '—'}
          icon={BarChart3}
        />
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Mes notes récentes</h2>
        {Object.keys(notesParMatiere).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune note pour ce trimestre.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(notesParMatiere).map(([matiereId, valeurs]) => (
              <div key={matiereId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold text-sm">{nomMatiere(Number(matiereId))}</p>
                  <p className="text-xs text-muted-foreground">{valeurs.length} note(s)</p>
                </div>
                <p className="font-bold text-primary">
                  {(valeurs.reduce((s, v) => s + v, 0) / valeurs.length).toFixed(2)}/20
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ title, value, icon: Icon, status }) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${status === 'good' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
          <Icon className={`w-6 h-6 ${status === 'good' ? 'text-green-600' : 'text-primary'}`} />
        </div>
      </div>
    </div>
  )
}

// ============ STUDENT PROFILE ============
function StudentProfile() {
  const dossier = useMonDossier()

  if (!dossier) {
    return <p className="text-sm text-muted-foreground">Chargement de votre profil...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <p className="text-muted-foreground mt-1">Consultation de vos informations personnelles et académiques</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 bg-card rounded-lg border border-border p-6">
          <div className="flex flex-col items-center">
            <UserAvatar photo={dossier.photo} name={`${dossier.prenom} ${dossier.nom}`} className="w-20 h-20 mb-4" />
            <h2 className="text-xl font-bold">{dossier.prenom} {dossier.nom}</h2>
            <p className="text-sm text-muted-foreground">Étudiant</p>
            <div className="mt-6 space-y-2 w-full text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Matricule:</span>
                <span className="font-semibold">{dossier.matricule}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classe:</span>
                <span className="font-semibold">{dossier.classe_actuelle ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Âge:</span>
                <span className="font-semibold">{dossier.age} ans</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-6">Informations personnelles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Prénom</p>
              <p className="font-semibold">{dossier.prenom}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nom</p>
              <p className="font-semibold">{dossier.nom}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-semibold">{dossier.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Téléphone</p>
              <p className="font-semibold">{dossier.telephone ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date d'inscription</p>
              <p className="font-semibold">{dossier.date_inscription}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Statut</p>
              <span className="px-3 py-1 bg-green-500/20 text-green-600 text-xs rounded-full font-medium">{dossier.statut}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ ACADEMIC MANAGEMENT ============
const JOURS_SEMAINE = [
  { code: 'LUN', label: 'Lundi' }, { code: 'MAR', label: 'Mardi' }, { code: 'MER', label: 'Mercredi' },
  { code: 'JEU', label: 'Jeudi' }, { code: 'VEN', label: 'Vendredi' }, { code: 'SAM', label: 'Samedi' },
]

function AcademicManagement() {
  const { data: matieres } = useResourceList('matieres', matiereService)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion Académique</h1>
        <p className="text-muted-foreground mt-1">Matières et cahier de textes</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-4">Matières de l'établissement</h2>
        {(matieres ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune matière.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {matieres.map((subject) => (
              <div key={subject.id} className="flex justify-between items-center p-3 bg-muted rounded-lg text-sm">
                <span className="font-medium">{subject.intitule}</span>
                <span className="text-muted-foreground">Coef. {subject.coefficient}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Cahier de textes</h2>
        <CahierTextePanel />
      </div>
    </div>
  )
}

// ============ EMPLOI DU TEMPS ============
function StudentEmploiDuTemps() {
  const { data: emploiDuTemps, isLoading } = useResourceList('emplois-du-temps', emploiDuTempsService)

  const creneaux = [...new Set((emploiDuTemps ?? []).map((s) => `${s.heure_debut}|${s.heure_fin}`))]
    .sort()
    .map((cle) => {
      const [heure_debut, heure_fin] = cle.split('|')
      return { heure_debut, heure_fin }
    })

  const slotAt = (jour, heure_debut) =>
    (emploiDuTemps ?? []).find((s) => s.jour === jour && s.heure_debut === heure_debut)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Emploi du Temps</h1>
        <p className="text-muted-foreground mt-1">Votre planning hebdomadaire de cours</p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        {isLoading && <p className="p-6 text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && creneaux.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">Aucun créneau enregistré.</p>
        )}
        {!isLoading && creneaux.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-3 text-left font-semibold border border-border w-24">Horaire</th>
                {JOURS_SEMAINE.map((j) => (
                  <th key={j.code} className="px-3 py-3 text-center font-semibold border border-border">{j.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {creneaux.map(({ heure_debut, heure_fin }) => (
                <tr key={heure_debut}>
                  <td className="px-3 py-2 border border-border text-xs font-medium text-muted-foreground whitespace-nowrap align-top">
                    {heure_debut.slice(0, 5)}–{heure_fin.slice(0, 5)}
                  </td>
                  {JOURS_SEMAINE.map((jour) => {
                    const slot = slotAt(jour.code, heure_debut)
                    return (
                      <td key={jour.code} className="border border-border p-1 align-top min-w-[140px]">
                        {slot && (
                          <div
                            className="rounded-lg p-2 text-xs h-full"
                            style={{ backgroundColor: `${slot.matiere_couleur ?? '#6366f1'}22` }}
                          >
                            <p className="font-semibold">{slot.matiere_intitule}</p>
                            {slot.enseignant_nom && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <UserAvatar photo={slot.enseignant_photo} name={slot.enseignant_nom} className="w-4 h-4" />
                                <p className="text-muted-foreground truncate">{slot.enseignant_nom}</p>
                              </div>
                            )}
                            {slot.salle_nom && <p className="text-muted-foreground">{slot.salle_nom}</p>}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ============ DEVOIRS ============
function StudentDevoirs() {
  const { data: entrees, isLoading } = useResourceList('cahier-textes', cahierTexteService)

  const aujourdhui = new Date().toISOString().slice(0, 10)
  const devoirs = (entrees ?? [])
    .filter((e) => e.travail_a_faire)
    .sort((a, b) => `${a.date_echeance_travail ?? ''}${a.heure_echeance_travail ?? ''}`.localeCompare(
      `${b.date_echeance_travail ?? ''}${b.heure_echeance_travail ?? ''}`
    ))

  const statutDevoir = (d) => {
    if (!d.date_echeance_travail) return { label: 'Sans échéance', classe: 'bg-muted text-muted-foreground' }
    if (d.date_echeance_travail < aujourdhui) return { label: 'En retard', classe: 'bg-red-500/20 text-red-700' }
    if (d.date_echeance_travail === aujourdhui) return { label: "Pour aujourd'hui", classe: 'bg-orange-500/20 text-orange-700' }
    const dansTroisJours = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (d.date_echeance_travail <= dansTroisJours) return { label: 'Bientôt', classe: 'bg-amber-500/20 text-amber-700' }
    return { label: 'À venir', classe: 'bg-green-500/20 text-green-700' }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Devoirs</h1>
        <p className="text-muted-foreground mt-1">Travail à faire pour votre classe</p>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && devoirs.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun devoir pour le moment.</p>
        )}
        {devoirs.map((d) => {
          const statut = statutDevoir(d)
          return (
            <div key={d.id} className="bg-card rounded-lg border border-border p-4">
              <div className="flex justify-between items-start gap-3 mb-1">
                <p className="font-semibold">{d.matiere_intitule}</p>
                <span className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${statut.classe}`}>{statut.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{d.travail_a_faire}</p>
              <p className="text-xs text-muted-foreground mt-2">
                À rendre le {d.date_echeance_travail}
                {d.heure_echeance_travail && ` à ${d.heure_echeance_travail.slice(0, 5)}`}
              </p>
              {(d.piece_jointe || d.lien) && (
                <div className="flex gap-3 mt-2">
                  {d.piece_jointe && (
                    <a href={d.piece_jointe} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      Pièce jointe
                    </a>
                  )}
                  {d.lien && (
                    <a href={d.lien} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      Lien
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============ GRADES & RESULTS ============
function GradesResults() {
  const dossier = useMonDossier()
  const { data: trimestres } = useResourceList('trimestres', trimestreService)
  const [selectedTrimestre, setSelectedTrimestre] = useState(null)
  const { data: notes } = useResourceList('notes', noteService)
  const { data: matieres } = useResourceList('matieres', matiereService)

  const trimestreCourant = trimestres?.find((t) => t.id === selectedTrimestre)
    ?? trimestres?.find((t) => t.est_actif)
    ?? trimestres?.[0]

  const { data: moyenneGenerale } = useQuery({
    queryKey: ['moyenne', dossier?.id, trimestreCourant?.id],
    queryFn: () => fetchMoyenneTrimestre(dossier.id, trimestreCourant.id),
    enabled: Boolean(dossier?.id && trimestreCourant?.id),
  })

  const nomMatiere = (id) => matieres?.find((m) => m.id === id)?.intitule ?? `Matière ${id}`

  const notesParMatiere = {}
  for (const n of notes ?? []) {
    if (n.trimestre !== trimestreCourant?.id) continue
    if (!notesParMatiere[n.matiere]) notesParMatiere[n.matiere] = []
    notesParMatiere[n.matiere].push(n)
  }
  const lignes = Object.entries(notesParMatiere).map(([matiereId, notesMatiere]) => {
    const moyenne = notesMatiere.reduce((s, n) => s + Number(n.valeur), 0) / notesMatiere.length
    return { matiereId: Number(matiereId), notesMatiere, moyenne }
  })
  const meilleureMatiere = lignes.length
    ? lignes.reduce((best, l) => (l.moyenne > best.moyenne ? l : best), lignes[0])
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notes & Résultats</h1>
        <p className="text-muted-foreground mt-1">Consultation de vos notes et résultats académiques</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(trimestres ?? []).map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTrimestre(t.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              trimestreCourant?.id === t.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Trimestre {t.numero}
          </button>
        ))}
      </div>

      {/* Grades Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Matière</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Notes</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Moyenne</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lignes.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground">Aucune note pour ce trimestre.</td></tr>
            )}
            {lignes.map(({ matiereId, notesMatiere, moyenne }) => (
              <tr key={matiereId} className="hover:bg-muted/50">
                <td className="px-6 py-4 text-sm font-medium">{nomMatiere(matiereId)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {notesMatiere.map(n => `${n.type_evaluation}: ${n.valeur}`).join(', ')}
                </td>
                <td className="px-6 py-4 text-center text-sm font-bold text-primary">{moyenne.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Moyenne générale pondérée</p>
          <p className="text-3xl font-bold mt-2">{moyenneGenerale != null ? `${moyenneGenerale}/20` : '—'}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Meilleure matière</p>
          <p className="text-3xl font-bold mt-2">{meilleureMatiere ? nomMatiere(meilleureMatiere.matiereId) : '—'}</p>
        </div>
      </div>

      <BulletinCard trimestreId={trimestreCourant?.id} />
    </div>
  )
}

function BulletinCard({ trimestreId }) {
  const { data: bulletins } = useResourceList('bulletins', bulletinService)
  const bulletin = bulletins?.find((b) => b.trimestre === trimestreId)

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Bulletin</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {bulletin
              ? `${bulletin.est_valide ? 'Validé' : 'En attente de validation'} — Rang ${bulletin.rang ?? '—'}/${bulletin.effectif_classe ?? '—'}`
              : "Pas encore généré par l'établissement pour ce trimestre."}
          </p>
        </div>
        {bulletin && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => telechargerBulletinPdf(bulletin.id, `bulletin_${bulletin.id}.pdf`)}
          >
            <Download className="w-4 h-4" /> Télécharger
          </Button>
        )}
      </div>
    </div>
  )
}

// ============ ATTENDANCE TRACKING ============
const STATUT_PRESENCE_LABELS = { P: 'Présent', A: 'Absent', R: 'En retard', E: 'Absence justifiée' }

const JUSTIFICATION_LABELS = {
  AUCUNE: null, EN_ATTENTE: 'Justificatif en attente', ACCEPTEE: 'Justificatif accepté', REFUSEE: 'Justificatif refusé',
}

function AttendanceTracking() {
  const { data: presences, refetch } = useResourceList('presences', presenceService)
  const [justifiant, setJustifiant] = useState(null)
  const [texte, setTexte] = useState('')

  const compteurs = (presences ?? []).reduce((acc, p) => ({ ...acc, [p.statut]: (acc[p.statut] ?? 0) + 1 }), {})
  const historique = (presences ?? []).filter((p) => p.statut !== 'P')

  const handleJustifier = async (id) => {
    try {
      await soumettreJustification(id, texte)
      toast.success('Justificatif envoyé.')
      setJustifiant(null)
      setTexte('')
      refetch()
    } catch {
      toast.error("Erreur lors de l'envoi du justificatif.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Suivi de Présence</h1>
        <p className="text-muted-foreground mt-1">Consultation de votre présence et absences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Présences</p>
          <p className="text-3xl font-bold mt-2 text-green-600">{compteurs.P ?? 0}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Absences</p>
          <p className="text-3xl font-bold mt-2 text-destructive">{compteurs.A ?? 0}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Retards</p>
          <p className="text-3xl font-bold mt-2 text-orange-600">{compteurs.R ?? 0}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-4">Historique des absences et retards</h2>
        {historique.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune absence ou retard enregistré.</p>
        ) : (
          <div className="space-y-3">
            {historique.map((record) => (
              <div key={record.id} className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{record.date_cours} — {record.matiere_intitule}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.justificatif || 'Aucun justificatif'}
                      {JUSTIFICATION_LABELS[record.justification_statut] && (
                        <span className="ml-2 font-medium">({JUSTIFICATION_LABELS[record.justification_statut]})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      record.statut === 'E' ? 'bg-green-500/20 text-green-600' : 'bg-orange-500/20 text-orange-600'
                    }`}>
                      {STATUT_PRESENCE_LABELS[record.statut]}
                    </span>
                    {record.justification_statut === 'AUCUNE' && (
                      <Button size="sm" variant="outline" onClick={() => { setJustifiant(record.id); setTexte('') }}>
                        Justifier
                      </Button>
                    )}
                  </div>
                </div>
                {justifiant === record.id && (
                  <div className="flex gap-2">
                    <input
                      value={texte} onChange={(e) => setTexte(e.target.value)}
                      placeholder="Motif du justificatif..."
                      className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button size="sm" onClick={() => handleJustifier(record.id)} disabled={!texte}>Envoyer</Button>
                    <Button size="sm" variant="secondary" onClick={() => setJustifiant(null)}>Annuler</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ ADMINISTRATIVE STATUS ============
const STATUT_LABELS = {
  PAYE: 'Payé', PARTIEL: 'Partiel', IMPAYE: 'Impayé', NON_CONFIGURE: 'Non configuré',
}

function AdministrativeStatus() {
  const dossier = useMonDossier()
  const anneeActive = useAnneeActive()
  const { data: paiements } = useResourceList('paiements', paiementService)
  const { data: classes } = useResourceList('classes', classeService)
  const { data: fraisScolarite } = useResourceList('frais-scolarite', fraisScolariteService)

  const { data: dossierFinancier } = useQuery({
    queryKey: ['dossier-financier', dossier?.id, anneeActive?.id],
    queryFn: () => fetchDossierFinancier(dossier.id, anneeActive.id),
    enabled: Boolean(dossier?.id && anneeActive?.id),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion Administrative</h1>
        <p className="text-muted-foreground mt-1">Consultation de vos paiements et statut</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Total dû</p>
          <p className="text-2xl font-bold mt-2">{dossierFinancier ? `${Number(dossierFinancier.total_du).toLocaleString()} Ar` : '—'}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Reste à payer</p>
          <p className="text-2xl font-bold mt-2">{dossierFinancier ? `${Number(dossierFinancier.reste_du).toLocaleString()} Ar` : '—'}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Statut</p>
          <p className="text-2xl font-bold mt-2">{dossierFinancier ? STATUT_LABELS[dossierFinancier.statut] : '—'}</p>
        </div>
      </div>

      <FraisEcolageCalendar
        dossier={dossier} anneeActive={anneeActive} paiements={paiements}
        classes={classes} fraisScolarite={fraisScolarite}
      />
    </div>
  )
}

// ============ CALENDRIER DES FRAIS (vue mensuelle type agenda) ============
function FraisEcolageCalendar({ dossier, anneeActive, paiements, classes, fraisScolarite }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { mois: now.getMonth(), annee: now.getFullYear() }
  })

  const classeActuelle = dossier?.classe_actuelle
    ? (classes ?? []).find((c) => c.nom === dossier.classe_actuelle)
    : null
  const tarifNiveau = classeActuelle
    ? (fraisScolarite ?? []).find(
        (f) => f.annee_scolaire === anneeActive?.id && f.niveau === classeActuelle.niveau
          && (f.filiere ?? null) === (classeActuelle.filiere ?? null)
      )
    : null

  const montantInscription = classeActuelle?.frais_inscription ?? tarifNiveau?.montant_inscription ?? null
  const montantEcolageMensuel = classeActuelle?.frais_ecolage_mensuel
    ?? (tarifNiveau ? Number(tarifNiveau.montant_annuel) / 12 : null)

  const mesPaiements = (paiements ?? []).filter((p) => p.annee_scolaire === anneeActive?.id)
  const totalPayeEcolage = mesPaiements
    .filter((p) => p.statut === 'PAYE')
    .reduce((somme, p) => somme + Number(p.montant), 0)
  const droitInscriptionPaye = montantInscription != null && totalPayeEcolage >= Number(montantInscription)

  // Même règle d'échéance que côté admin (`PaiementsEtudiantDialog`) : le 5 du mois, l'année
  // scolaire étant considérée comme un cycle septembre → août.
  const dateEcheancePourMois = (moisCouvert) => {
    const anneeDebut = new Date(anneeActive.date_debut).getFullYear()
    const annee = moisCouvert >= 9 ? anneeDebut : anneeDebut + 1
    return `${annee}-${String(moisCouvert).padStart(2, '0')}-05`
  }

  const aujourdhui = new Date().toISOString().slice(0, 10)

  const events = []
  if (anneeActive) {
    events.push({
      date: anneeActive.date_debut,
      label: droitInscriptionPaye ? "Inscription — Payé" : "Inscription — Non payé",
      color: droitInscriptionPaye ? 'bg-green-600' : 'bg-red-600',
      title: montantInscription != null ? `Droit d'inscription : ${Number(montantInscription).toLocaleString('fr-FR')} Ar` : "Droit d'inscription",
    })
    for (let moisCouvert = 1; moisCouvert <= 12; moisCouvert += 1) {
      const echeance = dateEcheancePourMois(moisCouvert)
      const paiementDuMois = mesPaiements.find((p) => p.mois_couvert === moisCouvert)
      const paye = paiementDuMois?.statut === 'PAYE'
      const enRetard = !paye && echeance < aujourdhui
      events.push({
        date: echeance,
        label: paye ? 'Écolage — Payé' : enRetard ? 'Écolage — En retard' : 'Écolage — Non payé',
        color: paye ? 'bg-green-600' : enRetard ? 'bg-red-600' : 'bg-gray-400',
        title: montantEcolageMensuel != null ? `Écolage : ${Number(montantEcolageMensuel).toLocaleString('fr-FR')} Ar` : 'Écolage',
      })
    }
  }

  const navigate = (dir) => {
    if (dir === 'aujourdhui') {
      const now = new Date()
      setCursor({ mois: now.getMonth(), annee: now.getFullYear() })
      return
    }
    setCursor((prev) => {
      let mois = prev.mois + dir
      let annee = prev.annee
      if (mois < 0) { mois = 11; annee -= 1 }
      if (mois > 11) { mois = 0; annee += 1 }
      return { mois, annee }
    })
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Frais généraux et écolage</h2>
      <MonthCalendar mois={cursor.mois} annee={cursor.annee} onNavigate={navigate} events={events} />
    </div>
  )
}

// ============ COMMUNICATIONS ============
function Communications() {
  const [activeTab, setActiveTab] = useState('notifications')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Communications</h1>
        <p className="text-muted-foreground mt-1">Annonces et messagerie interne</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {['notifications', 'messagerie'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {tab === 'notifications' && 'Annonces'}
            {tab === 'messagerie' && 'Messagerie interne'}
          </button>
        ))}
      </div>

      {activeTab === 'notifications' && <AnnoncesPanel />}
      {activeTab === 'messagerie' && <MessageriePanel />}
    </div>
  )
}

// ============ MY DOCUMENTS ============
const TYPE_DOCUMENT_LABELS = {
  CERTIFICAT_SCOLARITE: 'Certificat de scolarité',
  ATTESTATION: 'Attestation de fréquentation',
  CERTIFICAT_REUSSITE: 'Certificat de réussite',
}
const STATUT_DEMANDE_LABELS = { EN_ATTENTE: 'En attente', VALIDE: 'Validé', REFUSE: 'Refusé' }
const STATUT_DEMANDE_COLORS = {
  EN_ATTENTE: 'bg-orange-500/20 text-orange-600', VALIDE: 'bg-green-500/20 text-green-600', REFUSE: 'bg-red-500/20 text-red-600',
}

function MyDocuments() {
  const dossier = useMonDossier()
  const anneeActive = useAnneeActive()
  const { data: demandes } = useResourceList('demandes-documents', demandeDocumentService)
  const createDemande = useCreateResource('demandes-documents', demandeDocumentService)

  const handleDemander = async (typeDocument) => {
    try {
      await createDemande.mutateAsync({
        etudiant: dossier.id, annee_scolaire: anneeActive.id, type_document: typeDocument,
      })
      toast.success('Demande envoyée. Elle sera traitée par l\'administration.')
    } catch {
      toast.error('Erreur lors de la demande.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mes Documents</h1>
        <p className="text-muted-foreground mt-1">Demande et téléchargement de vos documents administratifs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(TYPE_DOCUMENT_LABELS).map(([code, label]) => (
          <div key={code} className="bg-card rounded-lg border border-border p-6">
            <FileText className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-semibold mb-4">{label}</h3>
            <button
              disabled={!dossier?.id || !anneeActive?.id}
              onClick={() => handleDemander(code)}
              className="w-full px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-sm font-medium disabled:opacity-50"
            >
              Demander
            </button>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-4">Mes demandes</h2>
        {(demandes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {demandes.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{TYPE_DOCUMENT_LABELS[d.type_document]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUT_DEMANDE_COLORS[d.statut]}`}>
                    {STATUT_DEMANDE_LABELS[d.statut]}
                  </span>
                  {d.statut === 'VALIDE' && (
                    <button
                      onClick={() => telechargerDocumentPdf(d.id, `${d.type_document.toLowerCase()}.pdf`)}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> Télécharger
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard;
