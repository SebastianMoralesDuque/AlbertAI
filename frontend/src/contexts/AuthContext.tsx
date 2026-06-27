import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  is_google_user: boolean
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async (token: string) => {
    try {
      console.log('[Auth] fetchUser - token preview:', token.substring(0, 30) + '...')
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log('[Auth] fetchUser - response status:', res.status)
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      console.log('[Auth] fetchUser - user authenticated:', data.email)
      setUser(data)
    } catch {
      console.warn('[Auth] fetchUser - failed, clearing auth state')
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchUser(token).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token, fetchUser])

  const login = async (newToken: string) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    await fetchUser(newToken)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
