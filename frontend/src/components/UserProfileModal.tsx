import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UserProfileModalProps {
  onClose: () => void
}

export default function UserProfileModal({ onClose }: UserProfileModalProps) {
  const { user, logout } = useAuth()
  const [confirming, setConfirming] = useState(false)

  const handleLogout = () => {
    logout()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-[#0d0d14] border border-white/[0.06] rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!confirming ? (
          /* ── Profile view ── */
          <div className="p-6">
            {/* Avatar */}
            <div className="flex justify-center mb-5">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-20 h-20 rounded-full ring-2 ring-white/[0.08] object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 ring-2 ring-white/[0.08] flex items-center justify-center">
                  <span className="text-2xl font-bold text-zinc-400">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <h2 className="text-center text-lg font-semibold text-white mb-0.5">
              {user?.full_name || user?.username}
            </h2>
            <p className="text-center text-sm text-zinc-500 mb-1">
              @{user?.username}
            </p>

            {/* Email */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 mb-6">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <span>{user?.email}</span>
            </div>

            {/* Connected account badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1">
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                </svg>
                <span className="text-xs text-zinc-500">Conectado con GitHub</span>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => setConfirming(true)}
              className="w-full flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-zinc-400 hover:text-red-400 font-medium py-2.5 px-4 rounded-xl transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        ) : (
          /* ── Confirm logout ── */
          <div className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">¿Cerrar sesión?</h3>
              <p className="text-zinc-500 text-sm max-w-xs">
                Vas a salir de tu cuenta. Vas a necesitar volver a iniciar sesión para acceder.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 font-medium py-2.5 px-4 rounded-xl transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
