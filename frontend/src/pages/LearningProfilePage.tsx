import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import config from '../config'
import type { LearningProfile, ConceptDetail } from '../types'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

function ConceptBar({ detail }: { detail: ConceptDetail }) {
  const rate = detail.mastery_rate
  const color =
    rate >= 0.7 ? 'bg-emerald-500' : rate >= 0.4 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 text-zinc-300 truncate flex-shrink-0">{detail.name}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${rate * 100}%` }} />
      </div>
      <span className="w-16 text-right text-zinc-500 tabular-nums flex-shrink-0">
        {Math.round(rate * 100)}%
      </span>
      <span className="w-20 text-right text-zinc-600 tabular-nums flex-shrink-0 text-xs">
        {detail.times_mastered}✓ / {detail.times_failed}✗
      </span>
    </div>
  )
}

export default function LearningProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<LearningProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) fetchProfile()
  }, [id])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${config.API_BASE_URL}/api/courses/${id}/learning-profile`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) throw new Error('No se pudo cargar el perfil')
      setProfile(await res.json())
    } catch {
      setError('Error al cargar el perfil de aprendizaje')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">{error || 'Perfil no encontrado'}</p>
        <button onClick={() => navigate('/courses')} className="text-amber-500 hover:text-amber-400 underline text-sm">
          Volver a mis cursos
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-24">
        {/* Back */}
        <button
          onClick={() => navigate(`/courses/${id}`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-8 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al curso
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-12 bg-amber-500 rounded-full" />
          <span className="text-amber-500 text-sm font-medium tracking-wide uppercase">
            Perfil de Aprendizaje
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">{profile.course_title}</h1>
        <p className="text-zinc-400 mb-8">Esto es lo que la IA sabe sobre tu aprendizaje</p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Progreso</div>
            <div className="text-2xl font-bold">
              {profile.total_days > 0
                ? Math.round((profile.current_day - 1) / profile.total_days * 100)
                : 0}%
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              Día {profile.current_day - 1} de {profile.total_days}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Racha</div>
            <div className="text-2xl font-bold text-amber-500">{profile.current_streak}</div>
            <div className="text-xs text-zinc-600 mt-1">días seguidos</div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Mejor puntaje</div>
            <div className={`text-2xl font-bold ${profile.best_overall_score >= 0.7 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {Math.round(profile.best_overall_score * 100)}%
            </div>
            <div className="text-xs text-zinc-600 mt-1">global</div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Nivel</div>
            <div className="text-2xl font-bold text-cyan-500">{LEVEL_LABELS[profile.course_level] || profile.course_level}</div>
            <div className="text-xs text-zinc-600 mt-1">{profile.total_quiz_attempts} intentos</div>
          </div>
        </div>

        {/* Agent's view — what the AI knows */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-cyan-500 rounded-full" />
            <span className="text-cyan-500 text-sm font-medium tracking-wide uppercase">Qué sabe la IA</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mastered */}
            <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-emerald-500 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Conceptos dominados ({profile.mastered_concepts.length})
              </h3>
              {profile.mastered_concepts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.mastered_concepts.map((c) => (
                    <span key={c} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-600 text-sm">Todavía no hay conceptos dominados</p>
              )}
            </div>

            {/* Failed */}
            <div className="bg-red-500/[0.02] border border-red-500/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Conceptos fallidos ({profile.failed_concepts.length})
              </h3>
              {profile.failed_concepts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.failed_concepts.map((c) => (
                    <span key={c} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-600 text-sm">No hay conceptos fallidos</p>
              )}
            </div>
          </div>

          {/* Weak areas */}
          {profile.weak_areas.length > 0 && (
            <div className="bg-amber-500/[0.02] border border-amber-500/10 rounded-xl p-5 mt-4">
              <h3 className="text-sm font-semibold text-amber-500 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Áreas débiles (prioridad para la IA)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.weak_areas.map((c) => (
                  <span key={c} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-2">Estos conceptos aparecen más seguido en tus fallos — la IA los reforzará en futuras lecciones.</p>
            </div>
          )}
        </div>

        {/* Concept mastery bars */}
        {profile.concept_details.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-12 bg-zinc-700 rounded-full" />
              <span className="text-zinc-500 text-sm font-medium tracking-wide uppercase">Detalle por concepto</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
              {profile.concept_details.map((d) => (
                <ConceptBar key={d.name} detail={d} />
              ))}
            </div>
          </div>
        )}

        {/* Recent scores */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-zinc-700 rounded-full" />
            <span className="text-zinc-500 text-sm font-medium tracking-wide uppercase">Puntajes recientes</span>
          </div>
          {profile.recent_scores.length > 0 ? (
            <div className="flex items-end gap-2 h-24">
              {profile.recent_scores.map((score, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-zinc-600 tabular-nums">{Math.round(score * 100)}%</span>
                  <div
                    className={`w-full rounded-t ${score >= 0.7 ? 'bg-emerald-500/60' : 'bg-amber-500/60'} transition-all`}
                    style={{ height: `${score * 100}%`, minHeight: 4 }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">Todavía no hay puntajes registrados</p>
          )}
        </div>

        {/* Per-lesson breakdown */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-zinc-700 rounded-full" />
            <span className="text-zinc-500 text-sm font-medium tracking-wide uppercase">Lecciones</span>
          </div>
          <div className="space-y-2">
            {profile.lessons.map((l) => (
              <div
                key={l.lesson_id}
                className={`rounded-xl border p-4 flex items-center gap-4 ${
                  l.quiz_passed
                    ? 'bg-emerald-500/[0.02] border-emerald-500/10'
                    : l.attempts > 0
                      ? 'bg-amber-500/[0.02] border-amber-500/10'
                      : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                  l.quiz_passed
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : l.attempts > 0
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-zinc-800 text-zinc-600'
                }`}>
                  {l.day_number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${l.quiz_passed ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {l.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-600 bg-white/[0.03] px-1.5 py-0.5 rounded">
                      {l.lesson_type === 'theory' ? 'Teoría' : l.lesson_type === 'practice' ? 'Práctica' : 'Repaso'}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    {l.attempts > 0
                      ? `${Math.round(l.best_score * 100)}% · ${l.attempts} intento${l.attempts > 1 ? 's' : ''}`
                      : 'Sin intentos'}
                  </div>
                </div>
                {l.quiz_passed && (
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
