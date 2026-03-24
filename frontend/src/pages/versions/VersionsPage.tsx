import { useCallback, useMemo, useState } from 'react'
import {
  getModelDraft,
  listModelVersionsPage,
  publishModelDraft,
  rollbackModelVersion,
  saveModelDraft,
} from '../../api/modelVersions'
import type { ModelVersionDto } from '../../api/types'
import { usePermissions } from '../../auth/usePermissions'
import { ErrorAlert } from '../../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import { parseJsonObjectInput } from '../../utils/json'
import '../PageShell.css'

const PAGE_SIZE = 10

export function VersionsPage() {
  const { can } = usePermissions()
  const [modelCode, setModelCode] = useState('M_GOV_RULE_ENGINE')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<ModelVersionDto[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [draftId, setDraftId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [changeLog, setChangeLog] = useState('')
  const [contentText, setContentText] = useState('{\n  "nodes": []\n}')
  const [rollbackVersionNo, setRollbackVersionNo] = useState('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<AppErrorInfo | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const canManageVersions = can('canManageVersions')

  const clearTip = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  const loadData = useCallback(async () => {
    clearTip()
    setLoading(true)
    try {
      const [listRes, draftRes] = await Promise.all([
        listModelVersionsPage({
          modelCode: modelCode || undefined,
          status: statusFilter || undefined,
          page,
          size: PAGE_SIZE,
        }),
        modelCode ? getModelDraft(modelCode).catch(() => null) : Promise.resolve(null),
      ])

      setRows(listRes.content)
      setTotalElements(listRes.totalElements)
      setTotalPages(listRes.totalPages)

      if (draftRes) {
        setDraftId(draftRes.id)
        setTitle(draftRes.title)
        setChangeLog(draftRes.changeLog ?? '')
        setContentText(JSON.stringify(draftRes.content, null, 2))
      } else {
        setDraftId(null)
      }
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setLoading(false)
    }
  }, [clearTip, modelCode, page, statusFilter])

  async function handleSaveDraft() {
    clearTip()
    if (!modelCode.trim()) {
      setError(toAppErrorInfo('modelCode 不能为空'))
      return
    }
    if (!title.trim()) {
      setError(toAppErrorInfo('标题不能为空'))
      return
    }
    const parsedContent = parseJsonObjectInput(
      contentText,
      '模型内容不能为空，请输入 JSON 对象',
      '模型内容格式不正确，请输入合法 JSON 对象',
    )
    if (!parsedContent.ok) {
      setError(toAppErrorInfo(parsedContent.message))
      return
    }
    if (Object.keys(parsedContent.value).length === 0) {
      setError(toAppErrorInfo('模型内容不能为空对象，请至少填写一个字段'))
      return
    }
    setSaving(true)
    try {
      const saved = await saveModelDraft({
        modelCode: modelCode.trim(),
        title: title.trim(),
        content: parsedContent.value,
        changeLog: changeLog.trim() || undefined,
      })
      setDraftId(saved.id)
      setSuccess(`草稿已保存（ID=${saved.id}）`)
      await loadData()
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishDraft() {
    clearTip()
    if (!draftId) {
      setError(toAppErrorInfo('当前无可发布草稿，请先保存草稿'))
      return
    }
    if (!changeLog.trim()) {
      setError(toAppErrorInfo('发布说明不能为空'))
      return
    }
    const parsedContent = parseJsonObjectInput(
      contentText,
      '发布前请先填写模型内容',
      '发布前请先修正模型内容 JSON 格式',
    )
    if (!parsedContent.ok) {
      setError(toAppErrorInfo(parsedContent.message))
      return
    }
    if (Object.keys(parsedContent.value).length === 0) {
      setError(toAppErrorInfo('发布前请先补充模型内容，空对象不允许发布'))
      return
    }
    setSaving(true)
    try {
      const published = await publishModelDraft(draftId, changeLog.trim())
      setDraftId(null)
      setSuccess(`发布成功：v${published.versionNo}`)
      await loadData()
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleRollbackDraft() {
    clearTip()
    const targetVersionNo = Number(rollbackVersionNo)
    if (!Number.isInteger(targetVersionNo) || targetVersionNo <= 0) {
      setError(toAppErrorInfo('请输入正确的回滚版本号'))
      return
    }
    if (!modelCode.trim()) {
      setError(toAppErrorInfo('modelCode 不能为空'))
      return
    }
    setSaving(true)
    try {
      const draft = await rollbackModelVersion({
        modelCode: modelCode.trim(),
        targetVersionNo,
        changeLog: changeLog.trim() || undefined,
      })
      setDraftId(draft.id)
      setTitle(draft.title)
      setChangeLog(draft.changeLog ?? '')
      setContentText(JSON.stringify(draft.content, null, 2))
      setSuccess(`已生成回滚草稿（目标版本 v${targetVersionNo}）`)
      await loadData()
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(
    () =>
      `显示 ${rows.length === 0 ? 0 : page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, totalElements)} / 共 ${totalElements} 条`,
    [page, rows.length, totalElements],
  )

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>版本治理</h1>
          <p>支持草稿保存、版本发布、回滚生成草稿与历史版本查询。</p>
        </div>
      </header>

      <ErrorAlert error={error} />
      {success ? <p className="status">{success}</p> : null}
      <p className="hint-text">
        使用建议：保存/发布前先确认“模型内容”为 JSON 对象且非空；发布说明用于后续追溯与审计。
      </p>
      {!canManageVersions ? (
        <p className="status info">当前为只读模式，可查询版本与草稿，但无法保存、发布或回滚。</p>
      ) : null}

      <div className="panel">
        <h2 className="panel-title">草稿编辑与发布</h2>
        <div className="form-grid">
          <label className="field">
            <span>模型编码（modelCode）</span>
            <input
              value={modelCode}
              onChange={(e) => setModelCode(e.target.value)}
              maxLength={64}
              placeholder="例如：M_GOV_RULE_ENGINE"
              disabled={!canManageVersions}
            />
          </label>
          <label className="field">
            <span>标题</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              placeholder="例如：规则引擎草稿"
              disabled={!canManageVersions}
            />
          </label>
          <label className="field full-width">
            <span>变更说明（changeLog）</span>
            <input
              value={changeLog}
              onChange={(e) => setChangeLog(e.target.value)}
              placeholder="发布和回滚时会作为版本说明"
              disabled={!canManageVersions}
            />
          </label>
          <label className="field full-width">
            <span>模型内容（JSON 对象）</span>
            <textarea
              rows={10}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder='{"nodes":[]}'
              disabled={!canManageVersions}
            />
          </label>
          <div className="form-actions full-width">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSaveDraft()}
              disabled={saving || !canManageVersions}
            >
              {saving ? '处理中…' : '保存草稿'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void handlePublishDraft()}
              disabled={saving || !canManageVersions}
            >
              发布草稿
            </button>
            <input
              className="input"
              style={{ maxWidth: 180 }}
              value={rollbackVersionNo}
              onChange={(e) => setRollbackVersionNo(e.target.value)}
              placeholder="回滚版本号，如 1"
              disabled={!canManageVersions}
            />
            <button
              type="button"
              className="btn"
              onClick={() => void handleRollbackDraft()}
              disabled={saving || !canManageVersions}
            >
              回滚生成草稿
            </button>
            <button type="button" className="btn btn-light" onClick={() => void loadData()} disabled={loading}>
              刷新
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="toolbar-fields">
            <label className="field small">
              <span>状态筛选</span>
              <select value={statusFilter} onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}>
                <option value="">全部</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
          </div>
          <button type="button" className="btn" onClick={() => void loadData()} disabled={loading}>
            {loading ? '加载中…' : '查询'}
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>模型编码</th>
                <th>版本号</th>
                <th>标题</th>
                <th>状态</th>
                <th>发布人/时间</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    暂无版本数据
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={String(row.id)}>
                    <td>{row.id}</td>
                    <td>{row.modelCode}</td>
                    <td>{row.versionNo}</td>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>
                      {row.publishedBy || '—'}
                      <br />
                      {row.publishedAt ? new Date(row.publishedAt).toLocaleString() : '—'}
                    </td>
                    <td>{new Date(row.updatedAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="pagination">
          <span>{summary}</span>
          <div className="pagination-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page <= 0}
            >
              上一页
            </button>
            <span>
              第 {Math.max(page + 1, 1)} / {Math.max(totalPages, 1)} 页
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={totalPages === 0 || page + 1 >= totalPages}
            >
              下一页
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}
