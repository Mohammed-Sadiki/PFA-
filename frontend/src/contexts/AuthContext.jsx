import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout, getMe } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  // Verify token on mount by fetching /auth/me
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then((me) => {
        setUser(me)
        localStorage.setItem('user', JSON.stringify(me))
      })
      .catch(() => {
        // Token invalid — clear session
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username, password) => {
    const { access_token } = await apiLogin(username, password)
    localStorage.setItem('token', access_token)
    setToken(access_token)
    const me = await getMe()
    setUser(me)
    localStorage.setItem('user', JSON.stringify(me))
    return me
  }, [])

  const logout = useCallback(async () => {
    try { await apiLogout() } catch { /* ignore */ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return
    const me = await getMe()
    setUser(me)
    localStorage.setItem('user', JSON.stringify(me))
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, isAdmin: user?.is_admin ?? false }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
