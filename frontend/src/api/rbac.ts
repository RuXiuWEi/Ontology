import { apiClient } from './client'
import type { ApiResponse, PageResponse, RoleDto, UserSummaryDto } from './types'

export async function listRbacRoles(): Promise<RoleDto[]> {
  const { data } = await apiClient.get<ApiResponse<RoleDto[]>>('/api/rbac/roles')
  return data.data
}

export type ListRbacUsersParams = {
  username?: string
  page?: number
  size?: number
}

export async function listRbacUsersPage(
  params?: ListRbacUsersParams,
): Promise<PageResponse<UserSummaryDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<UserSummaryDto>>>(
    '/api/rbac/users',
    {
      params: {
        username: params?.username || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    },
  )
  return data.data
}

export async function assignUserRoles(
  userId: number,
  roles: string[],
): Promise<UserSummaryDto> {
  const { data } = await apiClient.put<ApiResponse<UserSummaryDto>>(
    `/api/rbac/users/${userId}/roles`,
    { roles },
  )
  return data.data
}
