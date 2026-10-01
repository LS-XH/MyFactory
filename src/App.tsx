import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, Box, ChevronDown, CircleHelp, Factory, Gauge, GitBranch,
  Layers3, Map, Maximize2, MoreHorizontal, Orbit, Package, Pickaxe, Plus, Radio,
  Rocket, Settings, Shield, SlidersHorizontal, Sparkles, Target, Trash2, Triangle,
  Truck, Waves, X, Zap
} from 'lucide-react'
import { ReactFlow, Background, Controls, Handle, MiniMap, Position, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { content, getFactory, getItem, getRecipe, type FactoryDefinition, type FactoryNodeState } from './domain/content'
import { useGameStore, type OverlayId } from './state/gameStore'

const iconMap: Record<string, typeof Factory> = { zap: Zap, pickaxe: Pickaxe, factory: Factory, route: GitBranch, rocket: Rocket, orbit: Orbit }

function App() {
  const scene = useGameStore((state) => state.scene)
  const speed = useGameStore((state) => state.speed)
  const overlay = useGameStore((state) => state.overlay)
  const selectedId = useGameStore((state) => state.selectedId)
  const orbitAnimation = useGameStore((state) => state.orbitAnimation)
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const select = useGameStore((state) => state.select)
  const setScene = useGameStore((state) => state.setScene)
  const setOverlay = useGameStore((state) => state.setOverlay)
  const tick = useGameStore((state) => state.tick)
  const setZoomLevel = useGameStore((state) => state.setZoomLevel)
  const zoomLevel = useGameStore((state) => state.zoomLevel)
  const [toast, setToast] = useState('系统链路已连接')

  useEffect(() => {
    const timer = window.setInterval(tick, 100)
    return () => window.clearInterval(timer)
  }, [tick])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  return <div className="app-shell" style={{ '--ui-scale': zoomLevel } as React.CSSProperties}>
    <header className="topbar">
      <div className="brand-mark"><span className="brand-glyph">HX</span><div><strong>HELIX</strong><small>INDUSTRIAL COMMAND</small></div></div>
      <div className="breadcrumb"><span className="muted">总览</span><span className="slash">/</span><span>{scene === 'system' ? '猎户门 · 07' : '奥瑞利亚 · 地表'}</span>{scene === 'surface' && <><span className="slash">/</span><span className="cyan">生产区 A-03</span></>}</div>
      <div className="top-actions">
        <TopButton icon={Settings} label="设置" onClick={() => setOverlay('settings')} />
        <TopButton icon={Sparkles} label="科技树" onClick={() => setOverlay('tech')} />
        <TopButton icon={Map} label="星图" onClick={() => {
          if (scene === 'surface') {
            setScene('system')
            select(null)
            setOverlay(null)
            notify('已返回猎户门 · 07 星图')
          } else {
            setOverlay('map')
          }
        }} />
      </div>
    </header>

    <aside className="panel left-panel">
      <PanelTitle eyebrow="COMMAND / 01" title="总览" icon={Layers3} />
      <div className="tab-row"><button className="tab active">资产</button><button className="tab">对象</button><button className="tab">生产</button></div>
      <div className="asset-summary"><div><span className="label">可用功率</span><strong>1.24 GW</strong></div><div className="power-ring"><span>86%</span></div></div>
      <div className="section-label">{scene === 'system' ? '轨道资产' : '生产区实体'} <span>{scene === 'system' ? '03' : `${useGameStore.getState().nodes.length}`}</span></div>
      {scene === 'system' ? <SystemAssetList onSelect={select} selectedId={selectedId} onEnterSurface={(id) => { useGameStore.getState().enterSurface(id); notify('已进入奥瑞利亚地表视图') }} /> : <FactoryAssetList onSelect={select} selectedId={selectedId} />}
      <div className="panel-footer"><span className="status-dot" />同步稳定 <span className="muted">·</span> 24 ms</div>
    </aside>

    <main className="viewport">
      {scene === 'system' ? <SystemView selectedId={selectedId} orbitAnimation={orbitAnimation} onSelect={select} onEnterSurface={(id) => { useGameStore.getState().enterSurface(id); notify('已进入奥瑞利亚地表视图') }} /> : <SurfaceView planet={surfacePlanet} onNotify={notify} />}
      <div className="viewport-hud"><div className="hud-pill"><span className="live-dot" />LIVE / SIMULATION</div><div className="hud-pill coordinates">X 042.18 <span>·</span> Y -118.04 <span>·</span> Z 003</div></div>
      <div className="zoom-control"><button onClick={() => setZoomLevel(zoomLevel + 0.05)}>+</button><span>{Math.round(zoomLevel * 100)}%</span><button onClick={() => setZoomLevel(zoomLevel - 0.05)}>−</button></div>
    </main>

    <aside className="panel right-panel">
      <Inspector selectedId={selectedId} scene={scene} onClose={() => select(null)} onNotify={notify} onEnterSurface={(id) => { useGameStore.getState().enterSurface(id); notify('已进入奥瑞利亚地表视图') }} />
    </aside>

    <BottomBar scene={scene} selectedId={selectedId} speed={speed} onSpeed={setSpeed} onScene={setScene} onAdd={(factoryId) => { useGameStore.getState().addNode(factoryId); notify(`已部署 ${getFactory(factoryId)?.name ?? factoryId}`) }} />
    {overlay && <Overlay id={overlay} onClose={() => setOverlay(null)} onNotify={notify} />}
    {toast && <div className="toast"><span className="status-dot" />{toast}</div>}
  </div>
}

function TopButton({ icon: Icon, label, onClick }: { icon: typeof Settings; label: string; onClick: () => void }) { return <button className="top-button" onClick={onClick}><Icon size={16} /><span>{label}</span></button> }
function PanelTitle({ eyebrow, title, icon: Icon }: { eyebrow: string; title: string; icon: typeof Layers3 }) { return <div className="panel-title"><Icon size={17} /><div><small>{eyebrow}</small><h2>{title}</h2></div><button className="icon-button"><MoreHorizontal size={16} /></button></div> }

function SystemAssetList({ onSelect, selectedId, onEnterSurface }: { onSelect: (id: string, kind: 'body' | 'station' | 'ship') => void; selectedId: string | null; onEnterSurface: (id: string) => void }) {
  const assets = [{ id: 'aurelia', name: '奥瑞利亚', meta: '类地行星 · 已殖民', color: '#f2a65a', kind: 'body' as const }, { id: 'station-horizon', name: '地平线 · 铁壁', meta: '空间站 · 人类联邦', color: '#53d5c4', kind: 'station' as const }, { id: 'ship-imicus', name: '伊米卡斯级 · 侦察 01', meta: '护卫舰 · 运行中', color: '#b18cff', kind: 'ship' as const }]
  return <div className="asset-list">{assets.map((asset) => <button className={`asset-item ${selectedId === asset.id ? 'selected' : ''}`} key={asset.id} onClick={() => onSelect(asset.id, asset.kind)} onDoubleClick={() => asset.kind === 'body' && onEnterSurface(asset.id)}><span className="asset-icon" style={{ '--asset-color': asset.color } as React.CSSProperties}>{asset.kind === 'body' ? <Orbit size={16} /> : asset.kind === 'station' ? <Radio size={16} /> : <Rocket size={16} />}</span><span className="asset-copy"><strong>{asset.name}</strong><small>{asset.meta}</small></span><span className="item-arrow">›</span></button>)}</div>
}
function FactoryAssetList({ onSelect, selectedId }: { onSelect: (id: string, kind: 'factory') => void; selectedId: string | null }) { const nodes = useGameStore((state) => state.nodes); return <div className="asset-list">{nodes.map((node) => { const factory = getFactory(node.factoryId); return <button className={`asset-item ${selectedId === node.id ? 'selected' : ''}`} key={node.id} onClick={() => onSelect(node.id, 'factory')}><span className="asset-icon" style={{ '--asset-color': factory?.color } as React.CSSProperties}><Factory size={16} /></span><span className="asset-copy"><strong>{factory?.name}</strong><small>{node.status === 'blocked' ? '物流堵塞' : node.status === 'online' ? '运行中' : '待机'} · {node.buffer.toFixed(0)} 单位</small></span><span className={`mini-status ${node.status}`} /></button> })}</div> }

function SystemView({ selectedId, orbitAnimation, onSelect, onEnterSurface }: { selectedId: string | null; orbitAnimation: boolean; onSelect: (id: string, kind: 'body' | 'station' | 'ship') => void; onEnterSurface: (id: string) => void }) {
  const [time, setTime] = useState(0)
  useEffect(() => { if (!orbitAnimation) return; const id = window.setInterval(() => setTime((value) => value + 1), 80); return () => window.clearInterval(id) }, [orbitAnimation])
  const bodies = content.starSystem.bodies
  const orbitRadius = [138, 218, 304]
  return <div className="system-canvas">
    <div className="scene-label"><span className="scene-kicker">SYSTEM VIEW / SG-07</span><strong>{content.starSystem.name}</strong><small>{content.starSystem.subtitle}</small></div>
    <svg className="system-svg" viewBox="0 0 1000 760" onContextMenu={(event) => event.preventDefault()}>
      <defs><radialGradient id="starGlow"><stop offset="0" stopColor="#fff7cf" /><stop offset=".35" stopColor="#f7c85b" stopOpacity=".9" /><stop offset="1" stopColor="#f7c85b" stopOpacity="0" /></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="12" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      {[0, 1, 2].map((index) => <circle key={index} className="orbit-line" cx="500" cy="380" r={orbitRadius[index]} />)}
      <g className="star-group"><circle cx="500" cy="380" r="92" fill="url(#starGlow)" opacity=".22" /><circle cx="500" cy="380" r="42" fill="#f7c85b" filter="url(#glow)" /><text x="500" y="382" className="star-label">OG-A</text></g>
      {bodies.map((body, index) => { const angle = ((time * (index + 1) * 0.4 + index * 116) * Math.PI) / 180; const x = 500 + Math.cos(angle) * orbitRadius[index]; const y = 380 + Math.sin(angle) * orbitRadius[index]; const selected = selectedId === body.id; return <g key={body.id} className={`body-group ${selected ? 'selected' : ''}`} onClick={() => onSelect(body.id, 'body')} onDoubleClick={() => body.hasSurface && onEnterSurface(body.id)}><circle cx={x} cy={y} r={selected ? 28 : 22} className="body-hit" /><circle cx={x} cy={y} r={selected ? 15 : 11} fill={body.color} /><circle cx={x - 4} cy={y - 4} r="3" fill="#fff" opacity=".36" /><text x={x + 26} y={y + 4} className="body-label">{body.name}</text>{selected && <text x={x + 26} y={y + 20} className="body-meta">双击进入地表</text>}</g> })}
      <g className={`space-entity ${selectedId === 'station-horizon' ? 'selected' : ''}`} onClick={() => onSelect('station-horizon', 'station')}><circle cx="346" cy="262" r="19" className="entity-ring" /><path d="M336 262h20M346 252v20" /><text x="370" y="267" className="entity-label">地平线 · 铁壁</text></g>
      <g className={`space-entity ship-entity ${selectedId === 'ship-imicus' ? 'selected' : ''}`} onClick={() => onSelect('ship-imicus', 'ship')}><path d="M641 467l29-9-16 17-24 2z" /><circle cx="650" cy="466" r="16" className="entity-ring" /><text x="677" y="470" className="entity-label">侦察 01</text></g>
    </svg>
    <div className="system-legend"><span><i className="legend-dot star" />恒星</span><span><i className="legend-dot planet" />行星</span><span><i className="legend-dot station" />友方资产</span></div>
    <div className="time-card"><div className="time-card-head"><span>轨道时间</span><span className="cyan">DAY 842.16</span></div><strong>06:42:18</strong><div className="time-line"><span style={{ width: '64%' }} /></div><small>UTC+02:00 · 模拟速率 1×</small></div>
  </div>
}

type FactoryNodeData = { factory: FactoryDefinition; node: FactoryNodeState }
function FactoryNode({ data, selected }: NodeProps<Node<FactoryNodeData>>) {
  const factory = data.factory
  const icon = iconMap[content.factoryTypes.find((type) => type.id === factory.type)?.icon ?? 'factory'] ?? Factory
  const Icon = icon
  return <div className={`factory-node ${selected ? 'is-selected' : ''} ${data.node.status}`} style={{ '--node-color': factory.color } as React.CSSProperties}>
    <Handle type="target" position={Position.Left} className="flow-handle target" /><div className="node-top"><span className="node-icon"><Icon size={15} /></span><span className="node-type">{content.factoryTypes.find((type) => type.id === factory.type)?.label}</span><span className="node-menu">•••</span></div><strong>{factory.name}</strong><div className="node-metric"><span>{data.node.status === 'blocked' ? '物流堵塞' : data.node.status === 'online' ? '运行中' : '待机'}</span><span>{factory.rate ? `${factory.rate.toFixed(1)} /s` : '—'}</span></div><div className="node-progress"><span style={{ width: `${Math.max(8, data.node.progress * 100)}%` }} /></div><div className="node-buffer"><Box size={12} /> {data.node.buffer.toFixed(0)} / {factory.capacity ?? 20}</div><Handle type="source" position={Position.Right} className="flow-handle source" />
  </div>
}
const nodeTypes = { factory: FactoryNode }

function SurfaceView({ planet, onNotify }: { planet: string; onNotify: (message: string) => void }) {
  const nodes = useGameStore((state) => state.nodes)
  const edges = useGameStore((state) => state.edges)
  const selectedId = useGameStore((state) => state.selectedId)
  const select = useGameStore((state) => state.select)
  const moveNode = useGameStore((state) => state.moveNode)
  const addEdgeToStore = useGameStore((state) => state.addEdge)
  const removeNode = useGameStore((state) => state.removeNode)
  const [context, setContext] = useState<{ x: number; y: number; nodeId?: string } | null>(null)
  const flowNodes = useMemo(() => nodes.map((node) => ({ id: node.id, type: 'factory', position: { x: node.x, y: node.y }, data: { factory: getFactory(node.factoryId)!, node }, selected: selectedId === node.id })), [nodes, selectedId])
  const flowEdges = useMemo(() => edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, animated: true, type: 'smoothstep', style: { stroke: getItem(edge.itemId)?.color ?? '#6da9ff', strokeWidth: 2 }, label: `${edge.flow.toFixed(1)} /s`, labelStyle: { fill: '#a9bad0', fontSize: 10 }, labelBgStyle: { fill: '#0c131d', fillOpacity: .92 } })), [edges])
  const onConnect = (connection: Connection) => { if (!connection.source || !connection.target) return; const source = nodes.find((node) => node.id === connection.source); const target = nodes.find((node) => node.id === connection.target); const sourceDef = source && getFactory(source.factoryId); const targetDef = target && getFactory(target.factoryId); const itemId = sourceDef?.outputs?.[0] ?? 'iron-ingot'; if (!sourceDef?.outputs?.some((id) => targetDef?.inputs?.includes(id))) { onNotify('连接无效：端口物料类型不匹配'); return } addEdgeToStore({ id: `edge-${connection.source}-${connection.target}`, source: connection.source, target: connection.target, itemId, flow: sourceDef.rate ?? 1 }); onNotify('物流链路已建立') }
  return <div className="surface-canvas" onContextMenu={(event) => event.preventDefault()}>
    <div className="surface-backdrop" /><div className="scene-label"><span className="scene-kicker">SURFACE / AURELIA-01</span><strong>奥瑞利亚 · 生产区 A-03</strong><small>昼面 · 北纬 18.2° · 工业许可等级 IV</small></div>
    <div className="surface-grid-label"><span>生产网络 / NETWORK 03</span><span className="cyan">{nodes.length} 个实体 · {edges.length} 条链路</span></div>
    <ReactFlow nodes={flowNodes} edges={flowEdges as Edge[]} nodeTypes={nodeTypes} onNodeClick={(_, node) => { select(node.id, 'factory'); setContext(null) }} onNodeDragStop={(_, node) => moveNode(node.id, node.position.x, node.position.y)} onConnect={onConnect} onPaneClick={() => { select(null); setContext(null) }} onNodeContextMenu={(event, node) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY, nodeId: node.id }); select(node.id, 'factory') }} onPaneContextMenu={(event) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY }) }} panOnDrag={[2]} zoomOnScroll fitView fitViewOptions={{ padding: .3 }} minZoom={.55} maxZoom={1.5} proOptions={{ hideAttribution: true }}>
      <Background color="#1a2b3a" gap={32} size={1} /><Controls showInteractive={false} /><MiniMap nodeColor={(node) => (node.data as FactoryNodeData).factory?.color ?? '#53d5c4'} maskColor="rgba(7,12,18,.8)" />
    </ReactFlow>
    <div className="surface-status"><span className="status-dot" />网格同步 <span className="muted">·</span> 带宽 72% <span className="muted">·</span> 电网余量 14%</div>
    {context && <div className="context-menu" style={{ left: context.x, top: context.y }}><small>CONTEXUAL ACTIONS</small>{context.nodeId ? <><button onClick={() => onNotify('已打开物流配置')}><GitBranch size={14} />配置物流 <kbd>L</kbd></button><button onClick={() => onNotify('配方面板已锁定到右侧')}><SlidersHorizontal size={14} />查看配方 <kbd>R</kbd></button><button onClick={() => { removeNode(context.nodeId!); setContext(null) }} className="danger"><Trash2 size={14} />拆除设备 <kbd>Del</kbd></button></> : <button onClick={() => { onNotify('已聚焦全部设备'); setContext(null) }}><Maximize2 size={14} />聚焦全部设备</button>}</div>}
    <div className="surface-tip"><MouseIcon />右键拖动画布 <span>·</span> 滚轮缩放 <span>·</span> 从节点端口拖出连线</div>
  </div>
}
function MouseIcon() { return <span className="mouse-icon"><span /></span> }

