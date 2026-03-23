import { apiClient } from './client'
import type {
  ApiResponse,
  PageResponse,
  RelationEdgeDto,
  RelationNeighborDto,
  RelationTypeDto,
} from './types'

export type ListRelationTypesParams = {
  page?: number
  size?: number
}

export type RelationTypePayload = {
  code: string
  name: string
  sourceTypeId: number
  targetTypeId: number
  cardinality: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY'
  direction: 'DIRECTED' | 'UNDIRECTED'
  description?: string
}

export async function listRelationTypesPage(
  params?: ListRelationTypesParams,
): Promise<PageResponse<RelationTypeDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<RelationTypeDto>>>(
    '/api/relation-types',
    {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    },
  )
  return data.data
}

export async function createRelationType(
  payload: RelationTypePayload,
): Promise<RelationTypeDto> {
  const { data } = await apiClient.post<ApiResponse<RelationTypeDto>>(
    '/api/relation-types',
    payload,
  )
  return data.data
}

export async function updateRelationType(
  id: number,
  payload: RelationTypePayload,
): Promise<RelationTypeDto> {
  const { data } = await apiClient.put<ApiResponse<RelationTypeDto>>(
    `/api/relation-types/${id}`,
    payload,
  )
  return data.data
}

export async function deleteRelationType(id: number): Promise<void> {
  await apiClient.delete(`/api/relation-types/${id}`)
}

export type RelationEdgePayload = {
  relationTypeId: number
  sourceInstanceId: number
  targetInstanceId: number
  attributes?: Record<string, unknown>
}

export async function createRelationEdge(
  payload: RelationEdgePayload,
): Promise<RelationEdgeDto> {
  const { data } = await apiClient.post<ApiResponse<RelationEdgeDto>>(
    '/api/relations',
    payload,
  )
  return data.data
}

export async function deleteRelationEdge(id: number): Promise<void> {
  await apiClient.delete(`/api/relations/${id}`)
}

export async function listRelationNeighbors(
  instanceId: number,
): Promise<RelationNeighborDto[]> {
  const { data } = await apiClient.get<ApiResponse<RelationNeighborDto[]>>(
    '/api/relations/neighbors',
    {
      params: { instanceId },
    },
  )
  return data.data
}
