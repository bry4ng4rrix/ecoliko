import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { ChangePasswordGate } from "@/components/parametres/ChangePasswordGate"

export const ROLE_HOME = {
  ADMIN: "/admin",
  ENSEIGNANT: "/teacher",
  ETUDIANT: "/student",
  PARENT: "/parent",
  RESPONSABLE: "/responsable",
  SECRETARIAT: "/secretariat",
}

export function ProtectedRoute({ roles, children }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Chargement...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login/" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] ?? "/"} replace />
  }

  return <ChangePasswordGate>{children}</ChangePasswordGate>
}
