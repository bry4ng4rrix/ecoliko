import { useMemo, useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateResource, useDeleteResource, useResourceList, useUpdateResource } from '@/hooks/useResource'
import { classeService, matiereService, staffService } from '@/services'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'

const ROLE_LABELS = {
  ADMIN: 'Administrateur', RESPONSABLE: 'Responsable pédagogique',
  ENSEIGNANT: 'Enseignant', SECRETARIAT: 'Bureau administratif',
}

const MOT_DE_PASSE_TEMPORAIRE = '12345678'

const emptyForm = (role) => ({
  first_name: '', last_name: '', email: '', matricule: '', role, telephone: '',
})

/**
 * `roleFilter` restreint la liste et le formulaire à un seul rôle (ex: page dédiée
 * "Gestion des profs") ; omis, affiche tout le personnel avec choix du rôle à la création.
 *
 * Pour un enseignant, le formulaire propose en plus d'assigner les matières qu'il enseigne,
 * les classes où il intervient et la classe dont il est titulaire — ces liens sont portés par
 * `Matiere.enseignant`, `Classe.enseignants` et `Classe.titulaire`, pas par le compte lui-même,
 * donc appliqués via des PATCH séparés juste après la création/modification du compte.
 */
export function PersonnelPanel({ roleFilter, title }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm(roleFilter ?? 'ENSEIGNANT'))
  const [matieresChoisies, setMatieresChoisies] = useState([])
  const [classesChoisies, setClassesChoisies] = useState([])
  const [classeTitulaire, setClasseTitulaire] = useState('')

  const { data: personnel, isLoading } = useResourceList('personnel', staffService)
  const creeUnEnseignant = roleFilter === 'ENSEIGNANT' || (!roleFilter && form.role === 'ENSEIGNANT')
  const { data: matieres } = useResourceList('matieres', matiereService, { enabled: creeUnEnseignant })
  const { data: classes } = useResourceList('classes', classeService, { enabled: creeUnEnseignant })
  const createStaff = useCreateResource('personnel', staffService)
  const updateStaff = useUpdateResource('personnel', staffService)
  const deleteStaff = useDeleteResource('personnel', staffService)
  const updateMatiere = useUpdateResource('matieres', matiereService)
  const updateClasse = useUpdateResource('classes', classeService)

  const liste = roleFilter ? (personnel ?? []).filter((p) => p.role === roleFilter) : (personnel ?? [])

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const toggleMatiere = (id) => setMatieresChoisies((prev) => (
    prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
  ))

  const toggleClasse = (id) => setClassesChoisies((prev) => (
    prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
  ))

  const matieresDe = (enseignantId) => (matieres ?? []).filter((m) => m.enseignant === enseignantId)
  const classeDe = (enseignantId) => (classes ?? []).find((c) => c.titulaire === enseignantId)
  const classesEnseigneesDe = (enseignantId) => (classes ?? []).filter((c) => (c.enseignants ?? []).includes(enseignantId))

  const resetForm = () => {
    setForm(emptyForm(roleFilter ?? 'ENSEIGNANT'))
    setMatieresChoisies([])
    setClassesChoisies([])
    setClasseTitulaire('')
    setEditing(null)
    setShowForm(false)
  }

  const startEdit = (p) => {
    setEditing(p)
    setForm({
      first_name: p.first_name, last_name: p.last_name, email: p.email,
      matricule: p.matricule ?? '', role: p.role, telephone: p.telephone ?? '',
    })
    setMatieresChoisies(matieresDe(p.id).map((m) => m.id))
    setClassesChoisies(classesEnseigneesDe(p.id).map((c) => c.id))
    setClasseTitulaire(classeDe(p.id)?.id ? String(classeDe(p.id).id) : '')
    setShowForm(true)
  }

  const appliquerAffectationsEnseignant = async (enseignantId) => {
    const matieresAvant = matieresDe(enseignantId).map((m) => m.id)
    const matieresAAjouter = matieresChoisies.filter((id) => !matieresAvant.includes(id))
    const matieresARetirer = matieresAvant.filter((id) => !matieresChoisies.includes(id))

    const classesAvant = classesEnseigneesDe(enseignantId).map((c) => c.id)
    const classesAAjouter = classesChoisies.filter((id) => !classesAvant.includes(id))
    const classesARetirer = classesAvant.filter((id) => !classesChoisies.includes(id))

    await Promise.all([
      ...matieresAAjouter.map((id) => updateMatiere.mutateAsync({ id, payload: { enseignant: enseignantId } })),
      ...matieresARetirer.map((id) => updateMatiere.mutateAsync({ id, payload: { enseignant: null } })),
      ...classesAAjouter.map((id) => {
        const classeActuelle = (classes ?? []).find((c) => c.id === id)
        const enseignantsActuels = classeActuelle?.enseignants ?? []
        return updateClasse.mutateAsync({
          id, payload: { enseignants: [...new Set([...enseignantsActuels, enseignantId])] },
        })
      }),
      ...classesARetirer.map((id) => {
        const classeActuelle = (classes ?? []).find((c) => c.id === id)
        const enseignantsActuels = classeActuelle?.enseignants ?? []
        return updateClasse.mutateAsync({
          id, payload: { enseignants: enseignantsActuels.filter((eid) => eid !== enseignantId) },
        })
      }),
    ])

    const titulaireAvantId = classeDe(enseignantId)?.id ? String(classeDe(enseignantId).id) : ''
    if (titulaireAvantId !== classeTitulaire) {
      if (titulaireAvantId) {
        await updateClasse.mutateAsync({ id: Number(titulaireAvantId), payload: { titulaire: null } })
      }
      if (classeTitulaire) {
        await updateClasse.mutateAsync({ id: Number(classeTitulaire), payload: { titulaire: enseignantId } })
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { matricule, ...editable } = form
        const enseignant = await updateStaff.mutateAsync({ id: editing.id, payload: editable })
        if (creeUnEnseignant) await appliquerAffectationsEnseignant(enseignant.id)
        toast.success('Compte mis à jour.')
      } else {
        const enseignant = await createStaff.mutateAsync(form)
        if (creeUnEnseignant) {
          await Promise.all(matieresChoisies.map(
            (matiereId) => updateMatiere.mutateAsync({ id: matiereId, payload: { enseignant: enseignant.id } })
          ))
          await Promise.all(classesChoisies.map((classeId) => {
            const classeActuelle = (classes ?? []).find((c) => c.id === classeId)
            const enseignantsActuels = classeActuelle?.enseignants ?? []
            return updateClasse.mutateAsync({
              id: classeId,
              payload: { enseignants: [...new Set([...enseignantsActuels, enseignant.id])] },
            })
          }))
          if (classeTitulaire) {
            await updateClasse.mutateAsync({ id: Number(classeTitulaire), payload: { titulaire: enseignant.id } })
          }
        }
        const identifiant = enseignant.matricule || enseignant.email
        toast.success(`Compte créé. Identifiant : ${identifiant} — mot de passe temporaire : ${MOT_DE_PASSE_TEMPORAIRE}`)
      }
      resetForm()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : "Erreur lors de l'enregistrement du compte.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteStaff.mutateAsync(id)
      toast.success('Compte supprimé.')
    } catch {
      toast.error('Erreur lors de la suppression.')
    }
  }

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'nom', header: 'Nom', accessorFn: (p) => `${p.first_name} ${p.last_name}`,
        cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`,
      },
    ]
    if (!roleFilter) {
      cols.push({
        id: 'role', header: 'Rôle', accessorFn: (p) => ROLE_LABELS[p.role] ?? p.role,
        cell: ({ row }) => (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            {ROLE_LABELS[row.original.role] ?? row.original.role}
          </span>
        ),
      })
    }
    cols.push({ accessorKey: 'email', header: 'Email' })
    cols.push({
      accessorKey: 'matricule', header: 'Matricule',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.matricule || '—'}</span>,
    })
    if (roleFilter === 'ENSEIGNANT') {
      cols.push({
        id: 'affectations', header: 'Matières / Classe', enableSorting: false,
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="text-xs text-muted-foreground">
              {matieresDe(p.id).map((m) => m.intitule).join(', ') || '—'}
              {classesEnseigneesDe(p.id).length > 0 && (
                <span className="block">Classes : {classesEnseigneesDe(p.id).map((c) => c.nom).join(', ')}</span>
              )}
              {classeDe(p.id) && <span className="block">Titulaire : {classeDe(p.id).nom}</span>}
            </div>
          )
        },
      })
    }
    cols.push({
      id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center gap-1">
          <button onClick={() => startEdit(row.original)} className="p-1.5 hover:bg-muted rounded">
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => handleDelete(row.original.id)} className="p-1.5 hover:bg-muted rounded">
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      ),
    })
    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, matieres, classes])

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{title ?? 'Gestion des utilisateurs'}</h2>
        {!showForm && (
          <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nouveau compte
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted rounded-lg p-4 space-y-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="first_name" value={form.first_name} onChange={handleChange} placeholder="Prénom" required
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              name="last_name" value={form.last_name} onChange={handleChange} placeholder="Nom" required
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" required
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              name="matricule" value={form.matricule} onChange={handleChange}
              placeholder="Matricule (identifiant de connexion)" disabled={Boolean(editing)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:text-muted-foreground disabled:opacity-70"
            />
          </div>
          {!editing && (
            <p className="text-xs text-muted-foreground">
              Mot de passe temporaire attribué automatiquement : <span className="font-mono">{MOT_DE_PASSE_TEMPORAIRE}</span> — à changer à la première connexion.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(roleFilter || editing) ? (
              <input
                disabled value={ROLE_LABELS[editing ? editing.role : roleFilter]}
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-muted-foreground"
              />
            ) : (
              <select
                name="role" value={form.role} onChange={handleChange}
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(ROLE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            )}
            <input
              name="telephone" value={form.telephone} onChange={handleChange} placeholder="Téléphone (optionnel)"
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {creeUnEnseignant && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 pt-2">Matières enseignées</p>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-background border border-border rounded-lg p-2">
                  {(matieres ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground px-1">Aucune matière créée.</p>
                  )}
                  {(matieres ?? []).map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm px-1 py-1 rounded hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox" checked={matieresChoisies.includes(m.id)} onChange={() => toggleMatiere(m.id)}
                      />
                      <span>{m.intitule}</span>
                      {m.enseignant_nom && <span className="text-xs text-muted-foreground">(actuel : {m.enseignant_nom})</span>}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 pt-2">Classes qu'il peut enseigner</p>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-background border border-border rounded-lg p-2">
                  {(classes ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground px-1">Aucune classe créée.</p>
                  )}
                  {(classes ?? []).map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm px-1 py-1 rounded hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox" checked={classesChoisies.includes(c.id)} onChange={() => toggleClasse(c.id)}
                      />
                      <span>{c.nom}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 pt-2">Classe dont il est titulaire</p>
                <select
                  value={classeTitulaire} onChange={(e) => setClasseTitulaire(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Aucune</option>
                  {(classes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}{c.titulaire_nom ? ` (actuel : ${c.titulaire_nom})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createStaff.isPending || updateStaff.isPending}>
              {editing ? 'Enregistrer' : 'Créer le compte'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={liste}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par nom, email, matricule..."
        emptyMessage="Aucun compte."
      />
    </div>
  )
}
