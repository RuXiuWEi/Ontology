import { apiClient } from './client'
import type { ApiResponse, DashboardSummaryDto } from './types'

export async function getDashboardSummary(): Promise<DashboardSummaryDto> {
  const { data } = await apiClient.get<ApiResponse<DashboardSummaryDto>>(
    '/api/dashboard/summary',
  )
  return data.data
}
