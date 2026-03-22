import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { getMe } from '../api/auth'
import { useAuth } from '../auth/useAuth'
import './Layout.css'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: '总览',
    items: [{ to: '/dashboard', label: '总览', end: true }],
  },
  {
    title: '建模',
    items: [
      { to: '/object-types', label: '对象类型' },
      { to: '/link-types', label: '关联类型' },
      { to: '/integration', label: '集成' },
    ],
  },
  {
    title: '数据',
    items: [
      { to: '/instances', label: '对象实例' },
      { to: '/sets', label: '对象集合' },
    ],
  },
  {
    title: '动作',
    items: [{ to: '/actions', label: '动作' }],
  },
  {
    title: '治理',
    items: [
      { to: '/graph', label: '图谱' },
      { to: '/versions', label: '版本' },
      { to: '/lineage', label: '数据血缘' },
    ],
  },
  {
    title: '系统',
    items: [{ to: '/rbac', label: '权限' }],
  },
]

function resolveBreadcrumb(pathname: string): string {
  if (pathname === '/dashboard') return '总览'
  if (pathname === '/object-types') return '对象类型'
  if (pathname === '/object-types/new') return '新建对象类型'
  if (/^\/object-types\/[^/]+\/edit$/.test(pathname)) return '编辑对象类型'
  if (/^\/object-types\/[^/]+$/.test(pathname)) return '对象类型详情'
  if (pathname === '/instances') return '对象实例'
  if (pathname === '/instances/new') return '新建对象实例'
  if (/^\/instances\/[^/]+\/edit$/.test(pathname)) return '编辑对象实例'
  if (/^\/instances\/[^/]+$/.test(pathname)) return '对象实例详情'

  const map: Record<string, string> = {
    '/link-types': '关联类型',
    '/sets': '对象集合',
    '/actions': '动作',
    '/graph': '图谱',
    '/versions': '版本',
    '/lineage': '数据血缘',
    '/rbac': '权限',
    '/integration': '集成',
  }
  return map[pathname] ?? '总览'
}

function prettifyRole(role: string): string {
  if (role === 'ADMIN') return '管理员'
  if (role === 'EDITOR') return '编辑者'
  if (role === 'VIEWER') return '只读用户'
  return role
}

export function Layout() {
  const { logout } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState('当前用户')
  const [roleLabel, setRoleLabel] = useState('访客')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const me = await getMe()
        if (cancelled) return
        setUsername(me.username)
        setRoleLabel(prettifyRole(me.roles[0] ?? '普通用户'))
      } catch {
        if (cancelled) return
        setUsername('当前用户')
        setRoleLabel('未识别角色')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const breadcrumb = useMemo(
    () => resolveBreadcrumb(location.pathname),
    [location.pathname],
  )

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand">
          <div className="brand-logo">MD</div>
          <div className="brand-text">
            <strong>米多 · 企业本体管理平台</strong>
            <span>Ontology Console</span>
          </div>
        </div>
        <nav className="nav-sections">
          {NAV_SECTIONS.map((section) => (
            <section key={section.title} className="nav-section">
              <h3>{section.title}</h3>
              <div className="nav-group">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      isActive ? 'nav-link active' : 'nav-link'
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="top-bar">
          <div className="top-bar-title">
            <span className="product-name">米多 · 企业本体管理平台</span>
            <span className="slash">/</span>
            <span>{breadcrumb}</span>
          </div>
          <div className="top-bar-user">
            <div className="avatar">{username.slice(0, 1).toUpperCase()}</div>
            <div className="user-info">
              <strong>{username}</strong>
              <span>{roleLabel}</span>
            </div>
            <button type="button" className="btn-logout" onClick={logout}>
              退出登录
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
