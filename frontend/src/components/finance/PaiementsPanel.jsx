import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";

import { useAnneeActive } from "@/hooks/useAnneeActive";
import { useCreateResource, useResourceList } from "@/hooks/useResource";
import {
  classeService,
  etudiantService,
  fetchSyntheseFinanciere,
  paiementService,
} from "@/services";
import CarteEcolageCalendar from "./CarteEcolageCalendar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

const STATUT_LABELS = {
  PAYE: "Payé",
  PARTIEL: "Partiel",
  EN_ATTENTE: "En attente",
  ANNULE: "Annulé",
  EN_RETARD: "En retard",
};
const STATUT_COLORS = {
  PAYE: "bg-green-500/20 text-green-600",
  PARTIEL: "bg-orange-500/20 text-orange-600",
  EN_ATTENTE: "bg-gray-500/20 text-gray-600",
  ANNULE: "bg-gray-400/20 text-gray-500",
  EN_RETARD: "bg-red-500/20 text-red-600",
};

// Vocabulaire distinct de celui de `PaiementEcolage.statut` ci-dessus : c'est celui du dossier
// financier agrégé par élève (`services.finance.dossier_financier`), utilisé par "Élèves avec
// dettes".
const STATUT_DOSSIER_LABELS = {
  PAYE: "Payé",
  PARTIEL: "Partiel",
  IMPAYE: "Impayé",
  NON_CONFIGURE: "Non configuré",
};
const STATUT_DOSSIER_COLORS = {
  PAYE: "bg-green-500/20 text-green-600",
  PARTIEL: "bg-orange-500/20 text-orange-600",
  IMPAYE: "bg-red-500/20 text-red-600",
  NON_CONFIGURE: "bg-gray-500/20 text-gray-600",
};

const EMPTY_FORM = {
  etudiant: "",
  montant: "",
  date_paiement: "",
  date_echeance: "",
  mois_couvert: "",
  statut: "PAYE",
  mode_paiement: "Espèces",
  reference: "",
  commentaire: "",
};

