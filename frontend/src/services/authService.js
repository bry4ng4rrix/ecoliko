import { apiClient, storeTokens } from "@/lib/apiClient"

export const authService = {
  async login(email, password) {
    const { data } = await apiClient.post("/auth/token/", { email, password })
    storeTokens({ access: data.access, refresh: data.refresh })
    return data.user
  },

  async register(payload) {
    const { data } = await apiClient.post("/auth/register/", payload)
    return data
  },

  async registerEcole(payload) {
    const { data } = await apiClient.post("/auth/register/ecole/", payload)
    return data
  },

  async fetchProfile() {
    const { data } = await apiClient.get("/auth/profile/")
    return data
  },

  async updateProfile(payload) {
    const { data } = await apiClient.patch("/auth/profile/", payload)
    return data
  },

  async changePassword(ancienMotDePasse, nouveauMotDePasse) {
    const { data } = await apiClient.post("/auth/changer-mot-de-passe/", {
      ancien_mot_de_passe: ancienMotDePasse,
      nouveau_mot_de_passe: nouveauMotDePasse,
    })
    return data
  },

  logout() {
    storeTokens(null)
  },
}
