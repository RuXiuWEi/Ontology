import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { deleteInstance, listInstancesPage } from '../../api/instances'
import { listObjectTypes } from '../../api/objectTypes'
import type { ObjectInstanceDto, ObjectTypeDto } from '../../api/types'
import { ErrorAlert } from '../../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import '../PageShell.css'

const PAGE_SIZE = 10

export function InstanceListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const pageFromQuery = Number(searchParams.get('page') ?? '1')
  const typeFromQuery = searchParams.get('typeId') ?? ''
  const page = Number.isNaN(pageFromQuery) || pageFromQuery < 1 ? 1 : pageFromQuery

  const [types, setTypes] = useState<ObjectTypeDto[]>([])
  const [items, setItems] = useState<ObjectInstanceDto[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AppErrorInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await listObjectTypes()
        if (!cancelled) setTypes(data)
      } catch {
        if (!cancelled) setTypes([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const typeMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const type of types) {
      map.set(type.id, type.name)
    }
    return map
  }, [types])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listInstancesPage({
        page: page - 1,
        size: PAGE_SIZE,
        typeId: typeFromQuery ? Number(typeFromQuery) : undefined,
      })
      setItems(res.content)
      setTotalPages(res.totalPages)
      setTotalElements(res.totalElements)
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setLoading(false)
    }
  }, [page, typeFromQuery])

  useEffect(() => {
    void load()
  }, [load])

  function updateQuery(nextPage: number, nextTypeId: string) {
    const p = new URLSearchParams()
    p.set('page', String(nextPage))
    if (nextTypeId) p.set('typeId', nextTypeId)
    setSearchParams(p)
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除该对象实例？')) return
    setError(null)
    try {
      await deleteInstance(id)
      if (items.length === 1 && page > 1) {
        updateQuery(page - 1, typeFromQuery)
      } else {
        await load()
      }
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>对象实例</h1>
        <p>支持类型筛选、分页浏览与详情查看。</p>
      </header>

      <div className="toolbar">
        <label className="field">
          <span>按类型筛选</span>
          <select
            value={typeFromQuery}
            onChange={(e) => updateQuery(1, e.target.value)}
          >
            <option value="">全部</option>
            {types.map((type) => (
              <option key={String(type.id)} value={String(type.id)}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/instances/new')}
        >
          新建对象实例
        </button>
      </div>

      <ErrorAlert error={error} />

      <div className="panel">
        {loading ? (
          <p>加载中…</p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>类型</th>
                  <th>名称</th>
                  <th>属性</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={String(item.id)}>
                      <td>{item.id}</td>
                      <td>{typeMap.get(item.typeId) ?? item.typeCode}</td>
                      <td>{item.name}</td>
                      <td className="mono-cell">
                        {item.attributes ? JSON.stringify(item.attributes) : '—'}
                      </td>
                      <td className="actions-cell">
                        <Link className="btn btn-light" to={`/instances/${item.id}`}>
                          详情
                        </Link>
                        <Link className="btn btn-light" to={`/instances/${item.id}/edit`}>
                          编辑
                        </Link>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="pagination">
              <span>
                第 {totalPages === 0 ? 0 : page} / {totalPages} 页，共 {totalElements} 条
              </span>
              <div className="pagination-actions">
                <button
                  type="button"
                  className="btn btn-light"
                  disabled={page <= 1}
                  onClick={() => updateQuery(page - 1, typeFromQuery)}
                >
                  上一页
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  disabled={totalPages === 0 || page >= totalPages}
                  onClick={() => updateQuery(page + 1, typeFromQuery)}
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
