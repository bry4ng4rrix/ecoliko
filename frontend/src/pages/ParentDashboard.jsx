import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Receipt,
  AlertCircle,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useAnneeActive } from "@/hooks/useAnneeActive";
import { useResourceList } from "@/hooks/useResource";
import {
  bulletinService,
  etudiantService,
  fetchDossierFinancier,
  fetchMoyenneTrimestre,
  presenceService,
  paiementService,
  classeService,
  inscriptionService,
  fraisScolariteService,
  anneeScolaireService,
  telechargerBulletinPdf,
  telechargerCarteEcolage,
  telechargerFactureEcolage,
  trimestreService,
} from "@/services";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnoncesPanel } from "@/components/communication/AnnoncesPanel";
import { MessageriePanel } from "@/components/communication/MessageriePanel";
import { CahierTextePanel } from "@/components/pedagogie/CahierTextePanel";

/** L'API /etudiants/ est déjà scopée côté backend aux seuls enfants de ce parent. */
function useMesEnfants() {
  const { data } = useResourceList("etudiants", etudiantService);
  return data ?? [];
}

function useTrimestreActif() {
  const { data: trimestres } = useResourceList("trimestres", trimestreService);
  return trimestres?.find((t) => t.est_actif) ?? trimestres?.[0] ?? null;
}

function useDossier(etudiantId, anneeScolaireId) {
  return useQuery({
    queryKey: ["dossier-financier", etudiantId, anneeScolaireId],
    queryFn: () => fetchDossierFinancier(etudiantId, anneeScolaireId),
    enabled: Boolean(etudiantId && anneeScolaireId),
  }).data;
}

function useMoyenne(etudiantId, trimestreId) {
  return useQuery({
    queryKey: ["moyenne", etudiantId, trimestreId],
    queryFn: () => fetchMoyenneTrimestre(etudiantId, trimestreId),
    enabled: Boolean(etudiantId && trimestreId),
  }).data;
}

function EnfantMoyenne({ etudiantId }) {
  const trimestreActif = useTrimestreActif();
  const moyenne = useMoyenne(etudiantId, trimestreActif?.id);
  return <>{moyenne != null ? `${moyenne}/20` : "—"}</>;
}

