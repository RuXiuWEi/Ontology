import { useCallback, useEffect, useMemo, useState } from 'react'
import { assignUserRoles, listRbacRoles, listRbacUsersPage } from '../../api/rbac'
import type { RoleDto, UserSummaryDto } from '../../api/types'
import '../PageShell.css'

const PAGE_SIZE = 10

function errMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = err as { response?: { data?: { message?: string } } }
    return r.response?.data?.message ?? '请求失败'
  }
  return '请求失败'
}

export function RbacPage() {
  const [roles, setRoles] = useState<RoleDto[]>([])
  const [users, setUsers] = useState<UserSummaryDto[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [roleRows, userPage] = await Promise.all([
        listRbacRoles(),
        listRbacUsersPage({
          username: query || undefined,
          page,
          size: PAGE_SIZE,
        }),
      ])
      setRoles(roleRows)
      setUsers(userPage.content)
      setTotal(userPage.totalElements)
      setTotalPages(userPage.totalPages)
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [page, query])

  useEffect(() => {
    void load()
  }, [load])

  const roleNames = useMemo(() => roles.map((r) => r.name), [roles])

  async function toggleRole(user: UserSummaryDto, roleName: string) {
    const next = new Set(user.roles)
    if (next.has(roleName)) {
      next.delete(roleName)
    } else {
      next.add(roleName)
    }
    if (next.size === 0) {
      setError('每个用户至少保留一个角色')
      return
    }
    setSavingId(user.id)
    setError(null)
    try {
      const updated = await assignUserRoles(user.id, Array.from(next))
      setUsers((prev) => prev.map((row) => (row.id === user.id ? updated : row)))
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>权限管理（RBAC）</h1>
          <p>支持用户管理、角色管理、角色分配。内置角色：ADMIN / EDITOR / VIEWER。</p>
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="panel">
        <div className="toolbar">
          <div className="toolbar-fields">
            <label className="field small">
              <span>用户名</span>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder="按用户名筛选"
              />
            </label>
          </div>
          <button type="button" className="btn" onClick={() => void load()}>
            刷新
          </button>
        </div>

        {loading ? (
          <p className="status">加载中…</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>用户名</th>
                    <th>启用状态</th>
                    <th>角色分配</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        暂无用户
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={String(user.id)}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{user.enabled ? '已启用' : '已禁用'}</td>
                        <td>
                          <div className="actions-cell">
                            {roleNames.map((roleName) => (
                              <label key={roleName} className="btn btn-light">
                                <input
                                  type="checkbox"
                                  checked={user.roles.includes(roleName)}
                                  disabled={savingId === user.id}
                                  onChange={() => void toggleRole(user, roleName)}
                                />
                                <span>{roleName}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="pagination">
              <span>
                显示 {users.length === 0 ? 0 : page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, total)} / 共 {total} 条
              </span>
              <div className="pagination-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={page <= 0}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  上一页
                </button>
                <span>
                  第 {Math.max(page + 1, 1)} / {Math.max(totalPages, 1)} 页
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={totalPages === 0 || page + 1 >= totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  下一页
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </section>
  )
}
