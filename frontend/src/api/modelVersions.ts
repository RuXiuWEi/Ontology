import { apiClient } from './client'
import type { ApiResponse, ModelVersionDto, PageResponse } from './types'

export type ListModelVersionsParams = {
  modelCode?: string
  status?: string
  page?: number
  size?: number
}

export async function listModelVersionsPage(
  params?: ListModelVersionsParams,
): Promise<PageResponse<ModelVersionDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ModelVersionDto>>>(
    '/api/model-versions',
    {
      params: {
        modelCode: params?.modelCode || undefined,
        status: params?.status || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    },
  )
  return data.data
}

export async function getModelVersion(id: number): Promise<ModelVersionDto> {
  const { data } = await apiClient.get<ApiResponse<ModelVersionDto>>(
    `/api/model-versions/${id}`,
  )
  return data.data
}

export async function getModelDraft(modelCode: string): Promise<ModelVersionDto> {
  const { data } = await apiClient.get<ApiResponse<ModelVersionDto>>(
    '/api/model-versions/draft',
    { params: { modelCode } },
  )
  return data.data
}

export async function saveModelDraft(payload: {
  modelCode: string
  title: string
  content: Record<string, unknown>
  changeLog?: string
}): Promise<ModelVersionDto> {
  const { data } = await apiClient.put<ApiResponse<ModelVersionDto>>(
    '/api/model-versions/draft',
    payload,
  )
  return data.data
}

export async function publishModelDraft(id: number, changeLog: string): Promise<ModelVersionDto> {
  const { data } = await apiClient.post<ApiResponse<ModelVersionDto>>(
    `/api/model-versions/${id}/publish`,
    { changeLog },
  )
  return data.data
}

export async function rollbackModelVersion(payload: {
  modelCode: string
  targetVersionNo: number
  changeLog?: string
}): Promise<ModelVersionDto> {
  const { data } = await apiClient.post<ApiResponse<ModelVersionDto>>(
    '/api/model-versions/rollback',
    payload,
  )
  return data.data
}
