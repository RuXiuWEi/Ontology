import { useMemo } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { hasPermission, type PermissionFlags, type PermissionKey } from '../auth/permissions'
import { useAuth } from '../auth/useAuth'
import adminAvatar from '../assets/admin-avatar.svg'
import systemLogo from '../assets/system-logo.svg'
import './Layout.css'

type NavItem = {
  to: string
  label: string
  end?: boolean
  require?: PermissionKey | ((permissions: PermissionFlags) => boolean)
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
      { to: '/integration', label: '集成', require: 'canAccessIntegration' },
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
    items: [{ to: '/actions', label: '动作管理' }],
  },
  {
    title: '治理',
    items: [
      { to: '/graph', label: '图谱' },
      { to: '/versions', label: '版本治理' },
      { to: '/lineage', label: '数据血缘' },
    ],
  },
  {
    title: '系统',
    items: [{ to: '/rbac', label: '权限', require: 'canManageRbac' }],
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
  if (pathname === '/link-types') return '关联类型'
  if (pathname === '/actions') return '动作管理'
  if (pathname === '/versions') return '版本治理'

  const map: Record<string, string> = {
    '/sets': '对象集合',
    '/graph': '图谱',
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
  const { logout, me, permissions } = useAuth()
  const location = useLocation()

  const breadcrumb = useMemo(
    () => resolveBreadcrumb(location.pathname),
    [location.pathname],
  )

  const navSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.require || hasPermission(permissions, item.require),
        ),
      })).filter((section) => section.items.length > 0),
    [permissions],
  )

  const username = me?.username ?? '当前用户'
  const roleLabel = me?.roles.length
    ? me.roles.map(prettifyRole).join(' / ')
    : '未识别角色'

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand">
          <div className="brand-logo">
            <img src={systemLogo} alt="企业本体管理系统 Logo" />
          </div>
          <div className="brand-text">
            <strong>企业本体管理系统</strong>
            <span>Ontology Console</span>
          </div>
        </div>
        <nav className="nav-sections">
          {navSections.map((section) => (
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
            <span className="product-name">企业本体管理系统</span>
            <span className="slash">/</span>
            <span>{breadcrumb}</span>
          </div>
          <div className="top-bar-user">
            <div className="avatar">
              <img src={adminAvatar} alt="管理员头像" />
            </div>
            <div className="user-info">
              <strong>{username}</strong>
              <span>{roleLabel}</span>
            </div>
            {permissions.isReadOnly ? (
              <span className="role-chip role-chip--readonly">只读模式</span>
            ) : null}
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
