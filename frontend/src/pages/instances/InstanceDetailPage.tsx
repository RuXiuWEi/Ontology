import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getInstance } from '../../api/instances'
import { listObjectTypes } from '../../api/objectTypes'
import { usePermissions } from '../../auth/usePermissions'
import { ErrorAlert } from '../../components/ErrorAlert'
import type { ObjectInstanceDto, ObjectTypeDto } from '../../api/types'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import '../PageShell.css'

export function InstanceDetailPage() {
  const { can } = usePermissions()
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const [item, setItem] = useState<ObjectInstanceDto | null>(null)
  const [types, setTypes] = useState<ObjectTypeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AppErrorInfo | null>(null)
  const canManageInstances = can('canManageInstances')

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError(toAppErrorInfo('实例ID无效'))
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [instance, typeList] = await Promise.all([
          getInstance(id),
          listObjectTypes(),
        ])
        if (cancelled) return
        setItem(instance)
        setTypes(typeList)
      } catch (e: unknown) {
        if (!cancelled) setError(toAppErrorInfo(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const typeName = useMemo(() => {
    if (!item) return '—'
    const found = types.find((type) => type.id === item.typeId)
    return found?.name ?? item.typeCode ?? String(item.typeId)
  }, [item, types])

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>对象实例详情</h1>
          <p>查看实例信息和属性数据。</p>
        </div>
        <div className="header-actions">
          <Link to="/instances" className="btn ghost">
            返回列表
          </Link>
          {Number.isFinite(id) ? (
            <Link to={`/graph?mode=INSTANCE&instanceId=${id}`} className="btn">
              在图谱中查看
            </Link>
          ) : null}
          {Number.isFinite(id) && canManageInstances ? (
            <Link to={`/instances/${id}/edit`} className="btn primary">
              编辑实例
            </Link>
          ) : null}
        </div>
      </header>

      <ErrorAlert error={error} />
      {!canManageInstances ? (
        <p className="status info">当前账号为只读模式，可查看实例信息，但无法编辑。</p>
      ) : null}
      {loading ? <p>加载中…</p> : null}

      {!loading && item ? (
        <div className="panel detail-grid">
          <div className="detail-item">
            <span>实例ID</span>
            <strong>{item.id}</strong>
          </div>
          <div className="detail-item">
            <span>名称</span>
            <strong>{item.name}</strong>
          </div>
          <div className="detail-item">
            <span>类型</span>
            <strong>{typeName}</strong>
          </div>
          <div className="detail-item">
            <span>类型编码</span>
            <strong>{item.typeCode}</strong>
          </div>
          <div className="detail-item">
            <span>创建时间</span>
            <strong>{new Date(item.createdAt).toLocaleString()}</strong>
          </div>
          <div className="detail-item">
            <span>更新时间</span>
            <strong>{new Date(item.updatedAt).toLocaleString()}</strong>
          </div>
          <div className="detail-item full">
            <span>属性（JSON）</span>
            <pre className="json-view">
              {item.attributes
                ? JSON.stringify(item.attributes, null, 2)
                : '—'}
            </pre>
          </div>
        </div>
      ) : null}
    </section>
  )
}
