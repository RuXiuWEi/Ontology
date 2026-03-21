import { apiClient } from './client'
import type { ApiResponse, AuditLogDto, PageResponse } from './types'

export type ListAuditLogsParams = {
  username?: string
  action?: string
  resource?: string
  from?: string
  to?: string
  page?: number
  size?: number
}

export async function listAuditLogsPage(
  params?: ListAuditLogsParams,
): Promise<PageResponse<AuditLogDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<AuditLogDto>>>(
    '/api/audit-logs',
    {
      params: {
        username: params?.username || undefined,
        action: params?.action || undefined,
        resource: params?.resource || undefined,
        from: params?.from || undefined,
        to: params?.to || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    },
  )
  return data.data
}
