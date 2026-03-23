export type AppErrorInfo = {
  message: string
  code?: number
  detail?: string
}

type ApiErrorData = {
  code?: number
  message?: string
  detail?: unknown
  details?: unknown
}

type ApiErrorResponse = {
  data?: ApiErrorData
}

type AxiosLikeError = {
  response?: ApiErrorResponse
  message?: string
}

const FRIENDLY_MESSAGE_MAP: Record<number, string> = {
  40044: '参数 Schema 格式不正确，请检查 JSON 结构',
  40045: '执行参数不符合 Schema 约束，请按提示修改',
  40066: '模型内容不能为空对象，请至少填写一个字段',
  40067: '模型内容格式不正确，请输入合法 JSON',
}

function stringifyUnknown(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') {
    return value.trim() || undefined
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function toAppErrorInfo(error: unknown, fallback = '请求失败'): AppErrorInfo {
  if (typeof error === 'string') {
    return { message: error.trim() || fallback }
  }

  if (!error || typeof error !== 'object') {
    return { message: fallback }
  }

  const axiosLikeError = error as AxiosLikeError
  const code = axiosLikeError.response?.data?.code
  const backendMessage = stringifyUnknown(axiosLikeError.response?.data?.message)
  const backendDetail = stringifyUnknown(
    axiosLikeError.response?.data?.detail ?? axiosLikeError.response?.data?.details,
  )
  const jsErrorMessage = stringifyUnknown(axiosLikeError.message)

  const friendlyMessage =
    typeof code === 'number' ? FRIENDLY_MESSAGE_MAP[code] : undefined
  const message = friendlyMessage ?? backendMessage ?? jsErrorMessage ?? fallback

  const detailParts: string[] = []
  if (friendlyMessage && backendMessage && backendMessage !== friendlyMessage) {
    detailParts.push(`后端信息：${backendMessage}`)
  }
  if (backendDetail) {
    detailParts.push(`错误详情：${backendDetail}`)
  }

  return {
    message,
    code: typeof code === 'number' ? code : undefined,
    detail: detailParts.length ? detailParts.join('\n') : undefined,
  }
}

export function getErrorMessage(error: unknown, fallback = '请求失败'): string {
  return toAppErrorInfo(error, fallback).message
}
