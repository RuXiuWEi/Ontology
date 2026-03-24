import { createContext } from 'react'
import type { MeDto } from '../api/types'
import type { PermissionFlags } from './permissions'

export type AuthContextValue = {
  token: string | null
  me: MeDto | null
  roles: string[]
  permissions: PermissionFlags
  authLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<MeDto | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
