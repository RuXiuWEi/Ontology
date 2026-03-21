import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import * as instApi from '../api/instances'
import * as typeApi from '../api/objectTypes'
import type { ObjectInstanceDto, ObjectTypeDto } from '../api/types'
import './CrudPage.css'

function errMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = err as { response?: { data?: { message?: string } } }
    return r.response?.data?.message ?? '请求失败'
  }
  return '请求失败'
}

export function InstancesPage() {
  const [types, setTypes] = useState<ObjectTypeDto[]>([])
  const [items, setItems] = useState<ObjectInstanceDto[]>([])
  const [filterTypeId, setFilterTypeId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [typeId, setTypeId] = useState<string>('')
  const [name, setName] = useState('')
  const [attributesText, setAttributesText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const typeMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of types) {
      m.set(String(t.id), t.name)
    }
    return m
  }, [types])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await typeApi.listObjectTypes()
        if (cancelled) return
        setTypes(list)
        setTypeId((prev) => prev || (list[0] ? String(list[0].id) : ''))
      } catch (e: unknown) {
        if (!cancelled) setError(errMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadInstances = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const list = await instApi.listInstances({
        typeId: filterTypeId === '' ? undefined : Number(filterTypeId),
      })
      setItems(list)
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [filterTypeId])

  useEffect(() => {
    void loadInstances()
  }, [loadInstances])

  function startEdit(row: ObjectInstanceDto) {
    setEditingId(row.id)
    setTypeId(String(row.typeId))
    setName(row.name ?? '')
    setAttributesText(row.attributes ? JSON.stringify(row.attributes, null, 2) : '')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setAttributesText('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!typeId) {
      setError('请选择对象类型')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let attributes: Record<string, unknown> | undefined
      if (attributesText.trim()) {
        try {
          const parsed = JSON.parse(attributesText)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            attributes = parsed as Record<string, unknown>
          } else {
            setError('属性必须是 JSON 对象')
            setSaving(false)
            return
          }
        } catch {
          setError('属性 JSON 格式不正确')
          setSaving(false)
          return
        }
      }
      const parsedTypeId = Number(typeId)
      if (editingId !== null) {
        await instApi.updateInstance(editingId, {
          typeId: parsedTypeId,
          name,
          attributes,
        })
      } else {
        await instApi.createInstance({
          typeId: parsedTypeId,
          name,
          attributes,
        })
      }
      cancelEdit()
      await loadInstances()
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除该对象实例？')) return
    setError(null)
    try {
      await instApi.deleteInstance(id)
      if (editingId === id) cancelEdit()
      await loadInstances()
    } catch (e: unknown) {
      setError(errMessage(e))
    }
  }

  return (
    <div className="crud-page">
      <h1>对象实例</h1>

      <div className="filter-row">
        <label>
          按类型筛选
          <select
            value={filterTypeId}
            onChange={(e) => setFilterTypeId(e.target.value)}
          >
            <option value="">全部</option>
            {types.map((t) => (
              <option key={String(t.id)} value={String(t.id)}>
                {t.name} ({t.id})
              </option>
            ))}
          </select>
        </label>
      </div>

      <form className="crud-form" onSubmit={handleSubmit}>
        <h2>{editingId !== null ? '编辑' : '新增'}</h2>
        <div className="crud-form-row">
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
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            名称
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        </div>
        <label className="crud-field-block">
          属性（可选，JSON对象）
          <textarea
            value={attributesText}
            onChange={(e) => setAttributesText(e.target.value)}
            rows={5}
            placeholder='{"age": 30}'
          />
        </label>
        <div className="crud-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
          {editingId !== null ? (
            <button type="button" onClick={cancelEdit}>
              取消编辑
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="crud-error">{error}</p> : null}

      {loading ? (
        <p>加载中…</p>
      ) : (
        <table className="crud-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>名称</th>
              <th>数据</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={String(row.id)}>
                <td>{row.id}</td>
                <td>{typeMap.get(String(row.typeId)) ?? row.typeId}</td>
                <td>{row.name ?? '—'}</td>
                <td className="crud-cell-data">
                  {row.attributes ? JSON.stringify(row.attributes) : '—'}
                </td>
                <td className="crud-actions">
                  <button type="button" onClick={() => startEdit(row)}>
                    编辑
                  </button>
                  <button type="button" onClick={() => handleDelete(row.id)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
