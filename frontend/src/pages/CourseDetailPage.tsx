import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import config from '../config'
import type { Course, Lesson, Streak } from '../types'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const TYPE_LABELS: Record<string, string> = {
  theory: 'Teoría',
  practice: 'Práctica',
  review: 'Repaso',
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [streak, setStreak] = useState<Streak | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [courseRes, lessonsRes, streakRes] = await Promise.all([
        fetch(`${config.API_BASE_URL}/api/courses/${id}`, { headers }),
        fetch(`${config.API_BASE_URL}/api/lessons/course/${id}`, { headers }),
        fetch(`${config.API_BASE_URL}/api/streaks/course/${id}`, { headers }),
      ])

      if (!courseRes.ok) {
        setError('Curso no encontrado')
        return
      }

      const courseData = await courseRes.json()
      const lessonsData = courseRes.ok ? await lessonsRes.json() : []
      const streakData = streakRes.ok ? await streakRes.json() : null

      setCourse(courseData)
      setLessons(lessonsData)
      setStreak(streakData)
    } catch {
      setError('Error al cargar el curso')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateLesson = async () => {
    setGenerating(true)
    setGenError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${config.API_BASE_URL}/api/courses/${id}/generate-lesson`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Error al generar la lección')
      }
      // Refetch data to show the new lesson + updated day
      await fetchData()
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Error al generar la lección')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">{error || 'Curso no encontrado'}</p>
        <button onClick={() => navigate('/courses')} className="text-amber-500 hover:text-amber-400 transition-colors underline text-sm">
          Volver a mis cursos
        </button>
      </div>
    )
  }

  const progress = course.total_days > 0 ? Math.round((course.current_day / course.total_days) * 100) : 0
  const courseComplete = course.current_day > course.total_days

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-24">
        {/* Back */}
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-8 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Mis cursos
        </button>

        {/* Course header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-12 bg-amber-500 rounded-full" />
          <span className="text-amber-500 text-sm font-medium tracking-wide uppercase">
            {LEVEL_LABELS[course.level] || course.level}
          </span>
        </div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{course.title}</h1>
            <p className="text-zinc-400">{course.description || course.topic}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Progreso</div>
            <div className="text-2xl font-bold">{courseComplete ? 100 : progress}%</div>
            <div className="text-xs text-zinc-600 mt-1">
              {courseComplete
                ? '¡Completado!'
                : `Día ${course.current_day - 1} de ${course.total_days}`}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Duración diaria</div>
            <div className="text-2xl font-bold">{course.daily_minutes}m</div>
            <div className="text-xs text-zinc-600 mt-1">por día</div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Racha actual</div>
            <div className="text-2xl font-bold text-amber-500">{streak?.current_streak || 0}</div>
            <div className="text-xs text-zinc-600 mt-1">días seguidos</div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Lecciones</div>
            <div className="text-2xl font-bold text-cyan-500">{lessons.length}</div>
            <div className="text-xs text-zinc-600 mt-1">disponibles</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Progreso del curso</span>
            <span className="text-sm text-zinc-500">
              {courseComplete
                ? '¡Completado!'
                : `${course.current_day - 1}/${course.total_days} días`}
            </span>
          </div>
          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-500"
              style={{ width: `${courseComplete ? 100 : progress}%` }}
            />
          </div>
        </div>

        {/* Generate lesson button */}
        {!courseComplete ? (
          <div className="mb-8">
            {generating ? (
              <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
                <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                <div>
                  <p className="text-sm text-amber-400 font-medium">Generando lección con IA...</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Gemini está creando contenido personalizado para {course.topic}
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateLesson}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold py-4 px-6 rounded-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {lessons.length === 0
                  ? 'Generar primera lección con IA'
                  : `Generar día ${course.current_day} — ${course.topic}`}
              </button>
            )}
            {genError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mt-3">
                {genError}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-8 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center">
            <div className="text-emerald-500 text-lg font-bold mb-1">🎉 ¡Curso completado!</div>
            <p className="text-zinc-400 text-sm">Completaste las {course.total_days} lecciones de {course.topic}.</p>
          </div>
        )}

        {/* Lessons */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 w-12 bg-cyan-500 rounded-full" />
          <span className="text-cyan-500 text-sm font-medium tracking-wide uppercase">Lecciones</span>
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">Todavía no hay lecciones generadas para este curso.</p>
            <p className="text-zinc-600 text-xs mt-1">Hacé clic en "Generar primera lección" arriba para empezar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => navigate(`/lessons/${lesson.id}`)}
                className="w-full flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-xl p-4 text-left hover:bg-white/[0.04] hover:border-white/10 transition-all group"
              >
                {/* Day number */}
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-all">
                  <span className="text-sm font-bold text-zinc-500 group-hover:text-amber-500 transition-colors">
                    {lesson.day_number}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-sm group-hover:text-amber-500 transition-colors truncate">
                      {lesson.title}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-600 bg-white/[0.03] px-1.5 py-0.5 rounded">
                      {TYPE_LABELS[lesson.lesson_type] || lesson.lesson_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-600">
                    <span>{lesson.estimated_minutes} min</span>
                    {lesson.concepts?.length > 0 && (
                      <span>{lesson.concepts.slice(0, 2).join(', ')}{lesson.concepts.length > 2 ? '...' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-amber-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
