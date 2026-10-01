import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowLeft, Box, CircleHelp, Factory, Gauge, GitBranch,
  Layers3, Map, Maximize2, MoreHorizontal, Orbit, Package, Pickaxe, Plus, Radio,
  Rocket, Settings, Shield, SlidersHorizontal, Sparkles, Target, Trash2, Triangle,
  Truck, Waves, X, Zap
} from 'lucide-react'
import { ReactFlow, ReactFlowProvider, Background, Controls, Handle, MiniMap, Position, useReactFlow, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { content, getFactory, getItem, getRecipe, type FactoryDefinition, type FactoryNodeState } from './domain/content'
import { calculateOrbitalAngle, doesDiscIntersectView, doesOrbitIntersectView, findCelestialObject, getPlanet, getResourcePoints, getStar, isProjectedPointVisible, planetTypes, projectOrbitalRadius, projectStarPosition, resourceTypes, spaceMap, starTypes, type PlanetMapEntry } from './domain/spaceMap'
import { useGameStore, type OverlayId } from './state/gameStore'

const iconMap: Record<string, typeof Factory> = { zap: Zap, pickaxe: Pickaxe, factory: Factory, route: GitBranch, rocket: Rocket, orbit: Orbit }
type OrbitalEntityDefinition = { id: string; kind: 'station' | 'ship'; name: string; starId: string; position: { x: number; y: number }; orbit: number; faction: string }
const orbitalEntities = content.starSystem.entities as OrbitalEntityDefinition[]

function App() {
  const scene = useGameStore((state) => state.scene)
  const speed = useGameStore((state) => state.speed)
  const overlay = useGameStore((state) => state.overlay)
  const selectedId = useGameStore((state) => state.selectedId)
  const orbitAnimation = useGameStore((state) => state.orbitAnimation)
  const orbitFps = useGameStore((state) => state.orbitFps)
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const select = useGameStore((state) => state.select)
  const setScene = useGameStore((state) => state.setScene)
  const setOverlay = useGameStore((state) => state.setOverlay)
  const tick = useGameStore((state) => state.tick)
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
      {scene === 'system' ? <SystemView selectedId={selectedId} orbitAnimation={orbitAnimation} orbitFps={orbitFps} onSelect={select} onEnterSurface={(id) => { useGameStore.getState().enterSurface(id); notify('已进入奥瑞利亚地表视图') }} /> : <SurfaceView planet={surfacePlanet} onNotify={notify} />}
      <div className="viewport-hud"><div className="hud-pill"><span className="live-dot" />LIVE / SIMULATION</div><div className="hud-pill coordinates">X 042.18 <span>·</span> Y -118.04 <span>·</span> Z 003</div></div>
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

function CornerFrame({ x = 0, y = 0, half, corner }: { x?: number; y?: number; half: number; corner: number }) {
  const left = x - half, right = x + half, top = y - half, bottom = y + half
  return <path className="celestial-frame" vectorEffect="non-scaling-stroke" d={`M${left + corner} ${top}H${left}V${top + corner} M${right - corner} ${top}H${right}V${top + corner} M${left} ${bottom - corner}V${bottom}H${left + corner} M${right} ${bottom - corner}V${bottom}H${right - corner}`} />
}

const SPACE_ZOOM_LEVELS = [.03125, .0625, .125, .25, .5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512] as const
const SYSTEM_VIEW_ZOOM = 2
const ORBIT_TIME_UNIT_MS = 1000
const CELESTIAL_RADIUS_UNIT_SCALE = 0.1

function closestZoomLevelIndex(zoom: number) {
  return SPACE_ZOOM_LEVELS.reduce((closest, level, index) => Math.abs(level - zoom) < Math.abs(SPACE_ZOOM_LEVELS[closest] - zoom) ? index : closest, 0)
}

function SystemView({ selectedId, orbitAnimation, orbitFps, onSelect, onEnterSurface }: { selectedId: string | null; orbitAnimation: boolean; orbitFps: number; onSelect: (id: string | null, kind?: 'body' | 'station' | 'ship') => void; onEnterSurface: (id: string) => void }) {
  const starDisplayRadius = useGameStore((state) => state.starDisplayRadius)
  const planetDisplayRadius = useGameStore((state) => state.planetDisplayRadius)
  const moonDisplayRadius = useGameStore((state) => state.moonDisplayRadius)
  const orbitalEntityDisplayRadius = useGameStore((state) => state.orbitalEntityDisplayRadius)
  const overviewMarkerMinZoom = useGameStore((state) => state.overviewMarkerMinZoom)
  const starAuLengthFactor = useGameStore((state) => state.starAuLengthFactor)
  const planetAuLengthFactor = useGameStore((state) => state.planetAuLengthFactor)
  const moonAuLengthFactor = useGameStore((state) => state.moonAuLengthFactor)
  const [time, setTime] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [focusedStar, setFocusedStar] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const zoomRef = useRef(1)
  const zoomLevelIndexRef = useRef(closestZoomLevelIndex(1))
  const lastWheelAtRef = useRef(0)
  const panRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number | null>(null)
  const stars = useMemo(() => Object.entries(spaceMap), [])
  const starMapCenter = useMemo(() => stars.reduce((center, [, star]) => ({ x: center.x + star.position.x / Math.max(1, stars.length), y: center.y + star.position.y / Math.max(1, stars.length) }), { x: 0, y: 0 }), [stars])
  const projectedStars = useMemo(() => stars.map(([starId, star]) => ({ starId, star, point: projectStarPosition(star.position, starMapCenter, starAuLengthFactor) })), [stars, starMapCenter, starAuLengthFactor])
  const starPosition = (position: { x: number; y: number }) => projectStarPosition(position, starMapCenter, starAuLengthFactor)
  const smoothStep = (from: number, to: number, value: number) => { const ratio = Math.min(1, Math.max(0, (value - from) / (to - from))); return ratio * ratio * (3 - 2 * ratio) }
  const labelOpacity = smoothStep(.5, 1, zoom)
  const metaOpacity = smoothStep(1, 2, zoom)
  const systemOpacity = smoothStep(1, SYSTEM_VIEW_ZOOM, zoom)
  const entityOpacity = smoothStep(SYSTEM_VIEW_ZOOM, 4, zoom)
  const renderedStarRadius = starDisplayRadius * CELESTIAL_RADIUS_UNIT_SCALE
  const renderedOrbitalEntityRadius = orbitalEntityDisplayRadius * CELESTIAL_RADIUS_UNIT_SCALE
  const worldCenter = { x: (500 - pan.x) / zoom, y: (380 - pan.y) / zoom }
  const nearestStarId = useMemo(() => projectedStars.reduce<{ id: string; distance: number } | undefined>((nearest, projected) => {
    const distance = Math.hypot(projected.point.x - worldCenter.x, projected.point.y - worldCenter.y)
    return !nearest || distance < nearest.distance ? { id: projected.starId, distance } : nearest
  }, undefined)?.id ?? '', [projectedStars, worldCenter.x, worldCenter.y])
  const activeStarId = focusedStar ?? nearestStarId ?? stars[0]?.[0] ?? 'Solar'
  const activeStar = getStar(activeStarId)
  const detailMode = systemOpacity > .28
  const cameraViewBox = useMemo(() => ({ x: -pan.x / zoom, y: -pan.y / zoom, width: 1000 / zoom, height: 760 / zoom }), [pan.x, pan.y, zoom])
  const visibleStars = useMemo(() => projectedStars.filter(({ starId, star, point }) => {
    if (detailMode && starId === activeStarId) return true
    const outerOrbit = Object.values(star.planet).reduce((largest, planet) => Math.max(largest, projectOrbitalRadius(planet.position?.orbitalRadius ?? 0, planetAuLengthFactor)), 0)
    const overviewRadius = outerOrbit * Math.max(1, overviewMarkerMinZoom / zoom)
    const padding = detailMode ? 80 / zoom : Math.max(80 / zoom, overviewRadius + 32 / zoom)
    return isProjectedPointVisible(point, cameraViewBox, padding)
  }), [projectedStars, detailMode, activeStarId, planetAuLengthFactor, overviewMarkerMinZoom, zoom, cameraViewBox])

  useEffect(() => {
    if (!orbitAnimation || !detailMode) return
    const frameInterval = 1000 / orbitFps
    let animationFrame = 0
    let previousFrame = performance.now()
    let nextRender = previousFrame
    let elapsedSinceRender = 0
    const renderFrame = (now: number) => {
      elapsedSinceRender += now - previousFrame
      previousFrame = now
      if (now >= nextRender) {
        const elapsed = elapsedSinceRender
        elapsedSinceRender = 0
        nextRender += frameInterval
        if (now - nextRender > frameInterval) nextRender = now + frameInterval
        setTime((value) => value + elapsed / ORBIT_TIME_UNIT_MS)
      }
      animationFrame = window.requestAnimationFrame(renderFrame)
    }
    animationFrame = window.requestAnimationFrame(renderFrame)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [orbitAnimation, orbitFps, detailMode])
  const animateViewport = (nextZoom: number, nextPan: { x: number; y: number }, duration = 420) => {
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current)
    const startZoom = zoomRef.current
    const startPan = panRef.current
    const startedAt = performance.now()
    const frame = (now: number) => {
      const linear = Math.min(1, (now - startedAt) / duration)
      const eased = linear < .5 ? 4 * linear * linear * linear : 1 - Math.pow(-2 * linear + 2, 3) / 2
      const currentZoom = startZoom + (nextZoom - startZoom) * eased
      const currentPan = { x: startPan.x + (nextPan.x - startPan.x) * eased, y: startPan.y + (nextPan.y - startPan.y) * eased }
      zoomRef.current = currentZoom
      panRef.current = currentPan
      setZoom(currentZoom)
      setPan(currentPan)
      if (linear < 1) animationRef.current = window.requestAnimationFrame(frame)
      else animationRef.current = null
    }
    animationRef.current = window.requestAnimationFrame(frame)
  }
  const focusWorldPoint = (point: { x: number; y: number }, targetZoom = SYSTEM_VIEW_ZOOM) => {
    const levelIndex = closestZoomLevelIndex(targetZoom)
    const snappedZoom = SPACE_ZOOM_LEVELS[levelIndex]
    zoomLevelIndexRef.current = levelIndex
    animateViewport(snappedZoom, { x: 500 - point.x * snappedZoom, y: 380 - point.y * snappedZoom }, 680)
  }
  useEffect(() => () => { if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current) }, [])
  useEffect(() => {
    const entity = orbitalEntities.find((item) => item.id === selectedId)
    if (!entity) return
    const star = getStar(entity.starId)
    if (!star) return
    const starPoint = starPosition(star.position)
    setFocusedStar(entity.starId)
    focusWorldPoint({ x: starPoint.x + entity.position.x, y: starPoint.y + entity.position.y }, entity.kind === 'station' ? 8 : 11)
  }, [selectedId])

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const now = performance.now()
    if (now - lastWheelAtRef.current < 90) return
    lastWheelAtRef.current = now
    const rect = event.currentTarget.getBoundingClientRect()
    const cursor = { x: ((event.clientX - rect.left) / rect.width) * 1000, y: ((event.clientY - rect.top) / rect.height) * 760 }
    const direction = event.deltaY < 0 ? 1 : -1
    const nextLevelIndex = Math.min(SPACE_ZOOM_LEVELS.length - 1, Math.max(0, zoomLevelIndexRef.current + direction))
    if (nextLevelIndex === zoomLevelIndexRef.current) return
    zoomLevelIndexRef.current = nextLevelIndex
    const nextZoom = SPACE_ZOOM_LEVELS[nextLevelIndex]
    const worldPoint = { x: (cursor.x - panRef.current.x) / zoomRef.current, y: (cursor.y - panRef.current.y) / zoomRef.current }
    animateViewport(nextZoom, { x: cursor.x - worldPoint.x * nextZoom, y: cursor.y - worldPoint.y * nextZoom }, 360)
  }
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 2) return
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current)
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ x: event.clientX, y: event.clientY, panX: panRef.current.x, panY: panRef.current.y })
  }
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return
    const rect = event.currentTarget.getBoundingClientRect()
    const nextPan = { x: drag.panX + (event.clientX - drag.x) * 1000 / rect.width, y: drag.panY + (event.clientY - drag.y) * 760 / rect.height }
    panRef.current = nextPan
    setPan(nextPan)
  }
  const onPointerUp = () => setDrag(null)
  const clearFocus = () => { setFocusedStar(null); onSelect(null) }

  const renderOrbitingBodies = (entries: [string, PlanetMapEntry][], systemPoint: { x: number; y: number }, centerX = 0, centerY = 0, depth = 0, path = ''): React.ReactNode[] => entries.map(([bodyId, body], index) => {
    const orbit = projectOrbitalRadius(body.position?.orbitalRadius ?? 0, depth === 0 ? planetAuLengthFactor : moonAuLengthFactor)
    const period = body.position?.orbitalPeriod ?? 0
    const initialAngle = ((index * 126 + depth * 57) * Math.PI) / 180
    const angle = calculateOrbitalAngle(time, period, initialAngle)
    const x = centerX + Math.cos(angle) * orbit
    const y = centerY + Math.sin(angle) * orbit
    const bodySelected = selectedId === bodyId
    const hasSurface = (body.surface?.resource?.length ?? 0) > 0
    const displayRadius = depth === 0 ? planetDisplayRadius : moonDisplayRadius
    const radius = displayRadius * CELESTIAL_RADIUS_UNIT_SCALE
    const bodyPath = path ? `${path}/${bodyId}` : bodyId
    const children = Object.entries(body.planet ?? {}) as [string, PlanetMapEntry][]
    const absoluteCenter = { x: systemPoint.x + centerX, y: systemPoint.y + centerY }
    const absoluteBody = { x: systemPoint.x + x, y: systemPoint.y + y }
    const orbitVisible = doesOrbitIntersectView(absoluteCenter, orbit, cameraViewBox, 3 / zoom)
    const bodyVisible = doesDiscIntersectView(absoluteBody, radius, cameraViewBox, 36 / zoom)
    const childNodes = children.length > 0 ? renderOrbitingBodies(children, systemPoint, x, y, depth + 1, bodyPath) : []
    if (!orbitVisible && !bodyVisible && !childNodes.some(Boolean)) return null
    return <g key={bodyPath} className={`body-group ${bodySelected ? 'selected' : ''}`} onClick={(event) => { event.stopPropagation(); onSelect(bodyId, 'body') }} onDoubleClick={(event) => { event.stopPropagation(); if (hasSurface) onEnterSurface(bodyId) }}>
      {orbitVisible && <circle cx={centerX} cy={centerY} r={orbit} className={depth === 0 ? 'orbit-line' : 'orbit-line moon-orbit'} vectorEffect="non-scaling-stroke" />}
      {bodyVisible && <><circle cx={x} cy={y} r={radius + 6 / zoom} className="body-hit" /><circle cx={x} cy={y} r={radius} className={depth === 0 ? 'planet-core' : 'moon-core'} /><CornerFrame x={x} y={y} half={radius + 5 / zoom} corner={3.5 / zoom} /><text x={x} y={y + radius + (depth === 0 ? 12 : 9) / zoom} textAnchor="middle" style={{ fontSize: `${(depth === 0 ? 10 : 8) / zoom}px` }} className="body-label" opacity={depth === 0 ? metaOpacity : systemOpacity}>{bodyId}</text>{bodySelected && <text x={x} y={y + radius + 24 / zoom} textAnchor="middle" style={{ fontSize: `${8 / zoom}px` }} className="body-meta" opacity={1}>{planetTypes[body.planetType ?? '']?.displayName ?? (depth === 0 ? '行星' : '卫星')} · {hasSurface ? '双击进入地表' : '无资源点'}</text>}</>}
      {childNodes}
    </g>
  })

  return <div className="system-canvas">
    <div className="scene-label"><span className="scene-kicker">{detailMode ? 'STAR SYSTEM / CONTINUOUS SPACE' : 'GALACTIC MAP / SPACE'}</span><strong>{detailMode ? activeStar?.displayName ?? '恒星系' : '深空星图'}</strong><small>{detailMode ? `${starTypes[activeStar?.starType ?? '']?.displayName ?? '恒星系'} · 连续空间倍率 ${zoom.toFixed(2)}×` : '滚轮缩放 · 右键拖动 · 空白处取消选择'}</small></div>
    <svg className="system-svg map-galaxy" viewBox={`${cameraViewBox.x} ${cameraViewBox.y} ${cameraViewBox.width} ${cameraViewBox.height}`} onContextMenu={(event) => event.preventDefault()} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <defs><radialGradient id="overviewStarDot"><stop offset="0" stopColor="#f7c85b" stopOpacity=".78" /><stop offset=".55" stopColor="#f7c85b" stopOpacity=".78" /><stop offset=".7" stopColor="#f7c85b" stopOpacity=".58" /><stop offset=".84" stopColor="#f7c85b" stopOpacity=".3" /><stop offset=".94" stopColor="#f7c85b" stopOpacity=".1" /><stop offset="1" stopColor="#f7c85b" stopOpacity="0" /></radialGradient></defs>
      <rect x={cameraViewBox.x} y={cameraViewBox.y} width={cameraViewBox.width} height={cameraViewBox.height} fill="transparent" onClick={clearFocus} />
        {visibleStars.map(({ starId, star, point }) => {
          const selected = selectedId === starId || focusedStar === starId
          const planets = Object.entries(star.planet)
          const outerOrbit = planets.reduce((largest, [, planet]) => Math.max(largest, projectOrbitalRadius(planet.position?.orbitalRadius ?? 0, planetAuLengthFactor)), 0) || 24
          const overviewRadius = outerOrbit * Math.max(1, overviewMarkerMinZoom / zoom)
          const overviewOpacity = 1 - systemOpacity
          return <g key={starId} transform={`translate(${point.x} ${point.y})`}>
            <g className={`map-star ${selected ? 'selected' : ''}`} onClick={(event) => { event.stopPropagation(); setFocusedStar(starId); onSelect(starId, 'body') }} onDoubleClick={(event) => { event.stopPropagation(); setFocusedStar(starId); focusWorldPoint(point) }}>
              {overviewOpacity > 0 && <g className="map-star-overview" opacity={overviewOpacity} pointerEvents={overviewOpacity > .18 ? 'auto' : 'none'}>
                <circle r={overviewRadius} className="map-star-overview-dot" />
                <CornerFrame half={overviewRadius + 5 / zoom} corner={8 / zoom} />
                <text x="0" y={overviewRadius + 16 / zoom} textAnchor="middle" style={{ fontSize: `${12 / zoom}px` }} className="map-star-label" opacity={labelOpacity}>{star.displayName}</text>
                <text x="0" y={overviewRadius + 30 / zoom} textAnchor="middle" style={{ fontSize: `${9 / zoom}px` }} className="map-star-meta" opacity={metaOpacity}>{starTypes[star.starType ?? '']?.displayName ?? '恒星'} · {planets.length} 颗行星</text>
              </g>}
              {systemOpacity > 0 && <g className="map-star-center" opacity={systemOpacity} pointerEvents={systemOpacity > .18 ? 'auto' : 'none'}>
                <circle r={renderedStarRadius} className="map-star-core" />
                <CornerFrame half={renderedStarRadius + 7 / zoom} corner={5 / zoom} />
                <text x="0" y={renderedStarRadius + 14 / zoom} textAnchor="middle" style={{ fontSize: `${12 / zoom}px` }} className="map-star-label">{star.displayName}</text>
                <text x="0" y={renderedStarRadius + 28 / zoom} textAnchor="middle" style={{ fontSize: `${9 / zoom}px` }} className="map-star-meta" opacity={metaOpacity}>{starTypes[star.starType ?? '']?.displayName ?? '恒星'} · {planets.length} 颗行星</text>
              </g>}
            </g>
            {starId === activeStarId && systemOpacity > 0 && <g opacity={systemOpacity} className="system-detail-layer" pointerEvents={systemOpacity > .18 ? 'auto' : 'none'}>
              {renderOrbitingBodies(planets as [string, PlanetMapEntry][], point)}
              <g opacity={entityOpacity} pointerEvents={entityOpacity > .2 ? 'auto' : 'none'}>{orbitalEntities.filter((entity) => entity.starId === starId).map((entity) => <g key={entity.id} className={`space-entity ${entity.kind === 'ship' ? 'ship-entity' : ''} ${selectedId === entity.id ? 'selected' : ''}`} transform={`translate(${entity.position.x} ${entity.position.y})`} onClick={(event) => { event.stopPropagation(); onSelect(entity.id, entity.kind) }} onDoubleClick={(event) => { event.stopPropagation(); focusWorldPoint({ x: point.x + entity.position.x, y: point.y + entity.position.y }, entity.kind === 'station' ? 8 : 11) }}>{entity.kind === 'station' ? <Radio className="entity-glyph" x={-renderedOrbitalEntityRadius} y={-renderedOrbitalEntityRadius} width={renderedOrbitalEntityRadius * 2} height={renderedOrbitalEntityRadius * 2} strokeWidth={1.6} /> : <Rocket className="entity-glyph" x={-renderedOrbitalEntityRadius} y={-renderedOrbitalEntityRadius} width={renderedOrbitalEntityRadius * 2} height={renderedOrbitalEntityRadius * 2} strokeWidth={1.6} />}<text x="0" y={renderedOrbitalEntityRadius + 13 / zoom} textAnchor="middle" style={{ fontSize: `${10 / zoom}px` }} className="entity-label">{entity.name}</text></g>)}</g>
            </g>}
          </g>
        })}
    </svg>
    <div className="system-legend"><span><i className="legend-dot star" />恒星系</span><span><i className="legend-dot planet" />行星</span><span><i className="legend-dot station" />右键拖动</span></div>
    <div className="time-card"><div className="time-card-head"><span>{detailMode ? '恒星系缩放级别' : '星图缩放级别'}</span><span className="cyan">{Number((zoom * 100).toFixed(3))}%</span></div><strong>{detailMode ? activeStar?.displayName ?? 'SYSTEM' : `${stars.length} SYSTEMS`}</strong><div className="time-line"><span style={{ width: `${Math.min(100, Math.max(2, (zoomLevelIndexRef.current / (SPACE_ZOOM_LEVELS.length - 1)) * 100))}%` }} /></div><small>3.125% — 51200% · 每级 2×</small></div>
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

