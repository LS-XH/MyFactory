import { useMemo, useState, type WheelEvent } from 'react'
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Box, GitBranch, Maximize2, SlidersHorizontal, Trash2 } from 'lucide-react'
import { SURFACE_VIEW } from '../../config/gameplay'
import { ICON_SIZES, UI_COLORS } from '../../config/visualTokens'
import { content, getFactory, getItem, type FactoryDefinition, type FactoryNodeState } from '../../domain/content'
import { getResourcePoints } from '../../domain/spaceMap'
import { useGameStore } from '../../state/gameStore'
import { resolveFactoryIcon } from '../../shared/icons/iconRegistry'

type FactoryNodeData = { factory: FactoryDefinition; node: FactoryNodeState }

function FactoryNode({ data, selected }: NodeProps<Node<FactoryNodeData>>) {
  const factory = data.factory
  const Icon = resolveFactoryIcon(content.factoryTypes.find((type) => type.id === factory.type)?.icon)
  return <div className={`factory-node ${selected ? 'is-selected' : ''} ${data.node.status}`} style={{ '--node-color': factory.color } as React.CSSProperties}>
    <Handle type="target" position={Position.Left} className="flow-handle target" /><div className="node-top"><span className="node-icon"><Icon size={ICON_SIZES.node} /></span><span className="node-type">{content.factoryTypes.find((type) => type.id === factory.type)?.label}</span><span className="node-menu">•••</span></div><strong>{factory.name}</strong><div className="node-metric"><span>{data.node.status === 'blocked' ? '物流堵塞' : data.node.status === 'online' ? '运行中' : '待机'}</span><span>{factory.rate ? `${factory.rate.toFixed(1)} /s` : '—'}</span></div><div className="node-progress"><span style={{ width: `${Math.max(8, data.node.progress * 100)}%` }} /></div><div className="node-buffer"><Box size={12} /> {data.node.buffer.toFixed(0)} / {factory.capacity ?? 20}</div><Handle type="source" position={Position.Right} className="flow-handle source" />
  </div>
}

function ResourceNode({ data, selected }: NodeProps<Node<{ resource: ReturnType<typeof getResourcePoints>[number] }>>) {
  return <div className={`resource-node ${selected ? 'is-selected' : ''}`}><span className="resource-pulse" /><div><strong>{data.resource.resourceTypeName}</strong><small>{data.resource.item} · {data.resource.reserves.toLocaleString()} t</small></div></div>
}

const nodeTypes = { factory: FactoryNode, resource: ResourceNode }

export function SurfaceView(props: { planet: string; onNotify: (message: string) => void }) {
  return <ReactFlowProvider><SurfaceFlowView {...props} /></ReactFlowProvider>
}

