import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { listInstancesPage } from '../../api/instances'
import { listObjectTypes } from '../../api/objectTypes'
import {
  createRelationEdge,
  createRelationType,
  deleteRelationEdge,
  deleteRelationType,
  listRelationNeighbors,
  listRelationTypesPage,
  updateRelationType,
} from '../../api/relations'
import type {
  ObjectInstanceDto,
  ObjectTypeDto,
  RelationCardinality,
  RelationDirection,
  RelationNeighborDto,
  RelationTypeDto,
} from '../../api/types'
import { getErrorMessage } from '../../utils/error'
import { parseJsonObjectInput } from '../../utils/json'
import '../PageShell.css'

type RelationTypeForm = {
  code: string
  name: string
  sourceTypeId: string
  targetTypeId: string
  cardinality: RelationCardinality
  direction: RelationDirection
  description: string
}

const PAGE_SIZE = 10

const EMPTY_FORM: RelationTypeForm = {
  code: '',
  name: '',
  sourceTypeId: '',
  targetTypeId: '',
  cardinality: 'ONE_TO_ONE',
  direction: 'DIRECTED',
  description: '',
}

function prettyCardinality(value: RelationCardinality): string {
  switch (value) {
    case 'ONE_TO_ONE':
      return '一对一'
    case 'ONE_TO_MANY':
      return '一对多'
    case 'MANY_TO_ONE':
      return '多对一'
    case 'MANY_TO_MANY':
      return '多对多'
    default:
      return value
  }
}

function prettyDirection(value: RelationDirection): string {
  return value === 'DIRECTED' ? '有向' : '无向'
}

