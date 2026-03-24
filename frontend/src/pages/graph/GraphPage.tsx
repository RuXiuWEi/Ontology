import { useCallback, useEffect, useMemo, useState } from 'react'
import { listInstances, listInstancesPage } from '../../api/instances'
import { listObjectTypes } from '../../api/objectTypes'
import { listRelationNeighbors, listRelationTypesPage } from '../../api/relations'
import type {
  ObjectInstanceDto,
  ObjectTypeDto,
  RelationNeighborDto,
  RelationTypeDto,
} from '../../api/types'
import { ErrorAlert } from '../../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import '../PageShell.css'
import './GraphPage.css'

type GraphMode = 'INSTANCE' | 'MODEL'

type GraphNode = {
  id: string
  label: string
  kind: 'instance' | 'type'
  meta: string
  x: number
  y: number
  emphasis?: boolean
}

type GraphEdge = {
  id: string
  source: string
  target: string
  label: string
  weak?: boolean
}

const GRAPH_WIDTH = 980
const GRAPH_HEIGHT = 520

function distributeNodes<T extends { id: string; label: string; meta: string }>(
  items: readonly T[],
  options?: {
    emphasisId?: string | null
    kind?: GraphNode['kind']
    xBias?: number
    yBias?: number
  },
): GraphNode[] {
  const total = Math.max(items.length, 1)
  const centerX = GRAPH_WIDTH / 2 + (options?.xBias ?? 0)
  const centerY = GRAPH_HEIGHT / 2 + (options?.yBias ?? 0)
  const radiusX = Math.min(320, 110 + total * 16)
  const radiusY = Math.min(190, 80 + total * 10)
  return items.map((item, index) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    return {
      id: item.id,
      label: item.label,
      kind: options?.kind ?? 'instance',
      meta: item.meta,
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      emphasis: options?.emphasisId === item.id,
    }
  })
}

function buildInstanceGraph(
  focusInstance: ObjectInstanceDto | null,
  neighbors: readonly RelationNeighborDto[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (!focusInstance) {
    return { nodes: [], edges: [] }
  }

  const nodeMap = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  nodeMap.set(`instance-${focusInstance.id}`, {
    id: `instance-${focusInstance.id}`,
    label: focusInstance.name,
    kind: 'instance',
    meta: `${focusInstance.typeCode} / #${focusInstance.id}`,
    x: GRAPH_WIDTH / 2,
    y: GRAPH_HEIGHT / 2,
    emphasis: true,
  })

  const orbitItems = neighbors.map((neighbor) => {
    const isSource = neighbor.sourceInstanceId === focusInstance.id
    const targetId = isSource ? neighbor.targetInstanceId : neighbor.sourceInstanceId
    const targetName = isSource ? neighbor.targetInstanceName : neighbor.sourceInstanceName
    const targetType = isSource ? neighbor.targetTypeCode : neighbor.sourceTypeCode
    return {
      id: `instance-${targetId}`,
      label: targetName,
      meta: `${targetType} / #${targetId}`,
    }
  })

  for (const node of distributeNodes(orbitItems, { kind: 'instance' })) {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node)
    }
  }

  for (const neighbor of neighbors) {
    const sourceId = `instance-${neighbor.sourceInstanceId}`
    const targetId = `instance-${neighbor.targetInstanceId}`
    if (!nodeMap.has(sourceId)) {
      nodeMap.set(sourceId, {
        id: sourceId,
        label: neighbor.sourceInstanceName,
        kind: 'instance',
        meta: `${neighbor.sourceTypeCode} / #${neighbor.sourceInstanceId}`,
        x: GRAPH_WIDTH / 2,
        y: GRAPH_HEIGHT / 2,
      })
    }
    if (!nodeMap.has(targetId)) {
      nodeMap.set(targetId, {
        id: targetId,
        label: neighbor.targetInstanceName,
        kind: 'instance',
        meta: `${neighbor.targetTypeCode} / #${neighbor.targetInstanceId}`,
        x: GRAPH_WIDTH / 2,
        y: GRAPH_HEIGHT / 2,
      })
    }
    edges.push({
      id: `edge-${neighbor.edgeId}`,
      source: sourceId,
      target: targetId,
      label: neighbor.relationTypeName,
      weak: neighbor.sourceInstanceId !== focusInstance.id && neighbor.targetInstanceId !== focusInstance.id,
    })
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  }
}