function ResourceNode({ data, selected }: NodeProps<Node<{ resource: ReturnType<typeof getResourcePoints>[number] }>>) {
  return <div className={`resource-node ${selected ? 'is-selected' : ''}`}><span className="resource-pulse" /><div><strong>{data.resource.resourceTypeName}</strong><small>{data.resource.item} · {data.resource.reserves.toLocaleString()} t</small></div></div>
}
Object.assign(nodeTypes, { resource: ResourceNode })

function SurfaceView(props: { planet: string; onNotify: (message: string) => void }) {
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
  const flowEdges = useMemo(() => edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, animated: true, type: 'smoothstep', style: { stroke: getItem(edge.itemId)?.color ?? '#6da9ff', strokeWidth: 2 }, label: `${edge.flow.toFixed(1)} /s`, labelStyle: { fill: '#a9bad0', fontSize: 10 }, labelBgStyle: { fill: '#0c131d', fillOpacity: .92 } })), [edges])
  const onConnect = (connection: Connection) => { if (!connection.source || !connection.target) return; const source = nodes.find((node) => node.id === connection.source); const target = nodes.find((node) => node.id === connection.target); const sourceDef = source && getFactory(source.factoryId); const targetDef = target && getFactory(target.factoryId); const itemId = sourceDef?.outputs?.[0] ?? 'iron-ingot'; if (!sourceDef?.outputs?.some((id) => targetDef?.inputs?.includes(id))) { onNotify('连接无效：端口物料类型不匹配'); return } addEdgeToStore({ id: `edge-${connection.source}-${connection.target}`, source: connection.source, target: connection.target, itemId, flow: sourceDef.rate ?? 1 }); onNotify('物流链路已建立') }
  const onSurfaceWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const viewport = flowApi.getViewport()
    const bounds = event.currentTarget.getBoundingClientRect()
    const cursor = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    const worldPoint = { x: (cursor.x - viewport.x) / viewport.zoom, y: (cursor.y - viewport.y) / viewport.zoom }
    const nextZoom = Math.min(32, Math.max(.08, viewport.zoom * Math.exp(-event.deltaY * .0054)))
    void flowApi.setViewport({ x: cursor.x - worldPoint.x * nextZoom, y: cursor.y - worldPoint.y * nextZoom, zoom: nextZoom }, { duration: 300 })
  }
  return <div className="surface-canvas" onContextMenu={(event) => event.preventDefault()}>
    <div className="surface-backdrop" /><div className="scene-label"><span className="scene-kicker">SURFACE / AURELIA-01</span><strong>奥瑞利亚 · 生产区 A-03</strong><small>昼面 · 北纬 18.2° · 工业许可等级 IV</small></div>
    <div className="surface-grid-label"><span>生产网络 / NETWORK 03</span><span className="cyan">{nodes.length} 个实体 · {edges.length} 条链路</span></div>
    <ReactFlow nodes={flowNodes} edges={flowEdges as Edge[]} nodeTypes={nodeTypes} onWheel={onSurfaceWheel} onNodeClick={(_, node) => { select(node.id, node.type === 'resource' ? 'body' : 'factory'); setContext(null) }} onNodeDragStop={(_, node) => { if (node.type !== 'resource') moveNode(node.id, node.position.x, node.position.y) }} onConnect={onConnect} onPaneClick={() => { select(null); setContext(null) }} onNodeContextMenu={(event, node) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY, nodeId: node.id }); select(node.id, node.type === 'resource' ? 'body' : 'factory') }} onPaneContextMenu={(event) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY }) }} panOnDrag={[2]} zoomOnScroll={false} fitView fitViewOptions={{ padding: .3 }} minZoom={.08} maxZoom={32} proOptions={{ hideAttribution: true }}>
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
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const node = nodes.find((item) => item.id === selectedId)
  const factory = node && getFactory(node.factoryId)
  const spaceDetails = selectedId ? resolveSpaceInspectorDetails(selectedId, surfacePlanet) : undefined
  const title = factory?.name ?? spaceDetails?.name ?? '未知对象'
  return <>{selectedId ? <><div className="inspector-head"><div><small>OBJECT INSPECTOR / 04</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={16} /></button></div><div className="inspector-tabs"><button className="active">详情</button><button>配置</button><button>日志</button></div>{factory ? <FactoryInspector node={node!} factory={factory} onNotify={onNotify} /> : spaceDetails ? <SpaceInspector details={spaceDetails} onEnterSurface={onEnterSurface} /> : <UnknownObjectInspector selectedId={selectedId} />}</> : <EmptyInspector scene={scene} />}</>
}
function EmptyInspector({ scene }: { scene: 'system' | 'surface' }) { return <div className="empty-inspector"><div className="crosshair"><Target size={21} /></div><strong>未选择对象</strong><p>{scene === 'system' ? '选择恒星系内的资产查看详细状态' : '选择生产设备查看配方、库存与操作'}</p><div className="empty-divider" /><small>TIP 右键对象可快速调用操作菜单</small></div> }
function FactoryInspector({ node, factory, onNotify }: { node: FactoryNodeState; factory: FactoryDefinition; onNotify: (message: string) => void }) { const recipe = factory.recipe ? getRecipe(factory.recipe) : null; return <div className="inspector-content"><div className="object-identity"><span className="large-object-icon" style={{ '--node-color': factory.color } as React.CSSProperties}><Factory size={25} /></span><div><strong>{factory.name}</strong><small>{content.factoryTypes.find((type) => type.id === factory.type)?.label} · NODE-{node.id.slice(-3).toUpperCase()}</small></div><span className={`status-tag ${node.status}`}>{node.status === 'online' ? '运行中' : node.status === 'blocked' ? '堵塞' : '待机'}</span></div><div className="metric-grid"><Metric label="生产进度" value={`${Math.round(node.progress * 100)}%`} /><Metric label="缓存库存" value={`${node.buffer.toFixed(0)} / ${factory.capacity ?? 20}`} /><Metric label="输入速率" value={`${factory.rate?.toFixed(1) ?? '—'} /s`} /><Metric label="功率负载" value={factory.power ? `${factory.power} kW` : '—'} /></div>{recipe && <div className="recipe-card"><div className="card-heading"><span>当前配方</span><button onClick={() => onNotify('配方已置顶到操作台')}><Maximize2 size={13} /></button></div><strong>{recipe.name}</strong><div className="recipe-flow"><ItemChip itemId={recipe.inputs[0].item} amount={recipe.inputs[0].amount} /><span>→</span><ItemChip itemId={recipe.outputs[0].item} amount={recipe.outputs[0].amount} /></div><small>周期 {recipe.duration}s · 自动运行</small></div>}<div className="inspector-actions"><button onClick={() => onNotify('物流配置已打开')}><GitBranch size={15} />配置物流</button><button onClick={() => onNotify('设备已切换为维护模式')}><SlidersHorizontal size={15} />维护模式</button></div></div> }

