import { useResourceList } from "./useResource"
import { anneeScolaireService } from "@/services"

export function useAnneeActive() {
  const { data: annees } = useResourceList("annees-scolaires", anneeScolaireService)
  return annees?.find((a) => a.est_active) ?? annees?.[0] ?? null
}
