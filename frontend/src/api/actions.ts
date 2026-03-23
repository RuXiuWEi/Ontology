import { apiClient } from './client'
import type {
  ActionExecutionDto,
  ActionTypeDto,
  ApiResponse,
  PageResponse,
} from './types'

export type ListActionTypesParams = {
  page?: number
  size?: number
}

export type UpsertActionTypePayload = {
  code: string
  name: string
  targetTypeId: number
  executorType: string
  enabled?: boolean
  description?: string
  parameterSchema?: string
}

export type ListActionExecutionsParams = {
  actionTypeId?: number
  page?: number
  size?: number
}

export async function listActionTypesPage(
  params?: ListActionTypesParams,
): Promise<PageResponse<ActionTypeDto>> {
  const { data } = await apiClient.get<ApiResponse<PageResponse<ActionTypeDto>>>(
    '/api/action-types',
    {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    },
  )
  return data.data
}

export async function createActionType(
  payload: UpsertActionTypePayload,
): Promise<ActionTypeDto> {
  const { data } = await apiClient.post<ApiResponse<ActionTypeDto>>(
    '/api/action-types',
    payload,
  )
  return data.data
}

export async function updateActionType(
  id: number,
  payload: UpsertActionTypePayload,
): Promise<ActionTypeDto> {
  const { data } = await apiClient.put<ApiResponse<ActionTypeDto>>(
    `/api/action-types/${id}`,
    payload,
  )
  return data.data
}

export async function deleteActionType(id: number): Promise<void> {
  await apiClient.delete(`/api/action-types/${id}`)
}

export async function listActionExecutionsPage(
  params?: ListActionExecutionsParams,
): Promise<PageResponse<ActionExecutionDto>> {
  const { data } = await apiClient.get<
    ApiResponse<PageResponse<ActionExecutionDto>>
  >('/api/action-executions', {
    params: {
      actionTypeId: params?.actionTypeId,
      page: params?.page ?? 0,
      size: params?.size ?? 10,
    },
  })
  return data.data
}

export async function executeAction(payload: {
  actionTypeId: number
  targetInstanceId: number
  payload?: Record<string, unknown>
}): Promise<ActionExecutionDto> {
  const { data } = await apiClient.post<ApiResponse<ActionExecutionDto>>(
    '/api/action-executions',
    payload,
  )
  return data.data
}

export async function retryActionExecution(id: number): Promise<ActionExecutionDto> {
  const { data } = await apiClient.post<ApiResponse<ActionExecutionDto>>(
    `/api/action-executions/${id}/retry`,
  )
  return data.data
}
