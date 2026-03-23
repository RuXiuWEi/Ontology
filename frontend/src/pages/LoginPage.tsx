import { useState, type CSSProperties, type FormEvent } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import systemLogo from '../assets/system-logo.svg'
import { useAuth } from '../auth/useAuth'
import { ErrorAlert } from '../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../utils/error'
import './LoginPage.css'

const ontologyConcepts = [
  { label: '本体', tone: 'primary', x: '12%', y: '18%', delay: '0s' },
  { label: '类别', tone: 'secondary', x: '23%', y: '28%', delay: '1.1s' },
  { label: '属性', tone: 'primary', x: '17%', y: '51%', delay: '2.2s' },
  { label: '约束', tone: 'secondary', x: '28%', y: '66%', delay: '0.7s' },
  { label: '关系', tone: 'primary', x: '72%', y: '21%', delay: '1.4s' },
  { label: '规则', tone: 'secondary', x: '84%', y: '38%', delay: '2s' },
  { label: '实例', tone: 'primary', x: '76%', y: '63%', delay: '0.9s' },
  { label: '映射', tone: 'secondary', x: '88%', y: '74%', delay: '2.5s' },
] as const

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
  const [error, setError] = useState<AppErrorInfo | null>(null)
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
      setError(toAppErrorInfo(err, '登录失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-graph" aria-hidden="true">
        <svg
          className="login-graph-svg"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          role="presentation"
        >
          <defs>
            <radialGradient id="login-graph-left-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5d9bff" stopOpacity="0.24" />
              <stop offset="65%" stopColor="#5d9bff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#5d9bff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="login-graph-right-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8ed8ff" stopOpacity="0.24" />
              <stop offset="60%" stopColor="#5d9bff" stopOpacity="0.09" />
              <stop offset="100%" stopColor="#8ed8ff" stopOpacity="0" />
            </radialGradient>
            <filter id="login-graph-blur">
              <feGaussianBlur stdDeviation="24" />
            </filter>
          </defs>

          <g className="graph-halos" filter="url(#login-graph-blur)">
            <circle cx="266" cy="274" r="174" fill="url(#login-graph-left-glow)" />
            <circle cx="1284" cy="594" r="188" fill="url(#login-graph-right-glow)" />
          </g>

          <g className="graph-lines">
            <line className="graph-line graph-line--strong" x1="188" y1="352" x2="248" y2="260" />
            <line className="graph-line graph-line--strong" x1="248" y1="260" x2="362" y2="220" />
            <line className="graph-line graph-line--strong" x1="248" y1="260" x2="418" y2="320" />
            <line className="graph-line graph-line--secondary" x1="248" y1="260" x2="294" y2="394" />
            <line className="graph-line graph-line--secondary" x1="188" y1="352" x2="294" y2="394" />
            <line className="graph-line graph-line--secondary" x1="294" y1="394" x2="332" y2="500" />
            <line className="graph-line graph-line--secondary" x1="362" y1="220" x2="418" y2="320" />
            <line className="graph-line graph-line--secondary" x1="294" y1="394" x2="418" y2="320" />

            <path
              className="graph-line graph-line--bridge"
              d="M418 320 C 530 276, 648 262, 760 320"
            />
            <path
              className="graph-line graph-line--bridge"
              d="M362 220 C 548 120, 760 116, 980 270"
            />
            <path
              className="graph-line graph-line--bridge"
              d="M332 500 C 510 610, 686 648, 850 570"
            />

            <line className="graph-line graph-line--strong" x1="1120" y1="380" x2="1284" y2="430" />
            <line className="graph-line graph-line--strong" x1="1120" y1="380" x2="1212" y2="560" />
            <line className="graph-line graph-line--strong" x1="1284" y1="430" x2="1212" y2="560" />
            <line className="graph-line graph-line--secondary" x1="1284" y1="430" x2="1368" y2="586" />
            <line className="graph-line graph-line--secondary" x1="1212" y1="560" x2="1368" y2="586" />
            <line className="graph-line graph-line--secondary" x1="1212" y1="560" x2="1132" y2="690" />
            <line className="graph-line graph-line--secondary" x1="1212" y1="560" x2="1288" y2="724" />
            <line className="graph-line graph-line--secondary" x1="1132" y1="690" x2="1288" y2="724" />

            <path
              className="graph-line graph-line--bridge"
              d="M980 270 C 1038 322, 1072 340, 1120 380"
            />
            <path
              className="graph-line graph-line--bridge"
              d="M850 570 C 980 520, 1066 538, 1212 560"
            />
            <path
              className="graph-line graph-line--secondary"
              d="M760 320 C 910 352, 1002 430, 958 520"
            />
            <path
              className="graph-line graph-line--secondary"
              d="M958 520 C 1038 574, 1086 628, 1132 690"
            />
          </g>

          <g className="graph-node-pulses">
            <circle className="graph-node-pulse graph-node-pulse--one" cx="248" cy="260" r="28" />
            <circle className="graph-node-pulse graph-node-pulse--two" cx="1212" cy="560" r="30" />
            <circle className="graph-node-pulse graph-node-pulse--three" cx="362" cy="220" r="18" />
            <circle className="graph-node-pulse graph-node-pulse--four" cx="1284" cy="430" r="18" />
          </g>

          <g className="graph-rings">
            <circle className="graph-node-ring" cx="248" cy="260" r="12" />
            <circle className="graph-node-ring" cx="362" cy="220" r="8.5" />
            <circle className="graph-node-ring" cx="1212" cy="560" r="13" />
            <circle className="graph-node-ring" cx="1284" cy="430" r="8.5" />
          </g>

          <g className="graph-nodes">
            <circle className="graph-node graph-node--core" cx="248" cy="260" r="6" />
            <circle className="graph-node graph-node--core" cx="1212" cy="560" r="6" />
            <circle className="graph-node" cx="188" cy="352" r="4.4" />
            <circle className="graph-node" cx="362" cy="220" r="4.6" />
            <circle className="graph-node" cx="418" cy="320" r="4.8" />
            <circle className="graph-node" cx="294" cy="394" r="4.2" />
            <circle className="graph-node" cx="332" cy="500" r="4" />
            <circle className="graph-node graph-node--soft" cx="760" cy="320" r="3.8" />
            <circle className="graph-node graph-node--soft" cx="850" cy="570" r="3.8" />
            <circle className="graph-node graph-node--soft" cx="980" cy="270" r="3.8" />
            <circle className="graph-node graph-node--soft" cx="958" cy="520" r="3.8" />
            <circle className="graph-node" cx="1120" cy="380" r="4.6" />
            <circle className="graph-node" cx="1284" cy="430" r="4.8" />
            <circle className="graph-node" cx="1368" cy="586" r="4.4" />
            <circle className="graph-node" cx="1132" cy="690" r="4.2" />
            <circle className="graph-node" cx="1288" cy="724" r="4.2" />
          </g>
        </svg>

        {ontologyConcepts.map((concept) => (
          <span
            key={concept.label}
            className={`graph-badge graph-badge--${concept.tone}`}
            style={
              {
                '--badge-x': concept.x,
                '--badge-y': concept.y,
                '--badge-delay': concept.delay,
              } as CSSProperties
            }
          >
            {concept.label}
          </span>
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
        <ErrorAlert error={error} className="login-error-wrap" />
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
