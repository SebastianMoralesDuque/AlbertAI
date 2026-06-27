import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import config from '../config'

const LEVELS = [
  { value: 'beginner', label: 'Principiante', desc: 'Sin experiencia previa' },
  { value: 'intermediate', label: 'Intermedio', desc: 'Conocimientos básicos' },
  { value: 'advanced', label: 'Avanzado', desc: 'Experiencia en el tema' },
] as const

export default function CourseCreatePage() {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [dailyMinutes, setDailyMinutes] = useState(20)
  const [totalDays, setTotalDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      setError('Por favor ingresá un tema para estudiar')
      return
    }
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${config.API_BASE_URL}/api/courses/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          level,
          daily_minutes: dailyMinutes,
          total_days: totalDays,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Error al crear el curso')
        return
      }
      navigate(`/courses/${data.id}`)
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-16 pb-24">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-8 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al panel
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-12 bg-amber-500 rounded-full" />
          <span className="text-amber-500 text-sm font-medium tracking-wide uppercase">Nuevo Curso</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">¿Qué querés aprender?</h1>
        <p className="text-zinc-400 mb-10">
          Definí tu tema y la IA va a generar un plan de estudio personalizado para vos.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Tema a estudiar <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: Álgebra lineal, Python para datos, Historia argentina..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-colors"
              autoFocus
            />
            <p className="text-zinc-600 text-xs mt-1.5">Elegí cualquier tema que te interese aprender</p>
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Tu nivel actual</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LEVELS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLevel(opt.value)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    level === opt.value
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                      : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="font-medium text-sm mb-0.5">{opt.label}</div>
                  <div className="text-xs text-zinc-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Minutos por día
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-zinc-300 font-mono text-sm w-12 text-right">{dailyMinutes}m</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Duración del curso
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={7}
                  max={90}
                  step={1}
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-zinc-300 font-mono text-sm w-12 text-right">{totalDays}d</span>
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div className="bg-gradient-to-r from-amber-500/5 to-orange-600/5 border border-amber-500/10 rounded-xl p-4">
            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-2">Resumen</div>
            <div className="text-sm text-zinc-300">
              Vas a estudiar <span className="text-white font-semibold">{topic || '—'}</span>{' '}
              durante <span className="text-white font-semibold">{totalDays} días</span>,{' '}
              <span className="text-white font-semibold">{dailyMinutes} minutos</span> por día,{' '}
              en nivel <span className="text-white font-semibold">{LEVELS.find(l => l.value === level)?.label}</span>.
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 font-medium py-3 px-4 rounded-xl transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold py-3 px-4 rounded-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando curso...' : 'Crear curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
