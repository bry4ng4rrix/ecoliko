import { useRef, useState } from 'react'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useDeleteResource, useResourceList } from '@/hooks/useResource'
import { documentDevoirService } from '@/services'
import { Button } from '@/components/ui/button'

/** Import de plusieurs documents (énoncé, corrigé, ressources...) pour un devoir donné, en

 * plus de son unique pièce jointe. Sélection multiple en un seul clic (`<input multiple>`),
 * chaque fichier envoyé comme un `DocumentDevoir` séparé.
 */
export function DocumentsDevoirSection({ cahierTexteId }) {
  const [importEnCours, setImportEnCours] = useState(false)
  const inputRef = useRef(null)

  const { data: documents } = useResourceList(
    'documents-devoirs', documentDevoirService, { params: { cahier_texte: cahierTexteId } }
  )
  const importerDocument = useCreateResource('documents-devoirs', documentDevoirService)
  const supprimerDocument = useDeleteResource('documents-devoirs', documentDevoirService)

  const handleImport = async (e) => {
    const fichiers = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (fichiers.length === 0) return

    setImportEnCours(true)
    let reussis = 0
    for (const fichier of fichiers) {
      try {
        const payload = new FormData()
        payload.append('cahier_texte', cahierTexteId)
        payload.append('fichier', fichier)
        await importerDocument.mutateAsync(payload)
        reussis += 1
      } catch (err) {
        const data = err.response?.data
        toast.error(`${fichier.name} : ${data ? Object.values(data).flat().join(' ') : "erreur lors de l'import"}`)
      }
    }
    setImportEnCours(false)
    if (reussis > 0) {
      toast.success(`${reussis} document${reussis > 1 ? 's' : ''} importé${reussis > 1 ? 's' : ''}.`)
    }
  }

  const handleDelete = async (id) => {
    try {
      await supprimerDocument.mutateAsync(id)
      toast.success('Document supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground">Documents importés</p>
        <input ref={inputRef} type="file" multiple onChange={handleImport} className="hidden" />
        <Button
          type="button" size="sm" variant="outline" className="gap-2 h-7 px-2 text-xs"
          onClick={() => inputRef.current?.click()} disabled={importEnCours}
        >
          {importEnCours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {importEnCours ? 'Import...' : 'Importer des documents'}
        </Button>
      </div>
      {(documents ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun document importé pour ce devoir.</p>
      ) : (
        <ul className="space-y-1">
          {(documents ?? []).map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 text-xs bg-muted rounded-lg px-2 py-1.5">
              <a
                href={doc.fichier} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline truncate"
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{doc.nom}</span>
              </a>
              <button onClick={() => handleDelete(doc.id)} className="flex-shrink-0 hover:opacity-70">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
