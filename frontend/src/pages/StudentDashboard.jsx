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
  anneeScolaireService, bulletinService, demandeDocumentService, emploiDuTempsService, etudiantService,
  fetchDossierFinancier, fetchMoyenneTrimestre, matiereService, noteService, paiementService, presenceService,
  soumettreJustification, telechargerBulletinPdf, telechargerDocumentPdf, trimestreService,
} from '@/services'
import { Button } from '@/components/ui/button'
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
              <h1 className="text-2xl font-bold text-primary">SIG-Lycée Étudiant</h1>
              <p className="text-xs text-muted-foreground">
                {user ? `${user.first_name} ${user.last_name}` : 'Portail Étudiant Sécurisé'}
              </p>
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
            {activeTab === 'home' && <StudentDashboardOverview />}
            {activeTab === 'profil' && <StudentProfile />}
            {activeTab === 'academique' && <AcademicManagement />}
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
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
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
const JOUR_LABELS = { LUN: 'Lundi', MAR: 'Mardi', MER: 'Mercredi', JEU: 'Jeudi', VEN: 'Vendredi', SAM: 'Samedi' }

function AcademicManagement() {
  const { data: emploiDuTemps } = useResourceList('emplois-du-temps', emploiDuTempsService)
  const { data: matieres } = useResourceList('matieres', matiereService)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion Académique</h1>
        <p className="text-muted-foreground mt-1">Consultation de votre emploi du temps</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Mon emploi du temps</h2>
          {(emploiDuTemps ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun créneau enregistré.</p>
          ) : (
            <div className="space-y-3">
              {emploiDuTemps.map((slot) => (
                <div key={slot.id} className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">{JOUR_LABELS[slot.jour]} {slot.heure_debut}–{slot.heure_fin}</p>
                    <p className="text-sm text-muted-foreground">{slot.matiere_intitule} - {slot.enseignant_nom ?? 'Non assigné'}</p>
                  </div>
                  {slot.salle_nom && (
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{slot.salle_nom}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Matières de l'établissement</h2>
          {(matieres ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune matière.</p>
          ) : (
            <div className="space-y-3">
              {matieres.map((subject) => (
                <div key={subject.id} className="flex justify-between items-center p-3 bg-muted rounded-lg text-sm">
                  <span className="font-medium">{subject.intitule}</span>
                  <span className="text-muted-foreground">Coef. {subject.coefficient}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Cahier de textes</h2>
        <CahierTextePanel />
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

      {/* Payment History by month/year */}
      <PaiementsParMoisTable paiements={paiements} />
    </div>
  )
}

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const STATUT_CELL_COLORS = {
  PAYE: 'bg-green-500/20 text-green-700', PARTIEL: 'bg-orange-500/20 text-orange-700',
  EN_ATTENTE: 'bg-gray-500/10 text-gray-500', ANNULE: 'bg-gray-400/10 text-gray-400',
  EN_RETARD: 'bg-red-500/20 text-red-700',
}

function PaiementsParMoisTable({ paiements }) {
  const { data: annees } = useResourceList('annees-scolaires', anneeScolaireService)

  const parAnnee = {}
  for (const p of paiements ?? []) {
    if (!parAnnee[p.annee_scolaire]) parAnnee[p.annee_scolaire] = {}
    parAnnee[p.annee_scolaire][p.mois_couvert] = p
  }
  const anneeIds = Object.keys(parAnnee).map(Number).sort((a, b) => b - a)
  const libelle = (id) => annees?.find((a) => a.id === id)?.libelle ?? `Année #${id}`

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-bold mb-4">Paiements d'écolage par mois</h2>
      {anneeIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left">Année</th>
                {MOIS_LABELS.map((m) => <th key={m} className="px-2 py-2 text-center text-xs">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {anneeIds.map((anneeId) => (
                <tr key={anneeId}>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">{libelle(anneeId)}</td>
                  {MOIS_LABELS.map((_, idx) => {
                    const mois = idx + 1
                    const p = parAnnee[anneeId][mois]
                    return (
                      <td key={mois} className="text-center">
                        {p ? (
                          <div
                            title={`${Number(p.montant).toLocaleString()} Ar — ${STATUT_LABELS[p.statut] ?? p.statut}`}
                            className={`rounded px-1.5 py-2 text-xs font-medium ${STATUT_CELL_COLORS[p.statut] ?? 'bg-muted'}`}
                          >
                            {Number(p.montant).toLocaleString()}
                          </div>
                        ) : (
                          <div className="rounded px-1.5 py-2 text-xs text-muted-foreground bg-muted/40">—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
