import { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useDeleteResource, useResourceList, useUpdateResource } from '@/hooks/useResource'
import { classeService, etudiantService, salleService, staffService } from '@/services'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'

const EMPTY_FORM = {
  nom: '', capacite_max: 40, titulaire: '', salle: '', delegue: '',
  frais_ecolage_mensuel: '', frais_inscription: '', frais_reinscription: '',
}

export function ClassesPanel() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: classes, isLoading } = useResourceList('classes', classeService)
  const { data: salles } = useResourceList('salles', salleService)
  const { data: personnel } = useResourceList('personnel', staffService)
  const { data: etudiants } = useResourceList('etudiants', etudiantService)
  const createClasse = useCreateResource('classes', classeService)
  const updateClasse = useUpdateResource('classes', classeService)
  const deleteClasse = useDeleteResource('classes', classeService)

  const enseignants = (personnel ?? []).filter((p) => p.role === 'ENSEIGNANT')

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const startEdit = (cls) => {
    setEditing(cls.id)
    setForm({
      nom: cls.nom,
      capacite_max: cls.capacite_max, titulaire: cls.titulaire ? String(cls.titulaire) : '',
      salle: cls.salle ? String(cls.salle) : '', delegue: cls.delegue ? String(cls.delegue) : '',
      frais_ecolage_mensuel: cls.frais_ecolage_mensuel ?? '', frais_inscription: cls.frais_inscription ?? '',
      frais_reinscription: cls.frais_reinscription ?? '',
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      nom: form.nom,
      capacite_max: Number(form.capacite_max),
      titulaire: form.titulaire ? Number(form.titulaire) : null,
      salle: form.salle ? Number(form.salle) : null,
      delegue: form.delegue ? Number(form.delegue) : null,
      frais_ecolage_mensuel: form.frais_ecolage_mensuel !== '' ? Number(form.frais_ecolage_mensuel) : null,
      frais_inscription: form.frais_inscription !== '' ? Number(form.frais_inscription) : null,
      frais_reinscription: form.frais_reinscription !== '' ? Number(form.frais_reinscription) : null,
    }
    try {
      if (editing) {
        await updateClasse.mutateAsync({ id: editing, payload })
        toast.success('Classe mise à jour.')
      } else {
        await createClasse.mutateAsync(payload)
        toast.success('Classe créée.')
      }
      resetForm()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteClasse.mutateAsync(id)
      toast.success('Classe supprimée.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvelle classe
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="nom" value={form.nom} onChange={handleChange} placeholder="Nom (ex: 2nde C)" required
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              name="capacite_max" type="number" min="1" value={form.capacite_max} onChange={handleChange}
              placeholder="Capacité max"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              name="titulaire" value={form.titulaire} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sans prof principal</option>
              {enseignants.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <select
              name="salle" value={form.salle} onChange={handleChange}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sans salle assignée</option>
              {(salles ?? []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          <input
            name="frais_ecolage_mensuel" type="number" min="0" step="0.01" value={form.frais_ecolage_mensuel}
            onChange={handleChange} placeholder="Écolage mensuel (Ar/mois, ex: 100000)"
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="frais_inscription" type="number" min="0" step="0.01" value={form.frais_inscription}
              onChange={handleChange} placeholder="Droit d'inscription — nouvel élève (Ar)"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              name="frais_reinscription" type="number" min="0" step="0.01" value={form.frais_reinscription}
              onChange={handleChange} placeholder="Droit de réinscription — élève déjà inscrit (Ar)"
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Les deux champs sont facultatifs et indépendants : renseignez celui qui s'applique (inscription pour un
            nouvel élève, réinscription pour un élève déjà scolarisé l'année précédente).
          </p>
          {editing && (
            <select
              name="delegue" value={form.delegue} onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sans délégué de classe</option>
              {(etudiants ?? []).filter((e) => e.classe_actuelle === form.nom).map((e) => (
                <option key={e.id} value={e.id}>{e.prenom} {e.nom} (délégué)</option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createClasse.isPending || updateClasse.isPending}>
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!isLoading && (classes ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune classe pour l'année scolaire active.</p>
        )}
        {(classes ?? []).map((cls) => (
          <div key={cls.id} className="bg-card rounded-lg border border-border p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">{cls.nom}{cls.section ? ` — ${cls.section}` : ''}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {cls.effectif} / {cls.capacite_max} élèves
                </span>
                <button onClick={() => startEdit(cls)} className="p-1.5 hover:bg-muted rounded">
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(cls.id)} className="p-1.5 hover:bg-muted rounded">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5">
                Prof principal:
                {cls.titulaire_nom && <UserAvatar photo={cls.titulaire_photo} name={cls.titulaire_nom} className="w-5 h-5" />}
                <span className="font-semibold text-foreground">{cls.titulaire_nom ?? 'À assigner'}</span>
              </p>
              <p>Salle: <span className="font-semibold text-foreground">{cls.salle_nom ?? 'Non assignée'}</span></p>
              <p>Délégué de classe: <span className="font-semibold text-foreground">{cls.delegue_nom ?? 'À désigner'}</span></p>
              {cls.frais_ecolage_mensuel && (
                <p>Écolage: <span className="font-semibold text-foreground">{Number(cls.frais_ecolage_mensuel).toLocaleString('fr-FR')} Ar/mois</span></p>
              )}
              {cls.frais_inscription && (
                <p>Droit d'inscription: <span className="font-semibold text-foreground">{Number(cls.frais_inscription).toLocaleString('fr-FR')} Ar</span></p>
              )}
              {cls.frais_reinscription && (
                <p>Droit de réinscription: <span className="font-semibold text-foreground">{Number(cls.frais_reinscription).toLocaleString('fr-FR')} Ar</span></p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
