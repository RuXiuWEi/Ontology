import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import systemLogo from '../assets/system-logo.svg'
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
  const wireframes = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        index,
        size: `${62 + index * 14}vmin`,
        rotate: `${index * 14 - 12}deg`,
        duration: `${34 + index * 8}s`,
      })),
    [],
  )

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
      <div className="login-wires" aria-hidden="true">
        {wireframes.map((wire) => (
          <span
            key={String(wire.index)}
            className="wire-ring"
            style={
              {
                '--wire-size': wire.size,
                '--wire-rotate': wire.rotate,
                '--wire-duration': wire.duration,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-brand-logo">
            <img src={systemLogo} alt="企业本体管理系统 Logo" />
          </div>
          <div className="login-brand-text">
            <h1>企业本体管理系统</h1>
            <p>统一建模与治理控制台</p>
          </div>
        </div>
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
          {loading ? '登录中…' : '登录'}
        </button>
        <p className="login-footer">登录即表示你同意平台安全访问策略</p>
      </form>
    </div>
  )
}
