import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listInstances, listInstancesPage } from '../../api/instances'
import { listObjectTypes } from '../../api/objectTypes'
import { listRelationNeighbors, listRelationTypesPage } from '../../api/relations'
import type {
  ObjectInstanceDto,
  ObjectTypeDto,
  RelationDirection,
  RelationNeighborDto,
  RelationTypeDto,
} from '../../api/types'
import { ErrorAlert } from '../../components/ErrorAlert'
import { toAppErrorInfo, type AppErrorInfo } from '../../utils/error'
import '../PageShell.css'
import './GraphPage.css'

type GraphMode = 'INSTANCE' | 'MODEL'
type GraphNodeKind = 'instance' | 'type'

type GraphNode = {
  id: string
  entityId: number
  label: string
  kind: GraphNodeKind
  meta: string
  x: number
  y: number
  emphasis?: boolean
}

type GraphEdge = {
  id: string
  entityId: number
  code?: string
  direction?: RelationDirection
  sourceMeta?: string
  targetMeta?: string
  attributes?: Record<string, unknown> | null
  source: string
  target: string
  label: string
  weak?: boolean
}

type InstanceNodeDetail = {
  kind: 'instance'
  title: string
  subtitle: string
  description: string
  chips: string[]
  attributes: Record<string, unknown> | null
  neighbors: Array<{
    edgeId: number
    relationName: string
    relatedInstanceId: number
    relatedInstanceName: string
    relatedTypeCode: string
  }>
}

type TypeNodeDetail = {
  kind: 'type'
  title: string
  subtitle: string
  description: string
  chips: string[]
  descriptionText: string
  relations: Array<{
    id: number
    name: string
    code: string
    sourceTypeCode: string
    targetTypeCode: string
    direction: RelationDirection
  }>
}

type SelectedNodeDetail = InstanceNodeDetail | TypeNodeDetail

type EdgeDetail = {
  title: string
  subtitle: string
  description: string
  chips: string[]
  sourceMeta: string
  targetMeta: string
  attributes: Record<string, unknown> | null
}

type PathDetail = {
  title: string
  subtitle: string
  description: string
  chips: string[]
  steps: string[]
}

type GraphViewport = {
  scale: number
  offsetX: number
  offsetY: number
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originOffsetX: number
  originOffsetY: number
}

const GRAPH_WIDTH = 980
const GRAPH_HEIGHT = 520
const MAX_INSTANCE_DEPTH = 3
const DEFAULT_VIEWPORT: GraphViewport = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

function normalizeDepth(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_INSTANCE_DEPTH, Math.max(1, Math.round(value)))
}

function buildExportFileName(mode: GraphMode, extension: 'svg' | 'png'): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `graph-${mode.toLowerCase()}-${stamp}.${extension}`
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function inlineSvgStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source)
  const styleText = Array.from(computed)
    .map((property) => `${property}:${computed.getPropertyValue(property)};`)
    .join('')

  if (styleText) {
    target.setAttribute('style', styleText)
  }

  const sourceChildren = Array.from(source.children)
  const targetChildren = Array.from(target.children)
  const childCount = Math.min(sourceChildren.length, targetChildren.length)

  for (let index = 0; index < childCount; index += 1) {
    inlineSvgStyles(sourceChildren[index], targetChildren[index])
  }
}

function serializeSvgForExport(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlineSvgStyles(svg, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('width', String(GRAPH_WIDTH))
  clone.setAttribute('height', String(GRAPH_HEIGHT))

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  background.setAttribute('x', '0')
  background.setAttribute('y', '0')
  background.setAttribute('width', String(GRAPH_WIDTH))
  background.setAttribute('height', String(GRAPH_HEIGHT))
  background.setAttribute('fill', '#f7fbff')
  clone.insertBefore(background, clone.firstChild)

  const serializer = new XMLSerializer()
  return serializer.serializeToString(clone)
}

async function exportSvg(svg: SVGSVGElement, mode: GraphMode) {
  const serialized = serializeSvgForExport(svg)
  downloadBlob(
    new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }),
    buildExportFileName(mode, 'svg'),
  )
}

async function exportPng(svg: SVGSVGElement, mode: GraphMode) {
  const serialized = serializeSvgForExport(svg)
  const encoded = encodeURIComponent(serialized)
  const image = new Image()
  image.decoding = 'async'

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('图谱 PNG 导出失败'))
    image.src = `data:image/svg+xml;charset=utf-8,${encoded}`
  })

  const canvas = document.createElement('canvas')
  canvas.width = GRAPH_WIDTH * 2
  canvas.height = GRAPH_HEIGHT * 2

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前环境不支持图谱 PNG 导出')
  }

  context.fillStyle = '#f7fbff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )

  if (!blob) {
    throw new Error('图谱 PNG 导出失败')
  }

  downloadBlob(blob, buildExportFileName(mode, 'png'))
}

