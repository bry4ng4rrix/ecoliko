import { createContext, useCallback, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { authService } from "@/services/authService"
import { getStoredTokens, storeTokens } from "@/lib/apiClient"

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    const tokens = getStoredTokens()
    if (!tokens?.access) {
      setIsLoading(false)
      return
    }
    authService
      .fetchProfile()
      .then(setUser)
      .catch(() => storeTokens(null))
      .finally(() => setIsLoading(false))
  }, [])

  // Le cache TanStack Query est partagé par toute la SPA : sans le vider ici, les données
  // d'un utilisateur (ex. liste d'étudiants) peuvent fuiter vers la session suivante si
  // l'utilisateur se déconnecte/reconnecte sans rechargement complet de la page.
  const login = useCallback(async (email, password) => {
    queryClient.clear()
    const loggedInUser = await authService.login(email, password)
    setUser(loggedInUser)
    return loggedInUser
  }, [queryClient])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const value = { user, isAuthenticated: Boolean(user), isLoading, login, logout, setUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
