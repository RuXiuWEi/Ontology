export type ApiResponse<T> = {
  code: number
  message: string
  data: T
  timestamp: string
}

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ObjectTypeDto = {
  id: number
  code: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

export type ObjectInstanceDto = {
  id: number
  typeId: number
  typeCode: string
  name: string
  attributes?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type MeDto = {
  id: number
  username: string
  roles: string[]
}

export type DashboardDailyPointDto = {
  day: string
  objectTypeCreated: number
  objectInstanceCreated: number
  auditEvents: number
}

export type DashboardDimension = 'OBJECT_TYPE' | 'OBJECT_INSTANCE'

export type DashboardSummaryDto = {
  objectTypeTotal: number
  objectTypeCreatedLast7Days: number
  objectInstanceTotal: number
  objectInstanceCreatedLast7Days: number
  activeUserTotal: number
  auditEventsLast7Days: number
  dailyTrend: DashboardDailyPointDto[]
}

export type AuditLogDto = {
  id: number
  username: string | null
  action: string
  resource: string
  resourceId: string | null
  details: string | null
  createdAt: string
}

export type RoleDto = {
  id: number
  name: string
}

export type UserSummaryDto = {
  id: number
  username: string
  enabled: boolean
  roles: string[]
  createdAt: string
  updatedAt: string
}

export type RbacRoleDto = RoleDto
export type RbacUserDto = UserSummaryDto
