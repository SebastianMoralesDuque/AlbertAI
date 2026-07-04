import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import config from '../config'
import type { Course } from '../types'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
}

export default function CoursesPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${config.API_BASE_URL}/api/courses/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al cargar cursos')
      const data = await res.json()
      setCourses(data)
    } catch {
      setError('No se pudieron cargar tus cursos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, courseId: number, courseTitle: string) => {
    e.stopPropagation()
    const confirmed = window.confirm(`¿Eliminar el curso "${courseTitle}"?\n\nEsta acción no se puede deshacer. Se eliminarán todas las lecciones y progreso asociado.`)
    if (!confirmed) return

    setDeletingId(courseId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${config.API_BASE_URL}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al eliminar')
      setCourses((prev) => prev.filter((c) => c.id !== courseId))
    } catch {
      setError('No se pudo eliminar el curso')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-4 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Volver al panel
            </button>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-12 bg-amber-500 rounded-full" />
              <span className="text-amber-500 text-sm font-medium tracking-wide uppercase">Mis Cursos</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Tus cursos de aprendizaje</h1>
          </div>
          <button
            onClick={() => navigate('/courses/new')}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold py-3 px-5 rounded-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo curso
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchCourses}
              className="mt-3 text-sm text-zinc-400 hover:text-white transition-colors underline"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">No tenés cursos todavía</h3>
            <p className="text-zinc-600 text-sm max-w-sm mx-auto mb-6">
              Creá tu primer curso y empezá a aprender con lecciones generadas por IA.
            </p>
            <button
              onClick={() => navigate('/courses/new')}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold py-3 px-6 rounded-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300"
            >
              Crear mi primer curso
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-left hover:bg-white/[0.04] hover:border-white/10 transition-all group relative"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, course.id, course.title)}
                  disabled={deletingId === course.id}
                  className="absolute top-3 right-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-zinc-600 transition-all disabled:opacity-50"
                  title="Eliminar curso"
                >
                  {deletingId === course.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      course.status === 'active' ? 'bg-emerald-500' :
                      course.status === 'completed' ? 'bg-cyan-500' : 'bg-zinc-500'
                    }`} />
                    <span className="text-xs text-zinc-500">{STATUS_LABELS[course.status]}</span>
                  </div>
                  <div className="text-xs text-zinc-600 font-mono">
                    Día {course.current_day}/{course.total_days}
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-1 group-hover:text-amber-500 transition-colors">
                  {course.title}
                </h3>
                <p className="text-zinc-500 text-sm mb-4 line-clamp-2">
                  {course.description || course.topic}
                </p>

                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  <span className="bg-white/[0.04] px-2.5 py-1 rounded-full">
                    {LEVEL_LABELS[course.level] || course.level}
                  </span>
                  <span>{course.daily_minutes} min/día</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