function buildModelGraph(
  objectTypes: readonly ObjectTypeDto[],
  relationTypes: readonly RelationTypeDto[],
  selectedTypeId: number | null,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const visibleTypeIds = new Set<number>()

  if (selectedTypeId) {
    visibleTypeIds.add(selectedTypeId)
    for (const relation of relationTypes) {
      if (relation.sourceTypeId === selectedTypeId || relation.targetTypeId === selectedTypeId) {
        visibleTypeIds.add(relation.sourceTypeId)
        visibleTypeIds.add(relation.targetTypeId)
      }
    }
  } else {
    for (const type of objectTypes.slice(0, 12)) {
      visibleTypeIds.add(type.id)
    }
  }

  const visibleTypes = objectTypes
    .filter((item) => visibleTypeIds.has(item.id))
    .map((item) => ({
      id: `type-${item.id}`,
      label: item.name,
      meta: item.code,
    }))

  const nodes = distributeNodes(visibleTypes, {
    kind: 'type',
    emphasisId: selectedTypeId ? `type-${selectedTypeId}` : null,
  })

  const nodeIds = new Set(nodes.map((item) => item.id))
  const edges = relationTypes
    .filter(
      (relation) =>
        nodeIds.has(`type-${relation.sourceTypeId}`) &&
        nodeIds.has(`type-${relation.targetTypeId}`),
    )
    .slice(0, 18)
    .map((relation) => ({
      id: `relation-${relation.id}`,
      source: `type-${relation.sourceTypeId}`,
      target: `type-${relation.targetTypeId}`,
      label: relation.name,
      weak: relation.direction === 'UNDIRECTED',
    }))

  return { nodes, edges }
}