export function PaiementsPanel() {
  const anneeActive = useAnneeActive();
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState("liste");
  const [form, setForm] = useState(EMPTY_FORM);
  const [filtreClasse, setFiltreClasse] = useState("");

  const { data: synthese, isLoading: loadingSynthese } = useQuery({
    queryKey: ["synthese-financiere", anneeActive?.id],
    queryFn: () => fetchSyntheseFinanciere(anneeActive.id),
    enabled: Boolean(anneeActive?.id),
  });
  const { data: etudiants } = useResourceList("etudiants", etudiantService);
  const { data: classes } = useResourceList("classes", classeService);
  const { data: paiements, isLoading: loadingPaiements } = useResourceList(
    "paiements",
    paiementService,
  );
  const createPaiement = useCreateResource("paiements", paiementService);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!anneeActive) {
      toast.error("Aucune année scolaire active.");
      return;
    }
    try {
      await createPaiement.mutateAsync({
        etudiant: Number(form.etudiant),
        annee_scolaire: anneeActive.id,
        montant: form.montant,
        date_paiement: form.date_paiement || undefined,
        date_echeance: form.date_echeance,
        mois_couvert: Number(form.mois_couvert),
        statut: form.statut,
        mode_paiement: form.mode_paiement,
        reference: form.reference,
        commentaire: form.commentaire,
      });
      toast.success("Paiement enregistré.");
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      const data = err.response?.data;
      toast.error(
        data
          ? Object.values(data).flat().join(" ")
          : "Erreur lors de l'enregistrement.",
      );
    }
  };

  const etudiantParId = useMemo(() => {
    const map = new Map();
    for (const e of etudiants ?? []) map.set(e.id, e);
    return map;
  }, [etudiants]);

  const lignesEnrichies = useMemo(() => {
    const tries = [...(paiements ?? [])].sort((a, b) =>
      b.date_paiement.localeCompare(a.date_paiement),
    );
    return tries.map((p) => {
      const etu = etudiantParId.get(p.etudiant);
      return {
        ...p,
        matricule: etu?.matricule ?? "",
        classe_actuelle: etu?.classe_actuelle ?? "",
        nom_complet: etu ? `${etu.prenom} ${etu.nom}` : p.etudiant_nom,
      };
    });
  }, [paiements, etudiantParId]);

  const lignesFiltrees = filtreClasse
    ? lignesEnrichies.filter((l) => l.classe_actuelle === filtreClasse)
    : lignesEnrichies;

  const columns = useMemo(
    () => [
      { accessorKey: "nom_complet", header: "Élève" },
      {
        accessorKey: "matricule",
        header: "Matricule",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.matricule || "—"}
          </span>
        ),
      },
      {
        accessorKey: "classe_actuelle",
        header: "Classe",
        cell: ({ row }) => row.original.classe_actuelle || "—",
      },
      {
        accessorKey: "montant",
        header: "Montant",
        cell: ({ row }) =>
          `${Number(row.original.montant).toLocaleString("fr-FR")} Ar`,
      },
      { accessorKey: "date_paiement", header: "Date" },
      { accessorKey: "mode_paiement", header: "Mode" },
      {
        accessorKey: "statut",
        header: "Statut",
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${STATUT_COLORS[row.original.statut]}`}
          >
            {STATUT_LABELS[row.original.statut]}
          </span>
        ),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [],
  );

  const colonnesDettes = useMemo(
    () => [
      { accessorKey: "nom_complet", header: "Élève" },
      {
        accessorKey: "total_du",
        header: "Total dû",
        cell: ({ row }) =>
          `${Number(row.original.total_du).toLocaleString("fr-FR")} Ar`,
      },
      {
        accessorKey: "total_paye",
        header: "Total payé",
        cell: ({ row }) => (
          <span className="text-green-600">
            {Number(row.original.total_paye).toLocaleString("fr-FR")} Ar
          </span>
        ),
      },
      {
        accessorKey: "reste_du",
        header: "Reste à payer",
        cell: ({ row }) => (
          <span className="font-bold text-destructive">
            {Number(row.original.reste_du).toLocaleString("fr-FR")} Ar
          </span>
        ),
      },
      {
        accessorKey: "statut",
        header: "Statut",
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${STATUT_DOSSIER_COLORS[row.original.statut] ?? STATUT_DOSSIER_COLORS.NON_CONFIGURE}`}
          >
            {STATUT_DOSSIER_LABELS[row.original.statut] ?? row.original.statut}
          </span>
        ),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Revenus collectés</p>
              <p className="text-3xl font-bold mt-2">
                {loadingSynthese
                  ? "…"
                  : `${Number(synthese?.total_paye ?? 0).toLocaleString()} Ar`}
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Dettes totales</p>
              <p className="text-3xl font-bold mt-2 text-destructive">
                {loadingSynthese
                  ? "…"
                  : `${Number(synthese?.reste_du ?? 0).toLocaleString()} Ar`}
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Taux recouvrement</p>
              <p className="text-3xl font-bold mt-2">
                {loadingSynthese || synthese?.taux_recouvrement == null
                  ? "—"
                  : `${Number(synthese.taux_recouvrement).toFixed(1)}%`}
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Élèves avec dettes</h2>
        </div>
        <DataTable
          columns={colonnesDettes}
          data={synthese?.etudiants_endettes ?? []}
          isLoading={loadingSynthese}
          searchPlaceholder="Rechercher un élève..."
          emptyMessage="Aucune dette en cours."
        />
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Paiements</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtreClasse}
              onChange={(e) => setFiltreClasse(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Toutes les classes</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.nom}>
                  {c.nom}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("liste")}
                className={`px-3 py-1 rounded ${viewMode === "liste" ? "bg-primary text-white" : "bg-background border"}`}
              >
                Liste
              </button>
              <button
                onClick={() => setViewMode("calendrier")}
                className={`px-3 py-1 rounded ${viewMode === "calendrier" ? "bg-primary text-white" : "bg-background border"}`}
              >
                Calendrier
              </button>
            </div>
            {!showForm && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4" /> Enregistrer un paiement
              </Button>
            )}
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-muted rounded-lg p-4 space-y-3 mb-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                name="etudiant"
                value={form.etudiant}
                onChange={handleChange}
                required
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Choisir un élève</option>
                {(etudiants ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.prenom} {e.nom}
                  </option>
                ))}
              </select>
              <input
                name="montant"
                type="number"
                step="0.01"
                min="0"
                value={form.montant}
                onChange={handleChange}
                placeholder="Montant"
                required
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                name="mois_couvert"
                type="number"
                min="1"
                max="12"
                value={form.mois_couvert}
                onChange={handleChange}
                placeholder="Mois couvert (1-12)"
                required
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  Date de paiement
                </label>
                <input
                  name="date_paiement"
                  type="date"
                  value={form.date_paiement}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Date d'échéance
                </label>
                <input
                  name="date_echeance"
                  type="date"
                  value={form.date_echeance}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                name="statut"
                value={form.statut}
                onChange={handleChange}
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary self-end"
              >
                {Object.entries(STATUT_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                name="mode_paiement"
                value={form.mode_paiement}
                onChange={handleChange}
                placeholder="Mode de paiement"
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                name="reference"
                value={form.reference}
                onChange={handleChange}
                placeholder="Référence (optionnel)"
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                name="commentaire"
                value={form.commentaire}
                onChange={handleChange}
                placeholder="Commentaire (optionnel)"
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={createPaiement.isPending}
              >
                Enregistrer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}

        {viewMode === "liste" && (
          <DataTable
            columns={columns}
            data={lignesFiltrees}
            isLoading={loadingPaiements}
            searchPlaceholder="Rechercher par nom, matricule..."
            emptyMessage="Aucun paiement enregistré."
          />
        )}
        {viewMode === "calendrier" && <CarteEcolageCalendar />}
      </div>
    </div>
  );
}
