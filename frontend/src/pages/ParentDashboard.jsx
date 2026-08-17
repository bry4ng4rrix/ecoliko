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
  CheckCircle2,
  User,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnoncesPanel } from "@/components/communication/AnnoncesPanel";
import { MessageriePanel } from "@/components/communication/MessageriePanel";
import { CahierTextePanel } from "@/components/pedagogie/CahierTextePanel";
import { MonProfilPanel } from "@/components/parametres/MonProfilPanel";

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {enfants.map((enfant) => (
        <Card key={enfant.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              {enfant.prenom} {enfant.nom}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Classe :{" "}
              <span className="font-semibold text-foreground">
                {enfant.classe_actuelle ?? "—"}
              </span>
            </p>
            <p className="text-muted-foreground">
              Matricule :{" "}
              <span className="font-mono text-foreground">
                {enfant.matricule}
              </span>
            </p>
            <p className="text-muted-foreground">
              Moyenne générale :{" "}
              <span className="font-bold text-primary">
                <EnfantMoyenne etudiantId={enfant.id} />
              </span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChildrenTab({ enfants }) {
  return (
    <div className="space-y-6">
      {enfants.map((enfant) => (
        <Card key={enfant.id}>
          <CardHeader className="flex-row justify-between items-start gap-4 space-y-0">
            <div>
              <CardTitle className="text-xl">
                {enfant.prenom} {enfant.nom}
              </CardTitle>
              <CardDescription>
                Matricule : {enfant.matricule}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {enfant.classe_actuelle ?? "—"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Moyenne</p>
                <p className="text-2xl font-bold text-primary">
                  <EnfantMoyenne etudiantId={enfant.id} />
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Statut</p>
                <p className="text-2xl font-bold">{enfant.statut}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <Card key={enfant.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {enfant.prenom} {enfant.nom} — Bulletins
              </CardTitle>
            </CardHeader>
            <CardContent>
              {siens.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun bulletin généré pour l'instant.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {siens.map((b) => (
                    <Card key={b.id} className="shadow-none">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold">
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
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            Moyenne :{" "}
                            <span className="font-bold text-foreground">
                              {b.moyenne_generale ?? "—"}/20
                            </span>
                          </p>
                          <p>
                            Rang :{" "}
                            <span className="font-bold text-foreground">
                              {b.rang ?? "—"}/{b.effectif_classe ?? "—"}
                            </span>
                          </p>
                          <p>
                            {b.est_valide ? "Validé" : "En attente de validation"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
          <Card key={enfant.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {enfant.prenom} {enfant.nom} — Absences
              </CardTitle>
            </CardHeader>
            <CardContent>
              {siennes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune absence ou retard enregistré.
                </p>
              ) : (
                <div className="space-y-3">
                  {siennes.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm">
                        {p.date_cours} — {p.matiere_intitule}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          p.statut === "E"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                            : "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
                        }
                      >
                        {STATUT_PRESENCE_LABELS[p.statut]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
  PAYE: "bg-green-500/10 text-green-700 dark:text-green-400",
  PARTIEL: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  IMPAYE: "bg-red-500/10 text-red-700 dark:text-red-400",
  NON_CONFIGURE: "bg-muted text-muted-foreground",
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
  return (
    <Tabs defaultValue="annonces">
      <TabsList>
        <TabsTrigger value="annonces">Annonces</TabsTrigger>
        <TabsTrigger value="messagerie">Messagerie</TabsTrigger>
      </TabsList>
      <TabsContent value="annonces" className="mt-4">
        <AnnoncesPanel />
      </TabsContent>
      <TabsContent value="messagerie" className="mt-4">
        <MessageriePanel />
      </TabsContent>
    </Tabs>
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
    const moisDebut = anneeComplete?.mois_debut_annee_scolaire ?? 9;
    const jourEcheance = anneeComplete?.jour_echeance_mensuelle ?? 5;
    const anneeEcheance = mois >= moisDebut ? anneeDebut : anneeDebut + 1;
    return `${anneeEcheance}-${String(mois).padStart(2, "0")}-${String(jourEcheance).padStart(2, "0")}`;
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
        toast.error(detail);
      } else if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          toast.error(JSON.parse(text).detail ?? "Erreur lors de la génération de la facture");
        } catch {
          toast.error("Erreur lors de la génération de la facture");
        }
      } else {
        toast.error("Erreur lors de la génération de la facture");
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
      toast.error(err.response?.data?.detail ?? "Erreur lors de la génération de la carte d'écolage");
    }
  };

  // `anneeComplete` dépend de deux requêtes encore en vol au tout premier rendu
  // (`annees-scolaires` et `useAnneeActive`) : tant qu'aucune des deux n'a résolu, il vaut
  // `null` — construire le calendrier avant que les données soient là ferait planter
  // `dateEcheancePourMois` (accès à `.date_debut` sur `null`).
  const lignesCalendrier = [];
  if (anneeComplete) {
    if (montantInscription != null && !droitInscriptionPaye) {
      lignesCalendrier.push({
        key: "inscription",
        label: estReinscription ? "Droit de réinscription" : "Droit d'inscription",
        montant: montantInscription,
        echeance: anneeComplete.date_debut,
        statut: "IMPAYE",
        enRetard: anneeComplete.date_debut < aujourdhui,
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
  }

  const impayes = lignesCalendrier.filter((l) => l.statut !== "PAYE");
  const isLoading = !dossier || !anneeComplete || loadingPaiements;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap justify-between items-start gap-4 space-y-0">
        <CardTitle className="text-lg">
          {enfant.prenom} {enfant.nom}
        </CardTitle>
        <Button size="sm" variant="outline" className="gap-2" onClick={handleGenererCarteEcolage}>
          <Receipt className="w-4 h-4" />
          Carte d'écolage complète
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-500/10 rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Total dû</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {Number(dossier.total_du).toLocaleString("fr-FR")} Ar
                </p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Total payé</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  {Number(dossier.total_paye).toLocaleString("fr-FR")} Ar
                </p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Reste à payer</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                  {Number(dossier.reste_du).toLocaleString("fr-FR")} Ar
                </p>
              </div>
              <div className={`rounded-lg p-4 ${STATUT_COLORS[dossier.statut]}`}>
                <p className="text-sm opacity-80">Statut</p>
                <p className="text-xl font-bold">{STATUT_LABELS[dossier.statut]}</p>
              </div>
            </div>

            {impayes.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {impayes.length} échéance{impayes.length > 1 ? "s" : ""} impayée{impayes.length > 1 ? "s" : ""}
                </AlertTitle>
                <AlertDescription>
                  <div className="space-y-2 mt-2">
                    {impayes.map((ligne) => (
                      <div
                        key={`impaye-${ligne.key}`}
                        className="flex flex-wrap items-center justify-between gap-2 bg-background rounded-md px-3 py-2 border"
                      >
                        <div className="text-sm">
                          <span className="font-medium text-foreground">{ligne.label}</span>
                          <span className="text-muted-foreground ml-2">
                            — {ligne.montant != null ? `${Number(ligne.montant).toLocaleString("fr-FR")} Ar` : "—"}
                          </span>
                          <span className="text-muted-foreground/70 ml-2">
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
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 [&>svg]:text-green-700 dark:[&>svg]:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Toutes les échéances sont réglées pour cette année scolaire.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h4 className="font-semibold text-sm mb-3">
                Calendrier des échéances — {anneeComplete?.libelle ?? "Année scolaire"}
              </h4>
              {montantInscription == null && montantEcolageMensuel == null ? (
                <p className="text-sm text-muted-foreground">
                  Aucun tarif configuré pour cette année scolaire.
                </p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lignesCalendrier.map((ligne) => {
                        const estPaye = ligne.statut === "PAYE";
                        return (
                          <TableRow
                            key={ligne.key}
                            className={
                              estPaye
                                ? ""
                                : ligne.enRetard
                                  ? "bg-red-500/5"
                                  : "bg-orange-500/5"
                            }
                          >
                            <TableCell className="font-medium">{ligne.label}</TableCell>
                            <TableCell className="font-mono">
                              {ligne.montant != null
                                ? `${Number(ligne.montant).toLocaleString("fr-FR")} Ar`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {estPaye
                                ? new Date(ligne.echeance).toLocaleDateString("fr-FR")
                                : `Échéance : ${new Date(ligne.echeance).toLocaleDateString("fr-FR")}`}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  estPaye ? "default" : ligne.enRetard ? "destructive" : "secondary"
                                }
                              >
                                {estPaye
                                  ? STATUT_PAIEMENT_LABELS.PAYE
                                  : STATUT_PAIEMENT_LABELS[ligne.statut] ?? "Non payé"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
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
                                <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                                  Réglé
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const MENU_ITEMS = [
  { id: "home", label: "Accueil", icon: FileText },
  { id: "enfants", label: "Mes Enfants", icon: TrendingUp },
  { id: "bulletins", label: "Bulletins", icon: FileText },
  { id: "cahier", label: "Cahier de textes", icon: FileText },
  { id: "absences", label: "Absences", icon: Calendar },
  { id: "paiements", label: "Paiements", icon: DollarSign },
  { id: "communication", label: "Communication", icon: MessageSquare },
  { id: "profil", label: "Mon Profil", icon: User },
];

function ParentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const { user, logout } = useAuth();
  const enfants = useMesEnfants();

  const handleLogout = () => {
    logout();
    navigate("/login/", { replace: true });
  };

  const activeItem = MENU_ITEMS.find((item) => item.id === activeTab);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <header className="bg-card border-b border-border sticky top-0 z-20 flex-shrink-0">
        <div className="flex justify-between items-center px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              SIG-Lycée
            </h1>
            <p className="text-xs text-muted-foreground">
              Espace Parent Sécurisé
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UserAvatar
              photo={user?.photo}
              name={user ? `${user.first_name} ${user.last_name}` : ""}
              className="w-9 h-9 cursor-pointer"
              onClick={() => setActiveTab("profil")}
            />
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-sidebar border-r border-sidebar-border overflow-y-auto hidden md:block h-full flex-shrink-0">
          <nav className="p-4 space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full justify-start gap-3 px-4 py-3 h-auto rounded-xl text-sm font-medium ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-600 hover:text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-white" : "text-slate-500"}`}
                  />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div>
              <h2 className="text-3xl font-bold">
                {activeItem?.label ?? "Accueil"}
              </h2>
              <p className="text-muted-foreground mt-1">
                {user ? `${user.first_name} ${user.last_name}` : ""}
                {user?.email ? ` · ${user.email}` : ""}
              </p>
            </div>

            {activeTab === "communication" && <CommunicationTab />}
            {activeTab === "profil" && <MonProfilPanel />}
            {["home", "enfants", "bulletins", "cahier", "absences", "paiements"].includes(activeTab) && (
              enfants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun enfant n'est encore lié à votre compte.
                </p>
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
                </>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ParentDashboard;