export function GraphPage() {
  const [mode, setMode] = useState<GraphMode>('INSTANCE')
  const [typeOptions, setTypeOptions] = useState<ObjectTypeDto[]>([])
  const [instanceOptions, setInstanceOptions] = useState<ObjectInstanceDto[]>([])
  const [relationTypes, setRelationTypes] = useState<RelationTypeDto[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [selectedInstanceId, setSelectedInstanceId] = useState('')
  const [neighbors, setNeighbors] = useState<RelationNeighborDto[]>([])
  const [loading, setLoading] = useState(true)
  const [graphLoading, setGraphLoading] = useState(false)
  const [error, setError] = useState<AppErrorInfo | null>(null)

  const selectedType = useMemo(
    () => typeOptions.find((item) => item.id === Number(selectedTypeId)) ?? null,
    [selectedTypeId, typeOptions],
  )
  const selectedInstance = useMemo(
    () => instanceOptions.find((item) => item.id === Number(selectedInstanceId)) ?? null,
    [selectedInstanceId, instanceOptions],
  )

  const loadBaseData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [types, relationPage, instancePage] = await Promise.all([
        listObjectTypes(),
        listRelationTypesPage({ page: 0, size: 100 }),
        listInstancesPage({ page: 0, size: 100 }),
      ])
      setTypeOptions(types)
      setRelationTypes(relationPage.content)
      setInstanceOptions(instancePage.content)

      if (!selectedTypeId && types[0]) {
        setSelectedTypeId(String(types[0].id))
      }
      if (!selectedInstanceId && instancePage.content[0]) {
        setSelectedInstanceId(String(instancePage.content[0].id))
      }
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setLoading(false)
    }
  }, [selectedInstanceId, selectedTypeId])

  useEffect(() => {
    void loadBaseData()
  }, [loadBaseData])

  useEffect(() => {
    if (mode !== 'INSTANCE' || !selectedInstanceId) {
      setNeighbors([])
      return
    }
    let cancelled = false
    void (async () => {
      setGraphLoading(true)
      setError(null)
      try {
        const data = await listRelationNeighbors(Number(selectedInstanceId))
        if (!cancelled) {
          setNeighbors(data)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(toAppErrorInfo(e))
          setNeighbors([])
        }
      } finally {
        if (!cancelled) {
          setGraphLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, selectedInstanceId])

  const graphData = useMemo(() => {
    if (mode === 'INSTANCE') {
      return buildInstanceGraph(selectedInstance, neighbors)
    }
    return buildModelGraph(
      typeOptions,
      relationTypes,
      selectedType ? selectedType.id : null,
    )
  }, [mode, neighbors, relationTypes, selectedInstance, selectedType, typeOptions])

  const nodeMap = useMemo(
    () => new Map(graphData.nodes.map((node) => [node.id, node])),
    [graphData.nodes],
  )

  const sideSummary = useMemo(() => {
    if (mode === 'INSTANCE' && selectedInstance) {
      return {
        title: selectedInstance.name,
        subtitle: `${selectedInstance.typeCode} / #${selectedInstance.id}`,
        description:
          neighbors.length > 0
            ? `已加载 ${neighbors.length} 条邻接关系，可用于快速核对实体在图谱中的上下游连接。`
            : '当前实例尚未查询到邻居关系，可能尚未建立关系边。',
        tags: [
          `类型 ${selectedInstance.typeCode}`,
          `邻居 ${neighbors.length}`,
          `属性 ${selectedInstance.attributes ? Object.keys(selectedInstance.attributes).length : 0}`,
        ],
      }
    }
    if (mode === 'MODEL' && selectedType) {
      const relatedRelations = relationTypes.filter(
        (item) =>
          item.sourceTypeId === selectedType.id || item.targetTypeId === selectedType.id,
      )
      return {
        title: selectedType.name,
        subtitle: selectedType.code,
        description:
          relatedRelations.length > 0
            ? `该对象类型参与了 ${relatedRelations.length} 条关系定义，可从模型视图查看它与上下游类型的连接语义。`
            : '当前对象类型尚未配置关系定义，可在关联类型页继续补全语义连接。',
        tags: [
          `关系 ${relatedRelations.length}`,
          `编码 ${selectedType.code}`,
          `更新 ${new Date(selectedType.updatedAt).toLocaleDateString()}`,
        ],
      }
    }
    return {
      title: '图谱视图',
      subtitle: mode === 'INSTANCE' ? '实例视图' : '模型视图',
      description: '选择实例或对象类型后，可在右侧查看对应的语义网络结构。',
      tags: [],
    }
  }, [mode, neighbors.length, relationTypes, selectedInstance, selectedType])

  async function handleRefreshInstances() {
    setGraphLoading(true)
    setError(null)
    try {
      const data = await listInstances()
      setInstanceOptions(data)
      if (!data.some((item) => String(item.id) === selectedInstanceId)) {
        setSelectedInstanceId(data[0] ? String(data[0].id) : '')
      }
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setGraphLoading(false)
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>图谱</h1>
          <p>支持实例关系图与模型关系图双视图切换，帮助快速查看实体连接与语义结构。</p>
        </div>
      </header>

      <ErrorAlert error={error} />

      <div className="graph-layout">
        <section className="panel graph-controls">
          <div className="graph-mode-toggle" role="tablist" aria-label="图谱模式">
            <button
              type="button"
              className={mode === 'INSTANCE' ? 'btn btn-primary' : 'btn'}
              onClick={() => setMode('INSTANCE')}
            >
              实例视图
            </button>
            <button
              type="button"
              className={mode === 'MODEL' ? 'btn btn-primary' : 'btn'}
              onClick={() => setMode('MODEL')}
            >
              模型视图
            </button>
          </div>

          {mode === 'INSTANCE' ? (
            <div className="form-grid">
              <label className="field">
                <span>实例</span>
                <select
                  value={selectedInstanceId}
                  onChange={(e) => setSelectedInstanceId(e.target.value)}
                >
                  <option value="">请选择实例</option>
                  {instanceOptions.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {item.name} (#{item.id} / {item.typeCode})
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => void handleRefreshInstances()}>
                  刷新实例
                </button>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <label className="field">
                <span>对象类型</span>
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                >
                  <option value="">请选择对象类型</option>
                  {typeOptions.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="graph-summary">
            <h2 className="panel-title">{sideSummary.title}</h2>
            <p className="graph-summary-subtitle">{sideSummary.subtitle}</p>
            <p className="graph-summary-description">{sideSummary.description}</p>
            <div className="graph-summary-tags">
              {sideSummary.tags.map((tag) => (
                <span key={tag} className="graph-summary-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="panel graph-canvas-panel">
          <div className="graph-canvas-header">
            <div>
              <h2 className="panel-title">{mode === 'INSTANCE' ? '实例关系网络' : '模型语义网络'}</h2>
              <p className="hint-text">
                {graphLoading
                  ? '图谱加载中…'
                  : `当前显示 ${graphData.nodes.length} 个节点、${graphData.edges.length} 条关系`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-panel graph-empty-state">
              <p>正在加载图谱数据…</p>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="empty-panel graph-empty-state">
              <p>当前筛选下暂无可展示的节点关系，请切换实例或对象类型后重试。</p>
            </div>
          ) : (
            <div className="graph-stage">
              <svg
                className="graph-stage-svg"
                viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                role="img"
                aria-label="知识图谱预览"
              >
                <defs>
                  <linearGradient id="graph-edge-glow" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#7ebeff" stopOpacity="0.18" />
                    <stop offset="50%" stopColor="#5d9bff" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#7ebeff" stopOpacity="0.18" />
                  </linearGradient>
                  <filter id="graph-node-shadow">
                    <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#2f73df" floodOpacity="0.12" />
                  </filter>
                </defs>

                <g className="graph-stage-grid">
                  {Array.from({ length: 18 }, (_, index) => (
                    <line
                      key={`v-${String(index)}`}
                      x1={index * 60}
                      y1="0"
                      x2={index * 60}
                      y2={GRAPH_HEIGHT}
                    />
                  ))}
                  {Array.from({ length: 10 }, (_, index) => (
                    <line
                      key={`h-${String(index)}`}
                      x1="0"
                      y1={index * 58}
                      x2={GRAPH_WIDTH}
                      y2={index * 58}
                    />
                  ))}
                </g>

                <g className="graph-stage-edges">
                  {graphData.edges.map((edge) => {
                    const source = nodeMap.get(edge.source)
                    const target = nodeMap.get(edge.target)
                    if (!source || !target) return null
                    const labelX = (source.x + target.x) / 2
                    const labelY = (source.y + target.y) / 2
                    return (
                      <g key={edge.id}>
                        <line
                          className={edge.weak ? 'graph-stage-edge graph-stage-edge--weak' : 'graph-stage-edge'}
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                        />
                        <rect
                          className="graph-stage-edge-label-bg"
                          x={labelX - 44}
                          y={labelY - 12}
                          width="88"
                          height="24"
                          rx="12"
                        />
                        <text
                          className="graph-stage-edge-label"
                          x={labelX}
                          y={labelY + 4}
                          textAnchor="middle"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )
                  })}
                </g>

                <g className="graph-stage-nodes">
                  {graphData.nodes.map((node) => (
                    <g
                      key={node.id}
                      className={node.emphasis ? 'graph-stage-node graph-stage-node--emphasis' : 'graph-stage-node'}
                      transform={`translate(${node.x} ${node.y})`}
                    >
                      <circle className="graph-stage-node-halo" r={node.kind === 'type' ? 34 : 30} />
                      <circle className="graph-stage-node-core" r={node.kind === 'type' ? 12 : 10} />
                      <g className="graph-stage-node-card" filter="url(#graph-node-shadow)">
                        <rect
                          x={node.kind === 'type' ? -64 : -72}
                          y="18"
                          width={node.kind === 'type' ? 128 : 144}
                          height="52"
                          rx="16"
                        />
                        <text className="graph-stage-node-title" x="0" y="42" textAnchor="middle">
                          {node.label}
                        </text>
                        <text className="graph-stage-node-meta" x="0" y="58" textAnchor="middle">
                          {node.meta}
                        </text>
                      </g>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
