import { useMemo } from 'react'
import { hasPermission, type PermissionFlags, type PermissionKey } from './permissions'
import { useAuth } from './useAuth'

export function usePermissions() {
  const { permissions } = useAuth()

  return useMemo(
    () => ({
      permissions,
      can(permission: PermissionKey | ((value: PermissionFlags) => boolean)) {
        return hasPermission(permissions, permission)
      },
    }),
    [permissions],
  )
}
