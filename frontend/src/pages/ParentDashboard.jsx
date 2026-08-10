import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut, FileText, Calendar, TrendingUp, AlertCircle, DollarSign, MessageSquare } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useAnneeActive } from '@/hooks/useAnneeActive'
import { useResourceList } from '@/hooks/useResource'
import {
  bulletinService, etudiantService, fetchDossierFinancier, fetchMoyenneTrimestre,
  presenceService, telechargerBulletinPdf, trimestreService,
} from '@/services'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/NotificationBell'
import { AnnoncesPanel } from '@/components/communication/AnnoncesPanel'
import { MessageriePanel } from '@/components/communication/MessageriePanel'
import { CahierTextePanel } from '@/components/pedagogie/CahierTextePanel'

/** L'API /etudiants/ est déjà scopée côté backend aux seuls enfants de ce parent. */
function useMesEnfants() {
  const { data } = useResourceList('etudiants', etudiantService)
  return data ?? []
}

function useTrimestreActif() {
  const { data: trimestres } = useResourceList('trimestres', trimestreService)
  return trimestres?.find((t) => t.est_actif) ?? trimestres?.[0] ?? null
}

function useDossier(etudiantId, anneeScolaireId) {
  return useQuery({
    queryKey: ['dossier-financier', etudiantId, anneeScolaireId],
    queryFn: () => fetchDossierFinancier(etudiantId, anneeScolaireId),
    enabled: Boolean(etudiantId && anneeScolaireId),
  }).data
}

function useMoyenne(etudiantId, trimestreId) {
  return useQuery({
    queryKey: ['moyenne', etudiantId, trimestreId],
    queryFn: () => fetchMoyenneTrimestre(etudiantId, trimestreId),
    enabled: Boolean(etudiantId && trimestreId),
  }).data
}

function ParentDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')
  const { user, logout } = useAuth()
  const enfants = useMesEnfants()

  const handleLogout = () => {
    logout()
    navigate('/login/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">SIG-Lycée</h1>
            <p className="text-sm text-gray-600">Espace Parent</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md overflow-y-auto hidden md:block">
          <nav className="p-6 space-y-2">
            {[
              { id: 'home', label: 'Accueil', icon: FileText },
              { id: 'enfants', label: 'Mes Enfants', icon: TrendingUp },
              { id: 'bulletins', label: 'Bulletins', icon: FileText },
              { id: 'cahier', label: 'Cahier de textes', icon: FileText },
              { id: 'absences', label: 'Absences', icon: Calendar },
              { id: 'paiements', label: 'Paiements', icon: DollarSign },
              { id: 'communication', label: 'Communication', icon: MessageSquare }
            ].map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Parent Info */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-8 shadow-lg">
              <h2 className="text-3xl font-bold mb-2">Bienvenue, {user ? `${user.first_name} ${user.last_name}` : ''}</h2>
              <p className="text-blue-100">{user?.email}</p>
            </div>

            {enfants.length === 0 && (
              <p className="text-sm text-gray-500">Aucun enfant n'est encore lié à votre compte.</p>
            )}

            {activeTab === 'home' && <HomeTab enfants={enfants} />}
            {activeTab === 'enfants' && <ChildrenTab enfants={enfants} />}
            {activeTab === 'bulletins' && <BulletinsTab enfants={enfants} />}
            {activeTab === 'cahier' && <CahierTextePanel />}
            {activeTab === 'absences' && <AbsencesTab enfants={enfants} />}
            {activeTab === 'paiements' && <PaymentsTab enfants={enfants} />}
            {activeTab === 'communication' && <CommunicationTab />}
          </div>
        </main>
      </div>
    </div>
  )
}

function ComingSoon({ message }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  )
}

function EnfantMoyenne({ etudiantId }) {
  const trimestreActif = useTrimestreActif()
  const moyenne = useMoyenne(etudiantId, trimestreActif?.id)
  return <>{moyenne != null ? `${moyenne}/20` : '—'}</>
}

