import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createObjectSet, getObjectSet, updateObjectSet } from '../../api/objectSets'
import { listObjectTypes } from '../../api/objectTypes'
import type { ObjectSetDto, ObjectTypeDto } from '../../api/types'
import { ErrorAlert } from '../../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import '../PageShell.css'

type ObjectSetFormPageProps = {
  mode: 'create' | 'edit'
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function ObjectSetFormPage({ mode }: ObjectSetFormPageProps) {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const id = mode === 'edit' ? Number(params.id) : null

  const [types, setTypes] = useState<ObjectTypeDto[]>([])
  const [typeId, setTypeId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<ObjectSetDto['kind']>('DYNAMIC')
  const [ruleExpression, setRuleExpression] = useState('')
  const [ruleSource, setRuleSource] = useState<ObjectSetDto['ruleSource']>('MANUAL')
  const [snapshotLocal, setSnapshotLocal] = useState('')
  const [owner, setOwner] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<AppErrorInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await listObjectTypes()
        if (cancelled) return
        setTypes(list)
        setTypeId((prev) => prev || (list[0] ? String(list[0].id) : ''))
      } catch (e: unknown) {
        if (!cancelled) setError(toAppErrorInfo(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !id || Number.isNaN(id)) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const item = await getObjectSet(id)
        if (cancelled) return
        setTypeId(String(item.typeId))
        setName(item.name ?? '')
        setDescription(item.description ?? '')
        setKind(item.kind)
        setRuleExpression(item.ruleExpression ?? '')
        setRuleSource(item.ruleSource)
        setSnapshotLocal(isoToDatetimeLocal(item.snapshotAt ?? undefined))
        setOwner(item.owner ?? '')
        setNotes(item.notes ?? '')
      } catch (e: unknown) {
        if (!cancelled) setError(toAppErrorInfo(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!typeId) {
      setError(toAppErrorInfo('请选择对象类型'))
      return
    }
    const snapshotAt =
      kind === 'SNAPSHOT' ? datetimeLocalToIso(snapshotLocal) : null
    if (kind === 'SNAPSHOT' && !snapshotAt) {
      setError(toAppErrorInfo('快照集合需填写快照时间'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      const base = {
        typeId: Number(typeId),
        name,
        description: description.trim() ? description : null,
        kind,
        ruleExpression: ruleExpression.trim() ? ruleExpression : null,
        ruleSource,
        snapshotAt,
        owner: owner.trim() ? owner : null,
        notes: notes.trim() ? notes : null,
      }
      if (mode === 'edit' && id) {
        await updateObjectSet(id, base)
        navigate(`/sets/${id}`, { replace: true })
      } else {
        const created = await createObjectSet(base)
        navigate(`/sets/${created.id}`, { replace: true })
      }
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>{mode === 'edit' ? '编辑对象集合' : '新建对象集合'}</h1>
        <p>绑定单一对象类型，维护规则说明与种类；成员在详情页中维护。</p>
      </header>

      <div className="panel">
        <div className="panel-actions">
          <Link className="btn-secondary" to="/sets">
            返回列表
          </Link>
          {mode === 'edit' && id ? (
            <Link className="btn-secondary" to={`/sets/${id}`}>
              查看详情
            </Link>
          ) : null}
        </div>

        <ErrorAlert error={error} />
        {loading ? (
          <p className="hint-text">加载中…</p>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              对象类型
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                required
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
            <label>
              名称
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                required
              />
            </label>
            <label className="full-width">
              描述（可选）
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
            </label>
            <label>
              种类
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ObjectSetDto['kind'])}
              >
                <option value="DYNAMIC">动态（规则可随数据变化）</option>
                <option value="SNAPSHOT">快照（固定时间点）</option>
              </select>
            </label>
            <label>
              规则来源
              <select
                value={ruleSource}
                onChange={(e) =>
                  setRuleSource(e.target.value as ObjectSetDto['ruleSource'])
                }
              >
                <option value="MANUAL">手工说明</option>
                <option value="JSON_QUERY">JSON 查询（预留）</option>
              </select>
            </label>
            {kind === 'SNAPSHOT' ? (
              <label>
                快照时间
                <input
                  type="datetime-local"
                  value={snapshotLocal}
                  onChange={(e) => setSnapshotLocal(e.target.value)}
                  required
                />
              </label>
            ) : null}
            <label className="full-width">
              规则表达式（可选，说明性文本或后续引擎解析）
              <textarea
                rows={4}
                value={ruleExpression}
                onChange={(e) => setRuleExpression(e.target.value)}
                placeholder="例如：attributes->>'region' = '华东'"
              />
            </label>
            <label>
              业务负责人（可选）
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                maxLength={128}
              />
            </label>
            <label className="full-width">
              备注（可选）
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={5000}
              />
            </label>
            <div className="full-width form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
