import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteObjectType,
  listObjectTypesPage,
  type ListObjectTypesParams,
} from '../../api/objectTypes'
import { ErrorAlert } from '../../components/ErrorAlert'
import type { ObjectTypeDto, PageResponse } from '../../api/types'
import { type AppErrorInfo, toAppErrorInfo } from '../../utils/error'
import '../PageShell.css'

const PAGE_SIZE = 10

export function ObjectTypeListPage() {
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<ObjectTypeDto[]>([])
  const [pageInfo, setPageInfo] = useState<PageResponse<ObjectTypeDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AppErrorInfo | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async (params?: ListObjectTypesParams) => {
    setLoading(true)
    setError(null)
    try {
      const data = await listObjectTypesPage({
        page: params?.page ?? page,
        size: params?.size ?? PAGE_SIZE,
      })
      setRows(data.content)
      setPageInfo(data)
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load({ page, size: PAGE_SIZE })
  }, [page, load])

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除该对象类型？')) return
    setDeletingId(id)
    setError(null)
    try {
      await deleteObjectType(id)
      const shouldMovePrev = rows.length === 1 && page > 0
      if (shouldMovePrev) {
        setPage((prev) => prev - 1)
      } else {
        await load({ page, size: PAGE_SIZE })
      }
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = pageInfo?.totalPages ?? 0
  const totalElements = pageInfo?.totalElements ?? 0
  const startIndex = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const endIndex = Math.min((page + 1) * PAGE_SIZE, totalElements)

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>对象类型</h1>
          <p>管理对象类型定义，支持查看详情与编辑。</p>
        </div>
        <Link to="/object-types/new" className="btn btn-primary">
          新建对象类型
        </Link>
      </header>

      <ErrorAlert error={error} />

      <div className="panel">
        {loading ? (
          <p className="status">加载中…</p>
        ) : rows.length === 0 ? (
          <p className="status">暂无对象类型数据。</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>编码</th>
                  <th>名称</th>
                  <th>描述</th>
                  <th>更新时间</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)}>
                    <td>{row.id}</td>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.description ?? '—'}</td>
                    <td>{new Date(row.updatedAt).toLocaleString()}</td>
                    <td className="actions">
                      <Link to={`/object-types/${row.id}`} className="link-btn">
                        详情
                      </Link>
                      <Link to={`/object-types/${row.id}/edit`} className="link-btn">
                        编辑
                      </Link>
                      <button
                        type="button"
                        className="link-btn danger"
                        disabled={deletingId === row.id}
                        onClick={() => handleDelete(row.id)}
                      >
                        {deletingId === row.id ? '删除中…' : '删除'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="pagination">
        <span>
          显示 {startIndex}-{endIndex} / 共 {totalElements} 条
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
          <span>
            第 {Math.max(page + 1, 1)} / {Math.max(totalPages, 1)} 页
          </span>
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
    </section>
  )
}
