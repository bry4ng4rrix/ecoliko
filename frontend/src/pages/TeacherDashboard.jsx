'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Users, BookOpen, BarChart3, Clock, FileText,
  MessageSquare, Menu, X, Download, Edit2, Plus, TrendingUp,
  Calendar, CheckCircle, AlertCircle, Home, Settings, Send, Bell, Eye
} from 'lucide-react'

import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import { useAnneeActive } from '@/hooks/useAnneeActive'
import { useCreateResource, useResourceList, useUpdateResource } from '@/hooks/useResource'
import {
  classeService, dossierEnseignantService, emploiDuTempsService, enregistrerAppel, etudiantService,
  genererBulletin, matiereService, niveauService, noteService, presenceService, trimestreService,
} from '@/services'
import { authService } from '@/services/authService'
import { NotificationBell } from '@/components/NotificationBell'
import { AnnoncesPanel } from '@/components/communication/AnnoncesPanel'
import { MessageriePanel } from '@/components/communication/MessageriePanel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CahierTextePanel } from '@/components/pedagogie/CahierTextePanel'
import { DisciplinePanel } from '@/components/discipline/DisciplinePanel'

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    { id: 'home', label: 'Tableau de bord', icon: Home },
    { id: 'academique', label: 'Gestion Académique', icon: BookOpen },
    { id: 'emploi-du-temps', label: 'Emploi du Temps', icon: Calendar },
    { id: 'notes', label: 'Notes & Évaluations', icon: BarChart3 },
    { id: 'cahier', label: 'Cahier de textes', icon: FileText },
    { id: 'presence', label: 'Présence & Absences', icon: Clock },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'historique', label: 'Historique Étudiants', icon: FileText },
    { id: 'rapports', label: 'Rapports', icon: BarChart3 },
    { id: 'parametres', label: 'Paramètres', icon: Settings }
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
              <h1 className="text-2xl font-bold text-primary">SIG-Lycée Enseignant</h1>
              <p className="text-xs text-muted-foreground">
                {user ? `${user.first_name} ${user.last_name}` : '...'}
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
            {activeTab === 'home' && <TeacherDashboardOverview />}
            {activeTab === 'academique' && <AcademicManagement />}
            {activeTab === 'emploi-du-temps' && <MonEmploiDuTempsPanel />}
            {activeTab === 'notes' && <GradesEvaluation />}
            {activeTab === 'cahier' && <CahierTexteTab />}
            {activeTab === 'presence' && <AttendanceAbsence />}
            {activeTab === 'communication' && <Communication />}
            {activeTab === 'historique' && <StudentHistory />}
            {activeTab === 'rapports' && <TeacherReports />}
            {activeTab === 'parametres' && <TeacherSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ============ TEACHER DASHBOARD OVERVIEW ============
function TeacherDashboardOverview() {
  // Le backend scope déjà /api/classes/ aux seules classes où cet enseignant intervient.
  const { data: classes, isLoading } = useResourceList('classes', classeService)
  const totalEleves = classes?.reduce((sum, c) => sum + c.effectif, 0) ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de vos classes et tâches</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="Classes" value={isLoading ? '…' : classes?.length ?? 0} icon={BookOpen} />
        <StatCard title="Élèves total" value={isLoading ? '…' : totalEleves} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && classes?.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune classe assignée pour l'instant.</p>
        )}
        {classes?.map(cls => (
          <div key={cls.id} className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-bold mb-4">{cls.nom}</h3>
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre d'élèves</p>
                <p className="text-2xl font-bold">{cls.effectif} / {cls.capacite_max}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Niveau</p>
                <p className="text-lg font-semibold text-primary">{cls.niveau_intitule}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon }) {
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
const JOUR_LABELS = { LUN: 'Lundi', MAR: 'Mardi', MER: 'Mercredi', JEU: 'Jeudi', VEN: 'Vendredi', SAM: 'Samedi' }

function AcademicManagement() {
  const { data: classes } = useResourceList('classes', classeService)
  const { data: emploiDuTemps } = useResourceList('emplois-du-temps', emploiDuTempsService)
  const { user } = useAuth()
  const { data: matieres } = useResourceList('matieres', matiereService)
  const mesMatieres = matieres?.filter((m) => m.enseignant === user?.id) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion Académique</h1>
        <p className="text-muted-foreground mt-1">Emplois du temps et matières</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Mes classes</h2>
          <div className="space-y-2">
            {(classes ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune classe assignée.</p>}
            {(classes ?? []).map(cls => (
              <div key={cls.id} className="w-full px-4 py-3 rounded-lg text-left bg-muted">
                <p className="font-semibold">{cls.nom}</p>
              </div>
            ))}
          </div>
        </div>

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
                    <p className="font-semibold">{JOUR_LABELS[slot.jour]}</p>
                    <p className="text-sm text-muted-foreground">{slot.heure_debut}–{slot.heure_fin} - {slot.matiere_intitule} ({slot.classe_nom})</p>
                  </div>
                  {slot.salle_nom && (
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{slot.salle_nom}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Mes matières</h2>
        </div>
        <AjouterMatiereForm />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {mesMatieres.length === 0 && <p className="text-sm text-muted-foreground">Aucune matière assignée.</p>}
          {mesMatieres.map((m) => (
            <div key={m.id} className="border border-border rounded-lg p-4">
              <p className="font-semibold mb-2">{m.intitule}</p>
              <p className="text-sm text-muted-foreground">Coefficient: {m.coefficient}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ MY TIMETABLE ============
const JOURS_ORDRE = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']

function MonEmploiDuTempsPanel() {
  const { data: emploiDuTemps, isLoading } = useResourceList('emplois-du-temps', emploiDuTempsService)

  const joursAvecCreneaux = JOURS_ORDRE
    .map((jour) => ({
      jour,
      slots: (emploiDuTemps ?? [])
        .filter((s) => s.jour === jour)
        .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut)),
    }))
    .filter(({ slots }) => slots.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Emploi du Temps</h1>
        <p className="text-muted-foreground mt-1">Votre planning hebdomadaire de cours</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
      {!isLoading && joursAvecCreneaux.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun créneau enregistré pour l'instant.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {joursAvecCreneaux.map(({ jour, slots }) => (
          <div key={jour} className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-bold mb-4">{JOUR_LABELS[jour]}</h2>
            <div className="space-y-3">
              {slots.map((slot) => (
                <div key={slot.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-semibold text-sm">{slot.heure_debut}–{slot.heure_fin}</p>
                  <p className="text-sm text-muted-foreground">{slot.matiere_intitule} — {slot.classe_nom}</p>
                  {slot.salle_nom && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                      {slot.salle_nom}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AjouterMatiereForm() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', intitule: '', niveau: '', coefficient: 1 })
  const { data: niveaux } = useResourceList('niveaux', niveauService)
  const createMatiere = useCreateResource('matieres', matiereService)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createMatiere.mutateAsync({
        code: form.code, intitule: form.intitule, niveau: Number(form.niveau),
        coefficient: Number(form.coefficient), enseignant: user.id, filiere: null,
      })
      toast.success('Matière ajoutée.')
      setForm({ code: '', intitule: '', niveau: '', coefficient: 1 })
      setShowForm(false)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'ajout.")
    }
  }

  if (!showForm) {
    return (
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm(true)}>
        <Plus className="w-4 h-4" /> Ajouter une matière que j'enseigne
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-muted rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          name="code" value={form.code} onChange={handleChange} placeholder="Code (ex: MATH)" required
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          name="intitule" value={form.intitule} onChange={handleChange} placeholder="Intitulé" required
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          name="coefficient" type="number" min="1" max="10" value={form.coefficient} onChange={handleChange} required
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <select
        name="niveau" value={form.niveau} onChange={handleChange} required
        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Choisir un niveau</option>
        {(niveaux ?? []).map((n) => <option key={n.id} value={n.id}>{n.intitule}</option>)}
      </select>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={createMatiere.isPending}>Ajouter</Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
      </div>
    </form>
  )
}

// ============ CAHIER DE TEXTES ============
function CahierTexteTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cahier de textes</h1>
        <p className="text-muted-foreground mt-1">Contenu des séances et travail à faire</p>
      </div>
      <CahierTextePanel />
    </div>
  )
}

// ============ GRADES & EVALUATION ============
function GradesEvaluation() {
  const [selectedMatiere, setSelectedMatiere] = useState(null)
  const [selectedTrimestre, setSelectedTrimestre] = useState(null)
  const [filtreClasse, setFiltreClasse] = useState('')
  const [gradeForm, setGradeForm] = useState(false)
  const [form, setForm] = useState({ etudiant: '', type_evaluation: '', valeurs: { 1: '', 2: '', 3: '' } })
  const [consultationEtudiant, setConsultationEtudiant] = useState(null)

  const { user } = useAuth()
  const anneeActive = useAnneeActive()
  const { data: matieres } = useResourceList('matieres', matiereService)
  const { data: trimestres } = useResourceList('trimestres', trimestreService)
  const { data: classes } = useResourceList('classes', classeService)
  const { data: etudiants } = useResourceList('etudiants', etudiantService)
  const { data: notes } = useResourceList('notes', noteService)
  const createNote = useCreateResource('notes', noteService)
  const updateNote = useUpdateResource('notes', noteService)

  const mesMatieres = matieres?.filter((m) => m.enseignant === user?.id) ?? []

  useEffect(() => {
    if (!selectedMatiere && mesMatieres.length) setSelectedMatiere(mesMatieres[0].id)
  }, [mesMatieres, selectedMatiere])

  useEffect(() => {
    if (!selectedTrimestre && trimestres?.length) {
      setSelectedTrimestre((trimestres.find((t) => t.est_actif) ?? trimestres[0]).id)
    }
  }, [trimestres, selectedTrimestre])

  const notesFiltrees = (notes ?? []).filter(
    (n) => n.matiere === selectedMatiere && n.trimestre === selectedTrimestre
  )

  const rows = (etudiants ?? [])
    .filter((etu) => !filtreClasse || etu.classe_actuelle === filtreClasse)
    .map((etu) => {
      const notesEtu = notesFiltrees.filter((n) => n.etudiant === etu.id)
      const moyenne = notesEtu.length
        ? (notesEtu.reduce((sum, n) => sum + Number(n.valeur), 0) / notesEtu.length).toFixed(2)
        : null
      return { etudiant: etu, notes: notesEtu, moyenne }
    })

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  const handleValeurChange = (numero, value) => setForm((prev) => ({
    ...prev, valeurs: { ...prev.valeurs, [numero]: value },
  }))

  const startSaisiePour = (etudiantId) => {
    setForm({ etudiant: String(etudiantId), type_evaluation: '', valeurs: { 1: '', 2: '', 3: '' } })
    setGradeForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const aSaisir = [1, 2, 3].filter((numero) => form.valeurs[numero] !== '')
    if (aSaisir.length === 0) {
      toast.error('Renseignez la note d\'au moins un trimestre.')
      return
    }
    try {
      await Promise.all(aSaisir.map((numero) => {
        const trimestre = (trimestres ?? []).find((t) => t.numero === numero)
        const payload = {
          etudiant: Number(form.etudiant),
          matiere: selectedMatiere,
          trimestre: trimestre.id,
          valeur: form.valeurs[numero],
          type_evaluation: form.type_evaluation,
        }
        // Une note existe déjà pour cet élève/matière/trimestre/type d'évaluation (contrainte
        // d'unicité côté backend) : on la met à jour plutôt que d'essayer d'en recréer une.
        const existante = (notes ?? []).find(
          (n) => n.etudiant === payload.etudiant && n.matiere === payload.matiere
            && n.trimestre === payload.trimestre && n.type_evaluation === payload.type_evaluation
        )
        return existante
          ? updateNote.mutateAsync({ id: existante.id, payload: { valeur: payload.valeur } })
          : createNote.mutateAsync(payload)
      }))
      toast.success(`Note enregistrée pour ${aSaisir.length} trimestre${aSaisir.length > 1 ? 's' : ''}.`)
      setGradeForm(false)
      setForm({ etudiant: '', type_evaluation: '', valeurs: { 1: '', 2: '', 3: '' } })
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement.")
    }
  }

  const handleGenererBulletin = async (etudiantId) => {
    try {
      await genererBulletin({ etudiant: etudiantId, annee_scolaire: anneeActive.id, trimestre: selectedTrimestre })
      toast.success('Bulletin généré.')
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Erreur lors de la génération du bulletin.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notes & Évaluations</h1>
          <p className="text-muted-foreground mt-1">Saisie des notes de vos matières</p>
        </div>
        <button
          onClick={() => setGradeForm(!gradeForm)}
          disabled={!selectedMatiere || !selectedTrimestre}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Saisir une note
        </button>
      </div>

      {mesMatieres.length === 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-700 rounded-lg px-4 py-3 text-sm">
          Aucune matière ne vous est assignée pour le moment — la saisie de notes est indisponible.
          Contactez l'administration pour vous faire assigner une ou plusieurs matières.
        </div>
      )}

      {/* Matière / Trimestre selection */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedMatiere ?? ''}
          onChange={(e) => setSelectedMatiere(Number(e.target.value))}
          className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {mesMatieres.length === 0 && <option value="">Aucune matière assignée</option>}
          {mesMatieres.map((m) => <option key={m.id} value={m.id}>{m.intitule}</option>)}
        </select>
        <select
          value={selectedTrimestre ?? ''}
          onChange={(e) => setSelectedTrimestre(Number(e.target.value))}
          className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {(trimestres ?? []).map((t) => <option key={t.id} value={t.id}>Trimestre {t.numero}</option>)}
        </select>
        <select
          value={filtreClasse}
          onChange={(e) => setFiltreClasse(e.target.value)}
          className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Toutes mes classes</option>
          {(classes ?? []).map((c) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
        </select>
      </div>

      {/* Grade Form */}
      {gradeForm && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Saisir une note</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Élève</label>
                <select name="etudiant" value={form.etudiant} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Sélectionner un élève</option>
                  {rows.map(({ etudiant: s }) => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Type d'évaluation</label>
                <input name="type_evaluation" value={form.type_evaluation} onChange={handleChange} required placeholder="Contrôle continu 1" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Notes par trimestre (sur 20)</label>
              <p className="text-xs text-muted-foreground mb-2">Renseignez un ou plusieurs trimestres — une note est créée pour chacun des trimestres remplis.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((numero) => (
                  <div key={numero}>
                    <label className="block text-xs text-muted-foreground mb-1">Trimestre {numero}</label>
                    <input
                      value={form.valeurs[numero]} onChange={(e) => handleValeurChange(numero, e.target.value)}
                      type="number" min="0" max="20" step="0.25" placeholder="14.5"
                      className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createNote.isPending} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-50">
                {createNote.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setGradeForm(false)} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Grades Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Élève</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Notes saisies</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Moyenne</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Bulletin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">Aucun élève à afficher.</td></tr>
            )}
            {rows.map(({ etudiant, notes: notesEtu, moyenne }) => (
              <tr key={etudiant.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 text-sm font-medium">{etudiant.prenom} {etudiant.nom}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {notesEtu.length === 0 ? '—' : notesEtu.map(n => `${n.type_evaluation}: ${n.valeur}`).join(', ')}
                </td>
                <td className="px-6 py-4 text-center text-sm font-bold text-primary">{moyenne ?? '—'}</td>
                <td className="px-6 py-4 text-center space-x-2">
                  <button
                    className="text-primary hover:underline disabled:opacity-50" title="Saisir une note"
                    disabled={!selectedMatiere}
                    onClick={() => startSaisiePour(etudiant.id)}
                  >
                    <Edit2 className="w-4 h-4 inline" />
                  </button>
                  <button
                    className="text-primary hover:underline" title="Consulter toutes les notes"
                    onClick={() => setConsultationEtudiant(etudiant)}
                  >
                    <Eye className="w-4 h-4 inline" />
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    className="text-primary text-sm hover:underline disabled:opacity-50"
                    disabled={!anneeActive?.id || !selectedTrimestre}
                    onClick={() => handleGenererBulletin(etudiant.id)}
                  >
                    Générer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {consultationEtudiant && (
        <Dialog open onOpenChange={(open) => !open && setConsultationEtudiant(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Notes — {consultationEtudiant.prenom} {consultationEtudiant.nom}
                {' — '}{mesMatieres.find((m) => m.id === selectedMatiere)?.intitule}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {[1, 2, 3].map((numero) => {
                const trimestre = (trimestres ?? []).find((t) => t.numero === numero)
                const notesDuTrimestre = (notes ?? []).filter(
                  (n) => n.etudiant === consultationEtudiant.id && n.matiere === selectedMatiere
                    && n.trimestre === trimestre?.id
                )
                const moyenneTrimestre = notesDuTrimestre.length
                  ? (notesDuTrimestre.reduce((sum, n) => sum + Number(n.valeur), 0) / notesDuTrimestre.length).toFixed(2)
                  : null
                return (
                  <div key={numero}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-sm">Trimestre {numero}</h3>
                      {moyenneTrimestre && (
                        <span className="text-sm font-bold text-primary">Moyenne : {moyenneTrimestre} / 20</span>
                      )}
                    </div>
                    {notesDuTrimestre.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune note saisie.</p>
                    ) : (
                      <div className="space-y-1">
                        {notesDuTrimestre.map((n) => (
                          <div key={n.id} className="flex justify-between text-sm bg-muted rounded-lg px-3 py-2">
                            <span>{n.type_evaluation}</span>
                            <span className="font-mono">{n.valeur} / 20</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              <Button
                className="w-full"
                onClick={() => { startSaisiePour(consultationEtudiant.id); setConsultationEtudiant(null) }}
              >
                Saisir une nouvelle note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============ ATTENDANCE & ABSENCE ============
const STATUT_PRESENCE = { P: 'Présent', A: 'Absent', R: 'En retard', E: 'Absence justifiée' }

function AttendanceAbsence() {
  const { user } = useAuth()
  const [selectedMatiere, setSelectedMatiere] = useState(null)
  const [filtreClasse, setFiltreClasse] = useState('')
  const [selectedEdt, setSelectedEdt] = useState('')
  const [attendanceForm, setAttendanceForm] = useState(false)
  const [dateCours, setDateCours] = useState(() => new Date().toISOString().slice(0, 10))
  const [entrees, setEntrees] = useState({})
  const [selection, setSelection] = useState({})

  const { data: matieres } = useResourceList('matieres', matiereService)
  const { data: classes } = useResourceList('classes', classeService)
  const { data: emploiDuTemps } = useResourceList('emplois-du-temps', emploiDuTempsService)
  const { data: etudiants } = useResourceList('etudiants', etudiantService)
  const { data: presences, refetch } = useResourceList('presences', presenceService)

  const mesMatieres = matieres?.filter((m) => m.enseignant === user?.id) ?? []
  const creneauxDeLaMatiere = (emploiDuTemps ?? []).filter((s) => s.matiere === selectedMatiere)
  const creneauSelectionne = creneauxDeLaMatiere.find((s) => String(s.id) === selectedEdt)

  useEffect(() => {
    if (!selectedMatiere && mesMatieres.length) setSelectedMatiere(mesMatieres[0].id)
  }, [mesMatieres, selectedMatiere])

  useEffect(() => {
    setSelectedEdt('')
  }, [selectedMatiere])

  useEffect(() => {
    if (creneauSelectionne) setFiltreClasse(creneauSelectionne.classe_nom)
  }, [creneauSelectionne])

  const etudiantsFiltres = (etudiants ?? []).filter((s) => !filtreClasse || s.classe_actuelle === filtreClasse)

  const presencesDuJour = (presences ?? []).filter(
    (p) => p.matiere === selectedMatiere && p.date_cours === dateCours
  )
  const compteurs = presencesDuJour.reduce((acc, p) => ({ ...acc, [p.statut]: (acc[p.statut] ?? 0) + 1 }), {})
  const total = presencesDuJour.length

  const handleOpenForm = () => {
    const initial = {}
    for (const s of etudiantsFiltres) initial[s.id] = 'P'
    for (const p of presencesDuJour) initial[p.etudiant] = p.statut
    setEntrees(initial)
    setSelection({})
    setAttendanceForm(true)
  }

  const toutSelectionne = etudiantsFiltres.length > 0 && etudiantsFiltres.every((s) => selection[s.id])
  const toggleToutSelectionner = () => {
    const nouvelEtat = !toutSelectionne
    const maj = {}
    for (const s of etudiantsFiltres) maj[s.id] = nouvelEtat
    setSelection(maj)
  }

  const marquerSelection = (statut) => {
    const idsSelectionnes = Object.entries(selection).filter(([, coche]) => coche).map(([id]) => id)
    if (idsSelectionnes.length === 0) {
      toast.error('Sélectionnez au moins un élève.')
      return
    }
    setEntrees((prev) => {
      const maj = { ...prev }
      for (const id of idsSelectionnes) maj[id] = statut
      return maj
    })
  }

  const handleSubmit = async () => {
    try {
      await enregistrerAppel({
        matiere: selectedMatiere,
        date_cours: dateCours,
        heure_debut: creneauSelectionne?.heure_debut ?? '08:00',
        heure_fin: creneauSelectionne?.heure_fin ?? '10:00',
        entrees: Object.entries(entrees).map(([etudiant, statut]) => ({ etudiant: Number(etudiant), statut })),
      })
      toast.success('Appel enregistré.')
      setAttendanceForm(false)
      refetch()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? JSON.stringify(data) : "Erreur lors de l'enregistrement de l'appel.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Présence & Absences</h1>
          <p className="text-muted-foreground mt-1">Enregistrement et suivi des présences</p>
        </div>
        <button
          onClick={handleOpenForm}
          disabled={!selectedMatiere}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Appel du jour
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={selectedMatiere ?? ''}
          onChange={(e) => setSelectedMatiere(Number(e.target.value))}
          className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {mesMatieres.length === 0 && <option value="">Aucune matière assignée</option>}
          {mesMatieres.map((m) => <option key={m.id} value={m.id}>{m.intitule}</option>)}
        </select>
        <select
          value={filtreClasse}
          onChange={(e) => setFiltreClasse(e.target.value)}
          className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Toutes mes classes</option>
          {(classes ?? []).map((c) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
        </select>
        <select
          value={selectedEdt}
          onChange={(e) => setSelectedEdt(e.target.value)}
          className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Choisir un créneau (facultatif)</option>
          {creneauxDeLaMatiere.map((s) => (
            <option key={s.id} value={s.id}>
              {JOUR_LABELS[s.jour]} {s.heure_debut}–{s.heure_fin} ({s.classe_nom})
            </option>
          ))}
        </select>
        <input
          type="date" value={dateCours} onChange={(e) => setDateCours(e.target.value)}
          className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {attendanceForm && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold mb-4">Appel du {new Date(dateCours).toLocaleDateString('fr-FR')}</h2>

          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={toutSelectionne} onChange={toggleToutSelectionner} className="w-4 h-4 rounded" />
              Tout sélectionner
            </label>
            <div className="flex gap-2">
              <button
                type="button" onClick={() => marquerSelection('P')}
                className="px-3 py-1.5 bg-green-500/20 text-green-700 rounded-lg text-sm font-medium hover:bg-green-500/30"
              >
                Présent
              </button>
              <button
                type="button" onClick={() => marquerSelection('A')}
                className="px-3 py-1.5 bg-red-500/20 text-red-700 rounded-lg text-sm font-medium hover:bg-red-500/30"
              >
                Absent
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {etudiantsFiltres.map(s => (
              <div key={s.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <input
                  type="checkbox" checked={Boolean(selection[s.id])}
                  onChange={(e) => setSelection((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="flex-1 font-medium">{s.prenom} {s.nom}</span>
                <select
                  value={entrees[s.id] ?? 'P'}
                  onChange={(e) => setEntrees((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  className="px-3 py-1 rounded bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(STATUT_PRESENCE).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleSubmit} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">Valider l'appel</button>
            <button type="button" onClick={() => setAttendanceForm(false)} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Présences</p>
          <p className="text-3xl font-bold mt-2 text-green-600">{compteurs.P ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">{total ? `${((compteurs.P ?? 0) / total * 100).toFixed(1)}%` : '—'}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Absences</p>
          <p className="text-3xl font-bold mt-2 text-destructive">{compteurs.A ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">{total ? `${((compteurs.A ?? 0) / total * 100).toFixed(1)}%` : '—'}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Retards</p>
          <p className="text-3xl font-bold mt-2 text-orange-600">{compteurs.R ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Pour ce cours</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Vie scolaire</h2>
        <DisciplinePanel />
      </div>
    </div>
  )
}

// ============ COMMUNICATION ============
function Communication() {
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
            {tab === 'messagerie' && 'Messagerie interne'}
          </button>
        ))}
      </div>

      {activeSubTab === 'notifications' && <AnnoncesPanel />}
      {activeSubTab === 'messagerie' && <MessageriePanel />}
    </div>
  )
}

// ============ STUDENT HISTORY ============
function StudentHistory() {
  const [selectedStudent, setSelectedStudent] = useState(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historique Académique</h1>
        <p className="text-muted-foreground mt-1">Consultation de l'historique de vos étudiants</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-4">Sélectionner un élève</h2>
        <select
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">-- Sélectionner un élève --</option>
          <option value="1">Jean Dupont (2nde C)</option>
          <option value="2">Marie Jean (2nde C)</option>
          <option value="3">Paul Rakoto (1ère S)</option>
        </select>
      </div>

      {selectedStudent && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-bold mb-4">Profil d'élève</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-semibold">Jean Dupont</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classe actuelle</p>
                <p className="font-semibold">2nde C</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date d'inscription</p>
                <p className="font-semibold">01/09/2024</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-bold mb-4">Historique académique</h2>
            <div className="space-y-3">
              {[
                { year: '2023-2024', class: '3ème', avg: 11.5, status: 'Admis' },
                { year: '2024-2025', class: '2nde C', avg: 12.8, status: 'En cours' }
              ].map((record, i) => (
                <div key={i} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{record.year} - Classe: {record.class}</p>
                      <p className="text-sm text-muted-foreground">Moyenne générale: {record.avg}/20</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      record.status === 'Admis' ? 'bg-green-500/20 text-green-600' : 'bg-blue-500/20 text-blue-600'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ TEACHER REPORTS ============
function TeacherReports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rapports & Statistiques</h1>
        <p className="text-muted-foreground mt-1">Analyses par classe et par matière</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Moyennes par classe', description: 'Comparaison des performances académiques' },
          { title: 'Taux d\'assiduité', description: 'Suivi des présences et absences' },
          { title: 'Progression académique', description: 'Évolution des notes sur l\'année' },
          { title: 'Rapport mensuel', description: 'Récapitulatif des activités du mois' }
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
              <option>Classe</option>
              <option>2nde C</option>
              <option>1ère S</option>
              <option>Terminale C</option>
            </select>
            <select className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Période</option>
              <option>Mois</option>
              <option>Trimestre</option>
              <option>Année</option>
            </select>
            <button type="button" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">Générer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ TEACHER SETTINGS ============
function TeacherSettings() {
  const { user, setUser } = useAuth()
  const { data: matieres } = useResourceList('matieres', matiereService)
  const [form, setForm] = useState({
    first_name: user?.first_name ?? '', last_name: user?.last_name ?? '',
    email: user?.email ?? '', telephone: user?.telephone ?? '',
  })
  const [saving, setSaving] = useState(false)

  const mesMatieres = matieres?.filter((m) => m.enseignant === user?.id) ?? []

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await authService.updateProfile(form)
      setUser(updated)
      toast.success('Profil mis à jour.')
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Erreur lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gestion de votre profil et préférences</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-6">Informations personnelles</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Prénom</label>
              <input name="first_name" value={form.first_name} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nom</label>
              <input name="last_name" value={form.last_name} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Téléphone</label>
              <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="+261 XX XX XX XX" className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={saving} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold mb-6">Matières que vous enseignez</h2>
        {mesMatieres.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune matière ne vous est assignée pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mesMatieres.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.couleur }} />
                <div>
                  <p className="font-semibold">{m.intitule}</p>
                  <p className="text-xs text-muted-foreground">Coefficient {m.coefficient}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MonDossierRH />
    </div>
  )
}

const TYPE_CONTRAT_LABELS = { CDI: 'CDI', CDD: 'CDD', VACATAIRE: 'Vacataire', STAGIAIRE: 'Stagiaire' }

function MonDossierRH() {
  const { data: dossiers } = useResourceList('dossiers-enseignants', dossierEnseignantService)
  const dossier = dossiers?.[0]

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-bold mb-6">Mon dossier RH</h2>
      {!dossier ? (
        <p className="text-sm text-muted-foreground">Aucun dossier RH renseigné par l'administration.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p>Type de contrat: <span className="font-semibold">{TYPE_CONTRAT_LABELS[dossier.type_contrat] ?? '—'}</span></p>
          <p>Date d'embauche: <span className="font-semibold">{dossier.date_embauche ?? '—'}</span></p>
          <p>Volume horaire: <span className="font-semibold">{dossier.volume_horaire_hebdo ? `${dossier.volume_horaire_hebdo} h/semaine` : '—'}</span></p>
          <p>Salaire: <span className="font-semibold">{dossier.salaire ? `${Number(dossier.salaire).toLocaleString()} Ar` : '—'}</span></p>
          <p className="md:col-span-2">Diplômes: <span className="font-semibold">{dossier.diplomes ?? '—'}</span></p>
        </div>
      )}
    </div>
  )
}

export default TeacherDashboard
