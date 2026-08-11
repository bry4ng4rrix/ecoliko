import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, QrCode, Barcode, FileText, Upload, X, Edit2, CreditCard, Wallet, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'

import { useAnneeActive } from '@/hooks/useAnneeActive'
import {
  useCreateResource, useDeleteResource, useResourceList, useUpdateResource,
} from '@/hooks/useResource'
import {
  classeService, documentEtudiantService, etudiantService, fetchDossierFinancier, fetchEtudiantCodeBarreUrl,
  fetchEtudiantQrCodeUrl, fraisScolariteService, inscriptionService, paiementService, telechargerCarteEtudiant,
} from '@/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table'

const EMPTY_FORM = {
  matricule: '', prenom: '', nom: '', genre: 'H', date_naissance: '', lieu_naissance: '',
  nationalite: 'Malagasy', adresse: '', telephone: '', email: '', classe: '',
  situation_familiale: '', ancien_etablissement: '', dossier_medical: '',
  contact_urgence_nom: '', contact_urgence_telephone: '',
}

const TYPE_DOCUMENT_LABELS = {
  ACTE_NAISSANCE: 'Acte de naissance', CIN: "CIN de l'étudiant", CIN_PARENT: "CIN d'un parent/tuteur",
  CERTIFICAT_MEDICAL: 'Certificat médical', PHOTO_IDENTITE: "Photo d'identité",
  BULLETIN_ANTERIEUR: 'Bulletin établissement antérieur', AUTRE: 'Autre',
}

