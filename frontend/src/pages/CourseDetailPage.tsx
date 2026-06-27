import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import config from '../config'
import type { Course, Lesson, Streak } from '../types'

interface LessonProgress {
  lesson_id: number
  day_number: number
  title: string
  quiz_passed: boolean
  best_score: number
  attempts: number
}

interface ProgressData {
  course_id: number
  total_lessons: number
  lessons: LessonProgress[]
}

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
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
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

      const [courseRes, lessonsRes, streakRes, progressRes] = await Promise.all([
        fetch(`${config.API_BASE_URL}/api/courses/${id}`, { headers }),
        fetch(`${config.API_BASE_URL}/api/lessons/course/${id}`, { headers }),
        fetch(`${config.API_BASE_URL}/api/streaks/course/${id}`, { headers }),
        fetch(`${config.API_BASE_URL}/api/courses/${id}/progress`, { headers }),
      ])

      if (!courseRes.ok) {
        setError('Curso no encontrado')
        return
      }

      setCourse(await courseRes.json())
      setLessons(courseRes.ok ? await lessonsRes.json() : [])
      setStreak(streakRes.ok ? await streakRes.json() : null)
      setProgressData(progressRes.ok ? await progressRes.json() : null)
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

  const progress = course.total_days > 0 ? Math.round((course.current_day - 1) / course.total_days * 100) : 0
  const courseComplete = course.current_day > course.total_days
  const passedLessonIds = new Set(
    (progressData?.lessons || [])
      .filter((l) => l.quiz_passed)
      .map((l) => l.lesson_id),
  )

  // Determine what day the user is currently on (latest lesson that exists and can be studied)
  const currentDay = course.current_day - 1 // 0 = none yet

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
                : `${passedLessonIds.size}/${course.total_days} días`}
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
            <div className="text-xs text-zinc-600 mt-1">generadas</div>
          </div>
        </div>

        {/* Day road / timeline */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Tu progreso diario</span>
            <span className="text-sm text-zinc-500">
              {passedLessonIds.size} de {course.total_days} días completados
            </span>
          </div>
          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-500"
              style={{ width: `${courseComplete ? 100 : progress}%` }}
            />
          </div>
        </div>

        {/* Generate section */}
        <div className="mb-8">
          {courseComplete ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center">
              <div className="text-emerald-500 text-lg font-bold mb-1">🎉 ¡Curso completado!</div>
              <p className="text-zinc-400 text-sm">Completaste las {course.total_days} lecciones de {course.topic}.</p>
            </div>
          ) : generating ? (
            <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
              <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <div>
                <p className="text-sm text-amber-400 font-medium">Generando lección con IA...</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Gemini está analizando tu progreso y creando contenido personalizado
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
                ? 'Comenzar Día 1'
                : `Generar Día ${course.current_day}`}
            </button>
          )}
          {genError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mt-3">
              {genError}
            </p>
          )}
        </div>

        {/* Day-by-day lesson list */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 w-12 bg-cyan-500 rounded-full" />
          <span className="text-cyan-500 text-sm font-medium tracking-wide uppercase">Lecciones</span>
          {passedLessonIds.size > 0 && (
            <span className="text-xs text-zinc-600 ml-auto">
              {passedLessonIds.size} completadas
            </span>
          )}
        </div>

        {/* Build full day grid from 1 to total_days */}
        <div className="space-y-2">
          {Array.from({ length: course.total_days }, (_, i) => i + 1).map((day) => {
            const lessonForDay = lessons.find((l) => l.day_number === day)
            const progressForDay = progressData?.lessons.find((l) => l.day_number === day)
            const isCompleted = progressForDay?.quiz_passed ?? false
            const isCurrent = !isCompleted && lessonForDay != null
            const isLocked = lessonForDay == null
            const attempts = progressForDay?.attempts ?? 0
            const bestScore = progressForDay?.best_score ?? 0

            return (
              <div
                key={day}
                className={`flex items-center gap-4 rounded-xl p-4 border transition-all ${
                  isLocked
                    ? 'bg-white/[0.01] border-white/[0.03] opacity-40'
                    : isCompleted
                      ? 'bg-emerald-500/[0.02] border-emerald-500/10'
                      : isCurrent
                        ? 'bg-amber-500/[0.02] border-amber-500/15 hover:bg-amber-500/[0.04]'
                        : 'bg-white/[0.02] border-white/5'
                } ${!isLocked ? 'hover:border-white/10 cursor-pointer' : 'cursor-default'}`}
                onClick={() => {
                  if (!isLocked && lessonForDay) {
                    navigate(`/lessons/${lessonForDay.id}`)
                  }
                }}
              >
                {/* Day badge */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : isCurrent
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : isLocked
                        ? 'bg-zinc-800/50 border-zinc-800 text-zinc-600'
                        : 'bg-white/[0.03] border-white/[0.06] text-zinc-500'
                }`}>
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isLocked ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">{day}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {lessonForDay ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          isCompleted ? 'text-emerald-400' : isCurrent ? 'text-white' : 'text-zinc-400'
                        }`}>
                          {lessonForDay.title}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-600 bg-white/[0.03] px-1.5 py-0.5 rounded">
                          {TYPE_LABELS[lessonForDay.lesson_type] || lessonForDay.lesson_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs mt-0.5">
                        <span className="text-zinc-600">{lessonForDay.estimated_minutes} min</span>
                        {isCompleted && (
                          <span className="text-emerald-600">
                            ✔ {Math.round(bestScore * 100)}% {attempts > 1 ? `(${attempts} intentos)` : ''}
                          </span>
                        )}
                        {!isCompleted && isCurrent && attempts > 0 && (
                          <span className="text-amber-600">
                            {Math.round(bestScore * 100)}% — reintentar
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={`text-sm font-medium ${isLocked ? 'text-zinc-600' : ''}`}>
                        {isCompleted ? 'Completado' : isLocked ? 'Bloqueado' : ''}
                      </span>
                      <div className="text-xs text-zinc-700 mt-0.5">
                        {isLocked && 'Aprobá el día anterior para desbloquear'}
                      </div>
                    </>
                  )}
                </div>

                {/* Right indicator */}
                {isCompleted ? (
                  <div className="text-emerald-600 text-xs font-medium">Completado</div>
                ) : isCurrent ? (
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
