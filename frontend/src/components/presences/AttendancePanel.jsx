import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useResourceList } from '@/hooks/useResource'
import {
  classeService, emploiDuTempsService, enregistrerAppel, etudiantService, matiereService,
  presenceService, refuserJustification, validerJustification,
} from '@/services'
import { Button } from '@/components/ui/button'

const STATUT_PRESENCE = { P: 'Présent', A: 'Absent', R: 'En retard', E: 'Absence justifiée' }
const JOUR_LABELS = { LUN: 'Lundi', MAR: 'Mardi', MER: 'Mercredi', JEU: 'Jeudi', VEN: 'Vendredi', SAM: 'Samedi' }

function PrendreAppel() {
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

  const creneauxDeLaMatiere = (emploiDuTemps ?? []).filter((s) => s.matiere === selectedMatiere)
  const creneauSelectionne = creneauxDeLaMatiere.find((s) => String(s.id) === selectedEdt)

  useEffect(() => {
    if (!selectedMatiere && matieres?.length) setSelectedMatiere(matieres[0].id)
  }, [matieres, selectedMatiere])

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
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-bold">Prendre l'appel</h2>
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
          {(matieres ?? []).length === 0 && <option value="">Aucune matière</option>}
          {(matieres ?? []).map((m) => <option key={m.id} value={m.id}>{m.intitule}</option>)}
        </select>
        <select
          value={filtreClasse}
          onChange={(e) => setFiltreClasse(e.target.value)}
          className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Toutes les classes</option>
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
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-bold mb-4">Appel du {new Date(dateCours).toLocaleDateString('fr-FR')}</h3>

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
    </div>
  )
}

export function AttendancePanel() {
  const { data: presences, isLoading, refetch } = useResourceList('presences', presenceService)
  const total = presences?.length ?? 0
  const compteurs = (presences ?? []).reduce((acc, p) => ({ ...acc, [p.statut]: (acc[p.statut] ?? 0) + 1 }), {})
  const tauxPresence = total ? ((compteurs.P ?? 0) / total * 100).toFixed(1) : null
  const nonJustifiees = (presences ?? []).filter((p) => p.statut === 'A' && !p.justificatif)
  const enAttente = (presences ?? []).filter((p) => p.justification_statut === 'EN_ATTENTE')

  const handleValider = async (id) => {
    try {
      await validerJustification(id)
      toast.success('Justificatif accepté.')
      refetch()
    } catch {
      toast.error('Erreur lors de la validation.')
    }
  }

  const handleRefuser = async (id) => {
    try {
      await refuserJustification(id)
      toast.success('Justificatif refusé.')
      refetch()
    } catch {
      toast.error('Erreur lors du refus.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Taux présence général</p>
          <p className="text-3xl font-bold mt-2">{isLoading ? '…' : (tauxPresence != null ? `${tauxPresence}%` : '—')}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Absences enregistrées</p>
          <p className="text-3xl font-bold mt-2">{isLoading ? '…' : compteurs.A ?? 0}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Non justifiées</p>
          <p className="text-3xl font-bold mt-2 text-orange-600">{isLoading ? '…' : nonJustifiees.length}</p>
        </div>
      </div>

      <PrendreAppel />

      {enAttente.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold mb-4">Justificatifs en attente</h2>
          <div className="space-y-3">
            {enAttente.map((item) => (
              <div key={item.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{item.etudiant_nom}</p>
                  <p className="text-sm text-muted-foreground">{item.date_cours} - {item.matiere_intitule}</p>
                  <p className="text-sm mt-1">{item.justificatif}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleValider(item.id)}>Accepter</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleRefuser(item.id)}>Refuser</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Absences non justifiées</h2>
        {!isLoading && nonJustifiees.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune absence non justifiée.</p>
        )}
        <div className="space-y-3">
          {nonJustifiees.map((item) => (
            <div key={item.id} className="border border-border rounded-lg p-4">
              <p className="font-semibold">{item.etudiant_nom}</p>
              <p className="text-sm text-muted-foreground">{item.date_cours} - {item.matiere_intitule}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
