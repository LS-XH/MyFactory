import { useEffect, useMemo, useRef, useState, type DragEvent, type WheelEvent } from 'react'
import { Background, ControlButton, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, SelectionMode, useReactFlow, useStore, useStoreApi, useUpdateNodeInternals, ViewportPortal, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { GitBranch, Maximize2, Minus, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { SURFACE_VIEW } from '../../config/gameplay'
import { resolveItemColor } from '../../shared/icons/itemVisualRegistry'
import { ICON_SIZES, UI_COLORS } from '../../config/visualTokens'
import { content, getFactory, getFactoryPortItems, getItem, getRecipe, type FactoryDefinition, type FactoryNodeState } from '../../domain/content'
import { findCelestialObject, getDefaultPlanet, getResourcePoints } from '../../domain/spaceMap'
import { useGameStore } from '../../state/gameStore'
import { FactoryGlyph } from '../../shared/icons/FactoryGlyph'
import { objectRepository } from '../../domain/objects'
import { canvasToGrid, gridToCanvas, itemCountFromTonnes, toSurfaceGrid } from '../../domain/surfaceContent'
import { SURFACE_FACTORY_DRAG_TYPE } from './buildDrag'
import { ItemGlyph } from '../../shared/icons/ItemGlyph'

type FactoryNodeData = { factory: FactoryDefinition; node: FactoryNodeState; minedItemId?: string }
type ResourceNodeData = { resource: ReturnType<typeof getResourcePoints>[number]; remaining: number }
const depositHandleId = 'input:deposit'
const itemHandleId = (direction: 'input' | 'output', itemId: string) => `${direction}:${itemId}`
const surfaceDensity = (zoom: number, iconMaxZoom: number, detailMinZoom: number) => zoom <= iconMaxZoom ? 'icon' : zoom >= detailMinZoom ? 'detail' : 'compact'
const setLayerInert = (element: HTMLDivElement | null, inactive: boolean) => { if (element) element.inert = inactive }

function FactoryNode({ id, data, selected }: NodeProps<Node<FactoryNodeData>>) {
  const factory = data.factory
  const node = data.node
  const updateNodeInternals = useUpdateNodeInternals()
  const portItems = getFactoryPortItems(factory, node, data.minedItemId)
  const inputItems = factory.id === 'MiningStation' ? [data.minedItemId ?? null] : portItems.inputs
  const portSignature = `${inputItems.join('|')}→${portItems.outputs.join('|')}`
  const portStyle = (itemId: string | null, index: number, count: number) => ({
    top: `${(index + 1) * 100 / (count + 1)}%`,
    '--port-color': itemId ? resolveItemColor(itemId, getItem(itemId)) : factory.color
  } as React.CSSProperties)
  const compactMaxZoom = useGameStore((state) => state.surfaceCardCompactMaxZoom)
  const detailMinZoom = useGameStore((state) => state.surfaceCardDetailMinZoom)
  const density = useStore((state) => surfaceDensity(state.transform[2], compactMaxZoom, detailMinZoom))
  useEffect(() => updateNodeInternals(id), [id, portSignature, density, updateNodeInternals])
  const factoryType = content.factoryTypes.find((type) => type.id === factory.type)
  const category = factoryType?.label ?? factory.type
  const glyph = (size: number) => <FactoryGlyph factoryId={factory.id} size={size} fallbackCategoryIcon={factoryType?.icon} />
  const status = node.status === 'blocked' ? '等待物料' : node.status === 'online' ? '运行中' : '待机'
  const recipe = getRecipe(node.recipeId ?? factory.recipe ?? '')
  const cyclePercent = Math.round(Math.min(1, Math.max(0, node.progress)) * 100)
  const storageAmount = Math.max(0, node.buffer)
  const storageScale = Math.max(1, factory.capacity ?? 20)
  const storagePercent = Math.min(100, storageAmount / storageScale * 100)
  const storageText = factory.capacity ? `${storageAmount.toLocaleString()} / ${factory.capacity.toLocaleString()} 件` : `${storageAmount.toLocaleString()} 件`
  const header = (iconSize: number) => <div className="factory-card-head"><span className="factory-card-icon">{glyph(iconSize)}</span><span className="factory-card-identity"><strong>{factory.name}</strong><small>{category}</small></span><span className={`factory-card-status ${node.status}`}>{status}</span></div>
  const bars = (className: string, vertical = false) => <div className={`factory-card-bars ${className}`}>
    <div className="factory-card-bar factory-card-bar--cycle" role="progressbar" aria-label="当前轮次进度" aria-valuenow={cyclePercent} aria-valuemin={0} aria-valuemax={100}><span style={vertical ? { height: `${cyclePercent}%` } : { width: `${cyclePercent}%` }} /></div>
    <div className="factory-card-bar factory-card-bar--storage" role="progressbar" aria-label="当前总储量" aria-valuenow={Math.min(storageAmount, storageScale)} aria-valuemin={0} aria-valuemax={storageScale} title={factory.capacity ? storageText : `${storageText}；显示刻度 ${storageScale} 件`}><span style={vertical ? { height: `${storagePercent}%` } : { width: `${storagePercent}%` }} /></div>
  </div>
  return <div className={`factory-node ${selected ? 'is-selected' : ''} ${node.status}`} data-density={density} style={{ '--node-color': factory.color } as React.CSSProperties}>
    {inputItems.map((itemId, index) => <Handle key={itemId ?? 'deposit'} id={itemId === null ? depositHandleId : factory.id === 'MiningStation' ? depositHandleId : itemHandleId('input', itemId)} type="target" position={Position.Left} className="flow-handle factory-port target" data-port-item={itemId ?? ''} style={portStyle(itemId, index, inputItems.length)} title={itemId ? `输入：${getItem(itemId)?.name ?? itemId}` : '连接资源点以绑定开采物品'} aria-label={itemId ? `输入 ${getItem(itemId)?.name ?? itemId}` : '输入资源点'}>{itemId ? <ItemGlyph itemId={itemId} variant="chip" /> : glyph(16)}</Handle>)}
    <div className="factory-card-layer factory-card-layer--detail" aria-hidden={density !== 'detail'} ref={(element) => setLayerInert(element, density !== 'detail')}>
      {header(20)}
      <div className="factory-card-info"><span>当前轮次</span><strong>{cyclePercent}%</strong></div>
      <div className="factory-card-bar factory-card-bar--cycle" role="progressbar" aria-label="当前轮次进度" aria-valuenow={cyclePercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${cyclePercent}%` }} /></div>
      <div className="factory-card-recipe-title">当前配方 · {recipe?.name ?? '暂无配方'}</div>
      <div className="factory-card-recipe-flow" title={recipe?.name ?? '暂无配方'}>{recipe ? <>{recipe.inputs.map((input) => <span className="factory-card-recipe-item" key={input.item} title={`${getItem(input.item)?.name ?? input.item} ×${input.amount}`}><ItemGlyph itemId={input.item} variant="chip" /><small>×{input.amount}</small></span>)}<span className="factory-card-recipe-arrow">→</span>{recipe.outputs.map((output) => <span className="factory-card-recipe-item" key={output.item} title={`${getItem(output.item)?.name ?? output.item} ×${output.amount}`}><ItemGlyph itemId={output.item} variant="chip" /><small>×{output.amount}</small></span>)}</> : <span className="factory-card-empty-recipe">—</span>}</div>
      <div className="factory-card-info"><span>当前总储量</span><strong>{storageText}</strong></div>
      <div className="factory-card-bar factory-card-bar--storage" role="progressbar" aria-label="当前总储量" aria-valuenow={Math.min(storageAmount, storageScale)} aria-valuemin={0} aria-valuemax={storageScale} title={factory.capacity ? storageText : `${storageText}；显示刻度 ${storageScale} 件`}><span style={{ width: `${storagePercent}%` }} /></div>
    </div>
    <div className="factory-card-layer factory-card-layer--compact" aria-hidden={density !== 'compact'} ref={(element) => setLayerInert(element, density !== 'compact')}><span className="factory-card-icon">{glyph(88)}</span>{bars('factory-card-bars--compact', true)}</div>
    <div className="factory-card-layer factory-card-layer--icon" aria-hidden={density !== 'icon'} ref={(element) => setLayerInert(element, density !== 'icon')}><span className="surface-icon-shell">{glyph(48)}</span></div>
    {portItems.outputs.map((itemId, index) => <Handle key={itemId} id={itemHandleId('output', itemId)} type="source" position={Position.Right} className="flow-handle factory-port source" data-port-item={itemId} style={portStyle(itemId, index, portItems.outputs.length)} title={`输出：${getItem(itemId)?.name ?? itemId}`} aria-label={`输出 ${getItem(itemId)?.name ?? itemId}`}><ItemGlyph itemId={itemId} variant="chip" /></Handle>)}
  </div>
}

function ResourceNode({ id, data, selected }: NodeProps<Node<ResourceNodeData>>) {
  const updateNodeInternals = useUpdateNodeInternals()
  const compactMaxZoom = useGameStore((state) => state.surfaceCardCompactMaxZoom)
  const detailMinZoom = useGameStore((state) => state.surfaceCardDetailMinZoom)
  const density = useStore((state) => surfaceDensity(state.transform[2], compactMaxZoom, detailMinZoom))
  useEffect(() => updateNodeInternals(id), [id, density, updateNodeInternals])
  const grid = toSurfaceGrid(data.resource.position)
  const resource = data.resource
  const item = getItem(resource.item)
  const itemName = item?.name ?? resource.item
  const remaining = Math.max(0, data.remaining)
  const reserveScale = Math.max(1, resource.reserves)
  const reservePercent = Math.min(100, remaining / reserveScale * 100)
  const reserveText = `${remaining.toLocaleString()} / ${resource.reserves.toLocaleString()} t`
  const itemCount = itemCountFromTonnes(remaining, resource.item)
  const color = resolveItemColor(resource.item, item)
  const glyph = (interactive: boolean) => <ItemGlyph itemId={resource.item} variant="inventory" interactive={interactive} />
  return <div className={`resource-node ${selected ? 'is-selected' : ''}`} data-density={density} style={{ '--node-color': color } as React.CSSProperties} title={`${remaining.toLocaleString()} t ≈ ${itemCount.toLocaleString()} 件`}>
    <div className="factory-card-layer factory-card-layer--detail resource-card-layer--detail" aria-hidden={density !== 'detail'} ref={(element) => setLayerInert(element, density !== 'detail')}>
      <div className="factory-card-head"><span className={`factory-card-icon resource-card-icon ${item?.kind === 'material' ? 'resource-card-icon--material' : ''}`}>{glyph(true)}</span><span className="factory-card-identity"><strong>{resource.resourceTypeName}</strong><small>{itemName}</small></span><span className="factory-card-status">资源点</span></div>
      <div className="factory-card-info"><span>剩余储量</span><strong>{reserveText}</strong></div>
      <div className="factory-card-bar factory-card-bar--storage" role="progressbar" aria-label="资源剩余储量" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={reserveScale}><span style={{ width: `${reservePercent}%` }} /></div>
      <div className="resource-card-stat"><span>可转化物品</span><strong>≈ {itemCount.toLocaleString()} 件</strong></div>
      <div className="resource-card-stat"><span>地表坐标</span><strong>({grid.x}, {grid.y})</strong></div>
    </div>
    <div className="factory-card-layer factory-card-layer--compact resource-card-layer--compact" aria-hidden={density !== 'compact'} ref={(element) => setLayerInert(element, density !== 'compact')}><span className="factory-card-icon resource-card-icon">{glyph(true)}</span><div className="factory-card-bars factory-card-bars--compact"><div className="factory-card-bar factory-card-bar--storage" role="progressbar" aria-label="资源剩余储量" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={reserveScale}><span style={{ height: `${reservePercent}%` }} /></div></div></div>
    <div className="factory-card-layer factory-card-layer--icon" aria-hidden={density !== 'icon'} ref={(element) => setLayerInert(element, density !== 'icon')}><span className="surface-icon-shell resource-icon-shell">{glyph(false)}</span></div>
    <Handle id={itemHandleId('output', resource.item)} type="source" position={Position.Right} className="flow-handle factory-port source" data-port-item={resource.item} style={{ '--port-color': color } as React.CSSProperties} title={`输出：${itemName}`} aria-label={`输出 ${itemName}`}><ItemGlyph itemId={resource.item} variant="chip" /></Handle>
  </div>
}

const nodeTypes = { factory: FactoryNode, resource: ResourceNode }

export function SurfaceView(props: { planet: string; draggingFactoryId: string | null; focusRequest: { objectId: string; requestId: number } | null; onNotify: (message: string) => void; onVisibleObjectIdsChange: (ids: string[]) => void }) {
  return <ReactFlowProvider><SurfaceFlowView {...props} /></ReactFlowProvider>
}

function SurfaceFlowView({ planet, draggingFactoryId, focusRequest, onNotify, onVisibleObjectIdsChange }: { planet: string; draggingFactoryId: string | null; focusRequest: { objectId: string; requestId: number } | null; onNotify: (message: string) => void; onVisibleObjectIdsChange: (ids: string[]) => void }) {
  const nodes = useGameStore((state) => state.nodes)
  const edges = useGameStore((state) => state.edges)
  const resourceReserves = useGameStore(useShallow((state) => state.resourceReserves))
  const selectedIds = useGameStore((state) => state.selectedIds)
  const select = useGameStore((state) => state.select)
  const moveNode = useGameStore((state) => state.moveNode)
  const addNode = useGameStore((state) => state.addNode)
  const addEdgeToStore = useGameStore((state) => state.addEdge)
  const removeNode = useGameStore((state) => state.removeNode)
  const iconMinZoom = useGameStore((state) => state.surfaceIconMinZoom)
  const flowApi = useReactFlow()
  const flowStore = useStoreApi()
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasBoundsRef = useRef<{ left: number; top: number } | null>(null)
  const cursorXRef = useRef<HTMLSpanElement>(null)
  const cursorYRef = useRef<HTMLSpanElement>(null)
  const cursorGridRef = useRef<{ x: number; y: number } | null>(null)
  const iconScaleRef = useRef(1)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [context, setContext] = useState<{ x: number; y: number; nodeId?: string } | null>(null)
  const [activeInteraction, setActiveInteraction] = useState<'box' | 'drag' | null>(null)
  const [dragPreview, setDragPreview] = useState<{ id: string; position: { x: number; y: number } } | null>(null)
  const [buildPreview, setBuildPreview] = useState<{ factoryId: string; grid: { x: number; y: number } } | null>(null)
  const initialZoomLevelIndex = SURFACE_VIEW.zoomLevels.indexOf(SURFACE_VIEW.initialZoom)
  const zoomLevelIndexRef = useRef(initialZoomLevelIndex)
  const [zoomLevelIndex, setZoomLevelIndex] = useState(initialZoomLevelIndex)
  const lastWheelAtRef = useRef(0)
  const cursorClientRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => { if (!draggingFactoryId) setBuildPreview(null) }, [draggingFactoryId])
  const defaultPlanet = getDefaultPlanet()
  const surfacePath = planet === 'aurelia' ? `${defaultPlanet.starId}/${defaultPlanet.planetId}` : planet
  const surfaceName = useMemo(() => findCelestialObject(surfacePath)?.displayName ?? surfacePath, [surfacePath])
  const [starId, ...planetPath] = surfacePath.split('/')
  const resourcePoints = useMemo(() => getResourcePoints(starId, planetPath.join('/')), [starId, planetPath.join('/')])
  const resourceById = useMemo(() => new Map(resourcePoints.map((resource) => [resource.id, resource])), [resourcePoints])
  const minedItemByNodeId = useMemo(() => {
    const items = new Map<string, string>()
    for (const edge of edges) {
      const resource = resourceById.get(edge.source)
      if (resource?.item === edge.itemId && !items.has(edge.target)) items.set(edge.target, edge.itemId)
    }
    return items
  }, [edges, resourceById])
  useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const updateCanvasSize = () => {
      const bounds = element.getBoundingClientRect()
      canvasBoundsRef.current = { left: bounds.left, top: bounds.top }
      setCanvasSize({ width: element.clientWidth, height: element.clientHeight })
    }
    const observer = new ResizeObserver(updateCanvasSize)
    observer.observe(element)
    updateCanvasSize()
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!focusRequest) return
    const target = useGameStore.getState().nodes.find((node) => node.id === focusRequest.objectId && node.surfaceId === surfacePath)
    const resource = resourcePoints.find((point) => point.id === focusRequest.objectId)
    if (!target && !resource) return
    const flowNode = flowStore.getState().nodeLookup.get(focusRequest.objectId)
    const element = [...(canvasRef.current?.querySelectorAll<HTMLElement>('.react-flow__node') ?? [])].find((item) => item.dataset.id === focusRequest.objectId)
    const position = gridToCanvas(target ?? resource!.position, SURFACE_VIEW.gridGap)
    const width = flowNode?.measured?.width || element?.offsetWidth || (resource ? SURFACE_VIEW.resourceNodeWidth : SURFACE_VIEW.factoryNodeWidth)
    const height = flowNode?.measured?.height || element?.offsetHeight || (resource ? SURFACE_VIEW.resourceNodeHeight : SURFACE_VIEW.factoryNodeHeight)
    void flowApi.setCenter(position.x + width / 2, position.y + height / 2, { zoom: SURFACE_VIEW.zoomLevels[zoomLevelIndexRef.current], duration: SURFACE_VIEW.zoomAnimationMs })
  }, [focusRequest?.requestId, surfacePath, resourcePoints])
  const factoryFlowNodes = useMemo(() =>
    nodes.filter((node) => node.surfaceId === surfacePath).flatMap((node) => {
      const factory = getFactory(node.factoryId)
      if (!factory) return []
      objectRepository.ensureFactory(node.id, node.factoryId, factory.name, { ...node })
      return [{
        id: node.id, type: 'factory', position: gridToCanvas(node, SURFACE_VIEW.gridGap),
        // React Flow hides a recreated node until it knows its dimensions. Keep them through rapid drags.
        initialWidth: SURFACE_VIEW.factoryNodeWidth, initialHeight: SURFACE_VIEW.factoryNodeHeight,
        measured: flowStore.getState().nodeLookup.get(node.id)?.measured,
        data: { factory, node, minedItemId: minedItemByNodeId.get(node.id) },
        selected: selectedIds.includes(node.id)
      }]
    }), [nodes, selectedIds, surfacePath, minedItemByNodeId, flowStore])
  const resourceNodeCacheRef = useRef(new Map<string, Node<ResourceNodeData>>())
  const resourceFlowNodes = useMemo(() => {
    const nextCache = new Map<string, Node<ResourceNodeData>>()
    const resourceNodes = resourcePoints.map((resource) => {
      const remaining = resourceReserves[resource.id] ?? resource.reserves
      const selected = selectedIds.includes(resource.id)
      const previous = resourceNodeCacheRef.current.get(resource.id)
      if (previous?.data.resource === resource && previous.data.remaining === remaining && previous.selected === selected) {
        nextCache.set(resource.id, previous)
        return previous
      }
      const position = gridToCanvas(resource.position, SURFACE_VIEW.gridGap)
      objectRepository.ensureResource(resource.id, resource.displayName, resource, position)
      const flowNode: Node<ResourceNodeData> = {
        id: resource.id, type: 'resource', position,
        initialWidth: SURFACE_VIEW.resourceNodeWidth, initialHeight: SURFACE_VIEW.resourceNodeHeight,
        measured: flowStore.getState().nodeLookup.get(resource.id)?.measured,
        data: { resource, remaining },
        draggable: false, selectable: true, selected
      }
      nextCache.set(resource.id, flowNode)
      return flowNode
    })
    resourceNodeCacheRef.current = nextCache
    return resourceNodes
  }, [resourcePoints, resourceReserves, selectedIds, flowStore])
  const flowNodes = useMemo(() => [...factoryFlowNodes, ...resourceFlowNodes], [factoryFlowNodes, resourceFlowNodes])
  const visibleOverviewKeyRef = useRef<string | null>(null)
  const publishVisibleOverview = (viewport = flowApi.getViewport()) => {
    if (!canvasSize.width || !canvasSize.height) return
    const view = { left: -viewport.x / viewport.zoom, top: -viewport.y / viewport.zoom, right: (canvasSize.width - viewport.x) / viewport.zoom, bottom: (canvasSize.height - viewport.y) / viewport.zoom }
    const ids = flowNodes.filter((node) => {
      const measured = flowStore.getState().nodeLookup.get(node.id)?.measured
      const width = measured?.width ?? (node.type === 'resource' ? SURFACE_VIEW.resourceNodeWidth : SURFACE_VIEW.factoryNodeWidth)
      const height = measured?.height ?? (node.type === 'resource' ? SURFACE_VIEW.resourceNodeHeight : SURFACE_VIEW.factoryNodeHeight)
      return node.position.x <= view.right && node.position.x + width >= view.left && node.position.y <= view.bottom && node.position.y + height >= view.top
    }).map((node) => node.id)
    const key = `${surfacePath}:${ids.join('|')}`
    if (key === visibleOverviewKeyRef.current) return
    visibleOverviewKeyRef.current = key
    onVisibleObjectIdsChange(ids)
  }
  useEffect(() => publishVisibleOverview(), [flowNodes, canvasSize, onVisibleObjectIdsChange])
  const interactionNodesRef = useRef(flowNodes)
  if (!activeInteraction) interactionNodesRef.current = flowNodes
  const renderedNodes = activeInteraction === 'box' ? interactionNodesRef.current
    : activeInteraction === 'drag' && dragPreview
      ? interactionNodesRef.current.map((node) => node.id === dragPreview.id ? { ...node, position: dragPreview.position } : node)
      : flowNodes
  const previewFactory = buildPreview && getFactory(buildPreview.factoryId)
  const previewNode: Node<FactoryNodeData> | null = previewFactory && buildPreview ? {
    id: 'surface-build-preview', type: 'factory', className: 'surface-build-preview',
    position: gridToCanvas(buildPreview.grid, SURFACE_VIEW.gridGap),
    initialWidth: SURFACE_VIEW.factoryNodeWidth, initialHeight: SURFACE_VIEW.factoryNodeHeight,
    data: { factory: previewFactory, node: { id: 'surface-build-preview', factoryId: previewFactory.id, surfaceId: surfacePath, ...buildPreview.grid, buffer: 0, progress: 0, status: 'idle' } },
    draggable: false, selectable: false, connectable: false, zIndex: 1000
  } : null
  const visibleIds = useMemo(() => new Set(flowNodes.map((node) => node.id)), [flowNodes])
  const flowEdges = useMemo(() => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]))
    return edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)).flatMap((edge) => {
      const target = nodeById.get(edge.target)
      const targetFactory = target && getFactory(target.factoryId)
      if (!target || !targetFactory) return []
      const resource = resourceById.get(edge.source)
      let targetHandle = itemHandleId('input', edge.itemId)
      if (resource) {
        if (targetFactory.id !== 'MiningStation' || resource.item !== edge.itemId || minedItemByNodeId.get(target.id) !== edge.itemId) return []
        targetHandle = depositHandleId
      } else {
        const source = nodeById.get(edge.source)
        const sourceFactory = source && getFactory(source.factoryId)
        if (!source || !sourceFactory || targetFactory.id === 'MiningStation'
          || !getFactoryPortItems(sourceFactory, source, minedItemByNodeId.get(source.id)).outputs.includes(edge.itemId)
          || !getFactoryPortItems(targetFactory, target).inputs.includes(edge.itemId)) return []
      }
      return [{ id: edge.id, source: edge.source, target: edge.target, sourceHandle: itemHandleId('output', edge.itemId), targetHandle, animated: true, type: 'smoothstep', style: { stroke: resolveItemColor(edge.itemId, getItem(edge.itemId)), strokeWidth: 2 }, label: edge.itemId, labelStyle: { fill: UI_COLORS.edgeLabel, fontSize: 10 }, labelBgStyle: { fill: UI_COLORS.edgeLabelBackground, fillOpacity: 0.92 } }]
    })
  }, [edges, visibleIds, nodes, resourceById, minedItemByNodeId])
  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return
    const resource = resourceById.get(connection.source)
    const source = nodes.find((node) => node.id === connection.source && node.surfaceId === surfacePath)
    const target = nodes.find((node) => node.id === connection.target && node.surfaceId === surfacePath)
    const sourceDef = source && getFactory(source.factoryId)
    const targetDef = target && getFactory(target.factoryId)
    const itemId = resource?.item ?? (source && sourceDef && getFactoryPortItems(sourceDef, source, minedItemByNodeId.get(source.id)).outputs.find((item) => connection.sourceHandle === itemHandleId('output', item)))
    const validResourceLink = resource && targetDef?.id === 'MiningStation' && connection.sourceHandle === itemHandleId('output', resource.item) && connection.targetHandle === depositHandleId
    const validFactoryLink = !resource && source && sourceDef && target && targetDef && targetDef.id !== 'MiningStation' && itemId && connection.sourceHandle === itemHandleId('output', itemId) && connection.targetHandle === itemHandleId('input', itemId) && getFactoryPortItems(targetDef, target).inputs.includes(itemId)
    if (!itemId || !(validResourceLink || validFactoryLink)) {
      onNotify('连接无效：端口物料类型不匹配')
      return
    }
    if (resource && edges.some((edge) => edge.target === target?.id && resourceById.has(edge.source) && edge.source !== resource.id)) {
      onNotify('开采站已绑定其他资源点')
      return
    }
    addEdgeToStore({ id: `edge-${connection.source}-${connection.target}-${itemId}`, source: connection.source, target: connection.target, itemId, flow: sourceDef?.rate ?? 1 })
    onNotify('物流链路已建立')
  }
  const zoomToLevel = (nextLevelIndex: number, cursor: { x: number; y: number }) => {
    if (nextLevelIndex === zoomLevelIndexRef.current) return
    const viewport = flowApi.getViewport()
    const worldPoint = { x: (cursor.x - viewport.x) / viewport.zoom, y: (cursor.y - viewport.y) / viewport.zoom }
    const nextZoom = SURFACE_VIEW.zoomLevels[nextLevelIndex]
    zoomLevelIndexRef.current = nextLevelIndex
    setZoomLevelIndex(nextLevelIndex)
    void flowApi.setViewport({ x: cursor.x - worldPoint.x * nextZoom, y: cursor.y - worldPoint.y * nextZoom, zoom: nextZoom }, { duration: SURFACE_VIEW.zoomAnimationMs, interpolate: 'linear' })
  }
  const stepZoom = (direction: -1 | 1, cursor: { x: number; y: number }) => {
    const nextLevelIndex = Math.min(SURFACE_VIEW.zoomLevels.length - 1, Math.max(0, zoomLevelIndexRef.current + direction))
    zoomToLevel(nextLevelIndex, cursor)
  }
  const onSurfaceWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!event.deltaY) return
    const now = performance.now()
    if (now - lastWheelAtRef.current < SURFACE_VIEW.wheelThrottleMs) return
    lastWheelAtRef.current = now
    const bounds = event.currentTarget.getBoundingClientRect()
    stepZoom(event.deltaY < 0 ? 1 : -1, { x: event.clientX - bounds.left, y: event.clientY - bounds.top })
  }
  const zoomFromControls = (direction: -1 | 1) => {
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (bounds) stepZoom(direction, { x: bounds.width / 2, y: bounds.height / 2 })
  }
  const fitAllAtZoomLevel = () => {
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds || !flowNodes.length) return
    const nodesBounds = flowApi.getNodesBounds(flowNodes)
    const paddedWidth = nodesBounds.width * (1 + SURFACE_VIEW.fitPadding * 2)
    const paddedHeight = nodesBounds.height * (1 + SURFACE_VIEW.fitPadding * 2)
    const fitZoom = Math.min(bounds.width / paddedWidth, bounds.height / paddedHeight)
    const levelIndex = SURFACE_VIEW.zoomLevels.reduce((closest, level, index) => level <= fitZoom ? index : closest, 0)
    zoomLevelIndexRef.current = levelIndex
    setZoomLevelIndex(levelIndex)
    void flowApi.setCenter(nodesBounds.x + nodesBounds.width / 2, nodesBounds.y + nodesBounds.height / 2, { zoom: SURFACE_VIEW.zoomLevels[levelIndex], duration: SURFACE_VIEW.zoomAnimationMs })
  }
  const onFlowSelectionEnd = () => {
    const selectedNodes = [...flowStore.getState().nodeLookup.values()].filter((node) => node.selected)
    setActiveInteraction(null)
    if (!selectedNodes.length) { select(null); return }
    selectedNodes.forEach((node, index) => select(node.id, node.type === 'resource' ? 'body' : 'factory', index > 0))
  }
  const onBuildDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingFactoryId || !event.dataTransfer.types.includes(SURFACE_FACTORY_DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    const grid = canvasToGrid(flowApi.screenToFlowPosition({ x: event.clientX, y: event.clientY }), SURFACE_VIEW.gridGap)
    setBuildPreview((current) => current?.factoryId === draggingFactoryId && current.grid.x === grid.x && current.grid.y === grid.y ? current : { factoryId: draggingFactoryId, grid })
  }
  const onBuildDrop = (event: DragEvent<HTMLDivElement>) => {
    const factoryId = event.dataTransfer.getData(SURFACE_FACTORY_DRAG_TYPE)
    if (!factoryId || factoryId !== draggingFactoryId || getFactory(factoryId)?.status !== '可用') return
    event.preventDefault()
    const grid = canvasToGrid(flowApi.screenToFlowPosition({ x: event.clientX, y: event.clientY }), SURFACE_VIEW.gridGap)
    addNode(factoryId, grid.x, grid.y)
    setBuildPreview(null)
    onNotify(`已部署 ${getFactory(factoryId)?.name ?? factoryId}`)
  }
  const onBuildDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setBuildPreview(null)
  }
  const updateCursorGrid = (client: { x: number; y: number }, viewport = flowApi.getViewport()) => {
    const bounds = canvasBoundsRef.current
    if (!bounds) return
    const grid = canvasToGrid({ x: (client.x - bounds.left - viewport.x) / viewport.zoom, y: (client.y - bounds.top - viewport.y) / viewport.zoom }, SURFACE_VIEW.gridGap)
    if (cursorGridRef.current?.x === grid.x && cursorGridRef.current?.y === grid.y) return
    cursorGridRef.current = grid
    if (cursorXRef.current) cursorXRef.current.textContent = String(grid.x)
    if (cursorYRef.current) cursorYRef.current.textContent = String(grid.y)
  }
  const updateIconScale = (zoom: number) => {
    const scale = Math.max(1, iconMinZoom / zoom)
    if (scale === iconScaleRef.current) return
    iconScaleRef.current = scale
    canvasRef.current?.style.setProperty('--surface-icon-scale', String(scale))
  }
  useEffect(() => updateIconScale(flowApi.getZoom()), [iconMinZoom])
  const onViewportMove = (_: unknown, viewport: { x: number; y: number; zoom: number }) => {
    updateIconScale(viewport.zoom)
    if (cursorClientRef.current) updateCursorGrid(cursorClientRef.current, viewport)
    publishVisibleOverview(viewport)
  }
  return <div ref={canvasRef} className="surface-canvas" onContextMenu={(event) => event.preventDefault()} onDragOver={onBuildDragOver} onDragLeave={onBuildDragLeave} onDrop={onBuildDrop} onPointerMove={(event) => { const client = { x: event.clientX, y: event.clientY }; cursorClientRef.current = client; updateCursorGrid(client) }} onPointerLeave={() => { cursorClientRef.current = null; cursorGridRef.current = null; if (cursorXRef.current) cursorXRef.current.textContent = '—'; if (cursorYRef.current) cursorYRef.current.textContent = '—' }}>
    <div className="surface-backdrop" /><div className="scene-label"><span className="scene-kicker">SURFACE / {surfacePath}</span><strong>{surfaceName} · 地表生产区</strong></div>
    <div className="viewport-hud"><div className="hud-pill"><span className="live-dot" />X <span ref={cursorXRef}>—</span> <span>·</span> Y <span ref={cursorYRef}>—</span></div></div>
    <ReactFlow nodes={previewNode ? [...renderedNodes, previewNode] : renderedNodes} edges={flowEdges as Edge[]} nodeTypes={nodeTypes} onWheel={onSurfaceWheel} onMove={onViewportMove} onNodeClick={(event, node) => { event.stopPropagation(); select(node.id, node.type === 'resource' ? 'body' : 'factory', event.ctrlKey || event.metaKey); setContext(null) }} onSelectionStart={() => { interactionNodesRef.current = flowNodes.map((node) => ({ ...node, selected: false })); setActiveInteraction('box') }} onSelectionEnd={onFlowSelectionEnd} selectionMode={SelectionMode.Partial} multiSelectionKeyCode="Control" selectNodesOnDrag={false} onNodeDragStart={(_, node) => { interactionNodesRef.current = flowNodes.map((item) => item.id === node.id ? { ...item, position: node.position } : item); setDragPreview({ id: node.id, position: node.position }); setActiveInteraction('drag') }} onNodeDrag={(_, node) => setDragPreview({ id: node.id, position: node.position })} onNodeDragStop={(_, node) => { if (node.type !== 'resource') { const grid = canvasToGrid(node.position, SURFACE_VIEW.gridGap); moveNode(node.id, grid.x, grid.y) } setDragPreview(null); setActiveInteraction(null) }} onConnect={onConnect} onPaneClick={(event) => { if (!event.shiftKey) select(null); setContext(null) }} onNodeContextMenu={(event, node) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY, nodeId: node.id }); select(node.id, node.type === 'resource' ? 'body' : 'factory') }} onPaneContextMenu={(event) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY }) }} panOnDrag={[2]} selectionKeyCode="Shift" snapToGrid snapGrid={[SURFACE_VIEW.gridGap, SURFACE_VIEW.gridGap]} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} defaultViewport={{ x: 0, y: 0, zoom: SURFACE_VIEW.initialZoom }} onInit={(instance) => { const first = flowNodes.find((node) => node.type === 'factory') ?? flowNodes[0]; if (!first) return; const width = first.type === 'resource' ? SURFACE_VIEW.resourceNodeWidth : SURFACE_VIEW.factoryNodeWidth; const height = first.type === 'resource' ? SURFACE_VIEW.resourceNodeHeight : SURFACE_VIEW.factoryNodeHeight; void instance.setCenter(first.position.x + width / 2, first.position.y + height / 2, { zoom: SURFACE_VIEW.initialZoom }) }} minZoom={SURFACE_VIEW.minZoom} maxZoom={SURFACE_VIEW.maxZoom} onlyRenderVisibleElements proOptions={{ hideAttribution: true }}>
      <Background color={UI_COLORS.surfaceGrid} gap={SURFACE_VIEW.gridGap} size={SURFACE_VIEW.gridSize} /><SurfaceOrigin /><Controls showZoom={false} showFitView={false} showInteractive={false}>
        <ControlButton onClick={() => zoomFromControls(1)} disabled={zoomLevelIndex === SURFACE_VIEW.zoomLevels.length - 1} title="放大一档" aria-label="放大一档"><Plus size={14} /></ControlButton>
        <ControlButton onClick={() => zoomFromControls(-1)} disabled={zoomLevelIndex === 0} title="缩小一档" aria-label="缩小一档"><Minus size={14} /></ControlButton>
        <ControlButton onClick={fitAllAtZoomLevel} title="适应全部" aria-label="适应全部"><Maximize2 size={14} /></ControlButton>
      </Controls><MiniMap nodeColor={(node) => (node.data as FactoryNodeData).factory?.color ?? UI_COLORS.station} maskColor={UI_COLORS.minimapMask} />
    </ReactFlow>
    <div className="surface-footer"><span>{flowNodes.length} 个实体 · {flowEdges.length} 条链路</span><span>{Number((SURFACE_VIEW.zoomLevels[zoomLevelIndex] * 100).toFixed(3))}%</span></div>
    {context && <div className="context-menu" style={{ left: context.x, top: context.y }}><small>CONTEXUAL ACTIONS</small>{context.nodeId ? <><button onClick={() => onNotify('已打开物流配置')}><GitBranch size={ICON_SIZES.category} />配置物流 <kbd>L</kbd></button><button onClick={() => onNotify('配方面板已锁定到右侧')}><SlidersHorizontal size={ICON_SIZES.category} />查看配方 <kbd>R</kbd></button><button onClick={() => { removeNode(context.nodeId!); setContext(null) }} className="danger"><Trash2 size={ICON_SIZES.category} />拆除设备 <kbd>Del</kbd></button></> : <button onClick={() => { onNotify('已聚焦全部设备'); setContext(null) }}><Maximize2 size={ICON_SIZES.category} />聚焦全部设备</button>}</div>}
    <div className="surface-tip"><MouseIcon />从底栏拖出设备建造 <span>·</span> 右键拖动画布 <span>·</span> 滚轮缩放 <span>·</span> 端口连线</div>
  </div>
}

function MouseIcon() {
  return <span className="mouse-icon"><span /></span>
}

function SurfaceOrigin() {
  const zoom = useStore((state) => state.transform[2])
  return <ViewportPortal><svg className="surface-origin" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }} width={1} height={1} aria-hidden="true">
    <circle cx={0} cy={0} r={4 / zoom} /><text x={9 / zoom} y={-9 / zoom} fontSize={11 / zoom}>(0, 0)</text>
  </svg></ViewportPortal>
}
