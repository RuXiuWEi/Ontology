import { apiClient } from './client'
import type { ApiResponse, ObjectTypeDto, PageResponse } from './types'

export type ListObjectTypesParams = {
  page?: number
  size?: number
}

export async function listObjectTypes(): Promise<ObjectTypeDto[]> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ObjectTypeDto>>>(
    '/api/object-types',
  )
  return data.data?.content ?? []
}

export async function listObjectTypesPage(
  params?: ListObjectTypesParams,
): Promise<PageResponse<ObjectTypeDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ObjectTypeDto>>>(
    '/api/object-types',
    {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    },
  )
  return data.data
}

export async function getObjectType(id: number): Promise<ObjectTypeDto> {
  const { data } = await apiClient.get<ApiResponse<ObjectTypeDto>>(
    `/api/object-types/${id}`,
  )
  return data.data
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
