import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAnneeActive } from "@/hooks/useAnneeActive";
import { telechargerFactureEcolage } from "@/services";
import { Button } from "@/components/ui/button";

const MOIS_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export default function CarteEcolageCalendar() {
  const anneeActive = useAnneeActive();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendrier-impayes", anneeActive?.id],
    queryFn: async () => {
      if (!anneeActive) return [];
      const { data } = await apiClient.get("/paiements/calendrier-impayes/", {
        params: { annee_scolaire: anneeActive.id },
      });
      return data;
    },
    enabled: Boolean(anneeActive?.id),
  });

  const rows = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const id = ev.etudiant_id;
      if (!map.has(id))
        map.set(id, {
          etudiant_id: id,
          nom: ev.etudiant_nom,
          matricule: ev.matricule,
          mois: {},
        });
      map.get(id).mois[ev.mois] = ev;
    }
    return Array.from(map.values());
  }, [events]);

  if (isLoading) return <div>Chargement du calendrier...</div>;

  return (
    <div className="overflow-auto">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-64 text-left p-2">Élève</th>
            {MOIS_LABELS.map((m, i) => (
              <th key={m} className="text-center p-2">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={13}
                className="text-center p-4 text-muted-foreground"
              >
                Aucun mois impayé trouvé.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.etudiant_id} className="border-t">
              <td className="p-2 font-medium">
                {r.nom}{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {r.matricule}
                </span>
              </td>
              {Array.from({ length: 12 }, (_, idx) => {
                const mois = idx + 1;
                const ev = r.mois[mois];
                return (
                  <td key={mois} className="p-1 text-center align-top">
                    {ev ? (
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">
                          {Number(ev.montant).toLocaleString("fr-FR")} Ar
                        </div>
                        <Button
                          size="xs"
                          onClick={() =>
                            telechargerFactureEcolage(
                              r.etudiant_id,
                              { anneeScolaireId: ev.annee_scolaire, mois },
                              `facture_${r.matricule}_${mois}.pdf`,
                            )
                          }
                        >
                          Facture
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
