import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../../api/objectTypes'
import '../PageShell.css'

type ObjectTypeFormPageProps = {
  mode: 'create' | 'edit'
}

function errMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = err as { response?: { data?: { message?: string } } }
    return r.response?.data?.message ?? '请求失败'
  }
  return '请求失败'
}

export function ObjectTypeFormPage({ mode }: ObjectTypeFormPageProps) {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const isEdit = mode === 'edit'

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || Number.isNaN(id)) return

    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const row = await api.getObjectType(id)
        if (cancelled) return
        setCode(row.code)
        setName(row.name)
        setDescription(row.description ?? '')
      } catch (e: unknown) {
        if (!cancelled) setError(errMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isEdit) {
        if (Number.isNaN(id)) {
          setError('无效的对象类型ID')
          return
        }
        await api.updateObjectType(id, { code, name, description })
        navigate(`/object-types/${id}`)
      } else {
        const created = await api.createObjectType({ code, name, description })
        navigate(`/object-types/${created.id}`)
      }
    } catch (err: unknown) {
      setError(errMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>{isEdit ? '编辑对象类型' : '新建对象类型'}</h1>
        <p>按原设计稿流程拆分为独立编辑页，提升可用性与可维护性。</p>
      </header>

      <div className="panel form-panel">
        {loading ? <p>加载中…</p> : null}
        {error ? <p className="crud-error">{error}</p> : null}

        {!loading ? (
          <form className="entity-form" onSubmit={handleSubmit}>
            <label>
              编码
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={64}
                required
              />
            </label>
            <label>
              名称
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                required
              />
            </label>
            <label>
              描述
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
              <Link className="button-secondary" to={isEdit ? `/object-types/${id}` : '/object-types'}>
                取消
              </Link>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  )
}
