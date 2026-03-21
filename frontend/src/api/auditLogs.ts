import { apiClient } from './client'
import type { ApiResponse, AuditLogDto, PageResponse } from './types'

export type ListAuditLogsParams = {
  username?: string
  action?: string
  resource?: string
  preset?: AuditTimePreset
  from?: string
  to?: string
  page?: number
  size?: number
}

export type AuditTimePreset = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS'

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
        preset: params?.preset || undefined,
        from: params?.from || undefined,
        to: params?.to || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    },
  )
  return data.data
}

export function buildAuditExportUrl(params?: ListAuditLogsParams): string {
  const search = new URLSearchParams()
  if (params?.username) search.set('username', params.username)
  if (params?.action) search.set('action', params.action)
  if (params?.resource) search.set('resource', params.resource)
  if (params?.preset) search.set('preset', params.preset)
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  const qs = search.toString()
  return qs ? `/api/audit-logs/export?${qs}` : '/api/audit-logs/export'
}

export async function exportAuditLogsCsv(params?: ListAuditLogsParams): Promise<Blob> {
  const url = buildAuditExportUrl(params)
  const { data } = await apiClient.get<Blob>(url, {
    responseType: 'blob',
  })
  return data
}
