import { apiClient } from './client'
import type { ApiResponse, ObjectInstanceDto, ObjectSetDto, PageResponse } from './types'

export type ListObjectSetsParams = {
  typeId?: number
  page?: number
  size?: number
}

export async function listObjectSetsPage(
  params?: ListObjectSetsParams,
): Promise<PageResponse<ObjectSetDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ObjectSetDto>>>(
    '/api/object-sets',
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

export async function getObjectSet(id: number): Promise<ObjectSetDto> {
  const { data } = await apiClient.get<ApiResponse<ObjectSetDto>>(`/api/object-sets/${id}`)
  return data.data
}

export async function createObjectSet(payload: {
  typeId: number
  name: string
  description?: string | null
  kind: ObjectSetDto['kind']
  ruleExpression?: string | null
  ruleSource: ObjectSetDto['ruleSource']
  snapshotAt?: string | null
  owner?: string | null
  notes?: string | null
}): Promise<ObjectSetDto> {
  const { data } = await apiClient.post<ApiResponse<ObjectSetDto>>('/api/object-sets', payload)
  return data.data
}

export async function updateObjectSet(
  id: number,
  payload: {
    typeId: number
    name: string
    description?: string | null
    kind: ObjectSetDto['kind']
    ruleExpression?: string | null
    ruleSource: ObjectSetDto['ruleSource']
    snapshotAt?: string | null
    owner?: string | null
    notes?: string | null
  },
): Promise<ObjectSetDto> {
  const { data } = await apiClient.put<ApiResponse<ObjectSetDto>>(
    `/api/object-sets/${id}`,
    payload,
  )
  return data.data
}

export async function deleteObjectSet(id: number): Promise<void> {
  await apiClient.delete(`/api/object-sets/${id}`)
}

export async function listObjectSetMembersPage(
  setId: number,
  params?: { page?: number; size?: number },
): Promise<PageResponse<ObjectInstanceDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ObjectInstanceDto>>>(
    `/api/object-sets/${setId}/members`,
    {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    },
  )
  return data.data
}

export async function replaceObjectSetMembers(
  setId: number,
  instanceIds: number[],
): Promise<void> {
  await apiClient.put(`/api/object-sets/${setId}/members`, { instanceIds })
}