type SpaceInspectorDetails = {
  id: string
  kind: 'star' | 'planet' | 'moon' | 'station' | 'ship' | 'resource'
  name: string
  subtitle: string
  status: string
  color: string
  metrics: { label: string; value: string }[]
  facts: { label: string; value: string }[]
  surfaceTarget?: string
}

function formatNumber(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function resolveSpaceInspectorDetails(selectedId: string, surfacePlanet: string): SpaceInspectorDetails | undefined {
  const celestial = findCelestialObject(selectedId)
  if (celestial) {
    const position = celestial.orbitalPosition
    const kindName = celestial.kind === 'star' ? '恒星系' : celestial.kind === 'planet' ? '行星' : '卫星'
    const metrics = celestial.kind === 'star'
      ? [
          { label: '行星数量', value: `${celestial.planetCount}` },
          { label: '卫星数量', value: `${celestial.satelliteCount}` },
          { label: '资源点', value: `${celestial.resourceCount}` },
          { label: '已探明储量', value: `${formatNumber(celestial.totalReserves)} t` }
        ]
      : [
          { label: '天体半径', value: position ? `${formatNumber(position.radius)} km` : '未知' },
          { label: '轨道半径', value: position ? `${formatNumber(position.orbitalRadius)} AU` : '未知' },
          { label: '公转周期', value: position ? `${formatNumber(position.orbitalPeriod)} s` : '未知' },
          { label: '卫星数量', value: `${celestial.satelliteCount}` }
        ]
    const facts = celestial.kind === 'star'
      ? [
          { label: '恒星类型', value: celestial.typeName },
          { label: '星图坐标', value: celestial.mapPosition ? `X ${formatNumber(celestial.mapPosition.x)} / Y ${formatNumber(celestial.mapPosition.y)} AU` : '未知' },
          { label: '对象编号', value: celestial.id }
        ]
      : [
          { label: '天体类型', value: celestial.typeName },
          { label: '所属恒星系', value: celestial.starName },
          { label: celestial.kind === 'moon' ? '环绕天体' : '资源点', value: celestial.kind === 'moon' ? (celestial.parentName ?? '未知') : `${celestial.resourceCount}` },
          { label: '已探明储量', value: `${formatNumber(celestial.totalReserves)} t` },
          { label: '对象编号', value: celestial.id }
        ]
    return {
      id: celestial.id,
      kind: celestial.kind,
      name: celestial.displayName,
      subtitle: `${kindName} · ${celestial.typeName}`,
      status: celestial.kind === 'star' ? '稳定' : '已扫描',
      color: celestial.kind === 'star' ? '#ffd37a' : celestial.kind === 'planet' ? '#8cb6e8' : '#cbd4df',
      metrics,
      facts,
      surfaceTarget: celestial.hasSurface ? celestial.id : undefined
    }
  }

  const entity = orbitalEntities.find((item) => item.id === selectedId)
  if (entity) {
    const isStation = entity.kind === 'station'
    return {
      id: entity.id,
      kind: entity.kind,
      name: entity.name,
      subtitle: isStation ? 'Fortizar · 轨道空间站' : '伊米卡斯级 · 侦察护卫舰',
      status: '在线',
      color: isStation ? '#53d5c4' : '#b18cff',
      metrics: isStation
        ? [{ label: '护盾', value: '100%' }, { label: '装甲', value: '86%' }, { label: '结构', value: '100%' }, { label: '停泊位', value: '12' }]
        : [{ label: '护盾', value: '100%' }, { label: '装甲', value: '86%' }, { label: '结构', value: '100%' }, { label: '航行状态', value: '巡航' }],
      facts: [
        { label: '所属势力', value: entity.faction },
        { label: '轨道位置', value: `${getStar(entity.starId)?.displayName ?? entity.starId} / ORBIT ${entity.orbit}` },
        { label: '通信延迟', value: '24 ms' },
        { label: '对象编号', value: entity.id }
      ]
    }
  }

  const legacyBody = content.starSystem.bodies.find((item) => item.id === selectedId) as { id: string; name: string; color: string; status: string; population: string; orbit: number; hasSurface: boolean } | undefined
  if (legacyBody) return {
    id: legacyBody.id,
    kind: 'planet',
    name: legacyBody.name,
    subtitle: `行星 · ${legacyBody.status}`,
    status: '已扫描',
    color: legacyBody.color,
    metrics: [{ label: '轨道序号', value: `${legacyBody.orbit}` }, { label: '人口', value: legacyBody.population }, { label: '地表状态', value: legacyBody.hasSurface ? '可进入' : '不可进入' }, { label: '通信延迟', value: '24 ms' }],
    facts: [{ label: '所属恒星系', value: content.starSystem.name }, { label: '对象编号', value: legacyBody.id }],
    surfaceTarget: legacyBody.hasSurface ? legacyBody.id : undefined
  }

  const resourcePlanetId = surfacePlanet === 'aurelia' ? 'Earth' : surfacePlanet
  const resource = getResourcePoints('Solar', resourcePlanetId).find((item) => item.id === selectedId)
  if (resource) return {
    id: resource.id,
    kind: 'resource',
    name: resource.resourceTypeName,
    subtitle: `地表资源点 · ${resource.item}`,
    status: '可开采',
    color: '#e58b5c',
    metrics: [{ label: '储量', value: `${formatNumber(resource.reserves)} t` }, { label: '资源物', value: resource.item }, { label: '地表 X', value: `${formatNumber(resource.position.x)} km` }, { label: '地表 Y', value: `${formatNumber(resource.position.y)} km` }],
    facts: [{ label: '资源类型', value: resource.resourceTypeName }, { label: '所属行星', value: resourcePlanetId }, { label: '对象编号', value: resource.id }]
  }
  return undefined
}

function SpaceInspector({ details, onEnterSurface }: { details: SpaceInspectorDetails; onEnterSurface: (id: string) => void }) {
  const Icon = details.kind === 'star' ? Sparkles : details.kind === 'station' ? Radio : details.kind === 'ship' ? Rocket : details.kind === 'resource' ? Pickaxe : Orbit
  return <div className="inspector-content"><div className="object-identity"><span className="large-object-icon" style={{ '--node-color': details.color } as React.CSSProperties}><Icon size={25} /></span><div><strong>{details.name}</strong><small>{details.subtitle}</small></div><span className="status-tag online">{details.status}</span></div><div className="metric-grid">{details.metrics.map((metric) => <Metric key={metric.label} label={metric.label} value={metric.value} />)}</div><div className="info-list">{details.facts.map((fact) => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>)}</div>{details.surfaceTarget && <button className="enter-surface-button" onClick={() => onEnterSurface(details.surfaceTarget!)}><Orbit size={15} />进入地表操作视图 <span>↗</span></button>}</div>
}

function UnknownObjectInspector({ selectedId }: { selectedId: string }) { return <div className="empty-inspector"><div className="crosshair"><CircleHelp size={21} /></div><strong>对象资料不可用</strong><p>已选择 {selectedId}，但静态内容中没有对应定义。</p></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
function ItemChip({ itemId, amount }: { itemId: string; amount: number }) { const item = getItem(itemId); return <span className="item-chip" style={{ '--item-color': item?.color } as React.CSSProperties}><span>{item?.symbol}</span><small>×{amount}</small></span> }

function BottomBar({ scene, selectedId, speed, onSpeed, onScene, onAdd }: { scene: 'system' | 'surface'; selectedId: string | null; speed: 0 | 1 | 2; onSpeed: (speed: 0 | 1 | 2) => void; onScene: (scene: 'system' | 'surface') => void; onAdd: (factoryId: string) => void }) {
  const [category, setCategory] = useState('production')
  const [orbitalCategory, setOrbitalCategory] = useState<'station' | 'transport'>('station')
  const types = content.factoryTypes
  const visibleFactories = content.factories.filter((factory) => scene === 'surface' && (factory.type === category || category === 'all'))
  const orbitalOptions = orbitalCategory === 'station' ? ['平台', '空堡', '铁壁', '星城', '工程复合体', '主权设施'] : ['星门', '轨道加速器', '信标']
  const OrbitalIcon = orbitalCategory === 'station' ? Radio : Truck
  const orbitalColor = orbitalCategory === 'station' ? '#53d5c4' : '#69a7ff'
  return <div className="bottom-bar"><div className="bottom-context"><span className="scene-kicker">{selectedId ? 'OBJECT ACTIONS' : scene === 'system' ? 'ORBITAL BUILD' : 'SURFACE BUILD'}</span><strong>{selectedId ? '已选中对象 · 可用操作' : scene === 'system' ? '轨道设施与交通' : '地表生产设施'}</strong></div>{selectedId ? <div className="selected-actions"><button><SlidersHorizontal size={15} />配置</button><button><Target size={15} />设为目标</button><button><MoreHorizontal size={15} />更多</button></div> : scene === 'system' ? <div className="build-palette"><div className="palette-categories"><button className={orbitalCategory === 'station' ? 'active' : ''} onClick={() => setOrbitalCategory('station')}><Radio size={14} />空间站</button><button className={orbitalCategory === 'transport' ? 'active' : ''} onClick={() => setOrbitalCategory('transport')}><Truck size={14} />交通</button></div><div className="palette-items">{orbitalOptions.map((option) => <button className="build-item" key={option} title="预留建造项目"><span className="palette-icon" style={{ '--node-color': orbitalColor } as React.CSSProperties}><OrbitalIcon size={15} /></span>{option}<small>LOCKED</small></button>)}</div></div> : <div className="build-palette"><div className="palette-categories">{types.map((type) => { const Icon = iconMap[type.icon] ?? Factory; return <button className={category === type.id ? 'active' : ''} key={type.id} onClick={() => setCategory(type.id)}><Icon size={14} />{type.label}</button> })}</div><div className="palette-items">{visibleFactories.map((factory) => <button className="build-item" key={factory.id} onClick={() => factory.status === '可用' && onAdd(factory.id)}><span className="palette-icon" style={{ '--node-color': factory.color } as React.CSSProperties}><Factory size={15} /></span>{factory.name}{factory.status !== '可用' && <small>LOCKED</small>}</button>)}</div></div>}<div className="sim-controls"><span className="sim-label"><Activity size={14} />SIM</span><button className={speed === 0 ? 'active' : ''} onClick={() => onSpeed(0)}>Ⅱ</button><button className={speed === 1 ? 'active' : ''} onClick={() => onSpeed(1)}>1×</button><button className={speed === 2 ? 'active' : ''} onClick={() => onSpeed(2)}>2×</button></div><div className="bar-corner" /></div>
}

function Overlay({ id, onClose, onNotify }: { id: OverlayId; onClose: () => void; onNotify: (message: string) => void }) { const reset = useGameStore((state) => state.reset); const title = id === 'settings' ? '系统设置' : id === 'tech' ? '科技树' : '星图'; return <div className="overlay-backdrop" onMouseDown={onClose}><div className="overlay-card" onMouseDown={(event) => event.stopPropagation()}><div className="overlay-header"><div><small>SYSTEM MODULE / {id?.toUpperCase()}</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={17} /></button></div>{id === 'settings' ? <SettingsOverlay onNotify={onNotify} reset={reset} /> : <PlaceholderOverlay id={id} />}</div></div> }
function SettingsOverlay({ onNotify, reset }: { onNotify: (message: string) => void; reset: () => void }) {
  const orbitAnimation = useGameStore((state) => state.orbitAnimation)
  const orbitFps = useGameStore((state) => state.orbitFps)
  const starDisplayRadius = useGameStore((state) => state.starDisplayRadius)
  const planetDisplayRadius = useGameStore((state) => state.planetDisplayRadius)
  const moonDisplayRadius = useGameStore((state) => state.moonDisplayRadius)
  const orbitalEntityDisplayRadius = useGameStore((state) => state.orbitalEntityDisplayRadius)
  const overviewMarkerMinZoom = useGameStore((state) => state.overviewMarkerMinZoom)
  const starAuLengthFactor = useGameStore((state) => state.starAuLengthFactor)
  const planetAuLengthFactor = useGameStore((state) => state.planetAuLengthFactor)
  const moonAuLengthFactor = useGameStore((state) => state.moonAuLengthFactor)
  const toggleOrbitAnimation = useGameStore((state) => state.toggleOrbitAnimation)
  const setOrbitFps = useGameStore((state) => state.setOrbitFps)
  const setStarDisplayRadius = useGameStore((state) => state.setStarDisplayRadius)
  const setPlanetDisplayRadius = useGameStore((state) => state.setPlanetDisplayRadius)
  const setMoonDisplayRadius = useGameStore((state) => state.setMoonDisplayRadius)
  const setOrbitalEntityDisplayRadius = useGameStore((state) => state.setOrbitalEntityDisplayRadius)
  const setOverviewMarkerMinZoom = useGameStore((state) => state.setOverviewMarkerMinZoom)
  const setStarAuLengthFactor = useGameStore((state) => state.setStarAuLengthFactor)
  const setPlanetAuLengthFactor = useGameStore((state) => state.setPlanetAuLengthFactor)
  const setMoonAuLengthFactor = useGameStore((state) => state.setMoonAuLengthFactor)
  return <div className="settings-list">
    <div className="setting-row"><div><strong>轨道动画</strong><small>使用 JSON 中的公转周期推进天体运动</small></div><button className={`toggle ${orbitAnimation ? 'on' : ''}`} onClick={toggleOrbitAnimation}><span /></button></div>
    <div className="setting-row"><div><strong>目标帧率</strong><small>范围 10–240 FPS · 受屏幕刷新率限制</small></div><div className="fps-control"><input aria-label="轨道动画目标帧率" type="range" min="10" max="240" step="1" value={orbitFps} onChange={(event) => setOrbitFps(event.currentTarget.valueAsNumber)} /><label><input aria-label="轨道动画帧率数值" type="number" min="10" max="240" step="1" value={orbitFps} onChange={(event) => setOrbitFps(event.currentTarget.valueAsNumber)} /><span>FPS</span></label></div></div>
    <div className="setting-row celestial-radius-setting"><div><strong>天体显示半径</strong><small>1 u = 0.1 地图单位，会随视图缩放同步改变大小</small></div><div className="radius-controls"><RadiusControl label="恒星" value={starDisplayRadius} onChange={setStarDisplayRadius} /><RadiusControl label="行星" value={planetDisplayRadius} onChange={setPlanetDisplayRadius} /><RadiusControl label="卫星" value={moonDisplayRadius} onChange={setMoonDisplayRadius} /><RadiusControl label="舰船/空间站" value={orbitalEntityDisplayRadius} onChange={setOrbitalEntityDisplayRadius} /></div></div>
    <div className="setting-row"><div><strong>恒星系遮罩固定阈值</strong><small>低于该缩放倍率时，遮罩仅改变间距，不再缩小</small></div><ZoomThresholdControl value={overviewMarkerMinZoom} onChange={setOverviewMarkerMinZoom} /></div>
    <div className="setting-row au-factor-setting"><div><strong>Au长度系数</strong><small>JSON 中的 AU 数值 × 对应系数 = 画面长度</small></div><div className="factor-controls"><LengthFactorControl label="恒星单位长度轨道系数" value={starAuLengthFactor} onChange={setStarAuLengthFactor} /><LengthFactorControl label="行星单位长度轨道系数" value={planetAuLengthFactor} onChange={setPlanetAuLengthFactor} /><LengthFactorControl label="卫星单位长度轨道系数" value={moonAuLengthFactor} onChange={setMoonAuLengthFactor} /></div></div>
    <div className="setting-row"><div><strong>界面密度</strong><small>控制面板的间距与信息密度</small></div><span className="setting-value">紧凑</span></div>
    <div className="setting-row"><div><strong>本地存档</strong><small>每次操作自动保存到浏览器</small></div><span className="save-ok"><span className="status-dot" />已同步</span></div>
    <button className="reset-button" onClick={() => { reset(); onNotify('Demo 已恢复默认布局') }}><Trash2 size={15} />重置 Demo 数据</button>
  </div>
}
function RadiusControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label><span>{label}</span><input aria-label={`${label}默认显示半径`} type="range" min="0.2" max="8" step="0.1" value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><output>{value.toFixed(1)} u</output></label> }
function ZoomThresholdControl({ value, onChange }: { value: number; onChange: (value: number) => void }) { return <div className="zoom-threshold-control"><input aria-label="恒星系遮罩固定阈值" type="range" min="0.03125" max="1" step="0.03125" value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><output>{Number((value * 100).toFixed(3))}%</output></div> }
function LengthFactorControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label><span>{label}</span><input key={value} aria-label={label} type="number" min="0.000000000001" max="1000000000" step="any" defaultValue={value} onBlur={(event) => onChange(event.currentTarget.valueAsNumber)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label> }
function PlaceholderOverlay({ id }: { id: OverlayId }) { return <div className="placeholder-module"><div className="placeholder-icon">{id === 'tech' ? <Sparkles size={29} /> : <Map size={29} />}</div><strong>{id === 'tech' ? '科技网络正在编译' : '星图索引已就绪'}</strong><p>{id === 'tech' ? '研究节点、解锁条件和势力科技将在此处展开。' : '跨恒星系航线、跃迁节点和远端资产将在此处展开。'}</p><span>MODULE RESERVED · DEMO 0.1</span></div> }

export default App
