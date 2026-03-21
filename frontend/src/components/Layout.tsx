import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import './Layout.css'

export function Layout() {
  const { logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="app-nav">
          <NavLink
            to="/object-types"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            对象类型
          </NavLink>
          <NavLink
            to="/instances"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            对象实例
          </NavLink>
        </nav>
        <button type="button" className="btn-logout" onClick={logout}>
          退出登录
        </button>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
