export type PermissionFlags = {
  isAdmin: boolean
  isEditor: boolean
  isViewer: boolean
  isReadOnly: boolean
  canManageModel: boolean
  canManageInstances: boolean
  canManageActions: boolean
  canManageVersions: boolean
  canManageRbac: boolean
  canAccessIntegration: boolean
}

export type PermissionKey = keyof PermissionFlags

export const EMPTY_PERMISSIONS: PermissionFlags = {
  isAdmin: false,
  isEditor: false,
  isViewer: false,
  isReadOnly: true,
  canManageModel: false,
  canManageInstances: false,
  canManageActions: false,
  canManageVersions: false,
  canManageRbac: false,
  canAccessIntegration: false,
}

export function buildPermissions(roles: readonly string[] | null | undefined): PermissionFlags {
  const normalized = new Set((roles ?? []).map((role) => role.toUpperCase()))
  const isAdmin = normalized.has('ADMIN')
  const isEditor = normalized.has('EDITOR')
  const isViewer = normalized.has('VIEWER')
  const canWrite = isAdmin || isEditor

  return {
    isAdmin,
    isEditor,
    isViewer,
    isReadOnly: !canWrite,
    canManageModel: canWrite,
    canManageInstances: canWrite,
    canManageActions: canWrite,
    canManageVersions: canWrite,
    canManageRbac: isAdmin,
    canAccessIntegration: canWrite,
  }
}

export function hasPermission(
  permissions: PermissionFlags,
  permission: PermissionKey | ((value: PermissionFlags) => boolean),
): boolean {
  if (typeof permission === 'function') {
    return permission(permissions)
  }
  return permissions[permission]
}