function SurfaceFlowView({ planet, onNotify }: { planet: string; onNotify: (message: string) => void }) {
  const nodes = useGameStore((state) => state.nodes)
  const edges = useGameStore((state) => state.edges)
  const selectedId = useGameStore((state) => state.selectedId)
  const select = useGameStore((state) => state.select)
  const moveNode = useGameStore((state) => state.moveNode)
  const addEdgeToStore = useGameStore((state) => state.addEdge)
  const removeNode = useGameStore((state) => state.removeNode)
  const flowApi = useReactFlow()
  const [context, setContext] = useState<{ x: number; y: number; nodeId?: string } | null>(null)
  const resourcePoints = useMemo(() => getResourcePoints('Solar', planet === 'aurelia' ? 'Earth' : planet), [planet])
  const flowNodes = useMemo(() => {
    const factoryNodes = nodes.map((node) => ({ id: node.id, type: 'factory', position: { x: node.x, y: node.y }, data: { factory: getFactory(node.factoryId)!, node }, selected: selectedId === node.id }))
    const resources = resourcePoints.map((resource, index) => ({ id: resource.id, type: 'resource', position: { x: 470 + resource.position.x * 0.55, y: 380 - resource.position.y * 0.55 - index * 8 }, data: { resource }, draggable: false, selectable: true, selected: selectedId === resource.id }))
    return [...factoryNodes, ...resources]
  }, [nodes, selectedId, resourcePoints])
  const flowEdges = useMemo(() => edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, animated: true, type: 'smoothstep', style: { stroke: getItem(edge.itemId)?.color ?? UI_COLORS.logistics, strokeWidth: 2 }, label: `${edge.flow.toFixed(1)} /s`, labelStyle: { fill: UI_COLORS.edgeLabel, fontSize: 10 }, labelBgStyle: { fill: UI_COLORS.edgeLabelBackground, fillOpacity: 0.92 } })), [edges])
  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return
    const source = nodes.find((node) => node.id === connection.source)
    const target = nodes.find((node) => node.id === connection.target)
    const sourceDef = source && getFactory(source.factoryId)
    const targetDef = target && getFactory(target.factoryId)
    const itemId = sourceDef?.outputs?.[0] ?? 'iron-ingot'
    if (!sourceDef?.outputs?.some((id) => targetDef?.inputs?.includes(id))) {
      onNotify('连接无效：端口物料类型不匹配')
      return
    }
    addEdgeToStore({ id: `edge-${connection.source}-${connection.target}`, source: connection.source, target: connection.target, itemId, flow: sourceDef.rate ?? 1 })
    onNotify('物流链路已建立')
  }
  const onSurfaceWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const viewport = flowApi.getViewport()
    const bounds = event.currentTarget.getBoundingClientRect()
    const cursor = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    const worldPoint = { x: (cursor.x - viewport.x) / viewport.zoom, y: (cursor.y - viewport.y) / viewport.zoom }
    const nextZoom = Math.min(SURFACE_VIEW.maxZoom, Math.max(SURFACE_VIEW.minZoom, viewport.zoom * Math.exp(-event.deltaY * SURFACE_VIEW.wheelSensitivity)))
    void flowApi.setViewport({ x: cursor.x - worldPoint.x * nextZoom, y: cursor.y - worldPoint.y * nextZoom, zoom: nextZoom }, { duration: SURFACE_VIEW.zoomAnimationMs })
  }
  return <div className="surface-canvas" onContextMenu={(event) => event.preventDefault()}>
    <div className="surface-backdrop" /><div className="scene-label"><span className="scene-kicker">SURFACE / AURELIA-01</span><strong>奥瑞利亚 · 生产区 A-03</strong><small>昼面 · 北纬 18.2° · 工业许可等级 IV</small></div>
    <div className="surface-grid-label"><span>生产网络 / NETWORK 03</span><span className="cyan">{nodes.length} 个实体 · {edges.length} 条链路</span></div>
    <ReactFlow nodes={flowNodes} edges={flowEdges as Edge[]} nodeTypes={nodeTypes} onWheel={onSurfaceWheel} onNodeClick={(_, node) => { select(node.id, node.type === 'resource' ? 'body' : 'factory'); setContext(null) }} onNodeDragStop={(_, node) => { if (node.type !== 'resource') moveNode(node.id, node.position.x, node.position.y) }} onConnect={onConnect} onPaneClick={() => { select(null); setContext(null) }} onNodeContextMenu={(event, node) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY, nodeId: node.id }); select(node.id, node.type === 'resource' ? 'body' : 'factory') }} onPaneContextMenu={(event) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY }) }} panOnDrag={[2]} zoomOnScroll={false} fitView fitViewOptions={{ padding: SURFACE_VIEW.fitPadding }} minZoom={SURFACE_VIEW.minZoom} maxZoom={SURFACE_VIEW.maxZoom} proOptions={{ hideAttribution: true }}>
      <Background color={UI_COLORS.surfaceGrid} gap={SURFACE_VIEW.gridGap} size={SURFACE_VIEW.gridSize} /><Controls showInteractive={false} /><MiniMap nodeColor={(node) => (node.data as FactoryNodeData).factory?.color ?? UI_COLORS.station} maskColor={UI_COLORS.minimapMask} />
    </ReactFlow>
    <div className="surface-status"><span className="status-dot" />网格同步 <span className="muted">·</span> 带宽 72% <span className="muted">·</span> 电网余量 14%</div>
    {context && <div className="context-menu" style={{ left: context.x, top: context.y }}><small>CONTEXUAL ACTIONS</small>{context.nodeId ? <><button onClick={() => onNotify('已打开物流配置')}><GitBranch size={ICON_SIZES.category} />配置物流 <kbd>L</kbd></button><button onClick={() => onNotify('配方面板已锁定到右侧')}><SlidersHorizontal size={ICON_SIZES.category} />查看配方 <kbd>R</kbd></button><button onClick={() => { removeNode(context.nodeId!); setContext(null) }} className="danger"><Trash2 size={ICON_SIZES.category} />拆除设备 <kbd>Del</kbd></button></> : <button onClick={() => { onNotify('已聚焦全部设备'); setContext(null) }}><Maximize2 size={ICON_SIZES.category} />聚焦全部设备</button>}</div>}
    <div className="surface-tip"><MouseIcon />右键拖动画布 <span>·</span> 滚轮缩放 <span>·</span> 从节点端口拖出连线</div>
  </div>
}

function MouseIcon() {
  return <span className="mouse-icon"><span /></span>
}

