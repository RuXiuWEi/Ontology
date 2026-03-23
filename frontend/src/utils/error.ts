type ApiErrorData = {
  code?: number
  message?: string
}

type ApiErrorResponse = {
  data?: ApiErrorData
}

type AxiosLikeError = {
  response?: ApiErrorResponse
}

const FRIENDLY_MESSAGE_MAP: Record<number, string> = {
  40044: '参数 Schema 格式不正确，请检查 JSON 结构',
  40045: '执行参数不符合 Schema 约束，请按提示修改',
  40066: '模型内容不能为空对象，请至少填写一个字段',
  40067: '模型内容格式不正确，请输入合法 JSON',
}

export function getErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (!error || typeof error !== 'object') {
    return fallback
  }
  if (!('response' in error)) {
    return fallback
  }

  const axiosLikeError = error as AxiosLikeError
  const code = axiosLikeError.response?.data?.code
  const message = axiosLikeError.response?.data?.message

  if (typeof code === 'number' && FRIENDLY_MESSAGE_MAP[code]) {
    const backendMessage = typeof message === 'string' && message.trim() ? `（${message}）` : ''
    return `${FRIENDLY_MESSAGE_MAP[code]}${backendMessage}`
  }
  if (typeof message === 'string' && message.trim()) {
    return message
  }
  return fallback
}
