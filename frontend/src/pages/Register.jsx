import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  UserPlus,
  Loader2,
  School,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/apiClient";
import { authService } from "@/services/authService";

const MODES = {
  JOIN: "join",
  CREATE: "create",
};

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

function Register() {
  const [mode, setMode] = useState(MODES.JOIN);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur-xl shadow-2xl text-slate-100">
          <CardHeader className="space-y-1">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode(MODES.JOIN);
                  setError("");
                  setSuccess("");
                }}
                className={`flex items-center justify-center gap-2 h-10 rounded-lg text-xs font-semibold transition-all ${
                  mode === MODES.JOIN
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <School className="w-4 h-4" /> Élève / Parent
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(MODES.CREATE);
                  setError("");
                  setSuccess("");
                }}
                className={`flex items-center justify-center gap-2 h-10 rounded-lg text-xs font-semibold transition-all ${
                  mode === MODES.CREATE
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Building2 className="w-4 h-4" /> Établissement
              </button>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Création de compte
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              Remplissez les champs ci-dessous pour vous inscrire
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {success && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-200 text-xs">
                {success}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === MODES.JOIN ? (
              <JoinForm
                setError={setError}
                setSuccess={setSuccess}
                loading={loading}
                setLoading={setLoading}
              />
            ) : (
              <CreateEcoleForm
                setError={setError}
                setSuccess={setSuccess}
                loading={loading}
                setLoading={setLoading}
                navigate={navigate}
              />
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-t border-slate-900 pt-4">
            <p className="text-center text-xs text-slate-400">
              Déjà un compte ?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline transition-colors"
              >
                Se connecter
              </button>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-8">
          © {new Date().getFullYear()} SIG-Lycée • Tous droits réservés
        </p>
      </div>
    </div>
  );
}

function JoinForm({ setError, setSuccess, loading, setLoading }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "ETUDIANT",
    genre: "H",
    ecole: "",
    matricule_enfant: "",
    // Dossier élève (rôle Élève uniquement) — miroir de « Inscription nouvel étudiant »
    // (components/etudiants/EtudiantsPanel.jsx), pour que l'établissement n'ait pas à
    // ressaisir ces informations à l'activation du compte. Le matricule et la classe ne sont
    // volontairement pas demandés ici : le matricule est généré côté serveur (voir
    // RegisterSerializer), et affecter une classe reste une décision de l'établissement.
    date_naissance: "",
    lieu_naissance: "",
    nationalite: "Malagasy",
    adresse: "",
    telephone: "",
    situation_familiale: "",
    ancien_etablissement: "",
    dossier_medical: "",
    contact_urgence_nom: "",
    contact_urgence_telephone: "",
  });
  const [photo, setPhoto] = useState(null);
  const [ecoles, setEcoles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .get("/ecoles/publiques/")
      .then(({ data }) => setEcoles(data))
      .catch(() => setEcoles([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.email ||
      !formData.password ||
      !formData.first_name ||
      !formData.last_name ||
      !formData.ecole
    ) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (formData.role === "PARENT" && !formData.matricule_enfant) {
      setError("Veuillez fournir le matricule de votre enfant.");
      return;
    }
    if (
      formData.role === "ETUDIANT" &&
      (!formData.date_naissance || !formData.lieu_naissance)
    ) {
      setError("La date et le lieu de naissance sont requis.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      const champs = {
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: formData.role,
        genre: formData.genre,
        ecole: Number(formData.ecole),
        matricule_enfant: formData.matricule_enfant?.trim() || undefined,
      };
      if (formData.role === "ETUDIANT") {
        Object.assign(champs, {
          date_naissance: formData.date_naissance,
          lieu_naissance: formData.lieu_naissance.trim(),
          nationalite: formData.nationalite.trim() || undefined,
          adresse: formData.adresse.trim() || undefined,
          telephone: formData.telephone.trim() || undefined,
          situation_familiale: formData.situation_familiale.trim() || undefined,
          ancien_etablissement: formData.ancien_etablissement.trim() || undefined,
          dossier_medical: formData.dossier_medical.trim() || undefined,
          contact_urgence_nom: formData.contact_urgence_nom.trim() || undefined,
          contact_urgence_telephone:
            formData.contact_urgence_telephone.trim() || undefined,
        });
      }

      let payload = champs;
      if (formData.role === "ETUDIANT" && photo) {
        payload = new FormData();
        Object.entries(champs).forEach(([key, value]) => {
          if (value !== undefined) payload.append(key, value);
        });
        payload.append("photo", photo);
      }
      await authService.register(payload);

      setSuccess(
        "Inscription réussie ! Votre compte doit être activé par l'administration de l'établissement avant de pouvoir vous connecter.",
      );
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.email?.[0] ||
          data?.password?.[0] ||
          data?.role?.[0] ||
          data?.ecole?.[0] ||
          data?.date_naissance?.[0] ||
          data?.lieu_naissance?.[0] ||
          data?.non_field_errors?.[0] ||
          data?.detail ||
          "Erreur lors de l'inscription",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className="text-slate-300">
            Prénom *
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Votre prénom"
              required
              className="pl-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name" className="text-slate-300">
            Nom *
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Votre nom"
              required
              className="pl-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-slate-300">
          Email *
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="exemple@lycee.mg"
            required
            autoComplete="email"
            className="pl-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-slate-300">
          Mot de passe *
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Au moins 6 caractères"
            required
            autoComplete="new-password"
            className="pl-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ecole" className="text-slate-300">
          Établissement *
        </Label>
        <select
          id="ecole"
          name="ecole"
          value={formData.ecole}
          onChange={handleChange}
          required
          className="w-full h-10 px-3 py-2 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-slate-100 text-sm"
        >
          <option value="" disabled className="bg-slate-900 text-slate-400">
            Sélectionnez votre établissement
          </option>
          {ecoles.map((ecole) => (
            <option
              key={ecole.id}
              value={ecole.id}
              className="bg-slate-900 text-slate-100"
            >
              {ecole.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role" className="text-slate-300">
          Vous êtes *
        </Label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
          className="w-full h-10 px-3 py-2 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-slate-100 text-sm"
        >
          <option value="ETUDIANT" className="bg-slate-900 text-slate-100">
            Élève
          </option>
          <option value="PARENT" className="bg-slate-900 text-slate-100">
            Parent
          </option>
        </select>
        <p className="text-[10px] text-slate-500">
          Les comptes du personnel (enseignant, administration...) sont créés
          par l'établissement.
        </p>
      </div>

      {formData.role === "PARENT" && (
        <div className="space-y-1.5">
          <Label htmlFor="matricule_enfant" className="text-slate-300">
            Matricule de l'enfant *
          </Label>
          <div className="relative">
            <Input
              id="matricule_enfant"
              name="matricule_enfant"
              value={formData.matricule_enfant}
              onChange={handleChange}
              placeholder="Ex: 2023-INF-0001"
              required
              className="pl-3 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="genre" className="text-slate-300">
          Genre
        </Label>
        <select
          id="genre"
          name="genre"
          value={formData.genre}
          onChange={handleChange}
          className="w-full h-10 px-3 py-2 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-slate-100 text-sm"
        >
          <option value="H" className="bg-slate-900 text-slate-100">
            Masculin
          </option>
          <option value="F" className="bg-slate-900 text-slate-100">
            Féminin
          </option>
          <option value="A" className="bg-slate-900 text-slate-100">
            Autre / Non précisé
          </option>
        </select>
      </div>

      {formData.role === "ETUDIANT" && (
        <div className="space-y-4 pt-2 border-t border-slate-900">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide pt-3">
            Dossier élève
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="photo" className="text-slate-300">
              Photo
            </Label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-800 file:text-slate-200 file:text-xs hover:file:bg-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date_naissance" className="text-slate-300">
                Date de naissance *
              </Label>
              <Input
                id="date_naissance"
                type="date"
                name="date_naissance"
                value={formData.date_naissance}
                onChange={handleChange}
                required
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lieu_naissance" className="text-slate-300">
                Lieu de naissance *
              </Label>
              <Input
                id="lieu_naissance"
                name="lieu_naissance"
                value={formData.lieu_naissance}
                onChange={handleChange}
                placeholder="Antananarivo"
                required
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nationalite" className="text-slate-300">
              Nationalité
            </Label>
            <Input
              id="nationalite"
              name="nationalite"
              value={formData.nationalite}
              onChange={handleChange}
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adresse" className="text-slate-300">
              Adresse
            </Label>
            <Input
              id="adresse"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telephone" className="text-slate-300">
              Téléphone
            </Label>
            <Input
              id="telephone"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="situation_familiale" className="text-slate-300">
              Situation familiale
            </Label>
            <Input
              id="situation_familiale"
              name="situation_familiale"
              value={formData.situation_familiale}
              onChange={handleChange}
              placeholder="Ex: Vit avec ses parents"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ancien_etablissement" className="text-slate-300">
              Ancien établissement
            </Label>
            <Input
              id="ancien_etablissement"
              name="ancien_etablissement"
              value={formData.ancien_etablissement}
              onChange={handleChange}
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dossier_medical" className="text-slate-300">
              Dossier médical
            </Label>
            <textarea
              id="dossier_medical"
              name="dossier_medical"
              value={formData.dossier_medical}
              onChange={handleChange}
              rows={2}
              placeholder="Allergies, traitements en cours..."
              className="w-full px-3 py-2 rounded-md border border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact_urgence_nom" className="text-slate-300">
                Contact d'urgence
              </Label>
              <Input
                id="contact_urgence_nom"
                name="contact_urgence_nom"
                value={formData.contact_urgence_nom}
                onChange={handleChange}
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="contact_urgence_telephone"
                className="text-slate-300"
              >
                Téléphone urgence
              </Label>
              <Input
                id="contact_urgence_telephone"
                name="contact_urgence_telephone"
                value={formData.contact_urgence_telephone}
                onChange={handleChange}
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20 mt-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {loading ? "Inscription en cours..." : "Créer mon compte"}
      </Button>
    </form>
  );
}

function CreateEcoleForm({
  setError,
  setSuccess,
  loading,
  setLoading,
  navigate,
}) {
  const [formData, setFormData] = useState({
    ecole_nom: "",
    ecole_code: "",
    ecole_adresse: "",
    ecole_telephone: "",
    ecole_email: "",
    admin_first_name: "",
    admin_last_name: "",
    admin_email: "",
    admin_password: "",
    admin_telephone: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.ecole_nom ||
      !formData.ecole_code ||
      !formData.admin_email ||
      !formData.admin_password ||
      !formData.admin_first_name ||
      !formData.admin_last_name
    ) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (formData.admin_password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      await authService.registerEcole({
        ecole_nom: formData.ecole_nom.trim(),
        ecole_code: formData.ecole_code.trim(),
        ecole_adresse: formData.ecole_adresse.trim(),
        ecole_telephone: formData.ecole_telephone.trim(),
        ecole_email: formData.ecole_email.trim(),
        admin_first_name: formData.admin_first_name.trim(),
        admin_last_name: formData.admin_last_name.trim(),
        admin_email: formData.admin_email.trim(),
        admin_password: formData.admin_password,
        admin_telephone: formData.admin_telephone.trim(),
      });

      setSuccess(
        "Établissement créé ! Vous pouvez vous connecter dès maintenant avec votre compte administrateur.",
      );
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.ecole_code?.[0] ||
          data?.ecole_nom?.[0] ||
          data?.admin_email?.[0] ||
          data?.admin_password?.[0] ||
          data?.non_field_errors?.[0] ||
          data?.detail ||
          "Erreur lors de la création de l'établissement",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
          Établissement
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ecole_nom" className="text-slate-300">
              Nom de l'établissement *
            </Label>
            <Input
              id="ecole_nom"
              name="ecole_nom"
              value={formData.ecole_nom}
              onChange={handleChange}
              placeholder="Lycée Saint-Michel"
              required
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecole_code" className="text-slate-300">
              Code établissement *
            </Label>
            <Input
              id="ecole_code"
              name="ecole_code"
              value={formData.ecole_code}
              onChange={handleChange}
              placeholder="LYC-SM"
              required
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ecole_adresse" className="text-slate-300">
            Adresse
          </Label>
          <Input
            id="ecole_adresse"
            name="ecole_adresse"
            value={formData.ecole_adresse}
            onChange={handleChange}
            placeholder="Adresse de l'établissement"
            className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ecole_telephone" className="text-slate-300">
              Téléphone établissement
            </Label>
            <Input
              id="ecole_telephone"
              name="ecole_telephone"
              value={formData.ecole_telephone}
              onChange={handleChange}
              placeholder="+261 34 00 000 00"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecole_email" className="text-slate-300">
              Email établissement
            </Label>
            <Input
              id="ecole_email"
              type="email"
              name="ecole_email"
              value={formData.ecole_email}
              onChange={handleChange}
              placeholder="contact@etablissement.mg"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-900">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide pt-3">
          Votre compte administrateur
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin_first_name" className="text-slate-300">
              Prénom *
            </Label>
            <Input
              id="admin_first_name"
              name="admin_first_name"
              value={formData.admin_first_name}
              onChange={handleChange}
              placeholder="Votre prénom"
              required
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin_last_name" className="text-slate-300">
              Nom *
            </Label>
            <Input
              id="admin_last_name"
              name="admin_last_name"
              value={formData.admin_last_name}
              onChange={handleChange}
              placeholder="Votre nom"
              required
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin_email" className="text-slate-300">
            Email *
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              id="admin_email"
              type="email"
              name="admin_email"
              value={formData.admin_email}
              onChange={handleChange}
              placeholder="admin@etablissement.mg"
              required
              autoComplete="email"
              className="pl-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin_password" className="text-slate-300">
            Mot de passe *
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              id="admin_password"
              type="password"
              name="admin_password"
              value={formData.admin_password}
              onChange={handleChange}
              placeholder="Au moins 6 caractères"
              required
              autoComplete="new-password"
              className="pl-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin_telephone" className="text-slate-300">
            Téléphone
          </Label>
          <Input
            id="admin_telephone"
            name="admin_telephone"
            value={formData.admin_telephone}
            onChange={handleChange}
            placeholder="+261 34 00 000 00"
            className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-500 leading-normal">
        Vous serez administrateur de cet établissement avec un accès complet.
        Vous pourrez ensuite créer les comptes du personnel (enseignants,
        secrétariat, responsables pédagogiques) depuis votre tableau de bord.
      </p>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {loading ? "Création en cours..." : "Créer mon établissement"}
      </Button>
    </form>
  );
}

export default Register;
