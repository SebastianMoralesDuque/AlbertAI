import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      console.log('[AuthCallback] token received from URL, preview:', token.substring(0, 30) + '...')
      login(token).then(() => navigate('/'))
    } else {
      console.warn('[AuthCallback] no token in URL, redirecting to /login')
      navigate('/login')
    }
  }, [searchParams, login, navigate])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <div className="text-center">
        <img src="/logo.png" alt="AprendizajeAI" className="w-12 h-12 object-contain mx-auto mb-4 animate-pulse" />
        <p className="text-zinc-400 text-sm">Iniciando sesión...</p>
      </div>
    </div>
  )
}
