import { useCallback, useEffect, useState, type FormEvent } from 'react'
import * as api from '../api/objectTypes'
import type { ObjectTypeDto } from '../api/types'
import './CrudPage.css'

function errMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = err as { response?: { data?: { message?: string } } }
    return r.response?.data?.message ?? '请求失败'
  }
  return '请求失败'
}

export function ObjectTypesPage() {
  const [items, setItems] = useState<ObjectTypeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const list = await api.listObjectTypes()
      setItems(list)
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function startEdit(row: ObjectTypeDto) {
    setEditingId(row.id)
    setCode(row.code)
    setName(row.name)
    setDescription(row.description ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setCode('')
    setName('')
    setDescription('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId !== null) {
        await api.updateObjectType(editingId, { code, name, description })
      } else {
        await api.createObjectType({ code, name, description })
      }
      cancelEdit()
      await load()
    } catch (e: unknown) {
      setError(errMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除该对象类型？')) return
    setError(null)
    try {
      await api.deleteObjectType(id)
      if (editingId === id) cancelEdit()
      await load()
    } catch (e: unknown) {
      setError(errMessage(e))
    }
  }

  return (
    <div className="crud-page">
      <h1>对象类型</h1>

      <form className="crud-form" onSubmit={handleSubmit}>
        <h2>{editingId !== null ? '编辑' : '新增'}</h2>
        <div className="crud-form-row">
          <label>
            编码
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          <label>
            名称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            描述
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
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
              <th>编码</th>
              <th>名称</th>
              <th>描述</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={String(row.id)}>
                <td>{row.id}</td>
                <td>{row.code}</td>
                <td>{row.name}</td>
                <td>{row.description ?? '—'}</td>
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
