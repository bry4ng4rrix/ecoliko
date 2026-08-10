import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'

import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StudentDashboard from './pages/StudentDashboard'
import ParentDashboard from './pages/ParentDashboard'
import AdminDashboard from './pages/AdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import PedagogicalCoordinatorDashboard from './pages/PedagogicalCoordinatorDashboard'
import SecretariatDashboard from './pages/SecretariatDashboard'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import ServicePage from './pages/service/Service'
import ContactPage from './pages/contact/Contact'
import PresentationPage from './pages/presentation/presentation'
import ProgrammesPage from './pages/programmes/Programmes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/student/*" element={
              <ProtectedRoute roles={['ETUDIANT']}><StudentDashboard /></ProtectedRoute>
            } />
            <Route path="/parent/*" element={
              <ProtectedRoute roles={['PARENT']}><ParentDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/teacher/*" element={
              <ProtectedRoute roles={['ENSEIGNANT']}><TeacherDashboard /></ProtectedRoute>
            } />
            <Route path="/responsable/*" element={
              <ProtectedRoute roles={['RESPONSABLE']}><PedagogicalCoordinatorDashboard /></ProtectedRoute>
            } />
            <Route path="/secretariat/*" element={
              <ProtectedRoute roles={['SECRETARIAT']}><SecretariatDashboard /></ProtectedRoute>
            } />

            <Route path="/" element={<Login />} />
            <Route path="/services" element={<ServicePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/presentation" element={<PresentationPage />} />
            <Route path="/programmes" element={<ProgrammesPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
