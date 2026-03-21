import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listAuditLogsPage } from '../../api/auditLogs'
import { getDashboardSummary } from '../../api/dashboard'
import type { AuditLogDto, DashboardSummaryDto } from '../../api/types'
import '../PageShell.css'
import './DashboardPage.css'

type Filters = {
  username: string
  action: string
  resource: string
}

function errMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = err as { response?: { data?: { message?: string } } }
    return r.response?.data?.message ?? '请求失败'
  }
  return '请求失败'
}

const PAGE_SIZE = 10

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [filters, setFilters] = useState<Filters>({
    username: '',
    action: '',
    resource: '',
  })
  const [page, setPage] = useState(0)
  const [auditRows, setAuditRows] = useState<AuditLogDto[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditTotalPages, setAuditTotalPages] = useState(0)
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const data = await getDashboardSummary()
      setSummary(data)
    } catch (e: unknown) {
      setSummaryError(errMessage(e))
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadAudits = useCallback(async () => {
    setAuditLoading(true)
    setAuditError(null)
    try {
      const pageData = await listAuditLogsPage({
        page,
        size: PAGE_SIZE,
        username: filters.username || undefined,
        action: filters.action || undefined,
        resource: filters.resource || undefined,
      })
      setAuditRows(pageData.content)
      setAuditTotal(pageData.totalElements)
      setAuditTotalPages(pageData.totalPages)
    } catch (e: unknown) {
      setAuditError(errMessage(e))
    } finally {
      setAuditLoading(false)
    }
  }, [filters, page])

  function renderDetails(details: string | null): string {
    if (!details) return '{}'
    try {
      return JSON.stringify(JSON.parse(details), null, 2)
    } catch {
      return details
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadAudits()
  }, [loadAudits])

  const trendData = useMemo(
    () =>
      (summary?.dailyTrend ?? []).map((point) => ({
        day: point.day.slice(5),
        类型新增: point.objectTypeCreated,
        实例新增: point.objectInstanceCreated,
        审计事件: point.auditEvents,
      })),
    [summary],
  )

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>总览</h1>
          <p>展示核心指标、7天趋势和审计日志明细。</p>
        </div>
      </header>

      {summaryError ? <p className="error-text">{summaryError}</p> : null}
      {auditError ? <p className="error-text">{auditError}</p> : null}

      <div className="dashboard-stats">
        <article className="panel stat-card">
          <span>对象类型总数</span>
          <strong>{summaryLoading ? '...' : summary?.objectTypeTotal ?? 0}</strong>
          <small>近7天新增 {summary?.objectTypeCreatedLast7Days ?? 0}</small>
        </article>
        <article className="panel stat-card">
          <span>对象实例总数</span>
          <strong>{summaryLoading ? '...' : summary?.objectInstanceTotal ?? 0}</strong>
          <small>近7天新增 {summary?.objectInstanceCreatedLast7Days ?? 0}</small>
        </article>
        <article className="panel stat-card">
          <span>启用用户数</span>
          <strong>{summaryLoading ? '...' : summary?.activeUserTotal ?? 0}</strong>
          <small>按 enabled=true 统计</small>
        </article>
        <article className="panel stat-card">
          <span>审计事件（7天）</span>
          <strong>{summaryLoading ? '...' : summary?.auditEventsLast7Days ?? 0}</strong>
          <small>CREATE / UPDATE / DELETE</small>
        </article>
      </div>

      <div className="panel">
        <h2 className="panel-title">近7天趋势</h2>
        {summaryLoading ? (
          <p className="status">加载中…</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="类型新增" stroke="#0f2847" strokeWidth={2} />
                <Line type="monotone" dataKey="实例新增" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="审计事件" stroke="#7c3aed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="panel">
        <h2 className="panel-title">审计日志</h2>
        <div className="toolbar">
          <div className="toolbar-fields">
            <label className="field small">
              <span>用户名</span>
              <input
                value={filters.username}
                onChange={(e) => updateFilter('username', e.target.value)}
                placeholder="按用户名筛选"
              />
            </label>
            <label className="field small">
              <span>动作</span>
              <select
                value={filters.action}
                onChange={(e) => updateFilter('action', e.target.value)}
              >
                <option value="">全部</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </label>
            <label className="field small">
              <span>资源</span>
              <select
                value={filters.resource}
                onChange={(e) => updateFilter('resource', e.target.value)}
              >
                <option value="">全部</option>
                <option value="OBJECT_TYPE">OBJECT_TYPE</option>
                <option value="OBJECT_INSTANCE">OBJECT_INSTANCE</option>
              </select>
            </label>
          </div>
          <button type="button" className="btn" onClick={() => void loadAudits()}>
            刷新
          </button>
        </div>

        {auditLoading ? (
          <p className="status">加载中…</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>时间</th>
                    <th>用户</th>
                    <th>动作</th>
                    <th>资源</th>
                    <th>资源ID</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {auditRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        暂无审计日志
                      </td>
                    </tr>
                  ) : (
                    auditRows.map((row) => (
                      <Fragment key={String(row.id)}>
                        <tr>
                          <td>{row.id}</td>
                          <td>{new Date(row.createdAt).toLocaleString()}</td>
                          <td>{row.username || 'anonymous'}</td>
                          <td>{row.action}</td>
                          <td>{row.resource}</td>
                          <td>{row.resourceId || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-light"
                              onClick={() =>
                                setExpandedId((prev) => (prev === row.id ? null : row.id))
                              }
                            >
                              {expandedId === row.id ? '收起详情' : '查看详情JSON'}
                            </button>
                          </td>
                        </tr>
                        {expandedId === row.id ? (
                          <tr>
                            <td colSpan={7}>
                              <pre className="json-view json-view-light">
                                {renderDetails(row.details)}
                              </pre>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="pagination">
              <span>
                显示 {auditRows.length === 0 ? 0 : page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, auditTotal)} / 共 {auditTotal} 条
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
                  第 {Math.max(page + 1, 1)} / {Math.max(auditTotalPages, 1)} 页
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={auditTotalPages === 0 || page + 1 >= auditTotalPages}
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
