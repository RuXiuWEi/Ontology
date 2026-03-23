import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createActionType,
  deleteActionType,
  executeAction,
  listActionExecutionsPage,
  listActionTypesPage,
  retryActionExecution,
} from '../../api/actions'
import { listInstances } from '../../api/instances'
import { listObjectTypes } from '../../api/objectTypes'
import type {
  ActionExecutionDto,
  ActionTypeDto,
  ObjectInstanceDto,
  ObjectTypeDto,
  PageResponse,
} from '../../api/types'
import '../PageShell.css'

function errMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = err as { response?: { data?: { message?: string } } }
    return r.response?.data?.message ?? '请求失败'
  }
  return '请求失败'
}

const PAGE_SIZE = 10

type ActionTypeFormState = {
  code: string
  name: string
  targetTypeId: string
  executorType: string
  parameterSchema: string
  description: string
}

export function ActionsPage() {
  const [types, setTypes] = useState<ActionTypeDto[]>([])
  const [typesPage, setTypesPage] = useState<PageResponse<ActionTypeDto> | null>(null)
  const [typesLoading, setTypesLoading] = useState(true)
  const [typesPageIndex, setTypesPageIndex] = useState(0)

  const [executions, setExecutions] = useState<ActionExecutionDto[]>([])
  const [execPage, setExecPage] = useState<PageResponse<ActionExecutionDto> | null>(null)
  const [execLoading, setExecLoading] = useState(true)
  const [execPageIndex, setExecPageIndex] = useState(0)

  const [objectTypes, setObjectTypes] = useState<ObjectTypeDto[]>([])
  const [instances, setInstances] = useState<ObjectInstanceDto[]>([])

  const [queryActionTypeId, setQueryActionTypeId] = useState('')
  const [execActionTypeId, setExecActionTypeId] = useState('')
  const [execTargetInstanceId, setExecTargetInstanceId] = useState('')
  const [execPayloadText, setExecPayloadText] = useState('{\n  "tag": "vip"\n}')

  const [form, setForm] = useState<ActionTypeFormState>({
    code: '',
    name: '',
    targetTypeId: '',
    executorType: 'SYNC_MOCK',
    parameterSchema: '{"type":"object"}',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const typeMap = useMemo(() => {
    const map = new Map<number, ObjectTypeDto>()
    for (const t of objectTypes) map.set(t.id, t)
    return map
  }, [objectTypes])

  const refreshActionTypes = useCallback(
    async (page = typesPageIndex) => {
      setTypesLoading(true)
      try {
        const pageData = await listActionTypesPage({ page, size: PAGE_SIZE })
        setTypes(pageData.content)
        setTypesPage(pageData)
      } finally {
        setTypesLoading(false)
      }
    },
    [typesPageIndex],
  )

  const refreshExecutions = useCallback(
    async (page = execPageIndex, actionTypeId?: number) => {
      setExecLoading(true)
      try {
        const pageData = await listActionExecutionsPage({
          page,
          size: PAGE_SIZE,
          actionTypeId,
        })
        setExecutions(pageData.content)
        setExecPage(pageData)
      } finally {
        setExecLoading(false)
      }
    },
    [execPageIndex],
  )

  useEffect(() => {
    void refreshActionTypes(typesPageIndex)
  }, [typesPageIndex, refreshActionTypes])

  useEffect(() => {
    const actionTypeId = queryActionTypeId ? Number(queryActionTypeId) : undefined
    void refreshExecutions(execPageIndex, actionTypeId)
  }, [execPageIndex, queryActionTypeId, refreshExecutions])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [ot, ins] = await Promise.all([listObjectTypes(), listInstances()])
        if (cancelled) return
        setObjectTypes(ot)
        setInstances(ins)
        if (ot.length > 0 && !form.targetTypeId) {
          setForm((prev) => ({ ...prev, targetTypeId: String(ot[0].id) }))
        }
        if (ins.length > 0 && !execTargetInstanceId) {
          setExecTargetInstanceId(String(ins[0].id))
        }
      } catch {
        if (cancelled) return
      }
    })()
    return () => {
      cancelled = true
    }
  }, [form.targetTypeId, execTargetInstanceId])

  async function handleCreateActionType(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createActionType({
        code: form.code.trim(),
        name: form.name.trim(),
        targetTypeId: Number(form.targetTypeId),
        executorType: form.executorType.trim(),
        parameterSchema: form.parameterSchema.trim() || undefined,
        description: form.description.trim() || undefined,
        enabled: true,
      })
      setForm((prev) => ({
        ...prev,
        code: '',
        name: '',
        description: '',
      }))
      setTypesPageIndex(0)
      await refreshActionTypes(0)
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExecuteAction(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      let payload: Record<string, unknown> | undefined
      if (execPayloadText.trim()) {
        const parsed = JSON.parse(execPayloadText)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setError('执行参数必须是 JSON 对象')
          return
        }
        payload = parsed as Record<string, unknown>
      }
      await executeAction({
        actionTypeId: Number(execActionTypeId),
        targetInstanceId: Number(execTargetInstanceId),
        payload,
      })
      setExecPageIndex(0)
      await refreshExecutions(0, queryActionTypeId ? Number(queryActionTypeId) : undefined)
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetry(executionId: number) {
    setRetryingId(executionId)
    setError(null)
    try {
      await retryActionExecution(executionId)
      await refreshExecutions(execPageIndex, queryActionTypeId ? Number(queryActionTypeId) : undefined)
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setRetryingId(null)
    }
  }

  async function handleDeleteActionType(actionTypeId: number) {
    if (!window.confirm('确定删除该动作类型？')) return
    setDeletingId(actionTypeId)
    setError(null)
    try {
      await deleteActionType(actionTypeId)
      const shouldMovePrev = types.length === 1 && typesPageIndex > 0
      if (shouldMovePrev) {
        setTypesPageIndex((prev) => prev - 1)
      } else {
        await refreshActionTypes(typesPageIndex)
      }
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setDeletingId(null)
    }
  }

  function statusLabel(status: ActionExecutionDto['status']): string {
    if (status === 'SUCCEEDED') return '成功'
    if (status === 'FAILED') return '失败'
    if (status === 'RUNNING') return '执行中'
    return '待执行'
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>动作管理</h1>
          <p>维护动作类型，触发执行并跟踪执行记录，支持失败重试。</p>
        </div>
      </header>

      {error ? <p className="status error">{error}</p> : null}

      <div className="panel">
        <h2 className="panel-title">新建动作类型</h2>
        <form className="form-grid" onSubmit={handleCreateActionType}>
          <label className="field">
            <span>编码</span>
            <input
              value={form.code}
              maxLength={64}
              required
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>名称</span>
            <input
              value={form.name}
              maxLength={255}
              required
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>目标对象类型</span>
            <select
              value={form.targetTypeId}
              required
              onChange={(e) =>
                setForm((prev) => ({ ...prev, targetTypeId: e.target.value }))
              }
            >
              <option value="" disabled>
                请选择
              </option>
              {objectTypes.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>执行器类型</span>
            <select
              value={form.executorType}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, executorType: e.target.value }))
              }
            >
              <option value="SYNC_MOCK">SYNC_MOCK</option>
              <option value="WEBHOOK">WEBHOOK</option>
            </select>
          </label>
          <label className="field full">
            <span>参数 Schema（可选）</span>
            <textarea
              rows={4}
              value={form.parameterSchema}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, parameterSchema: e.target.value }))
              }
            />
          </label>
          <label className="field full">
            <span>描述（可选）</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </label>
          <div className="form-actions full">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '提交中…' : '创建动作类型'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="toolbar">
          <h2 className="panel-title">动作类型列表</h2>
          <button
            type="button"
            className="btn"
            onClick={() => void refreshActionTypes(typesPageIndex)}
          >
            刷新
          </button>
        </div>
        {typesLoading ? (
          <p className="status">加载中…</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>编码</th>
                    <th>名称</th>
                    <th>目标类型</th>
                    <th>执行器</th>
                    <th>状态</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {types.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        暂无动作类型
                      </td>
                    </tr>
                  ) : (
                    types.map((row) => (
                      <tr key={String(row.id)}>
                        <td>{row.id}</td>
                        <td className="mono-cell">{row.code}</td>
                        <td>{row.name}</td>
                        <td>{row.targetTypeCode}</td>
                        <td>{row.executorType}</td>
                        <td>{row.enabled ? '启用' : '停用'}</td>
                        <td className="actions">
                          <button
                            type="button"
                            className="link-btn danger"
                            disabled={deletingId === row.id}
                            onClick={() => void handleDeleteActionType(row.id)}
                          >
                            {deletingId === row.id ? '删除中…' : '删除'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <footer className="pagination">
              <span>
                显示 {typesPage?.totalElements === 0 ? 0 : typesPageIndex * PAGE_SIZE + 1}-
                {Math.min((typesPageIndex + 1) * PAGE_SIZE, typesPage?.totalElements ?? 0)} / 共{' '}
                {typesPage?.totalElements ?? 0} 条
              </span>
              <div className="pagination-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={typesPageIndex <= 0}
                  onClick={() => setTypesPageIndex((prev) => prev - 1)}
                >
                  上一页
                </button>
                <span>
                  第 {typesPageIndex + 1} / {Math.max(typesPage?.totalPages ?? 1, 1)} 页
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={typesPage ? typesPageIndex + 1 >= typesPage.totalPages : true}
                  onClick={() => setTypesPageIndex((prev) => prev + 1)}
                >
                  下一页
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      <div className="panel">
        <h2 className="panel-title">触发动作执行</h2>
        <form className="form-grid" onSubmit={handleExecuteAction}>
          <label className="field">
            <span>动作类型</span>
            <select
              value={execActionTypeId}
              required
              onChange={(e) => setExecActionTypeId(e.target.value)}
            >
              <option value="" disabled>
                请选择
              </option>
              {types.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>目标实例</span>
            <select
              value={execTargetInstanceId}
              required
              onChange={(e) => setExecTargetInstanceId(e.target.value)}
            >
              <option value="" disabled>
                请选择
              </option>
              {instances.map((ins) => (
                <option key={String(ins.id)} value={String(ins.id)}>
                  {ins.name} (#{ins.id} / {typeMap.get(ins.typeId)?.code ?? ins.typeCode})
                </option>
              ))}
            </select>
          </label>
          <label className="field full">
            <span>执行参数 JSON（可选）</span>
            <textarea
              rows={4}
              value={execPayloadText}
              onChange={(e) => setExecPayloadText(e.target.value)}
            />
          </label>
          <div className="form-actions full">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '执行中…' : '执行动作'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="toolbar">
          <h2 className="panel-title">动作执行记录</h2>
          <div className="toolbar-fields">
            <label className="field small">
              <span>按动作类型筛选</span>
              <select
                value={queryActionTypeId}
                onChange={(e) => {
                  setQueryActionTypeId(e.target.value)
                  setExecPageIndex(0)
                }}
              >
                <option value="">全部</option>
                {types.map((t) => (
                  <option key={String(t.id)} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn"
              onClick={() =>
                void refreshExecutions(
                  execPageIndex,
                  queryActionTypeId ? Number(queryActionTypeId) : undefined,
                )
              }
            >
              刷新
            </button>
          </div>
        </div>
        {execLoading ? (
          <p className="status">加载中…</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>动作</th>
                    <th>目标实例</th>
                    <th>状态</th>
                    <th>错误</th>
                    <th>完成时间</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {executions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        暂无执行记录
                      </td>
                    </tr>
                  ) : (
                    executions.map((row) => (
                      <tr key={String(row.id)}>
                        <td>{row.id}</td>
                        <td>
                          {row.actionTypeName}
                          <br />
                          <span className="mono-cell">{row.actionTypeCode}</span>
                        </td>
                        <td>
                          {row.targetInstanceName}
                          <br />
                          <span className="mono-cell">#{row.targetInstanceId}</span>
                        </td>
                        <td>{statusLabel(row.status)}</td>
                        <td>{row.errorMessage || '—'}</td>
                        <td>{row.completedAt ? new Date(row.completedAt).toLocaleString() : '—'}</td>
                        <td className="actions">
                          <button
                            type="button"
                            className="link-btn"
                            disabled={row.status !== 'FAILED' || retryingId === row.id}
                            onClick={() => void handleRetry(row.id)}
                          >
                            {retryingId === row.id ? '重试中…' : '失败重试'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <footer className="pagination">
              <span>
                显示 {execPage?.totalElements === 0 ? 0 : execPageIndex * PAGE_SIZE + 1}-
                {Math.min((execPageIndex + 1) * PAGE_SIZE, execPage?.totalElements ?? 0)} / 共{' '}
                {execPage?.totalElements ?? 0} 条
              </span>
              <div className="pagination-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={execPageIndex <= 0}
                  onClick={() => setExecPageIndex((prev) => prev - 1)}
                >
                  上一页
                </button>
                <span>
                  第 {execPageIndex + 1} / {Math.max(execPage?.totalPages ?? 1, 1)} 页
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={execPage ? execPageIndex + 1 >= execPage.totalPages : true}
                  onClick={() => setExecPageIndex((prev) => prev + 1)}
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
