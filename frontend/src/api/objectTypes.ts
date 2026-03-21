import { apiClient } from './client'
import type { ApiResponse, ObjectTypeDto, PageResponse } from './types'

export async function listObjectTypes(): Promise<ObjectTypeDto[]> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ObjectTypeDto>>>(
    '/api/object-types',
  )
  return data.data?.content ?? []
}

export async function createObjectType(payload: {
  code: string
  name: string
  description?: string
}): Promise<ObjectTypeDto> {
  const { data } = await apiClient.post<ApiResponse<ObjectTypeDto>>(
    '/api/object-types',
    payload,
  )
  return data.data
}

export async function updateObjectType(
  id: number,
  payload: { code: string; name: string; description?: string },
): Promise<ObjectTypeDto> {
  const { data } = await apiClient.put<ApiResponse<ObjectTypeDto>>(
    `/api/object-types/${id}`,
    payload,
  )
  return data.data
}

export async function deleteObjectType(id: number): Promise<void> {
  await apiClient.delete(`/api/object-types/${id}`)
}
