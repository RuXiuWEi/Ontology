import { useState, type CSSProperties, type FormEvent } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import systemLogo from '../assets/system-logo.svg'
import { useAuth } from '../auth/useAuth'
import { ErrorAlert } from '../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../utils/error'
import './LoginPage.css'

type SemanticEntityTone = 'core' | 'class' | 'property' | 'relation' | 'rule' | 'instance'
type SemanticPredicateTone = 'primary' | 'secondary'

type SemanticEntity = {
  id: string
  label: string
  kind: string
  summary: string
  tokens: readonly string[]
  tone: SemanticEntityTone
  x: string
  y: string
  delay: string
}

type SemanticPredicate = {
  id: string
  label: string
  tone: SemanticPredicateTone
  x: number
  y: number
  width: number
  delay: string
}

const semanticEntities: readonly SemanticEntity[] = [
  {
    id: 'schema',
    label: '核心本体',
    kind: 'Ontology Schema',
    summary: '统一定义类、属性、关系、公理与词表的语义骨架',
    tokens: ['RDF/OWL', 'Schema', 'Vocabulary'],
    tone: 'core',
    x: '16%',
    y: '22%',
    delay: '0s',
  },
  {
    id: 'class',
    label: '概念层级',
    kind: 'owl:Class',
    summary: '组织、人员、资产等概念的层级建模与分类抽象',
    tokens: ['taxonomy', 'concept', 'hierarchy'],
    tone: 'class',
    x: '24%',
    y: '42%',
    delay: '1.2s',
  },
  {
    id: 'property',
    label: '属性约束',
    kind: 'sh:PropertyShape',
    summary: 'datatype、cardinality 与字段约束的一致性校验',
    tokens: ['SHACL', 'datatype', 'cardinality'],
    tone: 'property',
    x: '18%',
    y: '64%',
    delay: '2.1s',
  },
  {
    id: 'relation',
    label: '对象关系',
    kind: 'owl:ObjectProperty',
    summary: 'domain / range / inverseOf 等关系语义的定义层',
    tokens: ['domain', 'range', 'inverseOf'],
    tone: 'relation',
    x: '76%',
    y: '22%',
    delay: '0.8s',
  },
  {
    id: 'rule',
    label: '规则推理',
    kind: 'swrl:Imp',
    summary: '一致性检查、语义推断与规则联动的执行入口',
    tokens: ['SWRL', 'inference', 'consistency'],
    tone: 'rule',
    x: '84%',
    y: '43%',
    delay: '1.9s',
  },
  {
    id: 'instance',
    label: '实例映射',
    kind: 'rdf:Description',
    summary: '主数据映射为实例节点并连接成可查询的知识网络',
    tokens: ['rdf:type', 'IRI', 'mapping'],
    tone: 'instance',
    x: '78%',
    y: '68%',
    delay: '2.8s',
  },
]

