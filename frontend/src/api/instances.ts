import { apiClient } from './client'
import type { ApiResponse, ObjectInstanceDto, PageResponse } from './types'

export type ListInstancesParams = {
  typeId?: number
  page?: number
  size?: number
}

export async function listInstances(params?: {
  typeId?: number
}): Promise<ObjectInstanceDto[]> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ObjectInstanceDto>>>('/api/instances', {
    params:
      params?.typeId !== undefined
        ? { typeId: params.typeId }
        : undefined,
  })
  return Array.isArray(data?.data?.content) ? data.data.content : []
}

export async function listInstancesPage(
  params?: ListInstancesParams,
): Promise<PageResponse<ObjectInstanceDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ObjectInstanceDto>>>(
    '/api/instances',
    {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 10,
        ...(params?.typeId !== undefined ? { typeId: params.typeId } : {}),
      },
    },
  )
  return data.data
}

export async function getInstance(id: number): Promise<ObjectInstanceDto> {
  const { data } = await apiClient.get<ApiResponse<ObjectInstanceDto>>(
    `/api/instances/${id}`,
  )
  return data.data
}

export async function createInstance(payload: {
  typeId: number
  name: string
  attributes?: Record<string, unknown>
}): Promise<ObjectInstanceDto> {
  const { data } = await apiClient.post<ApiResponse<ObjectInstanceDto>>(
    '/api/instances',
    payload,
  )
  return data.data
}

export async function updateInstance(
  id: number,
  payload: {
    typeId: number
    name: string
    attributes?: Record<string, unknown>
  },
): Promise<ObjectInstanceDto> {
  const { data } = await apiClient.put<ApiResponse<ObjectInstanceDto>>(
    `/api/instances/${id}`,
    payload,
  )
  return data.data
}

export async function deleteInstance(id: number): Promise<void> {
  await apiClient.delete(`/api/instances/${id}`)
}
