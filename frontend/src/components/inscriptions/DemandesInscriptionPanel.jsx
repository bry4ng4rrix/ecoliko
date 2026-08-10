import { useMemo, useState } from 'react'
import { FileText, Check, X, Upload, Trash2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import { useResourceList } from '@/hooks/useResource'
import { useQueryClient } from '@tanstack/react-query'
import {
  demandeInscriptionService, mettreAJourSuiviInscription, pieceJointeInscriptionService,
  rejeterDemandeInscription, validerDemandeInscription,
} from '@/services'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const ROLE_LABELS = { ETUDIANT: 'Étudiant', PARENT: 'Parent / Tuteur' }

const DOCUMENT_TYPES = [
  { value: 'ACTE_NAISSANCE', label: 'Acte de naissance' },
  { value: 'CIN_PARENT', label: "CIN d'un parent/tuteur" },
  { value: 'CERTIFICAT_MEDICAL', label: 'Certificat médical' },
  { value: 'PHOTO_IDENTITE', label: "Photo d'identité" },
  { value: 'BULLETIN_ANTERIEUR', label: 'Bulletins établissement antérieur' },
  { value: 'AUTRE', label: 'Autre document' },
]

export function DemandesInscriptionPanel() {
  const [dossier, setDossier] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const queryClient = useQueryClient()

  const { data: demandes, isLoading } = useResourceList('demandes-inscription', demandeInscriptionService)

  const invalider = () => queryClient.invalidateQueries({ queryKey: ['demandes-inscription'] })

  const handleValider = async (id) => {
    setBusyId(id)
    try {
      await validerDemandeInscription(id)
      toast.success('Compte activé — la personne peut maintenant se connecter.')
      invalider()
      setDossier(null)
    } catch {
      toast.error("Erreur lors de la validation.")
    } finally {
      setBusyId(null)
    }
  }

  const handleRejeter = async (id) => {
    if (!window.confirm('Rejeter et supprimer définitivement cette demande ?')) return
    setBusyId(id)
    try {
      await rejeterDemandeInscription(id)
      toast.success('Demande rejetée.')
      invalider()
      setDossier(null)
    } catch {
      toast.error('Erreur lors du rejet.')
    } finally {
      setBusyId(null)
    }
  }

  const handleUploadPiece = async (typeDocument, file) => {
    if (!file || !dossier) return
    try {
      const formData = new FormData()
      formData.append('demandeur', dossier.id)
      formData.append('type_document', typeDocument)
      formData.append('fichier', file)
      const cree = await pieceJointeInscriptionService.create(formData)
      setDossier((prev) => ({ ...prev, pieces_jointes: [cree, ...prev.pieces_jointes] }))
      invalider()
      toast.success('Document ajouté.')
    } catch {
      toast.error("Erreur lors de l'ajout du document.")
    }
  }

  const handleDeletePiece = async (pieceId) => {
    try {
      await pieceJointeInscriptionService.remove(pieceId)
      setDossier((prev) => ({ ...prev, pieces_jointes: prev.pieces_jointes.filter((p) => p.id !== pieceId) }))
      invalider()
      toast.success('Document supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  const handleTogglePaiement = async () => {
    if (!dossier) return
    try {
      const updated = await mettreAJourSuiviInscription(dossier.id, {
        frais_inscription_paye: !dossier.suivi.frais_inscription_paye,
      })
      setDossier(updated)
      invalider()
      toast.success('Statut de paiement mis à jour.')
    } catch {
      toast.error('Erreur lors de la mise à jour du paiement.')
    }
  }

  const columns = useMemo(() => [
    {
      id: 'nom', header: 'Nom', accessorFn: (d) => `${d.first_name} ${d.last_name}`,
      cell: ({ row }) => <span className="font-medium">{row.original.first_name} {row.original.last_name}</span>,
    },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role', header: 'Rôle',
      cell: ({ row }) => <Badge variant="secondary">{ROLE_LABELS[row.original.role] ?? row.original.role}</Badge>,
    },
    {
      accessorKey: 'date_creation', header: 'Date de la demande',
      cell: ({ row }) => new Date(row.original.date_creation).toLocaleDateString('fr-FR'),
    },
    {
      id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center gap-1">
          <button onClick={() => setDossier(row.original)} className="p-1.5 hover:bg-muted rounded" title="Consulter le dossier">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => handleValider(row.original.id)} disabled={busyId === row.original.id}
            className="p-1.5 hover:bg-muted rounded" title="Valider"
          >
            <Check className="w-4 h-4 text-green-600" />
          </button>
          <button
            onClick={() => handleRejeter(row.original.id)} disabled={busyId === row.original.id}
            className="p-1.5 hover:bg-muted rounded" title="Rejeter"
          >
            <X className="w-4 h-4 text-destructive" />
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [busyId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Demandes d'inscription</h1>
        <p className="text-muted-foreground mt-1">
          Comptes auto-inscrits (étudiant/parent) en attente d'activation
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <DataTable
          columns={columns}
          data={demandes ?? []}
          isLoading={isLoading}
          searchPlaceholder="Rechercher par nom, email..."
          emptyMessage="Aucune demande d'inscription en attente."
        />
      </div>

      <Dialog open={Boolean(dossier)} onOpenChange={(open) => !open && setDossier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dossier de la demande</DialogTitle>
          </DialogHeader>
          {dossier && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nom complet</p>
                  <p className="font-medium">{dossier.first_name} {dossier.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rôle demandé</p>
                  <p className="font-medium">{ROLE_LABELS[dossier.role] ?? dossier.role}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{dossier.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{dossier.telephone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Genre</p>
                  <p className="font-medium">{dossier.genre || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date de naissance</p>
                  <p className="font-medium">{dossier.date_naissance || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lieu de naissance</p>
                  <p className="font-medium">{dossier.lieu_naissance || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Demande soumise le</p>
                  <p className="font-medium">{new Date(dossier.date_creation).toLocaleString('fr-FR')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Adresse</p>
                  <p className="font-medium">{dossier.adresse || '—'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span>Frais d'inscription :</span>
                  <Badge variant={dossier.suivi.frais_inscription_paye ? 'default' : 'secondary'}>
                    {dossier.suivi.frais_inscription_paye ? 'Payés' : 'Pas encore payés'}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={handleTogglePaiement}>
                  Marquer comme {dossier.suivi.frais_inscription_paye ? 'non payés' : 'payés'}
                </Button>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-sm font-semibold">Documents nécessaires</p>
                {DOCUMENT_TYPES.map((type) => {
                  const pieces = dossier.pieces_jointes.filter((p) => p.type_document === type.value)
                  return (
                    <div key={type.value} className="flex items-start justify-between gap-3 text-sm py-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {pieces.length > 0 ? (
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span>{type.label}</span>
                        </div>
                        {pieces.length > 0 && (
                          <ul className="ml-6 mt-1 space-y-1">
                            {pieces.map((p) => (
                              <li key={p.id} className="flex items-center gap-2 text-xs">
                                <a href={p.fichier} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                  Voir le fichier
                                </a>
                                <span className="text-muted-foreground">
                                  ({new Date(p.date_ajout).toLocaleDateString('fr-FR')})
                                </span>
                                <button onClick={() => handleDeletePiece(p.id)} title="Supprimer">
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <label className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer flex-shrink-0">
                        <Upload className="w-3.5 h-3.5" /> Ajouter
                        <input
                          type="file" className="hidden"
                          onChange={(e) => handleUploadPiece(type.value, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <Button className="flex-1 gap-2" disabled={busyId === dossier.id} onClick={() => handleValider(dossier.id)}>
                  <Check className="w-4 h-4" /> Valider
                </Button>
                <Button
                  variant="destructive" className="flex-1 gap-2" disabled={busyId === dossier.id}
                  onClick={() => handleRejeter(dossier.id)}
                >
                  <X className="w-4 h-4" /> Rejeter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
