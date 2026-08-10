import { toast } from 'sonner'

import { useResourceList } from '@/hooks/useResource'
import { demandeDocumentService, refuserDemandeDocument, validerDemandeDocument } from '@/services'

const TYPE_DOCUMENT_LABELS = {
  CERTIFICAT_SCOLARITE: 'Certificat de scolarité',
  ATTESTATION: 'Attestation de fréquentation',
  CERTIFICAT_REUSSITE: 'Certificat de réussite',
}

export function DocumentsValidationPanel() {
  const { data: demandes } = useResourceList('demandes-documents', demandeDocumentService)
  const enAttente = (demandes ?? []).filter((d) => d.statut === 'EN_ATTENTE')

  const handleValider = async (id) => {
    try {
      await validerDemandeDocument(id)
      toast.success('Document validé.')
    } catch {
      toast.error('Erreur lors de la validation.')
    }
  }

  const handleRefuser = async (id) => {
    const motif = window.prompt('Motif du refus :') ?? ''
    try {
      await refuserDemandeDocument(id, motif)
      toast.success('Demande refusée.')
    } catch {
      toast.error('Erreur lors du refus.')
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-xl font-bold mb-4">Demandes de documents en attente</h2>
      {enAttente.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
      ) : (
        <div className="space-y-3">
          {enAttente.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">{d.etudiant_nom}</p>
                <p className="text-sm text-muted-foreground">{TYPE_DOCUMENT_LABELS[d.type_document]}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleValider(d.id)} className="px-3 py-1 bg-green-500/20 text-green-600 rounded text-sm font-medium hover:bg-green-500/30">Valider</button>
                <button onClick={() => handleRefuser(d.id)} className="px-3 py-1 bg-red-500/20 text-red-600 rounded text-sm font-medium hover:bg-red-500/30">Rejeter</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
