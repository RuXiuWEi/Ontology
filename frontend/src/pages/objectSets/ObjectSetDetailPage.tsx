import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getObjectSet, listObjectSetMembersPage, replaceObjectSetMembers } from '../../api/objectSets'
import { listObjectTypes } from '../../api/objectTypes'
import { ErrorAlert } from '../../components/ErrorAlert'
import { usePermissions } from '../../auth/usePermissions'
import type { ObjectInstanceDto, ObjectSetDto, ObjectTypeDto } from '../../api/types'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import '../PageShell.css'

const KIND_LABEL: Record<string, string> = {
  DYNAMIC: '动态',
  SNAPSHOT: '快照',
}

const RULE_SRC_LABEL: Record<string, string> = {
  MANUAL: '手工说明',
  JSON_QUERY: 'JSON 查询',
}

export function ObjectSetDetailPage() {
  const { can } = usePermissions()
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const [item, setItem] = useState<ObjectSetDto | null>(null)
  const [types, setTypes] = useState<ObjectTypeDto[]>([])
  const [members, setMembers] = useState<ObjectInstanceDto[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberIdsText, setMemberIdsText] = useState('')
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)
  const [error, setError] = useState<AppErrorInfo | null>(null)
  const canManage = can('canManageInstances')

  const loadSet = useCallback(async () => {
    if (!Number.isFinite(id)) return
    setLoading(true)
    setError(null)
    try {
      const [setData, typeList] = await Promise.all([
        getObjectSet(id),
        listObjectTypes(),
      ])
      setItem(setData)
      setTypes(typeList)
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadMembers = useCallback(async () => {
    if (!Number.isFinite(id)) return
    setMembersLoading(true)
    try {
      const page = await listObjectSetMembersPage(id, { page: 0, size: 100 })
      setMembers(page.content)
      setMemberTotal(page.totalElements)
      setMemberIdsText(page.content.map((m) => String(m.id)).join(', '))
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setMembersLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError(toAppErrorInfo('集合 ID 无效'))
      setLoading(false)
      return
    }
    void loadSet()
  }, [id, loadSet])

  useEffect(() => {
    if (!item) return
    void loadMembers()
  }, [item, loadMembers])

  const typeName = useMemo(() => {
    if (!item) return '—'
    const found = types.find((type) => type.id === item.typeId)
    return found?.name ?? item.typeCode ?? String(item.typeId)
  }, [item, types])

  async function handleSaveMembers() {
    if (!Number.isFinite(id) || !item) return
    const raw = memberIdsText
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const nums: number[] = []
    const seen = new Set<number>()
    for (const s of raw) {
      const n = Number(s)
      if (!Number.isInteger(n) || n <= 0) {
        setError(toAppErrorInfo(`无效的实例 ID：${s}`))
        return
      }
      if (seen.has(n)) continue
      seen.add(n)
      nums.push(n)
    }
    setSavingMembers(true)
    setError(null)
    try {
      await replaceObjectSetMembers(id, nums)
      await loadSet()
      await loadMembers()
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setSavingMembers(false)
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>对象集合详情</h1>
          <p>查看集合定义与成员列表；一期成员为手工指定，与绑定类型的实例 ID 一致。</p>
        </div>
        <div className="header-actions">
          <Link to="/sets" className="btn ghost">
            返回列表
          </Link>
          {Number.isFinite(id) && canManage ? (
            <Link to={`/sets/${id}/edit`} className="btn primary">
              编辑集合
            </Link>
          ) : null}
        </div>
      </header>

      <ErrorAlert error={error} />
      {!canManage ? (
        <p className="status info">当前账号为只读模式，无法修改成员。</p>
      ) : null}
      {loading ? <p>加载中…</p> : null}

      {!loading && item ? (
        <>
          <div className="panel detail-grid">
            <div className="detail-item">
              <span>集合 ID</span>
              <strong>{item.id}</strong>
            </div>
            <div className="detail-item">
              <span>名称</span>
              <strong>{item.name}</strong>
            </div>
            <div className="detail-item">
              <span>对象类型</span>
              <strong>{typeName}</strong>
            </div>
            <div className="detail-item">
              <span>种类</span>
              <strong>{KIND_LABEL[item.kind] ?? item.kind}</strong>
            </div>
            <div className="detail-item">
              <span>规则来源</span>
              <strong>{RULE_SRC_LABEL[item.ruleSource] ?? item.ruleSource}</strong>
            </div>
            <div className="detail-item">
              <span>成员数</span>
              <strong>{item.memberCount}</strong>
            </div>
            {item.snapshotAt ? (
              <div className="detail-item">
                <span>快照时间</span>
                <strong>{item.snapshotAt}</strong>
              </div>
            ) : null}
            {item.owner ? (
              <div className="detail-item">
                <span>负责人</span>
                <strong>{item.owner}</strong>
              </div>
            ) : null}
            {item.description ? (
              <div className="detail-item full-width">
                <span>描述</span>
                <strong>{item.description}</strong>
              </div>
            ) : null}
            {item.ruleExpression ? (
              <div className="detail-item full-width">
                <span>规则表达式</span>
                <strong className="mono-cell">{item.ruleExpression}</strong>
              </div>
            ) : null}
            {item.notes ? (
              <div className="detail-item full-width">
                <span>备注</span>
                <strong>{item.notes}</strong>
              </div>
            ) : null}
          </div>

          <div className="panel">
            <h2>成员</h2>
            {membersLoading ? (
              <p>成员加载中…</p>
            ) : (
              <>
                <p className="hint-text">
                  共 {memberTotal} 条；列表最多展示前 100 条。成员须属于类型「{typeName}」。
                </p>
                <table className="table">
                  <thead>
                    <tr>
                      <th>实例 ID</th>
                      <th>名称</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="empty-cell">
                          暂无成员
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr key={String(m.id)}>
                          <td>{m.id}</td>
                          <td>{m.name}</td>
                          <td className="actions-cell">
                            <Link className="btn btn-light" to={`/instances/${m.id}`}>
                              实例详情
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {canManage ? (
                  <div className="form-grid" style={{ marginTop: '1rem' }}>
                    <label className="full-width">
                      成员实例 ID（逗号或空格分隔，保存后将覆盖当前成员）
                      <textarea
                        rows={3}
                        value={memberIdsText}
                        onChange={(e) => setMemberIdsText(e.target.value)}
                        placeholder="例如：1, 2, 5"
                      />
                    </label>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={savingMembers}
                        onClick={() => void handleSaveMembers()}
                      >
                        {savingMembers ? '保存中…' : '保存成员'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
