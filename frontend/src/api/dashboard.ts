import { apiClient } from './client'
import type { ApiResponse, DashboardSummaryDto } from './types'

export type DashboardDimension = 'OBJECT_TYPE' | 'OBJECT_INSTANCE'

export async function getDashboardSummary(
  dimension: DashboardDimension,
): Promise<DashboardSummaryDto> {
  const { data } = await apiClient.get<ApiResponse<DashboardSummaryDto>>(
    '/api/dashboard/summary',
    {
      params: { dimension },
    },
  )
  return data.data
}
