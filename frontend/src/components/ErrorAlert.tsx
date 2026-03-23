import { useMemo, useState } from 'react'
import { type AppErrorInfo, toAppErrorInfo } from '../utils/error'
import './ErrorAlert.css'

type ErrorAlertProps = {
  error: string | AppErrorInfo | null
  className?: string
}

export function ErrorAlert({ error, className }: ErrorAlertProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => {
    if (!error) return null
    return typeof error === 'string' ? toAppErrorInfo(error) : error
  }, [error])
  if (!parsed) return null

  const copyText = `错误码: ${parsed.code ?? '无'}\n提示: ${parsed.message}\n${
    parsed.detail ? `详情: ${parsed.detail}` : ''
  }`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={`error-alert ${className ?? ''}`.trim()}>
      <div className="error-alert-main">
        <span className="error-alert-title">操作失败</span>
        <p className="error-alert-message">{parsed.message}</p>
      </div>
      <div className="error-alert-actions">
        <button type="button" className="btn btn-light" onClick={handleCopy}>
          {copied ? '已复制' : '复制错误码'}
        </button>
        {parsed.detail ? (
          <button
            type="button"
            className="btn"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? '收起详情' : '展开详情'}
          </button>
        ) : null}
      </div>
      {parsed.detail && expanded ? (
        <pre className="error-alert-detail">{parsed.detail}</pre>
      ) : null}
    </div>
  )
}
