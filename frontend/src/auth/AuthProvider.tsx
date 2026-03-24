import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import type { MeDto } from '../api/types'
import { AUTH_TOKEN_KEY } from '../config'
import { buildPermissions } from './permissions'
import { AuthContext } from './auth-context'

function readStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken)
  const [me, setMe] = useState<MeDto | null>(null)
  const [loading, setLoading] = useState(Boolean(token))

  const refreshMe = useCallback(async () => {
    if (!readStoredToken()) {
      setMe(null)
      setLoading(false)
      return null
    }
    setLoading(true)
    try {
      const profile = await authApi.getMe()
      setMe(profile)
      return profile
    } catch {
      setMe(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const t = await authApi.login({ username, password })
    localStorage.setItem(AUTH_TOKEN_KEY, t)
    setToken(t)
    setLoading(true)
    const profile = await authApi.getMe()
    setMe(profile)
    setLoading(false)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
    setMe(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!token) {
      setMe(null)
      setLoading(false)
      return
    }
    void refreshMe()
  }, [token, refreshMe])

  const value = useMemo(
    () => ({
      token,
      me,
      roles: me?.roles ?? [],
      permissions: buildPermissions(me?.roles),
      authLoading: loading,
      login,
      logout,
      refreshMe,
    }),
    [token, me, loading, login, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