export function RelationTypesPage() {
  const [types, setTypes] = useState<ObjectTypeDto[]>([])
  const [instances, setInstances] = useState<ObjectInstanceDto[]>([])
  const [rows, setRows] = useState<RelationTypeDto[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<RelationTypeForm>(EMPTY_FORM)

  const [edgeRelationTypeId, setEdgeRelationTypeId] = useState('')
  const [edgeSourceId, setEdgeSourceId] = useState('')
  const [edgeTargetId, setEdgeTargetId] = useState('')
  const [edgeAttributes, setEdgeAttributes] = useState('')
  const [neighborInstanceId, setNeighborInstanceId] = useState('')
  const [neighbors, setNeighbors] = useState<RelationNeighborDto[]>([])
  const [edgeBusy, setEdgeBusy] = useState(false)

  const objectTypeMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of types) {
      map.set(item.id, `${item.name} (${item.code})`)
    }
    return map
  }, [types])

  const instanceMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of instances) {
      map.set(item.id, item.name)
    }
    return map
  }, [instances])

  const loadRelationTypes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [typeRows, relationPage, instancePage] = await Promise.all([
        listObjectTypes(),
        listRelationTypesPage({ page, size: PAGE_SIZE }),
        listInstancesPage({ page: 0, size: 100 }),
      ])
      setTypes(typeRows)
      setRows(relationPage.content)
      setTotalPages(relationPage.totalPages)
      setTotalElements(relationPage.totalElements)
      setInstances(instancePage.content)
      if (!form.sourceTypeId && typeRows[0]) {
        setForm((prev) => ({
          ...prev,
          sourceTypeId: String(typeRows[0].id),
          targetTypeId: String(typeRows[0].id),
        }))
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [form.sourceTypeId, page])

  useEffect(() => {
    void loadRelationTypes()
  }, [loadRelationTypes])

  function resetForm() {
    setEditId(null)
    setForm((prev) => ({
      ...EMPTY_FORM,
      sourceTypeId: prev.sourceTypeId,
      targetTypeId: prev.targetTypeId,
    }))
  }

  function startEdit(row: RelationTypeDto) {
    setEditId(row.id)
    setForm({
      code: row.code,
      name: row.name,
      sourceTypeId: String(row.sourceTypeId),
      targetTypeId: String(row.targetTypeId),
      cardinality: row.cardinality,
      direction: row.direction,
      description: row.description ?? '',
    })
  }

  async function submitTypeForm(e: FormEvent) {
    e.preventDefault()
    if (!form.sourceTypeId || !form.targetTypeId) {
      setError('请选择源类型和目标类型')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (!form.code.trim()) {
        setError('请输入关系类型编码')
        setSaving(false)
        return
      }
      if (!form.name.trim()) {
        setError('请输入关系类型名称')
        setSaving(false)
        return
      }
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        sourceTypeId: Number(form.sourceTypeId),
        targetTypeId: Number(form.targetTypeId),
        cardinality: form.cardinality,
        direction: form.direction,
        description: form.description.trim() || undefined,
      }
      if (editId) {
        await updateRelationType(editId, payload)
      } else {
        await createRelationType(payload)
      }
      resetForm()
      await loadRelationTypes()
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRelationType(id: number) {
    if (!window.confirm('确定删除该关联类型？')) return
    setError(null)
    try {
      await deleteRelationType(id)
      if (rows.length === 1 && page > 0) {
        setPage((prev) => prev - 1)
      } else {
        await loadRelationTypes()
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    }
  }

  async function handleCreateEdge() {
    if (!edgeRelationTypeId || !edgeSourceId || !edgeTargetId) {
      setError('请填写关联类型、源实例、目标实例')
      return
    }
    setEdgeBusy(true)
    setError(null)
    try {
      let parsedAttributes: Record<string, unknown> | undefined
      if (edgeAttributes.trim()) {
        const parsed = parseJsonObjectInput(
          edgeAttributes,
          '关系属性不能为空',
          '关系属性必须是合法 JSON 对象',
        )
        if (!parsed.ok) {
          setError(parsed.message)
          setEdgeBusy(false)
          return
        }
        parsedAttributes = parsed.value
      }
      await createRelationEdge({
        relationTypeId: Number(edgeRelationTypeId),
        sourceInstanceId: Number(edgeSourceId),
        targetInstanceId: Number(edgeTargetId),
        attributes: parsedAttributes,
      })
      setEdgeAttributes('')
      if (neighborInstanceId) {
        const data = await listRelationNeighbors(Number(neighborInstanceId))
        setNeighbors(data)
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setEdgeBusy(false)
    }
  }

  async function handleQueryNeighbors() {
    if (!neighborInstanceId) {
      setError('请输入实例ID后查询')
      return
    }
    setEdgeBusy(true)
    setError(null)
    try {
      const data = await listRelationNeighbors(Number(neighborInstanceId))
      setNeighbors(data)
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setEdgeBusy(false)
    }
  }

  async function handleDeleteEdge(edgeId: number) {
    if (!window.confirm('确定删除该关联关系？')) return
    setEdgeBusy(true)
    setError(null)
    try {
      await deleteRelationEdge(edgeId)
      if (neighborInstanceId) {
        const data = await listRelationNeighbors(Number(neighborInstanceId))
        setNeighbors(data)
      } else {
        setNeighbors((prev) => prev.filter((item) => item.edgeId !== edgeId))
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setEdgeBusy(false)
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>关联类型与关系管理</h1>
          <p>管理关联类型定义，并支持创建/删除关系边、查询实例邻接关系。</p>
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}
      <p className="status">
        操作指引：先维护关系类型，再创建关系边。无向关系中 A-B 与 B-A 视为同一条关系。
      </p>

      <div className="panel">
        <h2 className="panel-title">关联类型维护</h2>
        <form className="form-grid" onSubmit={submitTypeForm}>
          <label className="field">
            <span>编码</span>
            <input
              required
              maxLength={64}
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="REL_CUSTOMER_ORDER"
            />
          </label>
          <label className="field">
            <span>名称</span>
            <input
              required
              maxLength={255}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="客户-订单"
            />
          </label>
          <label className="field">
            <span>源对象类型</span>
            <select
              required
              value={form.sourceTypeId}
              onChange={(e) => setForm((prev) => ({ ...prev, sourceTypeId: e.target.value }))}
            >
              <option value="">请选择</option>
              {types.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>目标对象类型</span>
            <select
              required
              value={form.targetTypeId}
              onChange={(e) => setForm((prev) => ({ ...prev, targetTypeId: e.target.value }))}
            >
              <option value="">请选择</option>
              {types.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>基数</span>
            <select
              value={form.cardinality}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  cardinality: e.target.value as RelationCardinality,
                }))
              }
            >
              <option value="ONE_TO_ONE">ONE_TO_ONE</option>
              <option value="ONE_TO_MANY">ONE_TO_MANY</option>
              <option value="MANY_TO_ONE">MANY_TO_ONE</option>
              <option value="MANY_TO_MANY">MANY_TO_MANY</option>
            </select>
          </label>
          <label className="field">
            <span>方向</span>
            <select
              value={form.direction}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  direction: e.target.value as RelationDirection,
                }))
              }
            >
              <option value="DIRECTED">DIRECTED</option>
              <option value="UNDIRECTED">UNDIRECTED</option>
            </select>
          </label>
          <label className="field full-width">
            <span>描述</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="可选"
            />
          </label>
          <div className="form-actions full-width">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '提交中…' : editId ? '更新关联类型' : '创建关联类型'}
            </button>
            {editId ? (
              <button type="button" className="btn" onClick={resetForm}>
                取消编辑
              </button>
            ) : null}
          </div>
        </form>

        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>编码/名称</th>
                <th>源 {'->'} 目标</th>
                <th>约束</th>
                <th>更新时间</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    加载中…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    暂无关联类型
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={String(row.id)}>
                    <td>{row.id}</td>
                    <td>
                      <div className="code">{row.code}</div>
                      <div>{row.name}</div>
                    </td>
                    <td>
                      {objectTypeMap.get(row.sourceTypeId) ?? row.sourceTypeCode}
                      {' -> '}
                      {objectTypeMap.get(row.targetTypeId) ?? row.targetTypeCode}
                    </td>
                    <td>
                      {prettyCardinality(row.cardinality)} /{' '}
                      {prettyDirection(row.direction)}
                    </td>
                    <td>{new Date(row.updatedAt).toLocaleString()}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => startEdit(row)}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void handleDeleteRelationType(row.id)}
                      >
                        删除
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
            共 {totalElements} 条，当前第 {Math.max(page + 1, 1)} /{' '}
            {Math.max(totalPages, 1)} 页
          </span>
          <div className="pagination-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setPage((prev) => prev - 1)}
              disabled={page <= 0 || loading}
            >
              上一页
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={loading || totalPages === 0 || page + 1 >= totalPages}
            >
              下一页
            </button>
          </div>
        </footer>
      </div>

      <div className="panel">
        <h2 className="panel-title">关系边操作与邻居查询</h2>
        <div className="form-grid">
          <label className="field">
            <span>关联类型</span>
            <select
              value={edgeRelationTypeId}
              onChange={(e) => setEdgeRelationTypeId(e.target.value)}
            >
              <option value="">请选择</option>
              {rows.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>源实例ID</span>
            <input
              type="number"
              value={edgeSourceId}
              onChange={(e) => setEdgeSourceId(e.target.value)}
              placeholder="例如 101"
              list="instance-id-options"
            />
          </label>
          <label className="field">
            <span>目标实例ID</span>
            <input
              type="number"
              value={edgeTargetId}
              onChange={(e) => setEdgeTargetId(e.target.value)}
              placeholder="例如 202"
              list="instance-id-options"
            />
          </label>
          <label className="field full-width">
            <span>关系属性（可选，JSON对象）</span>
            <textarea
              rows={3}
              value={edgeAttributes}
              onChange={(e) => setEdgeAttributes(e.target.value)}
              placeholder='{"weight": 0.8}'
            />
          </label>
          <div className="form-actions full-width">
            <button
              type="button"
              className="btn btn-primary"
              disabled={edgeBusy}
              onClick={() => void handleCreateEdge()}
            >
              {edgeBusy ? '处理中…' : '创建关系边'}
            </button>
          </div>
        </div>

        <datalist id="instance-id-options">
          {instances.map((item) => (
            <option key={String(item.id)} value={String(item.id)}>
              {item.id} - {instanceMap.get(item.id)}
            </option>
          ))}
        </datalist>

        <div className="toolbar" style={{ marginTop: '1rem' }}>
          <div className="toolbar-fields">
            <label className="field small">
              <span>查询邻居实例ID</span>
              <input
                type="number"
                value={neighborInstanceId}
                onChange={(e) => setNeighborInstanceId(e.target.value)}
                placeholder="输入实例ID"
              />
            </label>
          </div>
          <button
            type="button"
            className="btn"
            disabled={edgeBusy}
            onClick={() => void handleQueryNeighbors()}
          >
            查询邻居
          </button>
        </div>

        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Edge ID</th>
                <th>关系类型</th>
                <th>源实例</th>
                <th>目标实例</th>
                <th>属性</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {neighbors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    暂无邻居数据
                  </td>
                </tr>
              ) : (
                neighbors.map((item) => (
                  <tr key={String(item.edgeId)}>
                    <td>{item.edgeId}</td>
                    <td>
                      <div className="code">{item.relationTypeCode}</div>
                      <div>{item.relationTypeName}</div>
                    </td>
                    <td>
                      {item.sourceInstanceName} (#{item.sourceInstanceId})
                    </td>
                    <td>
                      {item.targetInstanceName} (#{item.targetInstanceId})
                    </td>
                    <td className="mono-cell">
                      {item.attributes ? JSON.stringify(item.attributes) : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={edgeBusy}
                        onClick={() => void handleDeleteEdge(item.edgeId)}
                      >
                        删除关系
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
