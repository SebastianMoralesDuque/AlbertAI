import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AuthCallback from './pages/AuthCallback'
import CoursesPage from './pages/CoursesPage'
import CourseCreatePage from './pages/CourseCreatePage'
import CourseDetailPage from './pages/CourseDetailPage'
import LessonPage from './pages/LessonPage'
import LearningProfilePage from './pages/LearningProfilePage'
import UserProfileModal from './components/UserProfileModal'

function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px]" />
        <div className="noise-overlay" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AprendizajeAI" className="w-8 h-8 object-contain" />
              <span className="font-semibold text-lg tracking-tight">AprendizajeAI</span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/courses')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Mis Cursos
              </button>
              <button className="text-sm text-zinc-400 hover:text-white transition-colors">
                Historial
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setProfileOpen(true)}
                  className="group relative"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-8 h-8 rounded-full ring-2 ring-white/[0.06] group-hover:ring-amber-500/40 transition-all object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-zinc-800 rounded-full ring-2 ring-white/[0.06] group-hover:ring-amber-500/40 transition-all flex items-center justify-center text-xs font-medium text-zinc-400">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </button>
              </div>
              {profileOpen && <UserProfileModal onClose={() => setProfileOpen(false)} />}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-6 pt-16 pb-24">
          <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-amber-500 rounded-full" />
              <span className="text-amber-500 text-sm font-medium tracking-wide uppercase">Panel de Control</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Tu progreso,
              <span className="block text-zinc-500">potenciado por IA.</span>
            </h1>

            <p className="text-lg text-zinc-400 max-w-xl mb-12">
              Lecciones adaptativas que se ajustan a tu ritmo. Cada día aprendés algo nuevo, evaluado en tiempo real.
            </p>
          </div>

          {/* Quick Actions */}
          <div className={`transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-cyan-500 rounded-full" />
              <span className="text-cyan-500 text-sm font-medium tracking-wide uppercase">Acciones Rápidas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/courses/new')}
                className="group relative bg-gradient-to-br from-amber-500 to-orange-600 text-black font-semibold py-5 px-8 rounded-2xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-lg font-bold mb-1">Crear Nuevo Curso</div>
                    <div className="text-black/60 text-sm font-normal">Definí tu tema y empezá a aprender</div>
                  </div>
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => navigate('/courses')}
                className="group bg-white/[0.02] border border-white/10 text-white font-semibold py-5 px-8 rounded-2xl transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-lg font-bold mb-1">Explorar Temas</div>
                    <div className="text-zinc-500 text-sm font-normal">Descubrí lo que podés aprender</div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity placeholder */}
          <div className={`mt-16 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-zinc-700 rounded-full" />
              <span className="text-zinc-500 text-sm font-medium tracking-wide uppercase">Actividad Reciente</span>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-400 mb-2">Sin actividad aún</h3>
              <p className="text-zinc-600 text-sm max-w-sm mx-auto">
                Creá un curso para empezar tu journey de aprendizaje. La IA se adaptará a tu nivel y ritmo.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Noise texture overlay */}
      <style>{`
        .noise-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px 256px;
        }
      `}</style>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <img src="/logo.png" alt="AprendizajeAI" className="w-12 h-12 object-contain animate-pulse" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <CoursesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/new"
        element={
          <ProtectedRoute>
            <CourseCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id"
        element={
          <ProtectedRoute>
            <CourseDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons/:id"
        element={
          <ProtectedRoute>
            <LessonPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/learning-profile"
        element={
          <ProtectedRoute>
            <LearningProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
