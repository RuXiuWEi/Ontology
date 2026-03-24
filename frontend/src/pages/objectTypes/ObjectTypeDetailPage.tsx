import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteObjectType, getObjectType } from '../../api/objectTypes'
import type { ObjectTypeDto } from '../../api/types'
import { usePermissions } from '../../auth/usePermissions'
import { ErrorAlert } from '../../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import '../PageShell.css'

export function ObjectTypeDetailPage() {
  const { can } = usePermissions()
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<ObjectTypeDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AppErrorInfo | null>(null)
  const [deleting, setDeleting] = useState(false)
  const canManageModel = can('canManageModel')

  useEffect(() => {
    if (!id) {
      setError(toAppErrorInfo('缺少对象类型 ID'))
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getObjectType(Number(id))
        if (cancelled) return
        setItem(data)
      } catch (e: unknown) {
        if (cancelled) return
        setError(toAppErrorInfo(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleDelete() {
    if (!item || deleting) return
    if (!window.confirm(`确定删除对象类型「${item.name}」？`)) return
    setDeleting(true)
    setError(null)
    try {
      await deleteObjectType(item.id)
      navigate('/object-types', { replace: true })
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <section className="page-shell">
        <header className="page-header">
          <h1>对象类型详情</h1>
          <p>正在加载详情数据…</p>
        </header>
      </section>
    )
  }

  if (error) {
    return (
      <section className="page-shell">
        <header className="page-header">
          <h1>对象类型详情</h1>
          <p>无法加载对象类型详情。</p>
        </header>
        <ErrorAlert error={error} />
      </section>
    )
  }

  if (!item) {
    return (
      <section className="page-shell">
        <header className="page-header">
          <h1>对象类型详情</h1>
          <p>未找到对应数据。</p>
        </header>
      </section>
    )
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>对象类型详情</h1>
          <p>查看对象类型完整信息并执行编辑、删除操作。</p>
        </div>
      </header>

      <ErrorAlert error={error} />
      {!canManageModel ? (
        <p className="status info">当前为只读模式，可查看详情，但无法修改对象类型。</p>
      ) : null}

      <div className="panel detail-grid">
        <div className="detail-item">
          <span>ID</span>
          <strong>{item.id}</strong>
        </div>
        <div className="detail-item">
          <span>编码</span>
          <strong>{item.code}</strong>
        </div>
        <div className="detail-item">
          <span>名称</span>
          <strong>{item.name}</strong>
        </div>
        <div className="detail-item">
          <span>描述</span>
          <strong>{item.description || '—'}</strong>
        </div>
        <div className="detail-item">
          <span>创建时间</span>
          <strong>{new Date(item.createdAt).toLocaleString()}</strong>
        </div>
        <div className="detail-item">
          <span>更新时间</span>
          <strong>{new Date(item.updatedAt).toLocaleString()}</strong>
        </div>
      </div>

      <div className="panel action-row">
        <Link className="btn-link" to="/object-types">
          返回列表
        </Link>
        {canManageModel ? (
          <>
            <Link className="btn btn-primary" to={`/object-types/${item.id}/edit`}>
              编辑
            </Link>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '删除中…' : '删除'}
            </button>
          </>
        ) : null}
      </div>
    </section>
  )
}
