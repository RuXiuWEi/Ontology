import { apiClient } from './client'
import type { ApiResponse } from './types'

export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
}

export async function login(body: LoginRequest): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/login',
    body,
  )
  const token = data.data?.accessToken
  if (!token) {
    throw new Error('登录响应中未包含 token')
  }
  return token
}
