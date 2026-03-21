export type ApiResponse<T> = {
  code: number
  message: string
  data: T
  timestamp: string
}

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ObjectTypeDto = {
  id: number
  code: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

export type ObjectInstanceDto = {
  id: number
  typeId: number
  typeCode: string
  name: string
  attributes?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}