function HomeTab({ enfants }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {enfants.map((enfant) => (
          <div key={enfant.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {enfant.prenom} {enfant.nom}
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                Classe:{" "}
                <span className="font-semibold text-gray-900">
                  {enfant.classe_actuelle ?? "—"}
                </span>
              </p>
              <p>
                Matricule:{" "}
                <span className="font-mono text-gray-900">
                  {enfant.matricule}
                </span>
              </p>
              <p>
                Moyenne générale:{" "}
                <span className="font-bold text-blue-600">
                  <EnfantMoyenne etudiantId={enfant.id} />
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChildrenTab({ enfants }) {
  return (
    <div className="space-y-6">
      {enfants.map((enfant) => (
        <div key={enfant.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {enfant.prenom} {enfant.nom}
              </h3>
              <p className="text-sm text-gray-600">
                Matricule: {enfant.matricule}
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {enfant.classe_actuelle ?? "—"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Moyenne</p>
              <p className="text-2xl font-bold text-blue-600">
                <EnfantMoyenne etudiantId={enfant.id} />
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Statut</p>
              <p className="text-2xl font-bold text-gray-700">
                {enfant.statut}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BulletinsTab({ enfants }) {
  /** L'API /bulletins/ est déjà scopée aux enfants de ce parent. */
  const { data: bulletins } = useResourceList("bulletins", bulletinService);

  return (
    <div className="space-y-6">
      {enfants.map((enfant) => {
        const siens = (bulletins ?? []).filter((b) => b.etudiant === enfant.id);
        return (
          <div key={enfant.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {enfant.prenom} {enfant.nom} - Bulletins
            </h3>
            {siens.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucun bulletin généré pour l'instant.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {siens.map((b) => (
                  <div
                    key={b.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {b.trimestre_numero
                          ? `Trimestre ${b.trimestre_numero}`
                          : "Annuel"}
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() =>
                          telechargerBulletinPdf(b.id, `bulletin_${b.id}.pdf`)
                        }
                      >
                        Voir
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        Moyenne:{" "}
                        <span className="font-bold text-gray-900">
                          {b.moyenne_generale ?? "—"}/20
                        </span>
                      </p>
                      <p>
                        Rang:{" "}
                        <span className="font-bold text-gray-900">
                          {b.rang ?? "—"}/{b.effectif_classe ?? "—"}
                        </span>
                      </p>
                      <p>
                        {b.est_valide ? "Validé" : "En attente de validation"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const STATUT_PRESENCE_LABELS = {
  P: "Présent",
  A: "Absent",
  R: "En retard",
  E: "Absence justifiée",
};

function AbsencesTab({ enfants }) {
  /** L'API /presences/ est déjà scopée aux enfants de ce parent ; on la filtre par enfant côté client. */
  const { data: presences } = useResourceList("presences", presenceService);

  return (
    <div className="space-y-6">
      {enfants.map((enfant) => {
        const siennes = (presences ?? []).filter(
          (p) => p.etudiant === enfant.id && p.statut !== "P",
        );
        return (
          <div key={enfant.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {enfant.prenom} {enfant.nom} - Absences
            </h3>
            {siennes.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucune absence ou retard enregistré.
              </p>
            ) : (
              <div className="space-y-3">
                {siennes.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-700">
                      {p.date_cours} — {p.matiere_intitule}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        p.statut === "E"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {STATUT_PRESENCE_LABELS[p.statut]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const STATUT_LABELS = {
  PAYE: "Payé",
  PARTIEL: "Partiel",
  IMPAYE: "Impayé",
  NON_CONFIGURE: "Non configuré",
};
const STATUT_COLORS = {
  PAYE: "bg-green-100 text-green-800",
  PARTIEL: "bg-orange-100 text-orange-800",
  IMPAYE: "bg-red-100 text-red-800",
  NON_CONFIGURE: "bg-gray-100 text-gray-600",
};

function PaymentsTab({ enfants }) {
  const anneeActive = useAnneeActive();

  return (
    <div className="space-y-6">
      {enfants.map((enfant) => (
        <ChildDossierCard
          key={enfant.id}
          enfant={enfant}
          anneeScolaireId={anneeActive?.id}
        />
      ))}
    </div>
  );
}

function CommunicationTab() {
  const [subTab, setSubTab] = useState("annonces");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "annonces", label: "Annonces" },
          { id: "messagerie", label: "Messagerie" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {subTab === "annonces" && <AnnoncesPanel />}
      {subTab === "messagerie" && <MessageriePanel />}
    </div>
  );
}

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUT_PAIEMENT_LABELS = {
  PAYE: "Payé",
  EN_ATTENTE: "En attente",
  EN_RETARD: "En retard",
  ANNULE: "Annulé",
};

function ChildDossierCard({ enfant, anneeScolaireId }) {
  const anneeActive = useAnneeActive();
  const dossier = useDossier(enfant.id, anneeScolaireId);
  const { data: paiements, isLoading: loadingPaiements } = useResourceList("paiements", paiementService);
  const { data: classes } = useResourceList("classes", classeService);
  const { data: inscriptions } = useResourceList("inscriptions", inscriptionService);
  const { data: fraisScolarite } = useResourceList("frais-scolarite", fraisScolariteService);
  const { data: anneesScolaires } = useResourceList("annees-scolaires", anneeScolaireService);
  const [generatingFacture, setGeneratingFacture] = useState(null);

  const anneeComplete = (anneesScolaires ?? []).find((a) => a.id === anneeScolaireId) ?? anneeActive;

  const inscriptionActive = (inscriptions ?? []).find(
    (i) => i.etudiant === enfant.id && i.annee_scolaire === anneeScolaireId,
  );
  const classeActuelle = inscriptionActive
    ? (classes ?? []).find((c) => c.id === inscriptionActive.classe)
    : null;
  const tarifNiveau = classeActuelle
    ? (fraisScolarite ?? []).find(
        (f) =>
          f.annee_scolaire === anneeScolaireId &&
          f.niveau === classeActuelle.niveau &&
          (f.filiere ?? null) === (classeActuelle.filiere ?? null),
      )
    : null;

  const estReinscription =
    Boolean(anneeComplete) &&
    (inscriptions ?? []).some((i) => {
      if (i.etudiant !== enfant.id) return false;
      const anneeInscription = (anneesScolaires ?? []).find((a) => a.id === i.annee_scolaire);
      return anneeInscription && anneeInscription.date_debut < anneeComplete.date_debut;
    });

  const droitClasse =
    estReinscription && classeActuelle?.frais_reinscription != null
      ? classeActuelle.frais_reinscription
      : classeActuelle?.frais_inscription;
  const montantInscription = droitClasse ?? tarifNiveau?.montant_inscription ?? null;
  const montantEcolageMensuel =
    classeActuelle?.frais_ecolage_mensuel ??
    (tarifNiveau ? Number(tarifNiveau.montant_annuel) / 12 : null);

  const mesPaiements = (paiements ?? []).filter(
    (p) => p.etudiant === enfant.id && p.annee_scolaire === anneeScolaireId,
  );
  const totalPayeEcolage = mesPaiements
    .filter((p) => p.statut === "PAYE")
    .reduce((somme, p) => somme + Number(p.montant), 0);
  const droitInscriptionPaye =
    montantInscription != null && totalPayeEcolage >= Number(montantInscription);

  const paiementsParMois = (mois) => mesPaiements.filter((p) => p.mois_couvert === mois);

  const dateEcheancePourMois = (mois) => {
    const anneeDebut = new Date(anneeComplete.date_debut).getFullYear();
    const anneeEcheance = mois >= 9 ? anneeDebut : anneeDebut + 1;
    return `${anneeEcheance}-${String(mois).padStart(2, "0")}-05`;
  };

  const aujourdhui = new Date().toISOString().slice(0, 10);

  const handleGenererFacture = async (key, options) => {
    setGeneratingFacture(key);
    try {
      const suffix = options.inscription ? "inscription" : `mois_${String(options.mois).padStart(2, "0")}`;
      await telechargerFactureEcolage(
        enfant.id,
        { anneeScolaireId, ...options },
        `facture_${enfant.matricule}_${suffix}.pdf`,
      );
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (detail) {
        alert(detail);
      } else if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          alert(JSON.parse(text).detail ?? "Erreur lors de la génération de la facture");
        } catch {
          alert("Erreur lors de la génération de la facture");
        }
      } else {
        alert("Erreur lors de la génération de la facture");
      }
    } finally {
      setGeneratingFacture(null);
    }
  };

  const handleGenererCarteEcolage = async () => {
    try {
      await telechargerCarteEcolage(enfant.id, `carte_ecolage_${enfant.matricule}.pdf`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail ?? "Erreur lors de la génération de la carte d'écolage");
    }
  };

  const lignesCalendrier = [];
  if (montantInscription != null && !droitInscriptionPaye) {
    lignesCalendrier.push({
      key: "inscription",
      label: estReinscription ? "Droit de réinscription" : "Droit d'inscription",
      montant: montantInscription,
      echeance: anneeComplete?.date_debut,
      statut: "IMPAYE",
      enRetard: anneeComplete?.date_debut < aujourdhui,
      facture: { inscription: true },
    });
  }

  for (let mois = 1; mois <= 12; mois += 1) {
    const lignes = paiementsParMois(mois);
    const paiementPaye = lignes.find((p) => p.statut === "PAYE");
    const echeance = dateEcheancePourMois(mois);
    if (paiementPaye) {
      lignesCalendrier.push({
        key: `mois-${mois}`,
        label: MOIS_LABELS[mois - 1],
        montant: paiementPaye.montant,
        echeance: paiementPaye.date_paiement,
        statut: "PAYE",
        enRetard: false,
        facture: null,
      });
      continue;
    }
    const paiementEnCours = lignes[0];
    const enRetard = echeance < aujourdhui;
    lignesCalendrier.push({
      key: `mois-${mois}`,
      label: MOIS_LABELS[mois - 1],
      montant: paiementEnCours?.montant ?? montantEcolageMensuel,
      echeance,
      statut: paiementEnCours?.statut ?? (enRetard ? "EN_RETARD" : "IMPAYE"),
      enRetard,
      facture: { mois },
    });
  }

  const impayes = lignesCalendrier.filter((l) => l.statut !== "PAYE");
  const isLoading = !dossier || loadingPaiements;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <h3 className="text-lg font-bold text-gray-900">
          {enfant.prenom} {enfant.nom}
        </h3>
        <Button size="sm" variant="outline" className="gap-2" onClick={handleGenererCarteEcolage}>
          <Receipt className="w-4 h-4" />
          Carte d'écolage complète
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Total dû</p>
              <p className="text-xl font-bold text-blue-600">
                {Number(dossier.total_du).toLocaleString("fr-FR")} Ar
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Total payé</p>
              <p className="text-xl font-bold text-green-600">
                {Number(dossier.total_paye).toLocaleString("fr-FR")} Ar
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Reste à payer</p>
              <p className="text-xl font-bold text-orange-600">
                {Number(dossier.reste_du).toLocaleString("fr-FR")} Ar
              </p>
            </div>
            <div className={`rounded-lg p-4 ${STATUT_COLORS[dossier.statut]}`}>
              <p className="text-sm opacity-80">Statut</p>
              <p className="text-xl font-bold">{STATUT_LABELS[dossier.statut]}</p>
            </div>
          </div>

          {impayes.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-semibold text-red-800">
                    {impayes.length} échéance{impayes.length > 1 ? "s" : ""} impayée{impayes.length > 1 ? "s" : ""}
                  </p>
                  <div className="space-y-2">
                    {impayes.map((ligne) => (
                      <div
                        key={`impaye-${ligne.key}`}
                        className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-md px-3 py-2 border border-red-100"
                      >
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">{ligne.label}</span>
                          <span className="text-gray-500 ml-2">
                            — {ligne.montant != null ? `${Number(ligne.montant).toLocaleString("fr-FR")} Ar` : "—"}
                          </span>
                          <span className="text-gray-400 ml-2">
                            (échéance : {new Date(ligne.echeance).toLocaleDateString("fr-FR")})
                          </span>
                        </div>
                        {ligne.facture && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-8"
                            disabled={generatingFacture === ligne.key}
                            onClick={() => handleGenererFacture(ligne.key, ligne.facture)}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {generatingFacture === ligne.key ? "Génération..." : "Facture"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Toutes les échéances sont réglées pour cette année scolaire.
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-3">
              Calendrier des échéances — {anneeComplete?.libelle ?? "Année scolaire"}
            </h4>
            {montantInscription == null && montantEcolageMensuel == null ? (
              <p className="text-sm text-gray-500">
                Aucun tarif configuré pour cette année scolaire.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Échéance</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Montant</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Statut</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lignesCalendrier.map((ligne) => {
                      const estPaye = ligne.statut === "PAYE";
                      return (
                        <tr
                          key={ligne.key}
                          className={
                            estPaye
                              ? "bg-white"
                              : ligne.enRetard
                                ? "bg-red-50"
                                : "bg-orange-50"
                          }
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{ligne.label}</td>
                          <td className="px-4 py-3 font-mono">
                            {ligne.montant != null
                              ? `${Number(ligne.montant).toLocaleString("fr-FR")} Ar`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {estPaye
                              ? new Date(ligne.echeance).toLocaleDateString("fr-FR")
                              : `Échéance : ${new Date(ligne.echeance).toLocaleDateString("fr-FR")}`}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                estPaye ? "default" : ligne.enRetard ? "destructive" : "secondary"
                              }
                            >
                              {estPaye
                                ? STATUT_PAIEMENT_LABELS.PAYE
                                : STATUT_PAIEMENT_LABELS[ligne.statut] ?? "Non payé"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ligne.facture ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-8"
                                disabled={generatingFacture === ligne.key}
                                onClick={() => handleGenererFacture(ligne.key, ligne.facture)}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {generatingFacture === ligne.key ? "..." : "Facture"}
                              </Button>
                            ) : (
                              <span className="text-xs text-green-700 font-medium">Réglé</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ParentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const { user, logout } = useAuth();
  const enfants = useMesEnfants();

  const handleLogout = () => {
    logout();
    navigate("/login/", { replace: true });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <header className="bg-card border-b border-border sticky top-0 z-20 flex-shrink-0">
        <div className="flex justify-between items-center px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">SIG-Lycée</h1>
            <p className="text-xs text-muted-foreground">
              Espace Parent Sécurisé
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-muted rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-sidebar border-r border-sidebar-border overflow-y-auto hidden md:block h-full flex-shrink-0">
          <nav className="p-4 space-y-1">
            {[
              { id: "home", label: "Accueil", icon: FileText },
              { id: "enfants", label: "Mes Enfants", icon: TrendingUp },
              { id: "bulletins", label: "Bulletins", icon: FileText },
              { id: "cahier", label: "Cahier de textes", icon: FileText },
              { id: "absences", label: "Absences", icon: Calendar },
              { id: "paiements", label: "Paiements", icon: DollarSign },
              {
                id: "communication",
                label: "Communication",
                icon: MessageSquare,
              },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-500"}`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-8 shadow-lg">
              <h2 className="text-3xl font-bold mb-2">
                {user ? `${user.first_name} ${user.last_name}` : ""}
              </h2>
              <p className="text-blue-100">{user?.email}</p>
            </div>

            {enfants.length === 0 ? (
              <>
                <p className="text-sm text-gray-500">
                  Aucun enfant n'est encore lié à votre compte.
                </p>
                {activeTab === "communication" && <CommunicationTab />}
              </>
            ) : (
              <>
                {activeTab === "home" && <HomeTab enfants={enfants} />}
                {activeTab === "enfants" && <ChildrenTab enfants={enfants} />}
                {activeTab === "bulletins" && (
                  <BulletinsTab enfants={enfants} />
                )}
                {activeTab === "cahier" && <CahierTextePanel />}
                {activeTab === "absences" && <AbsencesTab enfants={enfants} />}
                {activeTab === "paiements" && <PaymentsTab enfants={enfants} />}
                {activeTab === "communication" && <CommunicationTab />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ParentDashboard;
