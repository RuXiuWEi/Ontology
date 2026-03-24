import { Link } from 'react-router-dom'
import './PageShell.css'

export function ForbiddenPage() {
  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>无权限访问</h1>
          <p>当前账号没有访问该模块或执行该操作的权限，请联系管理员开通。</p>
        </div>
      </header>
      <div className="panel empty-panel">
        <div className="page-empty-state">
          <p>你仍然可以返回总览或继续访问当前账号可见的模块。</p>
          <div className="form-actions">
            <Link to="/dashboard" className="btn btn-primary">
              返回总览
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
