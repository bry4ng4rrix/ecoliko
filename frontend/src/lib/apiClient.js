import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL
const STORAGE_KEY = "sig_lycee_tokens"

export function getStoredTokens() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function storeTokens(tokens) {
  if (tokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const apiClient = axios.create({ baseURL: API_URL })

apiClient.interceptors.request.use((config) => {
  const tokens = getStoredTokens()
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`
  }
  return config
})

// Une seule requête de rafraîchissement en vol à la fois : les 401 concurrents
// attendent la même promesse au lieu de déclencher chacun leur propre refresh.
let refreshPromise = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/token")

    if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }

    const tokens = getStoredTokens()
    if (!tokens?.refresh) {
      storeTokens(null)
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_URL}/auth/token/refresh/`, { refresh: tokens.refresh })
          .then(({ data }) => {
            const newTokens = { ...tokens, access: data.access }
            storeTokens(newTokens)
            return newTokens
          })
          .finally(() => {
            refreshPromise = null
          })
      }
      const newTokens = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${newTokens.access}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      storeTokens(null)
      window.location.href = "/login/"
      return Promise.reject(refreshError)
    }
  }
)
