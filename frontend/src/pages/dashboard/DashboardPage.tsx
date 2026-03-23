import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  type AuditTimePreset,
  exportAuditLogsCsv,
  listAuditLogsPage,
} from '../../api/auditLogs'
import { getDashboardSummary } from '../../api/dashboard'
import type {
  AuditLogDto,
  DashboardDimension,
  DashboardSummaryDto,
} from '../../api/types'
import { ErrorAlert } from '../../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import '../PageShell.css'
import './DashboardPage.css'

type Filters = {
  username: string
  action: string
  resource: string
  preset: AuditTimePreset | ''
}

const PAGE_SIZE = 10

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null)
  const [dimension, setDimension] = useState<DashboardDimension>('OBJECT_TYPE')
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<AppErrorInfo | null>(null)

  const [filters, setFilters] = useState<Filters>({
    username: '',
    action: '',
    resource: '',
    preset: 'LAST_7_DAYS',
  })
  const [page, setPage] = useState(0)
  const [auditRows, setAuditRows] = useState<AuditLogDto[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditTotalPages, setAuditTotalPages] = useState(0)
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditError, setAuditError] = useState<AppErrorInfo | null>(null)
  const [exporting, setExporting] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<number, Set<string>>>({})

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const data = await getDashboardSummary(dimension)
      setSummary(data)
    } catch (e: unknown) {
      setSummaryError(toAppErrorInfo(e))
    } finally {
      setSummaryLoading(false)
    }
  }, [dimension])

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
        preset: filters.preset || undefined,
      })
      setAuditRows(pageData.content)
      setAuditTotal(pageData.totalElements)
      setAuditTotalPages(pageData.totalPages)
    } catch (e: unknown) {
      setAuditError(toAppErrorInfo(e))
    } finally {
      setAuditLoading(false)
    }
  }, [filters, page])

  function parseDetails(details: string | null): unknown {
    if (!details) return {}
    try {
      return JSON.parse(details) as unknown
    } catch {
      return details
    }
  }

  function isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  function toggleFieldCollapse(rowId: number, path: string) {
    setExpandedRows((prev) => {
      const current = new Set(prev[rowId] ?? [])
      if (current.has(path)) {
        current.delete(path)
      } else {
        current.add(path)
      }
      return { ...prev, [rowId]: current }
    })
  }

  function fieldCollapsed(rowId: number, path: string): boolean {
    return expandedRows[rowId]?.has(path) ?? false
  }

  function renderJsonValue(rowId: number, label: string, value: unknown, path: string): ReactNode {
    if (isJsonObject(value)) {
      const collapsed = fieldCollapsed(rowId, path)
      const keys = Object.keys(value)
      return (
        <div className="json-node" key={path}>
          <button
            type="button"
            className="json-toggle"
            onClick={() => toggleFieldCollapse(rowId, path)}
          >
            <span className="json-key">{label}</span>
            <span className="json-toggle-hint">
              {collapsed ? `+ 展开对象 (${keys.length})` : '- 折叠对象'}
            </span>
          </button>
          {!collapsed ? (
            <div className="json-children">
              {keys.map((key) =>
                renderJsonValue(rowId, key, value[key], `${path}.${key}`),
              )}
            </div>
          ) : null}
        </div>
      )
    }
    if (Array.isArray(value)) {
      const collapsed = fieldCollapsed(rowId, path)
      return (
        <div className="json-node" key={path}>
          <button
            type="button"
            className="json-toggle"
            onClick={() => toggleFieldCollapse(rowId, path)}
          >
            <span className="json-key">{label}</span>
            <span className="json-toggle-hint">
              {collapsed ? `+ 展开数组 (${value.length})` : '- 折叠数组'}
            </span>
          </button>
          {!collapsed ? (
            <div className="json-children">
              {value.map((item, index) =>
                renderJsonValue(rowId, `[${index}]`, item, `${path}.${index}`),
              )}
            </div>
          ) : null}
        </div>
      )
    }
    const rendered =
      typeof value === 'string' ? value : value === null ? 'null' : String(value)
    return (
      <div className="json-leaf" key={path}>
        <span className="json-key">{label}</span>
        <span className={typeof value === 'string' ? 'json-value-string' : 'json-value'}>
          {typeof value === 'string' ? `"${rendered}"` : rendered}
        </span>
      </div>
    )
  }

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportAuditLogsCsv({
        username: filters.username || undefined,
        action: filters.action || undefined,
        resource: filters.resource || undefined,
        preset: filters.preset || undefined,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setAuditError(toAppErrorInfo(e))
    } finally {
      setExporting(false)
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
        新增数量:
          dimension === 'OBJECT_TYPE'
            ? point.objectTypeCreated
            : point.objectInstanceCreated,
        审计事件: point.auditEvents,
      })),
    [summary, dimension],
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

      <ErrorAlert error={summaryError} />
      <ErrorAlert error={auditError} />

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
        <div className="panel-title-row">
          <h2 className="panel-title">近7天趋势</h2>
          <label className="field small">
            <span>资源维度</span>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as DashboardDimension)}
            >
              <option value="OBJECT_TYPE">OBJECT_TYPE</option>
              <option value="OBJECT_INSTANCE">OBJECT_INSTANCE</option>
            </select>
          </label>
        </div>
        {summaryLoading ? (
          <p className="status">加载中…</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="新增数量"
                  stroke="#1a3a6b"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="审计事件"
                  stroke="#2d6be4"
                  strokeWidth={2}
                />
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
            <label className="field small">
              <span>时间范围</span>
              <select
                value={filters.preset}
                onChange={(e) =>
                  updateFilter('preset', e.target.value as Filters['preset'])
                }
              >
                <option value="">全部</option>
                <option value="TODAY">今天</option>
                <option value="LAST_7_DAYS">近7天</option>
                <option value="LAST_30_DAYS">近30天</option>
              </select>
            </label>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="btn" onClick={() => void loadAudits()}>
              刷新
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void handleExport()} disabled={exporting}>
              {exporting ? '导出中…' : '导出CSV'}
            </button>
          </div>
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
                    auditRows.map((row) => {
                      const parsed = parseDetails(row.details)
                      const jsonObject = isJsonObject(parsed)
                      return (
                        <tr key={String(row.id)}>
                          <td>{row.id}</td>
                          <td>{new Date(row.createdAt).toLocaleString()}</td>
                          <td>{row.username || 'anonymous'}</td>
                          <td>{row.action}</td>
                          <td>{row.resource}</td>
                          <td>{row.resourceId || '—'}</td>
                          <td>
                            {jsonObject ? (
                              <div className="json-view">
                                {Object.keys(parsed).length === 0 ? (
                                  <span className="json-empty">{'{ }'}</span>
                                ) : (
                                  Object.keys(parsed).map((key) =>
                                    renderJsonValue(row.id, key, parsed[key], key),
                                  )
                                )}
                              </div>
                            ) : (
                              <pre className="json-view json-view-light">
                                {typeof parsed === 'string'
                                  ? parsed
                                  : JSON.stringify(parsed, null, 2)}
                              </pre>
                            )}
                          </td>
                        </tr>
                      )
                    })
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
