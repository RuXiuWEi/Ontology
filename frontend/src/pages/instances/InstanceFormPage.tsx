import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createInstance, getInstance, updateInstance } from '../../api/instances'
import { listObjectTypes } from '../../api/objectTypes'
import type { ObjectTypeDto } from '../../api/types'
import { ErrorAlert } from '../../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import { parseJsonObjectInput } from '../../utils/json'
import '../PageShell.css'

type InstanceFormPageProps = {
  mode: 'create' | 'edit'
}

export function InstanceFormPage({ mode }: InstanceFormPageProps) {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const id = mode === 'edit' ? Number(params.id) : null

  const [types, setTypes] = useState<ObjectTypeDto[]>([])
  const [typeId, setTypeId] = useState('')
  const [name, setName] = useState('')
  const [attributesText, setAttributesText] = useState('')

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
        const item = await getInstance(id)
        if (cancelled) return
        setTypeId(String(item.typeId))
        setName(item.name ?? '')
        setAttributesText(
          item.attributes ? JSON.stringify(item.attributes, null, 2) : '',
        )
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
    setSaving(true)
    setError(null)
    try {
      let attributes: Record<string, unknown> | undefined
      if (attributesText.trim()) {
        const parsed = parseJsonObjectInput(
          attributesText,
          '属性不能为空，请输入 JSON 对象',
          '属性必须是合法 JSON 对象',
        )
        if (!parsed.ok) {
          setError(toAppErrorInfo(parsed.message))
          setSaving(false)
          return
        }
        attributes = parsed.value
      }

      if (mode === 'edit' && id) {
        await updateInstance(id, {
          typeId: Number(typeId),
          name,
          attributes,
        })
        navigate(`/instances/${id}`, { replace: true })
      } else {
        const created = await createInstance({
          typeId: Number(typeId),
          name,
          attributes,
        })
        navigate(`/instances/${created.id}`, { replace: true })
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
        <h1>{mode === 'edit' ? '编辑对象实例' : '新建对象实例'}</h1>
        <p>维护对象实例名称、类型和结构化属性 JSON。</p>
      </header>

      <div className="panel">
        <div className="panel-actions">
          <Link className="btn-secondary" to="/instances">
            返回列表
          </Link>
          {mode === 'edit' && id ? (
            <Link className="btn-secondary" to={`/instances/${id}`}>
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
              属性（可选，JSON 对象）
              <textarea
                rows={8}
                value={attributesText}
                onChange={(e) => setAttributesText(e.target.value)}
                placeholder='{"region":"华东","level":1}'
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