function distributeNodes<T extends {
  id: string
  entityId: number
  label: string
  meta: string
}>(
  items: readonly T[],
  options?: {
    emphasisId?: string | null
    kind?: GraphNodeKind
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
      entityId: item.entityId,
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
    entityId: focusInstance.id,
    label: focusInstance.name,
    kind: 'instance',
    meta: `${focusInstance.typeCode} / #${focusInstance.id}`,
    x: GRAPH_WIDTH / 2,
    y: GRAPH_HEIGHT / 2,
    emphasis: true,
  })

  const orbitItems = neighbors.map((neighbor) => {
    const isSource = neighbor.sourceInstanceId === focusInstance.id
    const relatedInstanceId = isSource
      ? neighbor.targetInstanceId
      : neighbor.sourceInstanceId
    const relatedInstanceName = isSource
      ? neighbor.targetInstanceName
      : neighbor.sourceInstanceName
    const relatedTypeCode = isSource
      ? neighbor.targetTypeCode
      : neighbor.sourceTypeCode

    return {
      id: `instance-${relatedInstanceId}`,
      entityId: relatedInstanceId,
      label: relatedInstanceName,
      meta: `${relatedTypeCode} / #${relatedInstanceId}`,
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
        entityId: neighbor.sourceInstanceId,
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
        entityId: neighbor.targetInstanceId,
        label: neighbor.targetInstanceName,
        kind: 'instance',
        meta: `${neighbor.targetTypeCode} / #${neighbor.targetInstanceId}`,
        x: GRAPH_WIDTH / 2,
        y: GRAPH_HEIGHT / 2,
      })
    }

    edges.push({
      id: `edge-${neighbor.edgeId}`,
      entityId: neighbor.edgeId,
      source: sourceId,
      target: targetId,
      label: neighbor.relationTypeName,
      code: neighbor.relationTypeCode,
      direction: 'DIRECTED',
      sourceMeta: `${neighbor.sourceInstanceName} / #${neighbor.sourceInstanceId}`,
      targetMeta: `${neighbor.targetInstanceName} / #${neighbor.targetInstanceId}`,
      weak:
        neighbor.sourceInstanceId !== focusInstance.id &&
        neighbor.targetInstanceId !== focusInstance.id,
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
  directionFilter: RelationDirection | '',
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const filteredRelations = directionFilter
    ? relationTypes.filter((relation) => relation.direction === directionFilter)
    : relationTypes

  const visibleTypeIds = new Set<number>()

  if (selectedTypeId) {
    visibleTypeIds.add(selectedTypeId)
    for (const relation of filteredRelations) {
      if (
        relation.sourceTypeId === selectedTypeId ||
        relation.targetTypeId === selectedTypeId
      ) {
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
      entityId: item.id,
      label: item.name,
      meta: item.code,
    }))

  const nodes = distributeNodes(visibleTypes, {
    kind: 'type',
    emphasisId: selectedTypeId ? `type-${selectedTypeId}` : null,
  })

  const nodeIds = new Set(nodes.map((item) => item.id))
  const edges = filteredRelations
    .filter(
      (relation) =>
        nodeIds.has(`type-${relation.sourceTypeId}`) &&
        nodeIds.has(`type-${relation.targetTypeId}`),
    )
    .slice(0, 18)
    .map((relation) => ({
      id: `relation-${relation.id}`,
      entityId: relation.id,
      code: relation.code,
      direction: relation.direction,
      sourceMeta: relation.sourceTypeCode,
      targetMeta: relation.targetTypeCode,
      source: `type-${relation.sourceTypeId}`,
      target: `type-${relation.targetTypeId}`,
      label: relation.name,
      weak: relation.direction === 'UNDIRECTED',
    }))

  return { nodes, edges }
}

export function GraphPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [typeOptions, setTypeOptions] = useState<ObjectTypeDto[]>([])
  const [instanceOptions, setInstanceOptions] = useState<ObjectInstanceDto[]>([])
  const [relationTypes, setRelationTypes] = useState<RelationTypeDto[]>([])
  const [neighbors, setNeighbors] = useState<RelationNeighborDto[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [selectedEdgeId, setSelectedEdgeId] = useState('')
  const [pathSourceId, setPathSourceId] = useState('')
  const [pathTargetId, setPathTargetId] = useState('')
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '')
  const [instanceTypeFilterId, setInstanceTypeFilterId] = useState(
    searchParams.get('instanceTypeId') ?? '',
  )
  const [relationTypeFilterId, setRelationTypeFilterId] = useState(
    searchParams.get('relationTypeId') ?? '',
  )
  const [directionFilter, setDirectionFilter] = useState<RelationDirection | ''>(
    (searchParams.get('direction') as RelationDirection | null) ?? '',
  )
  const [expandedInstanceIds, setExpandedInstanceIds] = useState<Set<number>>(new Set())
  const [instanceDepth, setInstanceDepth] = useState<number>(
    normalizeDepth(Number(searchParams.get('depth') ?? '1')),
  )
  const [viewport, setViewport] = useState<GraphViewport>(DEFAULT_VIEWPORT)
  const [secondHopLoading, setSecondHopLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [graphLoading, setGraphLoading] = useState(false)
  const [error, setError] = useState<AppErrorInfo | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const stageWrapRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const mode: GraphMode = searchParams.get('mode') === 'MODEL' ? 'MODEL' : 'INSTANCE'
  const selectedInstanceId = searchParams.get('instanceId') ?? ''
  const selectedTypeId = searchParams.get('typeId') ?? ''

  const selectedInstance = useMemo(
    () => instanceOptions.find((item) => String(item.id) === selectedInstanceId) ?? null,
    [instanceOptions, selectedInstanceId],
  )

  const selectedType = useMemo(
    () => typeOptions.find((item) => String(item.id) === selectedTypeId) ?? null,
    [selectedTypeId, typeOptions],
  )

  const filteredInstanceOptions = useMemo(
    () =>
      instanceTypeFilterId
        ? instanceOptions.filter(
            (instance) => String(instance.typeId) === instanceTypeFilterId,
          )
        : instanceOptions,
    [instanceOptions, instanceTypeFilterId],
  )

  const replaceQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams)
      mutate(next)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleSelectInstance = useCallback(
    (instanceId: string) => {
      replaceQuery((params) => {
        params.set('mode', 'INSTANCE')
        params.delete('typeId')
        if (instanceId) {
          params.set('instanceId', instanceId)
        } else {
          params.delete('instanceId')
        }
      })
      setSelectedNodeId(instanceId ? `instance-${instanceId}` : '')
      setSelectedEdgeId('')
    },
    [replaceQuery],
  )

  const handleSelectType = useCallback(
    (typeId: string) => {
      replaceQuery((params) => {
        params.set('mode', 'MODEL')
        params.delete('instanceId')
        if (typeId) {
          params.set('typeId', typeId)
        } else {
          params.delete('typeId')
        }
      })
      setSelectedNodeId(typeId ? `type-${typeId}` : '')
      setSelectedEdgeId('')
    },
    [replaceQuery],
  )

  const handleChangeMode = useCallback(
    (nextMode: GraphMode) => {
      if (nextMode === 'INSTANCE') {
        handleSelectInstance(
          selectedInstanceId || String(filteredInstanceOptions[0]?.id ?? ''),
        )
        return
      }
      handleSelectType(selectedTypeId || String(typeOptions[0]?.id ?? ''))
    },
    [
      filteredInstanceOptions,
      handleSelectInstance,
      handleSelectType,
      selectedInstanceId,
      selectedTypeId,
      typeOptions,
    ],
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
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBaseData()
  }, [loadBaseData])

  useEffect(() => {
    if (loading) return

    if (mode === 'INSTANCE') {
      if (
        selectedInstanceId &&
        filteredInstanceOptions.some(
          (instance) => String(instance.id) === selectedInstanceId,
        )
      ) {
        return
      }
      handleSelectInstance(String(filteredInstanceOptions[0]?.id ?? ''))
      return
    }

    if (
      selectedTypeId &&
      typeOptions.some((type) => String(type.id) === selectedTypeId)
    ) {
      return
    }
    handleSelectType(String(typeOptions[0]?.id ?? ''))
  }, [
    filteredInstanceOptions,
    handleSelectInstance,
    handleSelectType,
    loading,
    mode,
    selectedInstanceId,
    selectedTypeId,
    typeOptions,
  ])

  useEffect(() => {
    if (mode === 'INSTANCE') {
      setDirectionFilter('')
      return
    }
    setRelationTypeFilterId('')
    setExpandedInstanceIds(new Set())
  }, [mode])

  useEffect(() => {
    replaceQuery((params) => {
      if (searchText.trim()) {
        params.set('q', searchText.trim())
      } else {
        params.delete('q')
      }
      if (instanceTypeFilterId) {
        params.set('instanceTypeId', instanceTypeFilterId)
      } else {
        params.delete('instanceTypeId')
      }
      if (relationTypeFilterId) {
        params.set('relationTypeId', relationTypeFilterId)
      } else {
        params.delete('relationTypeId')
      }
      if (directionFilter) {
        params.set('direction', directionFilter)
      } else {
        params.delete('direction')
      }
      if (pathSourceId) {
        params.set('pathSourceId', pathSourceId)
      } else {
        params.delete('pathSourceId')
      }
      if (pathTargetId) {
        params.set('pathTargetId', pathTargetId)
      } else {
        params.delete('pathTargetId')
      }
      if (mode === 'INSTANCE') {
        params.set('depth', String(instanceDepth))
      } else {
        params.delete('depth')
      }
    })
  }, [
    instanceDepth,
    directionFilter,
    instanceTypeFilterId,
    mode,
    pathSourceId,
    pathTargetId,
    relationTypeFilterId,
    replaceQuery,
    searchText,
  ])

  useEffect(() => {
    setExpandedInstanceIds(
      selectedInstanceId ? new Set([Number(selectedInstanceId)]) : new Set(),
    )
  }, [selectedInstanceId])

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

  const filteredNeighbors = useMemo(
    () =>
      relationTypeFilterId
        ? neighbors.filter(
            (neighbor) => neighbor.relationTypeId === Number(relationTypeFilterId),
          )
        : neighbors,
    [neighbors, relationTypeFilterId],
  )

  const graphData = useMemo(
    () =>
      mode === 'INSTANCE'
        ? buildInstanceGraph(selectedInstance, filteredNeighbors)
        : buildModelGraph(
            typeOptions,
            relationTypes,
            selectedType?.id ?? null,
            directionFilter,
          ),
    [
      directionFilter,
      filteredNeighbors,
      mode,
      relationTypes,
      selectedInstance,
      selectedType,
      typeOptions,
    ],
  )

  const searchResultNodes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) {
      return []
    }
    return graphData.nodes
      .filter(
        (node) =>
          node.label.toLowerCase().includes(keyword) ||
          node.meta.toLowerCase().includes(keyword),
      )
      .slice(0, 8)
  }, [graphData.nodes, searchText])

  useEffect(() => {
    if (!graphData.nodes.length) {
      setSelectedNodeId('')
      return
    }

    if (selectedNodeId && graphData.nodes.some((node) => node.id === selectedNodeId)) {
      return
    }

    const emphasizedNode = graphData.nodes.find((node) => node.emphasis)
    setSelectedNodeId(emphasizedNode?.id ?? graphData.nodes[0]?.id ?? '')
  }, [graphData.nodes, selectedNodeId])

  const nodeMap = useMemo(
    () => new Map(graphData.nodes.map((node) => [node.id, node])),
    [graphData.nodes],
  )

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null
  const selectedNodeEntityId = selectedNode?.entityId ?? null

  const adjacencyMap = useMemo(() => {
    const map = new Map<string, GraphEdge[]>()
    for (const edge of graphData.edges) {
      const sourceEdges = map.get(edge.source) ?? []
      sourceEdges.push(edge)
      map.set(edge.source, sourceEdges)
      const targetEdges = map.get(edge.target) ?? []
      targetEdges.push(edge)
      map.set(edge.target, targetEdges)
    }
    return map
  }, [graphData.edges])

  const highlightedPath = useMemo(() => {
    if (!pathSourceId || !pathTargetId || pathSourceId === pathTargetId) {
      return null
    }

    const visited = new Set<string>([pathSourceId])
    const queue: Array<{ nodeId: string; edgeIds: string[]; nodeIds: string[] }> = [
      { nodeId: pathSourceId, edgeIds: [], nodeIds: [pathSourceId] },
    ]

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) break
      if (current.nodeId === pathTargetId) {
        return {
          edgeIds: new Set(current.edgeIds),
          nodeIds: new Set(current.nodeIds),
          orderedNodeIds: current.nodeIds,
        }
      }

      const nextEdges = adjacencyMap.get(current.nodeId) ?? []
      for (const edge of nextEdges) {
        const nextNodeId = edge.source === current.nodeId ? edge.target : edge.source
        if (visited.has(nextNodeId)) {
          continue
        }
        visited.add(nextNodeId)
        queue.push({
          nodeId: nextNodeId,
          edgeIds: [...current.edgeIds, edge.id],
          nodeIds: [...current.nodeIds, nextNodeId],
        })
      }
    }

    return null
  }, [adjacencyMap, pathSourceId, pathTargetId])

  const highlightedEdgeIds = useMemo(
    () => {
      const ids = new Set<string>()
      if (highlightedPath) {
        for (const id of highlightedPath.edgeIds) {
          ids.add(id)
        }
      }
      for (const edge of graphData.edges) {
        if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
          ids.add(edge.id)
        }
      }
      return ids
    },
    [graphData.edges, highlightedPath, selectedNodeId],
  )

  const highlightedNodeIds = useMemo(() => {
    const ids = new Set<string>()
    if (highlightedPath) {
      for (const id of highlightedPath.nodeIds) {
        ids.add(id)
      }
    }
    if (selectedNodeId) {
      ids.add(selectedNodeId)
    }
    return ids
  }, [highlightedPath, selectedNodeId])

  const sideSummary = useMemo(() => {
    if (mode === 'INSTANCE' && selectedInstance) {
      return {
        title: selectedInstance.name,
        subtitle: `${selectedInstance.typeCode} / #${selectedInstance.id}`,
        description:
          filteredNeighbors.length > 0
            ? `已加载 ${filteredNeighbors.length} 条邻接关系，可用于快速核对实体在图谱中的上下游连接。`
            : '当前实例尚未查询到邻居关系，可能尚未建立关系边。',
        tags: [
          `类型 ${selectedInstance.typeCode}`,
          `邻居 ${filteredNeighbors.length}`,
          `属性 ${
            selectedInstance.attributes
              ? Object.keys(selectedInstance.attributes).length
              : 0
          }`,
        ],
      }
    }

    if (mode === 'MODEL' && selectedType) {
      const relatedRelations = relationTypes.filter(
        (relation) =>
          (!directionFilter || relation.direction === directionFilter) &&
          (relation.sourceTypeId === selectedType.id ||
            relation.targetTypeId === selectedType.id),
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
  }, [
    directionFilter,
    filteredNeighbors.length,
    mode,
    relationTypes,
    selectedInstance,
    selectedType,
  ])

  const selectedNodeDetail = useMemo<SelectedNodeDetail | null>(() => {
    if (!selectedNode) {
      return null
    }

    if (selectedNode.kind === 'instance') {
      const currentInstance =
        instanceOptions.find((instance) => instance.id === selectedNode.entityId) ??
        null
      const relatedNeighbors = filteredNeighbors.filter(
        (neighbor) =>
          neighbor.sourceInstanceId === selectedNode.entityId ||
          neighbor.targetInstanceId === selectedNode.entityId,
      )

      return {
        kind: 'instance',
        title: selectedNode.label,
        subtitle: selectedNode.meta,
        description:
          relatedNeighbors.length > 0
            ? `该实例当前在图谱中关联 ${relatedNeighbors.length} 条边，可继续切换到相邻节点进行排查。`
            : '当前实例未查询到可视化关系，可先在关联类型页补充关系边。',
        chips: [
          `实例 #${selectedNode.entityId}`,
          `关系 ${relatedNeighbors.length}`,
          `属性 ${
            currentInstance?.attributes
              ? Object.keys(currentInstance.attributes).length
              : 0
          }`,
        ],
        attributes: currentInstance?.attributes ?? null,
        neighbors: relatedNeighbors.map((neighbor) => {
          const isSource = neighbor.sourceInstanceId === selectedNode.entityId
          return {
            edgeId: neighbor.edgeId,
            relationName: neighbor.relationTypeName,
            relatedInstanceId: isSource
              ? neighbor.targetInstanceId
              : neighbor.sourceInstanceId,
            relatedInstanceName: isSource
              ? neighbor.targetInstanceName
              : neighbor.sourceInstanceName,
            relatedTypeCode: isSource
              ? neighbor.targetTypeCode
              : neighbor.sourceTypeCode,
          }
        }),
      }
    }

    const currentType =
      typeOptions.find((objectType) => objectType.id === selectedNode.entityId) ?? null
    const relatedRelations = relationTypes
      .filter(
        (relation) =>
          (!directionFilter || relation.direction === directionFilter) &&
          (relation.sourceTypeId === selectedNode.entityId ||
            relation.targetTypeId === selectedNode.entityId),
      )
      .map((relation) => ({
        id: relation.id,
        name: relation.name,
        code: relation.code,
        sourceTypeCode: relation.sourceTypeCode,
        targetTypeCode: relation.targetTypeCode,
        direction: relation.direction,
      }))

    return {
      kind: 'type',
      title: selectedNode.label,
      subtitle: selectedNode.meta,
      description:
        relatedRelations.length > 0
          ? `该对象类型参与 ${relatedRelations.length} 条关系定义，可结合模型视图检查上下游建模。`
          : '当前对象类型尚未配置关系定义。',
      chips: [
        `类型 #${selectedNode.entityId}`,
        `关系 ${relatedRelations.length}`,
        currentType?.description ? '含描述' : '无描述',
      ],
      descriptionText: currentType?.description ?? '未填写对象类型描述。',
      relations: relatedRelations,
    }
  }, [
    directionFilter,
    filteredNeighbors,
    instanceOptions,
    relationTypes,
    selectedNode,
    typeOptions,
  ])

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    setSelectedEdgeId('')
  }, [])

  const handleSelectEdge = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId)
  }, [])

  const handleFocusNeighbor = useCallback(
    (instanceId: number) => {
      handleSelectInstance(String(instanceId))
    },
    [handleSelectInstance],
  )

  const handleRefreshInstances = useCallback(async () => {
    setGraphLoading(true)
    setError(null)
    try {
      const rows = await listInstances()
      setInstanceOptions(rows)
      if (!rows.some((instance) => String(instance.id) === selectedInstanceId)) {
        handleSelectInstance(String(rows[0]?.id ?? ''))
      }
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setGraphLoading(false)
    }
  }, [handleSelectInstance, selectedInstanceId])

  const selectedEdge = useMemo(
    () => graphData.edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [graphData.edges, selectedEdgeId],
  )

  const selectedEdgeDetail = useMemo<EdgeDetail | null>(() => {
    if (!selectedEdge) {
      return null
    }
    return {
      title: selectedEdge.label,
      subtitle: selectedEdge.code ?? `边 #${selectedEdge.entityId}`,
      description:
        selectedEdge.direction === 'UNDIRECTED'
          ? '当前边为无向关系，表示两个节点之间的双向语义连接。'
          : '当前边为有向关系，表示从源节点到目标节点的语义连接。',
      chips: [
        `关系 #${selectedEdge.entityId}`,
        selectedEdge.direction ?? 'DIRECTED',
        selectedEdge.weak ? '弱连接' : '强连接',
      ],
      sourceMeta: selectedEdge.sourceMeta ?? '—',
      targetMeta: selectedEdge.targetMeta ?? '—',
      attributes: selectedEdge.attributes ?? null,
    }
  }, [selectedEdge])

  const selectedPathDetail = useMemo<PathDetail | null>(() => {
    if (!highlightedPath) {
      return null
    }

    const steps = highlightedPath.orderedNodeIds
      .map((nodeId) => nodeMap.get(nodeId))
      .filter((node): node is GraphNode => Boolean(node))
      .map((node) => `${node.label} (${node.meta})`)

    if (steps.length === 0) {
      return null
    }

    return {
      title: '最短路径高亮',
      subtitle: `${steps.length} 个节点 / ${Math.max(steps.length - 1, 0)} 条边`,
      description: '当前高亮的是两个节点之间在现有图谱中的最短连接路径。',
      chips: [
        `源 ${pathSourceId}`,
        `目标 ${pathTargetId}`,
        `边数 ${Math.max(steps.length - 1, 0)}`,
      ],
      steps,
    }
  }, [highlightedPath, nodeMap, pathSourceId, pathTargetId])

  function handlePickSearchNode(nodeId: string) {
    const node = nodeMap.get(nodeId)
    if (!node) return
    setSearchText('')
    if (node.kind === 'instance') {
      handleSelectInstance(String(node.entityId))
      return
    }
    handleSelectType(String(node.entityId))
  }

  function handleUsePathEndpoint(kind: 'source' | 'target') {
    if (!selectedNodeId) return
    if (kind === 'source') {
      setPathSourceId(selectedNodeId)
      return
    }
    setPathTargetId(selectedNodeId)
  }

  function clearPathHighlight() {
    setPathSourceId('')
    setPathTargetId('')
  }

  async function handleExpandSecondHop() {
    if (mode !== 'INSTANCE' || !selectedNode || selectedNode.kind !== 'instance') {
      return
    }

    if (expandedInstanceIds.size >= instanceDepth) {
      return
    }

    const baseInstanceId = selectedNode.entityId
    const firstHopInstanceIds = new Set<number>([baseInstanceId])
    for (const neighbor of filteredNeighbors) {
      if (neighbor.sourceInstanceId === baseInstanceId) {
        firstHopInstanceIds.add(neighbor.targetInstanceId)
      }
      if (neighbor.targetInstanceId === baseInstanceId) {
        firstHopInstanceIds.add(neighbor.sourceInstanceId)
      }
    }

    const nextTargets = Array.from(firstHopInstanceIds).filter(
      (instanceId) => !expandedInstanceIds.has(instanceId),
    )
    if (nextTargets.length === 0) {
      return
    }

    setSecondHopLoading(true)
    setError(null)
    try {
      const batches = await Promise.all(
        nextTargets.map(async (instanceId) => ({
          instanceId,
          neighbors: await listRelationNeighbors(instanceId),
        })),
      )

      setNeighbors((prev) => {
        const seen = new Set(prev.map((item) => item.edgeId))
        const merged = [...prev]
        for (const batch of batches) {
          for (const item of batch.neighbors) {
            if (!seen.has(item.edgeId)) {
              seen.add(item.edgeId)
              merged.push(item)
            }
          }
        }
        return merged
      })

      setExpandedInstanceIds((prev) => {
        const next = new Set(prev)
        next.add(baseInstanceId)
        for (const instanceId of nextTargets) {
          next.add(instanceId)
        }
        return next
      })
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    } finally {
      setSecondHopLoading(false)
    }
  }

  function resetViewport() {
    setViewport(DEFAULT_VIEWPORT)
  }

  function centerOnCoordinates(x: number, y: number) {
    const scale = viewport.scale
    setViewport((prev) => ({
      ...prev,
      offsetX: GRAPH_WIDTH / 2 - x * scale,
      offsetY: GRAPH_HEIGHT / 2 - y * scale,
    }))
  }

  function handleZoom(delta: number) {
    setViewport((prev) => ({
      ...prev,
      scale: Math.min(2.2, Math.max(0.6, Number((prev.scale + delta).toFixed(2)))),
    }))
  }

  function handleStageWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const stage = stageWrapRef.current
    if (!stage) return

    const rect = stage.getBoundingClientRect()
    const cursorX = event.clientX - rect.left
    const cursorY = event.clientY - rect.top
    const delta = event.deltaY < 0 ? 0.08 : -0.08

    setViewport((prev) => {
      const nextScale = Math.min(
        2.4,
        Math.max(0.6, Number((prev.scale + delta).toFixed(2))),
      )
      if (nextScale === prev.scale) {
        return prev
      }

      const worldX = (cursorX - prev.offsetX) / prev.scale
      const worldY = (cursorY - prev.offsetY) / prev.scale

      return {
        scale: nextScale,
        offsetX: cursorX - worldX * nextScale,
        offsetY: cursorY - worldY * nextScale,
      }
    })
  }

  function handleCenterSelected() {
    if (!selectedNode) return
    centerOnCoordinates(selectedNode.x, selectedNode.y)
  }

  async function handleExport(kind: 'svg' | 'png') {
    const svg = svgRef.current
    if (!svg) {
      return
    }
    try {
      if (kind === 'svg') {
        await exportSvg(svg, mode)
      } else {
        await exportPng(svg, mode)
      }
    } catch (e: unknown) {
      setError(toAppErrorInfo(e))
    }
  }

  function handleStagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.closest('.graph-stage-node') || target.closest('.graph-stage-edges')) {
      return
    }
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: viewport.offsetX,
      originOffsetY: viewport.offsetY,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleStagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }
    const dx = event.clientX - dragState.startX
    const dy = event.clientY - dragState.startY
    setViewport((prev) => ({
      ...prev,
      offsetX: dragState.originOffsetX + dx,
      offsetY: dragState.originOffsetY + dy,
    }))
  }

  function handleStagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragState?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      setDragState(null)
    }
  }

  function handleStagePointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragState?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      setDragState(null)
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <h1>图谱</h1>
          <p>支持实例关系图与模型关系图双视图切换，可通过筛选、节点联动和实例跳转快速聚焦语义网络。</p>
        </div>
      </header>

      <ErrorAlert error={error} />

      <div className="graph-layout">
        <section className="panel graph-controls">
          <div className="graph-mode-toggle" role="tablist" aria-label="图谱模式">
            <button
              type="button"
              className={mode === 'INSTANCE' ? 'btn btn-primary' : 'btn'}
              onClick={() => handleChangeMode('INSTANCE')}
            >
              实例视图
            </button>
            <button
              type="button"
              className={mode === 'MODEL' ? 'btn btn-primary' : 'btn'}
              onClick={() => handleChangeMode('MODEL')}
            >
              模型视图
            </button>
          </div>

          <div className="graph-search-box">
            <div className="graph-search-row">
              <label className="field">
                <span>节点搜索</span>
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={
                    mode === 'INSTANCE'
                      ? '搜索实例名称或类型'
                      : '搜索对象类型名称或编码'
                  }
                />
              </label>
            </div>
            {searchText.trim() ? (
              <div className="graph-node-neighbor-list">
                {searchResultNodes.length === 0 ? (
                  <p className="status">未找到匹配节点</p>
                ) : (
                  searchResultNodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      className="graph-neighbor-item"
                      onClick={() => handlePickSearchNode(node.id)}
                    >
                      <strong>{node.label}</strong>
                      <span>
                        {node.meta} / {node.kind === 'instance' ? '实例' : '对象类型'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="graph-search-box">
            <div className="graph-search-row">
              <label className="field">
                <span>路径源节点</span>
                <input
                  value={pathSourceId}
                  readOnly
                  placeholder="先选中节点后设为源"
                />
              </label>
              <label className="field">
                <span>路径目标节点</span>
                <input
                  value={pathTargetId}
                  readOnly
                  placeholder="再选中节点后设为目标"
                />
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn"
                onClick={() => handleUsePathEndpoint('source')}
                disabled={!selectedNodeId}
              >
                设为路径源
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleUsePathEndpoint('target')}
                disabled={!selectedNodeId}
              >
                设为路径目标
              </button>
              <button
                type="button"
                className="btn"
                onClick={clearPathHighlight}
                disabled={!pathSourceId && !pathTargetId}
              >
                清空路径
              </button>
            </div>
          </div>

          {mode === 'INSTANCE' ? (
            <div className="form-grid">
              <label className="field">
                <span>对象类型筛选</span>
                <select
                  value={instanceTypeFilterId}
                  onChange={(e) => setInstanceTypeFilterId(e.target.value)}
                >
                  <option value="">全部类型</option>
                  {typeOptions.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>实例</span>
                <select
                  value={selectedInstanceId}
                  onChange={(e) => handleSelectInstance(e.target.value)}
                >
                  <option value="">请选择实例</option>
                  {filteredInstanceOptions.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {item.name} (#{item.id} / {item.typeCode})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>关系类型筛选</span>
                <select
                  value={relationTypeFilterId}
                  onChange={(e) => setRelationTypeFilterId(e.target.value)}
                >
                  <option value="">全部关系</option>
                  {relationTypes.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => void handleRefreshInstances()}
                >
                  刷新实例
                </button>
                <label className="field small">
                  <span>展开深度</span>
                  <select
                    value={String(instanceDepth)}
                    onChange={(e) => setInstanceDepth(normalizeDepth(Number(e.target.value)))}
                  >
                    <option value="1">1 跳</option>
                    <option value="2">2 跳</option>
                    <option value="3">3 跳</option>
                  </select>
                </label>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <label className="field">
                <span>对象类型</span>
                <select
                  value={selectedTypeId}
                  onChange={(e) => handleSelectType(e.target.value)}
                >
                  <option value="">请选择对象类型</option>
                  {typeOptions.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>方向筛选</span>
                <select
                  value={directionFilter}
                  onChange={(e) =>
                    setDirectionFilter(e.target.value as RelationDirection | '')
                  }
                >
                  <option value="">全部方向</option>
                  <option value="DIRECTED">DIRECTED</option>
                  <option value="UNDIRECTED">UNDIRECTED</option>
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
              <h2 className="panel-title">
                {mode === 'INSTANCE' ? '实例关系网络' : '模型语义网络'}
              </h2>
              <p className="hint-text">
                {graphLoading
                  ? '图谱加载中…'
                  : `当前显示 ${graphData.nodes.length} 个节点、${graphData.edges.length} 条关系`}
              </p>
            </div>
            <div className="graph-legend">
              <span className="graph-legend-item">
                <span className="graph-legend-dot graph-legend-dot--focus" />
                焦点节点
              </span>
              <span className="graph-legend-item">
                <span className="graph-legend-dot graph-legend-dot--weak" />
                弱连接
              </span>
              <span className="graph-legend-item">
                <span className="graph-legend-dot graph-legend-dot--type" />
                类型节点
              </span>
            </div>
          </div>

          <div className="graph-canvas-tools">
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => handleZoom(0.1)}>
                放大
              </button>
              <button type="button" className="btn" onClick={() => handleZoom(-0.1)}>
                缩小
              </button>
              <button type="button" className="btn" onClick={resetViewport}>
                重置视图
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleCenterSelected}
                disabled={!selectedNode}
              >
                居中当前节点
              </button>
              {mode === 'INSTANCE' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleExpandSecondHop()}
                  disabled={
                    secondHopLoading ||
                    !selectedNode ||
                    selectedNode.kind !== 'instance' ||
                    expandedInstanceIds.size >= instanceDepth
                  }
                >
                  {secondHopLoading ? '扩展中…' : '展开二跳'}
                </button>
              ) : null}
              <button
                type="button"
                className="btn"
                onClick={() => void handleExport('svg')}
              >
                导出 SVG
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void handleExport('png')}
              >
                导出 PNG
              </button>
            </div>
            <p className="hint-text">
              支持拖动画布平移，缩放比例 {Math.round(viewport.scale * 100)}%，
              {mode === 'INSTANCE' ? `当前深度 ${instanceDepth} 跳` : '当前为模型视图'}
            </p>
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
            <div
              ref={stageWrapRef}
              className={`graph-stage ${dragState ? 'graph-stage--dragging' : ''}`}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onPointerLeave={handleStagePointerLeave}
              onWheel={handleStageWheel}
            >
              <svg
                ref={svgRef}
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
                    <feDropShadow
                      dx="0"
                      dy="8"
                      stdDeviation="10"
                      floodColor="#2f73df"
                      floodOpacity="0.12"
                    />
                  </filter>
                </defs>

                <g
                  transform={`translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.scale})`}
                >
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

                      if (!source || !target) {
                        return null
                      }

                      const labelX = (source.x + target.x) / 2
                      const labelY = (source.y + target.y) / 2
                      const isSelected = highlightedEdgeIds.has(edge.id)
                      const edgeClassName = [
                        'graph-stage-edge',
                        edge.weak ? 'graph-stage-edge--weak' : '',
                        isSelected ? 'graph-stage-edge--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <g key={edge.id}>
                          <line
                            className={edgeClassName}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            onClick={() => handleSelectEdge(edge.id)}
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
                    {graphData.nodes.map((node) => {
                      const nodeClassName = [
                        'graph-stage-node',
                        node.emphasis ? 'graph-stage-node--emphasis' : '',
                        highlightedNodeIds.has(node.id)
                          ? 'graph-stage-node--selected'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <g
                          key={node.id}
                          className={nodeClassName}
                          transform={`translate(${node.x} ${node.y})`}
                          onClick={() => handleSelectNode(node.id)}
                        >
                          <circle
                            className="graph-stage-node-halo"
                            r={node.kind === 'type' ? 34 : 30}
                          />
                          <circle
                            className="graph-stage-node-core"
                            r={node.kind === 'type' ? 12 : 10}
                          />
                          <g
                            className="graph-stage-node-card"
                            filter="url(#graph-node-shadow)"
                          >
                            <rect
                              x={node.kind === 'type' ? -64 : -72}
                              y="18"
                              width={node.kind === 'type' ? 128 : 144}
                              height="52"
                              rx="16"
                            />
                            <text
                              className="graph-stage-node-title"
                              x="0"
                              y="42"
                              textAnchor="middle"
                            >
                              {node.label}
                            </text>
                            <text
                              className="graph-stage-node-meta"
                              x="0"
                              y="58"
                              textAnchor="middle"
                            >
                              {node.meta}
                            </text>
                          </g>
                        </g>
                      )
                    })}
                  </g>
                </g>
              </svg>
            </div>
          )}
        </section>

        <section className="panel graph-node-detail-panel">
          <h2 className="panel-title">
            {selectedPathDetail
              ? '路径详情'
              : selectedEdgeDetail
                ? '关系详情'
                : '节点详情'}
          </h2>
          {selectedPathDetail ? (
            <div className="graph-node-detail">
              <p className="graph-summary-subtitle">{selectedPathDetail.subtitle}</p>
              <h3 className="graph-node-detail-title">{selectedPathDetail.title}</h3>
              <p className="graph-summary-description">
                {selectedPathDetail.description}
              </p>
              <div className="graph-summary-tags">
                {selectedPathDetail.chips.map((chip) => (
                  <span key={chip} className="graph-summary-tag">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="graph-node-neighbors">
                <span className="graph-node-section-title">路径节点顺序</span>
                <div className="graph-node-neighbor-list">
                  {selectedPathDetail.steps.map((step) => (
                    <div key={step} className="graph-neighbor-item">
                      <strong>{step}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={clearPathHighlight}>
                  清空路径高亮
                </button>
              </div>
            </div>
          ) : selectedEdgeDetail ? (
            <div className="graph-node-detail">
              <p className="graph-summary-subtitle">{selectedEdgeDetail.subtitle}</p>
              <h3 className="graph-node-detail-title">{selectedEdgeDetail.title}</h3>
              <p className="graph-summary-description">
                {selectedEdgeDetail.description}
              </p>
              <div className="graph-summary-tags">
                {selectedEdgeDetail.chips.map((chip) => (
                  <span key={chip} className="graph-summary-tag">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="graph-edge-detail">
                <div className="graph-edge-card">
                  <strong>源节点</strong>
                  <p>{selectedEdge?.sourceMeta ?? '—'}</p>
                </div>
                <div className="graph-edge-card">
                  <strong>目标节点</strong>
                  <p>{selectedEdge?.targetMeta ?? '—'}</p>
                </div>
              </div>
              <div className="graph-edge-attributes">
                <span>关系属性</span>
                <pre className="json-view">
                  {selectedEdgeDetail.attributes
                    ? JSON.stringify(selectedEdgeDetail.attributes, null, 2)
                    : '—'}
                </pre>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSelectedEdgeId('')}
                >
                  返回节点详情
                </button>
              </div>
            </div>
          ) : selectedNodeDetail ? (
            <div className="graph-node-detail">
              <p className="graph-summary-subtitle">{selectedNodeDetail.subtitle}</p>
              <h3 className="graph-node-detail-title">{selectedNodeDetail.title}</h3>
              <p className="graph-summary-description">
                {selectedNodeDetail.description}
              </p>
              <div className="graph-summary-tags">
                {selectedNodeDetail.chips.map((chip) => (
                  <span key={chip} className="graph-summary-tag">
                    {chip}
                  </span>
                ))}
              </div>

              {selectedNodeDetail.kind === 'instance' ? (
                <>
                  <div className="graph-node-json">
                    <span className="graph-node-section-title">属性</span>
                    <pre className="json-view">
                      {selectedNodeDetail.attributes
                        ? JSON.stringify(selectedNodeDetail.attributes, null, 2)
                        : '—'}
                    </pre>
                  </div>

                  <div className="graph-node-neighbors">
                    <span className="graph-node-section-title">相关邻居</span>
                    {selectedNodeDetail.neighbors.length === 0 ? (
                      <p className="status">暂无关联边</p>
                    ) : (
                      <div className="graph-node-neighbor-list">
                        {selectedNodeDetail.neighbors.map((neighbor) => (
                          <button
                            key={neighbor.edgeId}
                            type="button"
                            className="graph-neighbor-item"
                            onClick={() =>
                              handleFocusNeighbor(neighbor.relatedInstanceId)
                            }
                          >
                            <strong>{neighbor.relatedInstanceName}</strong>
                            <span>
                              {neighbor.relationName} / {neighbor.relatedTypeCode} / #
                              {neighbor.relatedInstanceId}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <Link
                      to={`/instances/${selectedNodeEntityId}`}
                      className="btn btn-primary"
                    >
                      打开实例详情
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="graph-node-json">
                    <span className="graph-node-section-title">对象类型描述</span>
                    <p className="graph-node-paragraph">
                      {selectedNodeDetail.descriptionText}
                    </p>
                  </div>

                  <div className="graph-node-neighbors">
                    <span className="graph-node-section-title">相关关系</span>
                    {selectedNodeDetail.relations.length === 0 ? (
                      <p className="status">暂无关系定义</p>
                    ) : (
                      <div className="graph-node-neighbor-list">
                        {selectedNodeDetail.relations.map((relation) => (
                          <div key={relation.id} className="graph-neighbor-item">
                            <strong>{relation.name}</strong>
                            <span>
                              {relation.code} / {relation.sourceTypeCode} {'->'}{' '}
                              {relation.targetTypeCode} / {relation.direction}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <Link
                      to={`/object-types/${selectedNodeEntityId}`}
                      className="btn btn-primary"
                    >
                      打开对象类型详情
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="empty-panel graph-empty-state">
              <p>点击图谱中的节点后，可在这里查看详情、属性与相邻连接。</p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