export function EtudiantsPanel() {
  const anneeActive = useAnneeActive()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [dossierEtudiant, setDossierEtudiant] = useState(null)
  const [financeEtudiant, setFinanceEtudiant] = useState(null)
  const [classeEtudiant, setClasseEtudiant] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [photo, setPhoto] = useState(null)
  const [filtreClasse, setFiltreClasse] = useState('')

  const { data: etudiants, isLoading } = useResourceList('etudiants', etudiantService)
  const { data: classes } = useResourceList('classes', classeService)
  const createEtudiant = useCreateResource('etudiants', etudiantService)
  const updateEtudiant = useUpdateResource('etudiants', etudiantService)
  const deleteEtudiant = useDeleteResource('etudiants', etudiantService)
  const createInscription = useCreateResource('inscriptions', inscriptionService)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setPhoto(null)
    setEditing(null)
    setDialogOpen(false)
  }

  const startEdit = (etudiant) => {
    setEditing(etudiant)
    setForm({
      matricule: etudiant.matricule, prenom: etudiant.prenom, nom: etudiant.nom,
      genre: etudiant.genre, date_naissance: etudiant.date_naissance, lieu_naissance: etudiant.lieu_naissance,
      nationalite: etudiant.nationalite ?? '', adresse: etudiant.adresse ?? '', telephone: etudiant.telephone ?? '',
      email: etudiant.email ?? '', classe: '',
      situation_familiale: etudiant.situation_familiale ?? '', ancien_etablissement: etudiant.ancien_etablissement ?? '',
      dossier_medical: etudiant.dossier_medical ?? '',
      contact_urgence_nom: etudiant.contact_urgence_nom ?? '', contact_urgence_telephone: etudiant.contact_urgence_telephone ?? '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { classe, matricule, ...profil } = form
      const payload = new FormData()
      Object.entries(profil).forEach(([key, value]) => {
        if (value !== '') payload.append(key, value)
      })
      if (!editing) payload.append('matricule', matricule)
      if (photo) payload.append('photo', photo)

      if (editing) {
        await updateEtudiant.mutateAsync({ id: editing.id, payload })
        toast.success('Étudiant mis à jour.')
      } else {
        const etudiant = await createEtudiant.mutateAsync(payload)

        if (classe && anneeActive) {
          await createInscription.mutateAsync({
            etudiant: etudiant.id, classe: Number(classe), annee_scolaire: anneeActive.id,
          })
        }

        toast.success(
          `Étudiant inscrit avec succès. Identifiant de connexion : ${etudiant.matricule} — mot de passe temporaire : 12345678`
        )
      }
      resetForm()
    } catch (err) {
      const data = err.response?.data
      const message = data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement."
      toast.error(message)
    }
  }

  const handleDelete = async (etudiant) => {
    if (!window.confirm(`Supprimer ${etudiant.prenom} ${etudiant.nom} ?`)) return
    try {
      await deleteEtudiant.mutateAsync(etudiant.id)
      toast.success('Étudiant supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  const etudiantColumns = useMemo(() => [
    { accessorKey: 'matricule', header: 'Matricule', cell: ({ row }) => <span className="font-mono">{row.original.matricule}</span> },
    {
      id: 'nom', header: 'Nom', accessorFn: (s) => `${s.prenom} ${s.nom}`,
      cell: ({ row }) => <span className="font-medium">{row.original.prenom} {row.original.nom}</span>,
    },
    { accessorKey: 'classe_actuelle', header: 'Classe', cell: ({ row }) => row.original.classe_actuelle ?? '—' },
    { accessorKey: 'statut', header: 'Statut', cell: ({ row }) => <Badge variant="secondary">{row.original.statut}</Badge> },
    {
      id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center space-x-2">
          <button className="text-primary hover:underline" onClick={() => setDossierEtudiant(row.original)} title="Dossier">
            <FileText className="w-4 h-4 inline" />
          </button>
          <button className="text-primary hover:underline" onClick={() => setFinanceEtudiant(row.original)} title="Paiements">
            <Wallet className="w-4 h-4 inline" />
          </button>
          <button className="text-primary hover:underline" onClick={() => setClasseEtudiant(row.original)} title="Changer de classe">
            <ArrowRightLeft className="w-4 h-4 inline" />
          </button>
          <button className="text-primary hover:underline" onClick={() => startEdit(row.original)} title="Modifier">
            <Edit2 className="w-4 h-4 inline" />
          </button>
          <button className="text-destructive hover:underline" onClick={() => handleDelete(row.original)} title="Supprimer">
            <Trash2 className="w-4 h-4 inline" />
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des étudiants</h1>
          <p className="text-muted-foreground mt-1">Inscription, modification et suivi des profils</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nouvel étudiant</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? `Modifier — ${editing.prenom} ${editing.nom}` : 'Inscription nouvel étudiant'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Identité</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    name="matricule" placeholder="Matricule" value={form.matricule} onChange={handleChange}
                    required disabled={Boolean(editing)} className={editing ? 'text-muted-foreground' : ''}
                  />
                  <Input name="prenom" placeholder="Prénom" value={form.prenom} onChange={handleChange} required />
                  <Input name="nom" placeholder="Nom" value={form.nom} onChange={handleChange} required />
                  <select
                    name="genre" value={form.genre} onChange={handleChange}
                    className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="H">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="A">Autre</option>
                  </select>
                  <Input name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange} required />
                  <Input name="lieu_naissance" placeholder="Lieu de naissance" value={form.lieu_naissance} onChange={handleChange} required />
                  <Input name="nationalite" placeholder="Nationalité" value={form.nationalite} onChange={handleChange} />
                  <div>
                    <label className="text-xs text-muted-foreground">Photo</label>
                    <input
                      type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                      className="w-full text-sm file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input name="adresse" placeholder="Adresse" value={form.adresse} onChange={handleChange} />
                  <Input name="telephone" placeholder="Téléphone" value={form.telephone} onChange={handleChange} />
                  <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} />
                  {!editing && (
                    <select
                      name="classe" value={form.classe} onChange={handleChange}
                      className="px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Choisir une classe (facultatif)</option>
                      {(classes ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}{c.filiere_intitule ? ` — ${c.filiere_intitule}` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Situation</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input name="situation_familiale" placeholder="Situation familiale" value={form.situation_familiale} onChange={handleChange} />
                  <Input name="ancien_etablissement" placeholder="Ancien établissement (facultatif)" value={form.ancien_etablissement} onChange={handleChange} />
                </div>
                <textarea
                  name="dossier_medical" placeholder="Dossier médical (allergies, traitements... facultatif)"
                  value={form.dossier_medical} onChange={handleChange} rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Personne à contacter en urgence</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input name="contact_urgence_nom" placeholder="Nom" value={form.contact_urgence_nom} onChange={handleChange} />
                  <Input name="contact_urgence_telephone" placeholder="Téléphone" value={form.contact_urgence_telephone} onChange={handleChange} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={createEtudiant.isPending || updateEtudiant.isPending}>
                  {editing ? 'Enregistrer' : 'Inscrire'}
                </Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={resetForm}>Annuler</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Filtrer par classe :</label>
        <select
          value={filtreClasse} onChange={(e) => setFiltreClasse(e.target.value)}
          className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Toutes les classes</option>
          {(classes ?? []).map((c) => (
            <option key={c.id} value={c.nom}>{c.nom}{c.filiere_intitule ? ` — ${c.filiere_intitule}` : ''}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={etudiantColumns}
        data={filtreClasse ? (etudiants ?? []).filter((e) => e.classe_actuelle === filtreClasse) : (etudiants ?? [])}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom, matricule, classe..."
        emptyMessage="Aucun étudiant."
      />

      {dossierEtudiant && (
        <DossierEtudiantDialog etudiant={dossierEtudiant} onClose={() => setDossierEtudiant(null)} />
      )}
      {financeEtudiant && (
        <PaiementsEtudiantDialog etudiant={financeEtudiant} onClose={() => setFinanceEtudiant(null)} />
      )}
      {classeEtudiant && (
        <ChangerClasseDialog etudiant={classeEtudiant} onClose={() => setClasseEtudiant(null)} />
      )}
    </div>
  )
}

function ChangerClasseDialog({ etudiant, onClose }) {
  const anneeActive = useAnneeActive()
  const queryClient = useQueryClient()
  const { data: classes } = useResourceList('classes', classeService)
  const { data: inscriptions, isLoading } = useResourceList('inscriptions', inscriptionService)
  const createInscription = useCreateResource('inscriptions', inscriptionService)
  const updateInscription = useUpdateResource('inscriptions', inscriptionService)

  const inscriptionActive = (inscriptions ?? []).find(
    (i) => i.etudiant === etudiant.id && i.annee_scolaire === anneeActive?.id
  )
  const [classeId, setClasseId] = useState('')

  useEffect(() => {
    if (inscriptionActive && !classeId) setClasseId(String(inscriptionActive.classe))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscriptionActive?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!classeId || !anneeActive) return
    try {
      if (inscriptionActive) {
        await updateInscription.mutateAsync({ id: inscriptionActive.id, payload: { classe: Number(classeId) } })
      } else {
        await createInscription.mutateAsync({
          etudiant: etudiant.id, classe: Number(classeId), annee_scolaire: anneeActive.id,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['etudiants'] })
      toast.success('Classe mise à jour.')
      onClose()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Erreur lors du changement de classe.')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer de classe — {etudiant.prenom} {etudiant.nom}</DialogTitle>
        </DialogHeader>

        {!anneeActive ? (
          <p className="text-sm text-muted-foreground">Aucune année scolaire active.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Classe actuelle : <span className="font-medium text-foreground">{etudiant.classe_actuelle ?? 'Aucune'}</span>
            </p>
            <select
              value={classeId} onChange={(e) => setClasseId(e.target.value)} required
              className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choisir une classe</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nom}{c.filiere_intitule ? ` — ${c.filiere_intitule}` : ''}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <Button
                type="submit" className="flex-1"
                disabled={createInscription.isPending || updateInscription.isPending}
              >
                Enregistrer
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const STATUT_PAIEMENT_VARIANT = {
  PAYE: 'default', EN_ATTENTE: 'secondary', EN_RETARD: 'destructive', ANNULE: 'secondary',
}

function PaiementsEtudiantDialog({ etudiant, onClose }) {
  const anneeActive = useAnneeActive()
  const queryClient = useQueryClient()
  const { data: paiements, isLoading: loadingPaiements } = useResourceList('paiements', paiementService)
  const { data: fraisScolarite } = useResourceList('frais-scolarite', fraisScolariteService)
  const { data: classes } = useResourceList('classes', classeService)
  const { data: inscriptions } = useResourceList('inscriptions', inscriptionService)
  const createPaiement = useCreateResource('paiements', paiementService)
  const updatePaiement = useUpdateResource('paiements', paiementService)

  const { data: dossier, isLoading: loadingDossier } = useQuery({
    queryKey: ['dossier-financier', etudiant.id, anneeActive?.id],
    queryFn: () => fetchDossierFinancier(etudiant.id, anneeActive.id),
    enabled: Boolean(anneeActive?.id),
  })

  const inscriptionActive = (inscriptions ?? []).find(
    (i) => i.etudiant === etudiant.id && i.annee_scolaire === anneeActive?.id
  )
  const classeActuelle = inscriptionActive ? (classes ?? []).find((c) => c.id === inscriptionActive.classe) : null
  const tarifNiveau = classeActuelle
    ? (fraisScolarite ?? []).find(
        (f) => f.annee_scolaire === anneeActive?.id && f.niveau === classeActuelle.niveau
          && (f.filiere ?? null) === (classeActuelle.filiere ?? null)
      )
    : null

  // Le tarif renseigné directement sur la classe prime sur celui par niveau/filière (voir
  // `services.finance.frais_attendus` côté backend — même logique de priorité ici).
  const montantInscription = classeActuelle?.frais_inscription ?? tarifNiveau?.montant_inscription ?? null
  const montantEcolageMensuel = classeActuelle?.frais_ecolage_mensuel
    ?? (tarifNiveau ? Number(tarifNiveau.montant_annuel) / 12 : null)

  const mesPaiements = (paiements ?? []).filter(
    (p) => p.etudiant === etudiant.id && p.annee_scolaire === anneeActive?.id
  )
  const totalPayeEcolage = mesPaiements
    .filter((p) => p.statut === 'PAYE')
    .reduce((somme, p) => somme + Number(p.montant), 0)
  const droitInscriptionPaye = montantInscription != null && totalPayeEcolage >= Number(montantInscription)

  const paiementsParMois = (mois) => mesPaiements.filter((p) => p.mois_couvert === mois)

  const dateEcheancePourMois = (mois) => {
    const anneeDebut = new Date(anneeActive.date_debut).getFullYear()
    const annee = mois >= 9 ? anneeDebut : anneeDebut + 1
    return `${annee}-${String(mois).padStart(2, '0')}-05`
  }

  const invaliderFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['paiements'] })
    queryClient.invalidateQueries({ queryKey: ['dossier-financier', etudiant.id, anneeActive?.id] })
  }

  const handleMarquerPaye = async (mois) => {
    const existant = paiementsParMois(mois)[0]
    try {
      if (existant) {
        await updatePaiement.mutateAsync({ id: existant.id, payload: { statut: 'PAYE' } })
      } else {
        await createPaiement.mutateAsync({
          etudiant: etudiant.id, annee_scolaire: anneeActive.id,
          montant: montantEcolageMensuel ?? 0, date_echeance: dateEcheancePourMois(mois),
          mois_couvert: mois, statut: 'PAYE',
        })
      }
      invaliderFinance()
      toast.success('Mois marqué comme payé.')
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Erreur lors de la mise à jour.')
    }
  }

  const handleMarquerNonPaye = async (mois) => {
    const existant = paiementsParMois(mois)[0]
    if (!existant) return
    try {
      await updatePaiement.mutateAsync({ id: existant.id, payload: { statut: 'EN_ATTENTE' } })
      invaliderFinance()
      toast.success('Mois marqué comme non payé.')
    } catch {
      toast.error('Erreur lors de la mise à jour.')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Paiements — {etudiant.prenom} {etudiant.nom}</DialogTitle>
        </DialogHeader>

        {!anneeActive ? (
          <p className="text-sm text-muted-foreground">Aucune année scolaire active.</p>
        ) : (
          <div className="space-y-6">
            {(loadingDossier || loadingPaiements) && <p className="text-sm text-muted-foreground">Chargement...</p>}

            {dossier && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total dû</p>
                  <p className="text-lg font-bold">{Number(dossier.total_du).toLocaleString('fr-FR')} Ar</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total payé</p>
                  <p className="text-lg font-bold text-green-600">{Number(dossier.total_paye).toLocaleString('fr-FR')} Ar</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Reste à payer</p>
                  <p className="text-lg font-bold text-red-600">{Number(dossier.reste_du).toLocaleString('fr-FR')} Ar</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <Badge variant={dossier.statut === 'PAYE' ? 'default' : 'secondary'} className="mt-1">
                    {dossier.statut}
                  </Badge>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm mb-2">Frais généraux</h3>
              {montantInscription == null && montantEcolageMensuel == null ? (
                <p className="text-sm text-muted-foreground">Aucun tarif configuré (ni sur la classe, ni par niveau) pour cette année.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px] bg-muted rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-sm">Droit d'inscription / réinscription</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {montantInscription != null ? `${Number(montantInscription).toLocaleString('fr-FR')} Ar` : '—'}
                      </span>
                      <Badge variant={droitInscriptionPaye ? 'default' : 'destructive'}>
                        {droitInscriptionPaye ? 'Payé' : 'Pas encore payé'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px] bg-muted rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-sm">Écolage mensuel</span>
                    <span className="text-sm font-mono">
                      {montantEcolageMensuel != null ? `${Number(montantEcolageMensuel).toLocaleString('fr-FR')} Ar/mois` : '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Cartes d'écolage — suivi mensuel</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Mois</th>
                      <th className="px-3 py-2 text-left">Montant</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                      <th className="px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MOIS_LABELS.map((label, i) => {
                      const mois = i + 1
                      const lignes = paiementsParMois(mois)
                      const dejaPaye = lignes.some((p) => p.statut === 'PAYE')
                      if (lignes.length === 0) {
                        return (
                          <tr key={mois}>
                            <td className="px-3 py-2">{label}</td>
                            <td className="px-3 py-2 text-muted-foreground" colSpan={2}>—</td>
                            <td className="px-3 py-2"><Badge variant="secondary">Non payé</Badge></td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button" onClick={() => handleMarquerPaye(mois)}
                                className="text-xs px-2 py-1 bg-green-500/20 text-green-700 rounded hover:bg-green-500/30 font-medium"
                              >
                                Marquer payé
                              </button>
                            </td>
                          </tr>
                        )
                      }
                      return lignes.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2">{label}</td>
                          <td className="px-3 py-2 font-mono">{Number(p.montant).toLocaleString('fr-FR')} Ar</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.date_paiement}</td>
                          <td className="px-3 py-2">
                            <Badge variant={STATUT_PAIEMENT_VARIANT[p.statut] ?? 'secondary'}>{p.statut}</Badge>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {dejaPaye ? (
                              <button
                                type="button" onClick={() => handleMarquerNonPaye(mois)}
                                className="text-xs px-2 py-1 bg-red-500/20 text-red-700 rounded hover:bg-red-500/30 font-medium"
                              >
                                Marquer non payé
                              </button>
                            ) : (
                              <button
                                type="button" onClick={() => handleMarquerPaye(mois)}
                                className="text-xs px-2 py-1 bg-green-500/20 text-green-700 rounded hover:bg-green-500/30 font-medium"
                              >
                                Marquer payé
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DossierEtudiantDialog({ etudiant, onClose }) {
  const [qrUrl, setQrUrl] = useState(null)
  const [barcodeUrl, setBarcodeUrl] = useState(null)
  const [typeDoc, setTypeDoc] = useState('ACTE_NAISSANCE')
  const [fichier, setFichier] = useState(null)

  const { data: inscriptions } = useResourceList('inscriptions', inscriptionService)
  const { data: documents, isLoading: loadingDocs } = useResourceList('documents-etudiants', documentEtudiantService)
  const createDocument = useCreateResource('documents-etudiants', documentEtudiantService)
  const deleteDocument = useDeleteResource('documents-etudiants', documentEtudiantService)

  const historique = (inscriptions ?? []).filter((i) => i.etudiant === etudiant.id)
  const mesDocuments = (documents ?? []).filter((d) => d.etudiant === etudiant.id)

  const voirQrCode = async () => setQrUrl(await fetchEtudiantQrCodeUrl(etudiant.id))
  const voirCodeBarre = async () => setBarcodeUrl(await fetchEtudiantCodeBarreUrl(etudiant.id))

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!fichier) return
    try {
      const payload = new FormData()
      payload.append('etudiant', etudiant.id)
      payload.append('type_document', typeDoc)
      payload.append('fichier', fichier)
      await createDocument.mutateAsync(payload)
      toast.success('Document ajouté.')
      setFichier(null)
    } catch {
      toast.error("Erreur lors de l'ajout du document.")
    }
  }

  const handleDeleteDocument = async (id) => {
    try {
      await deleteDocument.mutateAsync(id)
      toast.success('Document supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  const handleGenererCarte = async () => {
    try {
      await telechargerCarteEtudiant(etudiant.id, `carte_${etudiant.matricule}.pdf`)
    } catch {
      toast.error('Erreur lors de la génération de la carte.')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dossier — {etudiant.prenom} {etudiant.nom}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={voirQrCode}>
              <QrCode className="w-4 h-4" /> QR Code
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={voirCodeBarre}>
              <Barcode className="w-4 h-4" /> Code-barres
            </Button>
            <Button type="button" size="sm" className="gap-2" onClick={handleGenererCarte}>
              <CreditCard className="w-4 h-4" /> Générer la carte d'étudiant
            </Button>
          </div>
          {qrUrl && <img src={qrUrl} alt="QR code étudiant" className="w-32 h-32 border border-border rounded-lg" />}
          {barcodeUrl && <img src={barcodeUrl} alt="Code-barres étudiant" className="max-w-full border border-border rounded-lg" />}

          <div>
            <h3 className="font-semibold text-sm mb-2">Historique scolaire</h3>
            {historique.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune inscription enregistrée.</p>
            ) : (
              <div className="space-y-1">
                {historique.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm bg-muted rounded-lg px-3 py-2">
                    <span>{i.classe_nom}</span>
                    <span className="text-muted-foreground">{i.statut} — {i.date_inscription}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Documents</h3>
            <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-2 mb-3">
              <select
                value={typeDoc} onChange={(e) => setTypeDoc(e.target.value)}
                className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              >
                {Object.entries(TYPE_DOCUMENT_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
              <input
                type="file" accept="application/pdf,image/*" onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              <Button type="submit" size="sm" disabled={!fichier || createDocument.isPending} className="gap-2">
                <Upload className="w-4 h-4" /> Ajouter
              </Button>
            </form>
            {loadingDocs && <p className="text-sm text-muted-foreground">Chargement...</p>}
            {!loadingDocs && mesDocuments.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun document.</p>
            )}
            <div className="space-y-1">
              {mesDocuments.map((d) => (
                <div key={d.id} className="flex justify-between items-center text-sm bg-muted rounded-lg px-3 py-2">
                  <a href={d.fichier} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {TYPE_DOCUMENT_LABELS[d.type_document] ?? d.type_document}
                  </a>
                  <button onClick={() => handleDeleteDocument(d.id)} className="text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