function Inspector({ selectedId, scene, onClose, onNotify, onEnterSurface }: { selectedId: string | null; scene: 'system' | 'surface'; onClose: () => void; onNotify: (message: string) => void; onEnterSurface: (id: string) => void }) {
  const nodes = useGameStore((state) => state.nodes)
  const node = nodes.find((item) => item.id === selectedId)
  const factory = node && getFactory(node.factoryId)
  const body = content.starSystem.bodies.find((item) => item.id === selectedId)
  const station = selectedId === 'station-horizon'
  const ship = selectedId === 'ship-imicus'
  const title = factory?.name ?? body?.name ?? (station ? '地平线 · 铁壁' : ship ? '伊米卡斯级' : '对象')
  return <>{selectedId ? <><div className="inspector-head"><div><small>OBJECT INSPECTOR / 04</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={16} /></button></div><div className="inspector-tabs"><button className="active">详情</button><button>配置</button><button>日志</button></div>{factory ? <FactoryInspector node={node!} factory={factory} onNotify={onNotify} /> : <SpaceInspector body={body} station={station} ship={ship} onEnterSurface={onEnterSurface} />}</> : <EmptyInspector scene={scene} />}</>
}
function EmptyInspector({ scene }: { scene: 'system' | 'surface' }) { return <div className="empty-inspector"><div className="crosshair"><Target size={21} /></div><strong>未选择对象</strong><p>{scene === 'system' ? '选择恒星系内的资产查看详细状态' : '选择生产设备查看配方、库存与操作'}</p><div className="empty-divider" /><small>TIP 右键对象可快速调用操作菜单</small></div> }
function FactoryInspector({ node, factory, onNotify }: { node: FactoryNodeState; factory: FactoryDefinition; onNotify: (message: string) => void }) { const recipe = factory.recipe ? getRecipe(factory.recipe) : null; return <div className="inspector-content"><div className="object-identity"><span className="large-object-icon" style={{ '--node-color': factory.color } as React.CSSProperties}><Factory size={25} /></span><div><strong>{factory.name}</strong><small>{content.factoryTypes.find((type) => type.id === factory.type)?.label} · NODE-{node.id.slice(-3).toUpperCase()}</small></div><span className={`status-tag ${node.status}`}>{node.status === 'online' ? '运行中' : node.status === 'blocked' ? '堵塞' : '待机'}</span></div><div className="metric-grid"><Metric label="生产进度" value={`${Math.round(node.progress * 100)}%`} /><Metric label="缓存库存" value={`${node.buffer.toFixed(0)} / ${factory.capacity ?? 20}`} /><Metric label="输入速率" value={`${factory.rate?.toFixed(1) ?? '—'} /s`} /><Metric label="功率负载" value={factory.power ? `${factory.power} kW` : '—'} /></div>{recipe && <div className="recipe-card"><div className="card-heading"><span>当前配方</span><button onClick={() => onNotify('配方已置顶到操作台')}><Maximize2 size={13} /></button></div><strong>{recipe.name}</strong><div className="recipe-flow"><ItemChip itemId={recipe.inputs[0].item} amount={recipe.inputs[0].amount} /><span>→</span><ItemChip itemId={recipe.outputs[0].item} amount={recipe.outputs[0].amount} /></div><small>周期 {recipe.duration}s · 自动运行</small></div>}<div className="inspector-actions"><button onClick={() => onNotify('物流配置已打开')}><GitBranch size={15} />配置物流</button><button onClick={() => onNotify('设备已切换为维护模式')}><SlidersHorizontal size={15} />维护模式</button></div></div> }
function SpaceInspector({ body, station, ship, onEnterSurface }: { body?: any; station: boolean; ship: boolean; onEnterSurface: (id: string) => void }) { const title = body?.name ?? (station ? '地平线 · 铁壁' : '伊米卡斯级 · 侦察 01'); return <div className="inspector-content"><div className="object-identity"><span className="large-object-icon" style={{ '--node-color': body?.color ?? (station ? '#53d5c4' : '#b18cff') } as React.CSSProperties}>{body ? <Orbit size={25} /> : station ? <Radio size={25} /> : <Rocket size={25} />}</span><div><strong>{title}</strong><small>{body ? '行星 · 可进入地表' : station ? 'Fortizar · 人类联邦' : '护卫舰 · 运行中'}</small></div><span className="status-tag online">在线</span></div><div className="stat-block"><div className="stat-row"><span>护盾完整度</span><strong>100%</strong></div><div className="stat-line"><span style={{ width: '100%', background: '#5ee1d0' }} /></div><div className="stat-row"><span>装甲完整度</span><strong>86%</strong></div><div className="stat-line"><span style={{ width: '86%', background: '#f7c85b' }} /></div><div className="stat-row"><span>结构完整度</span><strong>100%</strong></div><div className="stat-line"><span style={{ width: '100%', background: '#b18cff' }} /></div></div><div className="info-list"><div><span>所属势力</span><strong>人类联邦</strong></div><div><span>轨道位置</span><strong>OG-A / {body ? `ORBIT ${body.orbit}` : 'ANCHOR 02'}</strong></div><div><span>通信延迟</span><strong className="cyan">24 ms</strong></div></div>{body?.hasSurface && <button className="enter-surface-button" onClick={() => onEnterSurface(body.id)}><Orbit size={15} />进入地表操作视图 <span>↗</span></button>}</div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
function ItemChip({ itemId, amount }: { itemId: string; amount: number }) { const item = getItem(itemId); return <span className="item-chip" style={{ '--item-color': item?.color } as React.CSSProperties}><span>{item?.symbol}</span><small>×{amount}</small></span> }

function BottomBar({ scene, selectedId, speed, onSpeed, onScene, onAdd }: { scene: 'system' | 'surface'; selectedId: string | null; speed: 0 | 1 | 2; onSpeed: (speed: 0 | 1 | 2) => void; onScene: (scene: 'system' | 'surface') => void; onAdd: (factoryId: string) => void }) { const [category, setCategory] = useState('production'); const types = content.factoryTypes; const visibleFactories = content.factories.filter((factory) => scene === 'surface' && (factory.type === category || category === 'all')); return <div className="bottom-bar"><div className="bottom-context"><span className="scene-kicker">{selectedId ? 'OBJECT ACTIONS' : scene === 'system' ? 'ORBITAL BUILD' : 'SURFACE BUILD'}</span><strong>{selectedId ? '已选中对象 · 可用操作' : scene === 'system' ? '轨道设施与交通' : '地表生产设施'}</strong></div>{selectedId ? <div className="selected-actions"><button><SlidersHorizontal size={15} />配置</button><button><Target size={15} />设为目标</button><button><MoreHorizontal size={15} />更多</button></div> : scene === 'system' ? <div className="build-tabs"><button className="build-tab active"><Radio size={15} />空间站 <ChevronDown size={13} /></button><button className="build-tab"><Truck size={15} />交通 <ChevronDown size={13} /></button></div> : <div className="build-palette"><div className="palette-categories">{types.map((type) => { const Icon = iconMap[type.icon] ?? Factory; return <button className={category === type.id ? 'active' : ''} key={type.id} onClick={() => setCategory(type.id)}><Icon size={14} />{type.label}</button> })}</div><div className="palette-items">{visibleFactories.map((factory) => <button className="build-item" key={factory.id} onClick={() => factory.status === '可用' && onAdd(factory.id)}><span className="palette-icon" style={{ '--node-color': factory.color } as React.CSSProperties}><Factory size={15} /></span>{factory.name}{factory.status !== '可用' && <small>LOCKED</small>}</button>)}</div></div>}<div className="sim-controls"><span className="sim-label"><Activity size={14} />SIM</span><button className={speed === 0 ? 'active' : ''} onClick={() => onSpeed(0)}>Ⅱ</button><button className={speed === 1 ? 'active' : ''} onClick={() => onSpeed(1)}>1×</button><button className={speed === 2 ? 'active' : ''} onClick={() => onSpeed(2)}>2×</button></div><div className="bar-corner" /></div> }

function Overlay({ id, onClose, onNotify }: { id: OverlayId; onClose: () => void; onNotify: (message: string) => void }) { const reset = useGameStore((state) => state.reset); const title = id === 'settings' ? '系统设置' : id === 'tech' ? '科技树' : '星图'; return <div className="overlay-backdrop" onMouseDown={onClose}><div className="overlay-card" onMouseDown={(event) => event.stopPropagation()}><div className="overlay-header"><div><small>SYSTEM MODULE / {id?.toUpperCase()}</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={17} /></button></div>{id === 'settings' ? <SettingsOverlay onNotify={onNotify} reset={reset} /> : <PlaceholderOverlay id={id} />}</div></div> }
function SettingsOverlay({ onNotify, reset }: { onNotify: (message: string) => void; reset: () => void }) { const orbitAnimation = useGameStore((state) => state.orbitAnimation); const toggleOrbitAnimation = useGameStore((state) => state.toggleOrbitAnimation); return <div className="settings-list"><div className="setting-row"><div><strong>轨道动画</strong><small>在恒星系视图中播放轨道运动</small></div><button className={`toggle ${orbitAnimation ? 'on' : ''}`} onClick={toggleOrbitAnimation}><span /></button></div><div className="setting-row"><div><strong>界面密度</strong><small>控制面板的间距与信息密度</small></div><span className="setting-value">紧凑</span></div><div className="setting-row"><div><strong>本地存档</strong><small>每次操作自动保存到浏览器</small></div><span className="save-ok"><span className="status-dot" />已同步</span></div><button className="reset-button" onClick={() => { reset(); onNotify('Demo 已恢复默认布局') }}><Trash2 size={15} />重置 Demo 数据</button></div> }
function PlaceholderOverlay({ id }: { id: OverlayId }) { return <div className="placeholder-module"><div className="placeholder-icon">{id === 'tech' ? <Sparkles size={29} /> : <Map size={29} />}</div><strong>{id === 'tech' ? '科技网络正在编译' : '星图索引已就绪'}</strong><p>{id === 'tech' ? '研究节点、解锁条件和势力科技将在此处展开。' : '跨恒星系航线、跃迁节点和远端资产将在此处展开。'}</p><span>MODULE RESERVED · DEMO 0.1</span></div> }

export default App
