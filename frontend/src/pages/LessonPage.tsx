import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import config from '../config'
import type { Lesson, QuizResult } from '../types'

type Phase = 'reading' | 'quiz' | 'result'

export default function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<Phase>('reading')

  // Quiz state
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [quizError, setQuizError] = useState('')
  const [startTime, setStartTime] = useState(0)

  useEffect(() => {
    if (id) fetchLesson()
  }, [id])

  const fetchLesson = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${config.API_BASE_URL}/api/lessons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Lección no encontrada')
      const data: Lesson = await res.json()
      setLesson(data)
      setCourseId(data.course_id)
      resetQuiz(data)
    } catch {
      setError('No se pudo cargar la lección')
    } finally {
      setLoading(false)
    }
  }

  const resetQuiz = (data?: Lesson) => {
    const l = data || lesson
    if (!l) return
    const numQuestions = l.quiz_data?.questions?.length || 0
    setAnswers(new Array(numQuestions).fill(-1))
    setResult(null)
    setQuizError('')
    setStartTime(Date.now())
  }

  const handleStartQuiz = () => {
    setPhase('quiz')
    setStartTime(Date.now())
  }

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[questionIndex] = optionIndex
      return next
    })
  }

  const handleSubmitQuiz = async () => {
    const unanswered = answers.findIndex((a) => a === -1)
    if (unanswered !== -1) {
      setQuizError(`Respondé la pregunta ${unanswered + 1} antes de enviar`)
      return
    }

    setSubmitting(true)
    setQuizError('')
    try {
      const token = localStorage.getItem('token')
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      const res = await fetch(`${config.API_BASE_URL}/api/lessons/${id}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lesson_id: Number(id),
          answers,
          time_spent_seconds: timeSpent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al enviar el quiz')
      setResult(data)
      setPhase('result')

      // Update streak in background
      if (lesson) {
        fetch(`${config.API_BASE_URL}/api/streaks/course/${lesson.course_id}/update`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    } catch (e: unknown) {
      setQuizError(e instanceof Error ? e.message : 'Error al enviar las respuestas')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setPhase('quiz')
    resetQuiz()
  }

  const handleNextDay = () => {
    if (courseId) {
      navigate(`/courses/${courseId}`)
    } else {
      navigate('/courses')
    }
  }

  const handleBackToCourse = () => {
    if (courseId) {
      navigate(`/courses/${courseId}`)
    } else {
      navigate('/courses')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">{error || 'Lección no encontrada'}</p>
        <button onClick={handleBackToCourse} className="text-amber-500 hover:text-amber-400 transition-colors underline text-sm">
          Volver al curso
        </button>
      </div>
    )
  }

  const questions = lesson.quiz_data?.questions || []
  const allAnswered = answers.every((a) => a !== -1)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-16 pb-24">
        {/* Back */}
        <button
          onClick={handleBackToCourse}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-8 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al curso
        </button>

        {/* Phase indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`flex items-center gap-2 ${phase === 'reading' ? 'text-amber-500' : 'text-zinc-600'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              phase === 'reading' ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-800 text-zinc-500'
            }`}>1</div>
            <span className="text-sm">Leer</span>
          </div>
          <div className="h-px w-8 bg-zinc-700" />
          <div className={`flex items-center gap-2 ${phase === 'quiz' ? 'text-cyan-500' : phase === 'result' ? `text-${result?.passed ? 'emerald' : 'amber'}-500` : 'text-zinc-600'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              phase === 'quiz' ? 'bg-cyan-500/20 text-cyan-500' :
              phase === 'result' && result?.passed ? 'bg-emerald-500/20 text-emerald-500' :
              phase === 'result' ? 'bg-amber-500/20 text-amber-500' :
              'bg-zinc-800 text-zinc-500'
            }`}>2</div>
            <span className="text-sm">Quiz</span>
          </div>
          {phase === 'result' && (
            <>
              <div className="h-px w-8 bg-zinc-700" />
              <div className={`flex items-center gap-2 ${result?.passed ? 'text-emerald-500' : 'text-amber-500'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  result?.passed ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                }`}>
                  {result?.passed ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm">{result?.passed ? 'Aprobado' : 'A repasar'}</span>
              </div>
            </>
          )}
        </div>

        {/* ══════ READING PHASE ══════ */}
        {phase === 'reading' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-12 bg-amber-500 rounded-full" />
              <span className="text-amber-500 text-sm font-medium tracking-wide uppercase">
                Día {lesson.day_number} · {lesson.estimated_minutes} min ·{' '}
                {lesson.lesson_type === 'theory' ? 'Teoría' : lesson.lesson_type === 'practice' ? 'Práctica' : 'Repaso'}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-6">{lesson.title}</h1>

            {lesson.concepts?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {lesson.concepts.map((concept) => (
                  <span
                    key={concept}
                    className="text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            )}

            <div className="prose prose-invert max-w-none mb-10">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mt-8 mb-3 text-white">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mt-6 mb-2 text-zinc-200">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-zinc-300 mb-4 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc ml-5 mb-4 space-y-1 text-zinc-300">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-5 mb-4 space-y-1 text-zinc-300">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-zinc-300">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-white">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-zinc-200">{children}</em>
                  ),
                  code: ({ children }) => (
                    <code className="bg-white/5 text-amber-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 overflow-x-auto text-sm font-mono text-zinc-200">{children}</pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-amber-500/30 pl-4 mb-4 text-zinc-400 italic">{children}</blockquote>
                  ),
                  hr: () => (
                    <hr className="border-white/5 my-6" />
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-amber-400 hover:text-amber-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full border-collapse text-sm text-zinc-300">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold text-white">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-white/10 px-3 py-2">{children}</td>
                  ),
                }}
              >
                {lesson.content}
              </ReactMarkdown>
            </div>

            {questions.length > 0 && (
              <div className="border-t border-white/5 pt-8">
                <button
                  onClick={handleStartQuiz}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-4 px-6 rounded-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all duration-300"
                >
                  Empezar quiz ({questions.length} preguntas)
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════ QUIZ PHASE ══════ */}
        {phase === 'quiz' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-12 bg-cyan-500 rounded-full" />
              <span className="text-cyan-500 text-sm font-medium tracking-wide uppercase">
                Quiz · {questions.length} preguntas
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-8">Ponete a prueba</h2>

            {questions.map((q, qi) => (
              <div key={qi} className="mb-8 bg-white/[0.02] border border-white/5 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {qi + 1}
                  </span>
                  <p className="text-zinc-200 font-medium">{q.question}</p>
                </div>

                <div className="space-y-2 ml-9">
                  {q.options.map((option, oi) => {
                    const isSelected = answers[qi] === oi
                    return (
                      <button
                        key={oi}
                        onClick={() => handleAnswer(qi, oi)}
                        className={`w-full text-left p-3 rounded-xl text-sm border transition-all ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                            : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:bg-white/[0.05] hover:border-white/20'
                        }`}
                      >
                        <span className={`inline-block w-5 h-5 rounded-full border text-xs flex items-center justify-center mr-3 ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/20 text-cyan-500'
                            : 'border-zinc-600 text-zinc-600'
                        }`}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {quizError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-4">
                {quizError}
              </p>
            )}

            <button
              onClick={handleSubmitQuiz}
              disabled={submitting || !allAnswered}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold py-4 px-6 rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Enviando...'
                : allAnswered
                  ? 'Enviar respuestas'
                  : `Respondé todas (${answers.filter(a => a !== -1).length}/${questions.length})`
              }
            </button>
          </>
        )}

        {/* ══════ RESULT PHASE ══════ */}
        {phase === 'result' && result && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-1 w-12 ${result.passed ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full`} />
              <span className={`text-sm font-medium tracking-wide uppercase ${result.passed ? 'text-emerald-500' : 'text-amber-500'}`}>
                Resultado {result.attempts > 1 ? `· Intento #${result.attempts}` : ''}
              </span>
            </div>

            {/* Score card */}
            <div className={`rounded-2xl p-8 text-center mb-6 border ${
              result.passed
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
            }`}>
              <div className={`text-6xl font-bold mb-2 ${
                result.passed ? 'text-emerald-500' : 'text-amber-500'
              }`}>
                {Math.round(result.score * 100)}%
              </div>
              {result.attempts > 1 && result.best_score > result.score && (
                <div className="text-sm text-zinc-500 mb-1">Mejor puntaje: {Math.round(result.best_score * 100)}%</div>
              )}
              <p className={`text-lg font-medium ${result.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {result.passed ? '¡Aprobado!' : 'Necesitás repasar'}
              </p>
              <p className="text-zinc-400 text-sm mt-2">{result.feedback}</p>
            </div>

            {/* Per-question results */}
            {result.question_results && result.question_results.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wide">Revisión por pregunta</h3>
                <div className="space-y-3">
                  {result.question_results.map((qr) => (
                    <div
                      key={qr.question_index}
                      className={`rounded-xl border p-4 ${
                        qr.is_correct
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          qr.is_correct ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        }`}>
                          {qr.is_correct ? (
                            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 mb-1">{qr.question}</p>
                          <div className="text-xs space-y-0.5">
                            {!qr.is_correct && (
                              <p className="text-red-400">
                                Elegiste: <span className="line-through opacity-70">Opción {String.fromCharCode(65 + qr.selected_answer)}</span>
                              </p>
                            )}
                            <p className={qr.is_correct ? 'text-emerald-400' : 'text-emerald-400'}>
                              Respuesta correcta: Opción {String.fromCharCode(65 + qr.correct_answer)}
                            </p>
                            <p className="text-zinc-500 mt-1">{qr.explanation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Concepts */}
            {result.concepts_mastered.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-emerald-500 mb-2">Conceptos dominados</h3>
                <div className="flex flex-wrap gap-2">
                  {result.concepts_mastered.map((c) => (
                    <span key={c} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.concepts_failed.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-amber-500 mb-2">Conceptos a repasar</h3>
                <div className="flex flex-wrap gap-2">
                  {result.concepts_failed.map((c) => (
                    <span key={c} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {!result.passed && (
                <button
                  onClick={handleRetry}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold py-4 px-6 rounded-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300"
                >
                  Reintentar quiz
                </button>
              )}
              <button
                onClick={result.passed ? handleNextDay : handleBackToCourse}
                className={`flex-1 font-semibold py-4 px-6 rounded-xl transition-all duration-300 ${
                  result.passed
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300'
                }`}
              >
                {result.passed ? 'Siguiente día →' : 'Volver al curso'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
