import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import './LoginPage.css'

export function LoginPage() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromState = (location.state as
    | { from?: { pathname?: string; search?: string } }
    | null)?.from
  const from =
    fromState?.pathname && fromState.pathname !== '/login'
      ? `${fromState.pathname}${fromState.search ?? ''}`
      : '/dashboard'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String(
              (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message ?? '登录失败',
            )
          : '登录失败'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <p className="login-kicker">数字策展引擎</p>
        <h1>企业本体管理系统</h1>
        <p className="login-intro">
          以高一致性与高可追溯的数据治理体验，支撑建模、实例管理与权限协同。
        </p>
        <div className="login-hero-metrics">
          <article>
            <strong>100%</strong>
            <span>流程标准化</span>
          </article>
          <article>
            <strong>7x24</strong>
            <span>治理在线</span>
          </article>
          <article>
            <strong>可审计</strong>
            <span>全链路留痕</span>
          </article>
        </div>
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <h2>账号登录</h2>
        <p className="login-subtitle">请输入企业账号信息以继续。</p>
        {error ? <p className="login-error">{error}</p> : null}
        <label className="login-field">
          <span>用户名</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="请输入用户名"
            required
          />
        </label>
        <label className="login-field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="请输入密码"
            required
          />
        </label>
        <button type="submit" className="login-primary" disabled={loading}>
          {loading ? '登录中…' : '进入平台'}
        </button>
      </form>
    </div>
  )
}