const semanticPredicates: readonly SemanticPredicate[] = [
  { id: 'subclass', label: 'rdfs:subClassOf', tone: 'primary', x: 314, y: 236, width: 142, delay: '0.4s' },
  { id: 'property', label: 'sh:property', tone: 'primary', x: 308, y: 428, width: 100, delay: '1.2s' },
  { id: 'domain', label: 'rdfs:domain', tone: 'secondary', x: 654, y: 238, width: 106, delay: '2.1s' },
  { id: 'range', label: 'rdfs:range', tone: 'secondary', x: 1044, y: 334, width: 100, delay: '0.8s' },
  { id: 'entails', label: 'swrl:implies', tone: 'primary', x: 1048, y: 540, width: 112, delay: '1.8s' },
  { id: 'mapped', label: 'skos:exactMatch', tone: 'secondary', x: 894, y: 596, width: 134, delay: '2.6s' },
  { id: 'instance', label: 'rdf:type', tone: 'primary', x: 1218, y: 648, width: 82, delay: '1s' },
]

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
            <marker
              id="login-graph-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="7.2"
              refY="5"
              orient="auto"
            >
              <path d="M1 1 L9 5 L1 9 Z" fill="#6d9dff" fillOpacity="0.62" />
            </marker>
          </defs>

          <g className="graph-halos" filter="url(#login-graph-blur)">
            <circle cx="266" cy="274" r="174" fill="url(#login-graph-left-glow)" />
            <circle cx="1284" cy="594" r="188" fill="url(#login-graph-right-glow)" />
          </g>

          <g className="graph-lines">
            <line className="graph-line graph-line--strong" x1="188" y1="352" x2="248" y2="260" />
            <line
              className="graph-line graph-line--strong graph-line--directed"
              x1="248"
              y1="260"
              x2="362"
              y2="220"
              markerEnd="url(#login-graph-arrow)"
            />
            <line
              className="graph-line graph-line--strong graph-line--directed"
              x1="248"
              y1="260"
              x2="418"
              y2="320"
              markerEnd="url(#login-graph-arrow)"
            />
            <line className="graph-line graph-line--secondary" x1="248" y1="260" x2="294" y2="394" />
            <line className="graph-line graph-line--secondary" x1="188" y1="352" x2="294" y2="394" />
            <line className="graph-line graph-line--secondary" x1="294" y1="394" x2="332" y2="500" />
            <line className="graph-line graph-line--secondary" x1="362" y1="220" x2="418" y2="320" />
            <line className="graph-line graph-line--secondary" x1="294" y1="394" x2="418" y2="320" />

            <path
              className="graph-line graph-line--bridge graph-line--directed"
              d="M418 320 C 530 276, 648 262, 760 320"
              markerEnd="url(#login-graph-arrow)"
            />
            <path
              className="graph-line graph-line--bridge graph-line--directed"
              d="M362 220 C 548 120, 760 116, 980 270"
              markerEnd="url(#login-graph-arrow)"
            />
            <path
              className="graph-line graph-line--bridge graph-line--directed"
              d="M332 500 C 510 610, 686 648, 850 570"
              markerEnd="url(#login-graph-arrow)"
            />

            <line
              className="graph-line graph-line--strong graph-line--directed"
              x1="1120"
              y1="380"
              x2="1284"
              y2="430"
              markerEnd="url(#login-graph-arrow)"
            />
            <line
              className="graph-line graph-line--strong graph-line--directed"
              x1="1120"
              y1="380"
              x2="1212"
              y2="560"
              markerEnd="url(#login-graph-arrow)"
            />
            <line className="graph-line graph-line--strong" x1="1284" y1="430" x2="1212" y2="560" />
            <line className="graph-line graph-line--secondary" x1="1284" y1="430" x2="1368" y2="586" />
            <line className="graph-line graph-line--secondary" x1="1212" y1="560" x2="1368" y2="586" />
            <line className="graph-line graph-line--secondary" x1="1212" y1="560" x2="1132" y2="690" />
            <line className="graph-line graph-line--secondary" x1="1212" y1="560" x2="1288" y2="724" />
            <line className="graph-line graph-line--secondary" x1="1132" y1="690" x2="1288" y2="724" />

            <path
              className="graph-line graph-line--bridge graph-line--directed"
              d="M980 270 C 1038 322, 1072 340, 1120 380"
              markerEnd="url(#login-graph-arrow)"
            />
            <path
              className="graph-line graph-line--bridge graph-line--directed"
              d="M850 570 C 980 520, 1066 538, 1212 560"
              markerEnd="url(#login-graph-arrow)"
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

          <g className="graph-lines graph-lines--signal">
            <path className="graph-line graph-line--signal graph-line--signal-one" d="M362 220 C 548 120, 760 116, 980 270" />
            <path className="graph-line graph-line--signal graph-line--signal-two" d="M418 320 C 530 276, 648 262, 760 320" />
            <path className="graph-line graph-line--signal graph-line--signal-three" d="M850 570 C 980 520, 1066 538, 1212 560" />
            <line className="graph-line graph-line--signal graph-line--signal-four" x1="248" y1="260" x2="418" y2="320" />
            <line className="graph-line graph-line--signal graph-line--signal-five" x1="1120" y1="380" x2="1284" y2="430" />
          </g>

          <g className="graph-edge-labels">
            {semanticPredicates.map((predicate) => (
              <g
                key={predicate.id}
                className="graph-edge-label-wrap"
                transform={`translate(${predicate.x - predicate.width / 2} ${predicate.y - 13})`}
              >
                <g
                  className={`graph-edge-label graph-edge-label--${predicate.tone}`}
                  style={{ '--predicate-delay': predicate.delay } as CSSProperties}
                >
                  <rect width={predicate.width} height="26" rx="13" />
                  <text x={predicate.width / 2} y="17" textAnchor="middle">
                    {predicate.label}
                  </text>
                </g>
              </g>
            ))}
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

        {semanticEntities.map((entity) => (
          <div
            key={entity.id}
            className={`graph-entity graph-entity--${entity.tone}`}
            style={
              {
                '--entity-x': entity.x,
                '--entity-y': entity.y,
                '--entity-delay': entity.delay,
              } as CSSProperties
            }
          >
            <span className="graph-entity-kind">{entity.kind}</span>
            <strong className="graph-entity-title">{entity.label}</strong>
            <span className="graph-entity-summary">{entity.summary}</span>
            <span className="graph-entity-tags">
              {entity.tokens.map((token) => (
                <span key={token} className="graph-entity-tag">
                  {token}
                </span>
              ))}
            </span>
          </div>
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