function HomeTab({ enfants }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {enfants.map((enfant) => (
          <div key={enfant.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{enfant.prenom} {enfant.nom}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Classe: <span className="font-semibold text-gray-900">{enfant.classe_actuelle ?? '—'}</span></p>
              <p>Matricule: <span className="font-mono text-gray-900">{enfant.matricule}</span></p>
              <p>Moyenne générale: <span className="font-bold text-blue-600"><EnfantMoyenne etudiantId={enfant.id} /></span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChildrenTab({ enfants }) {
  return (
    <div className="space-y-6">
      {enfants.map((enfant) => (
        <div key={enfant.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{enfant.prenom} {enfant.nom}</h3>
              <p className="text-sm text-gray-600">Matricule: {enfant.matricule}</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {enfant.classe_actuelle ?? '—'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Moyenne</p>
              <p className="text-2xl font-bold text-blue-600"><EnfantMoyenne etudiantId={enfant.id} /></p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Statut</p>
              <p className="text-2xl font-bold text-gray-700">{enfant.statut}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BulletinsTab({ enfants }) {
  /** L'API /bulletins/ est déjà scopée aux enfants de ce parent. */
  const { data: bulletins } = useResourceList('bulletins', bulletinService)

  return (
    <div className="space-y-6">
      {enfants.map((enfant) => {
        const siens = (bulletins ?? []).filter((b) => b.etudiant === enfant.id)
        return (
          <div key={enfant.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{enfant.prenom} {enfant.nom} - Bulletins</h3>
            {siens.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun bulletin généré pour l'instant.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {siens.map((b) => (
                  <div key={b.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {b.trimestre_numero ? `Trimestre ${b.trimestre_numero}` : 'Annuel'}
                      </h4>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => telechargerBulletinPdf(b.id, `bulletin_${b.id}.pdf`)}>
                        Voir
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Moyenne: <span className="font-bold text-gray-900">{b.moyenne_generale ?? '—'}/20</span></p>
                      <p>Rang: <span className="font-bold text-gray-900">{b.rang ?? '—'}/{b.effectif_classe ?? '—'}</span></p>
                      <p>{b.est_valide ? 'Validé' : 'En attente de validation'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const STATUT_PRESENCE_LABELS = { P: 'Présent', A: 'Absent', R: 'En retard', E: 'Absence justifiée' }

function AbsencesTab({ enfants }) {
  /** L'API /presences/ est déjà scopée aux enfants de ce parent ; on la filtre par enfant côté client. */
  const { data: presences } = useResourceList('presences', presenceService)

  return (
    <div className="space-y-6">
      {enfants.map((enfant) => {
        const siennes = (presences ?? []).filter((p) => p.etudiant === enfant.id && p.statut !== 'P')
        return (
          <div key={enfant.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{enfant.prenom} {enfant.nom} - Absences</h3>
            {siennes.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune absence ou retard enregistré.</p>
            ) : (
              <div className="space-y-3">
                {siennes.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">{p.date_cours} — {p.matiere_intitule}</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      p.statut === 'E' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {STATUT_PRESENCE_LABELS[p.statut]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const STATUT_LABELS = {
  PAYE: 'Payé', PARTIEL: 'Partiel', IMPAYE: 'Impayé', NON_CONFIGURE: 'Non configuré',
}
const STATUT_COLORS = {
  PAYE: 'bg-green-100 text-green-800', PARTIEL: 'bg-orange-100 text-orange-800',
  IMPAYE: 'bg-red-100 text-red-800', NON_CONFIGURE: 'bg-gray-100 text-gray-600',
}

function PaymentsTab({ enfants }) {
  const anneeActive = useAnneeActive()

  return (
    <div className="space-y-6">
      {enfants.map((enfant) => (
        <ChildDossierCard key={enfant.id} enfant={enfant} anneeScolaireId={anneeActive?.id} />
      ))}
    </div>
  )
}

function CommunicationTab() {
  const [subTab, setSubTab] = useState('annonces')

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'annonces', label: 'Annonces' },
          { id: 'messagerie', label: 'Messagerie' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {subTab === 'annonces' && <AnnoncesPanel />}
      {subTab === 'messagerie' && <MessageriePanel />}
    </div>
  )
}

function ChildDossierCard({ enfant, anneeScolaireId }) {
  const dossier = useDossier(enfant.id, anneeScolaireId)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{enfant.prenom} {enfant.nom}</h3>
      {!dossier ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total dû</p>
            <p className="text-xl font-bold text-blue-600">{Number(dossier.total_du).toLocaleString()} Ar</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Reste à payer</p>
            <p className="text-xl font-bold text-orange-600">{Number(dossier.reste_du).toLocaleString()} Ar</p>
          </div>
          <div className={`rounded-lg p-4 ${STATUT_COLORS[dossier.statut]}`}>
            <p className="text-sm opacity-80">Statut</p>
            <p className="text-xl font-bold">{STATUT_LABELS[dossier.statut]}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ParentDashboard
