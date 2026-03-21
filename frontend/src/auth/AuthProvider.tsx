import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import { AUTH_TOKEN_KEY } from '../config'
import { AuthContext } from './auth-context'

function readStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken)

  const login = useCallback(async (username: string, password: string) => {
    const t = await authApi.login({ username, password })
    localStorage.setItem(AUTH_TOKEN_KEY, t)
    setToken(t)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({ token, login, logout }),
    [token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
