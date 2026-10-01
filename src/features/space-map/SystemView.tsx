import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import { ORBIT_VISUALIZATION, SPACE_MAP_LABEL, SPACE_MAP_VIEW, SPACE_MAP_VISUAL, SPACE_MAP_ZOOM } from '../../config/spaceMapVisuals'
import { calculateOrbitalAngle, doesDiscIntersectView, doesOrbitIntersectView, getStar, isProjectedPointVisible, planetTypes, projectOrbitalRadius, projectStarPosition, spaceMap, starTypes, type PlanetMapEntry } from '../../domain/spaceMap'
import { useGameStore } from '../../state/gameStore'
import { orbitalEntities } from './content'
import { OrbitingBodyVisual } from './components/OrbitingBodyVisual'
import { OrbitalEntityGlyph } from './components/OrbitalEntityGlyph'
import { SpaceMapGradientDefs } from './components/SpaceMapGradientDefs'
import { StarSystemMarkerVisual } from './components/StarSystemMarkerVisual'
import type { SystemViewProps, WorldPoint } from './types'

function closestZoomLevelIndex(zoom: number) {
  return SPACE_MAP_ZOOM.levels.reduce((closest, level, index) => Math.abs(level - zoom) < Math.abs(SPACE_MAP_ZOOM.levels[closest] - zoom) ? index : closest, 0)
}

function smoothStep(from: number, to: number, value: number) {
  const ratio = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return ratio * ratio * (3 - 2 * ratio)
}

export function SystemView({ selectedId, orbitAnimation, orbitFps, onSelect, onEnterSurface }: SystemViewProps) {
  const starDisplayRadius = useGameStore((state) => state.starDisplayRadius)
  const planetDisplayRadius = useGameStore((state) => state.planetDisplayRadius)
  const moonDisplayRadius = useGameStore((state) => state.moonDisplayRadius)
  const orbitalEntityDisplayRadius = useGameStore((state) => state.orbitalEntityDisplayRadius)
  const overviewMarkerMinZoom = useGameStore((state) => state.overviewMarkerMinZoom)
  const starAuLengthFactor = useGameStore((state) => state.starAuLengthFactor)
  const planetAuLengthFactor = useGameStore((state) => state.planetAuLengthFactor)
  const moonAuLengthFactor = useGameStore((state) => state.moonAuLengthFactor)
  const [time, setTime] = useState(0)
  const [zoom, setZoom] = useState<number>(SPACE_MAP_ZOOM.initial)
  const [pan, setPan] = useState<WorldPoint>({ x: 0, y: 0 })
  const [focusedStar, setFocusedStar] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const zoomRef = useRef<number>(SPACE_MAP_ZOOM.initial)
  const zoomLevelIndexRef = useRef(closestZoomLevelIndex(SPACE_MAP_ZOOM.initial))
  const lastWheelAtRef = useRef(0)
  const panRef = useRef<WorldPoint>({ x: 0, y: 0 })
  const animationRef = useRef<number | null>(null)
  const stars = useMemo(() => Object.entries(spaceMap), [])
  const starMapCenter = useMemo(() => stars.reduce((center, [, star]) => ({
    x: center.x + star.position.x / Math.max(1, stars.length),
    y: center.y + star.position.y / Math.max(1, stars.length)
  }), { x: 0, y: 0 }), [stars])
  const projectedStars = useMemo(() => stars.map(([starId, star]) => ({
    starId,
    star,
    point: projectStarPosition(star.position, starMapCenter, starAuLengthFactor)
  })), [stars, starMapCenter, starAuLengthFactor])
  const starPosition = (position: WorldPoint) => projectStarPosition(position, starMapCenter, starAuLengthFactor)
  const labelOpacity = smoothStep(0.5, 1, zoom)
  const metaOpacity = smoothStep(1, SPACE_MAP_ZOOM.systemDetail, zoom)
  const systemOpacity = smoothStep(1, SPACE_MAP_ZOOM.systemDetail, zoom)
  const entityOpacity = smoothStep(SPACE_MAP_ZOOM.systemDetail, SPACE_MAP_ZOOM.entityDetail, zoom)
  const renderedStarRadius = starDisplayRadius * SPACE_MAP_VISUAL.celestialRadiusUnitScale
  const renderedOrbitalEntityRadius = orbitalEntityDisplayRadius * SPACE_MAP_VISUAL.celestialRadiusUnitScale
  const worldCenter = { x: (SPACE_MAP_VIEW.centerX - pan.x) / zoom, y: (SPACE_MAP_VIEW.centerY - pan.y) / zoom }
  const nearestStarId = useMemo(() => projectedStars.reduce<{ id: string; distance: number } | undefined>((nearest, projected) => {
    const distance = Math.hypot(projected.point.x - worldCenter.x, projected.point.y - worldCenter.y)
    return !nearest || distance < nearest.distance ? { id: projected.starId, distance } : nearest
  }, undefined)?.id ?? '', [projectedStars, worldCenter.x, worldCenter.y])
  const activeStarId = focusedStar ?? nearestStarId ?? stars[0]?.[0] ?? 'Solar'
  const activeStar = getStar(activeStarId)
  const detailMode = systemOpacity > SPACE_MAP_VISUAL.detailModeOpacityThreshold
  const cameraViewBox = useMemo(() => ({
    x: -pan.x / zoom,
    y: -pan.y / zoom,
    width: SPACE_MAP_VIEW.width / zoom,
    height: SPACE_MAP_VIEW.height / zoom
  }), [pan.x, pan.y, zoom])
  const visibleStars = useMemo(() => projectedStars.filter(({ starId, star, point }) => {
    if (detailMode && starId === activeStarId) return true
    const outerOrbit = Object.values(star.planet).reduce((largest, planet) => Math.max(largest, projectOrbitalRadius(planet.position?.orbitalRadius ?? 0, planetAuLengthFactor)), 0)
    const overviewRadius = outerOrbit * Math.max(1, overviewMarkerMinZoom / zoom)
    const padding = detailMode
      ? SPACE_MAP_VISUAL.cullingPadding / zoom
      : Math.max(SPACE_MAP_VISUAL.cullingPadding / zoom, overviewRadius + SPACE_MAP_VISUAL.overviewPadding / zoom)
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
        setTime((value) => value + elapsed / ORBIT_VISUALIZATION.timeUnitMs)
      }
      animationFrame = window.requestAnimationFrame(renderFrame)
    }
    animationFrame = window.requestAnimationFrame(renderFrame)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [orbitAnimation, orbitFps, detailMode])

  const animateViewport = (nextZoom: number, nextPan: WorldPoint, duration: number = SPACE_MAP_ZOOM.defaultAnimationMs) => {
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current)
    const startZoom = zoomRef.current
    const startPan = panRef.current
    const startedAt = performance.now()
    const frame = (now: number) => {
      const linear = Math.min(1, (now - startedAt) / duration)
      const eased = linear < 0.5 ? 4 * linear * linear * linear : 1 - Math.pow(-2 * linear + 2, 3) / 2
      const currentZoom = startZoom + (nextZoom - startZoom) * eased
      const currentPan = {
        x: startPan.x + (nextPan.x - startPan.x) * eased,
        y: startPan.y + (nextPan.y - startPan.y) * eased
      }
      zoomRef.current = currentZoom
      panRef.current = currentPan
      setZoom(currentZoom)
      setPan(currentPan)
      if (linear < 1) animationRef.current = window.requestAnimationFrame(frame)
      else animationRef.current = null
    }
    animationRef.current = window.requestAnimationFrame(frame)
  }

  const focusWorldPoint = (point: WorldPoint, targetZoom: number = SPACE_MAP_ZOOM.systemDetail) => {
    const levelIndex = closestZoomLevelIndex(targetZoom)
    const snappedZoom = SPACE_MAP_ZOOM.levels[levelIndex]
    zoomLevelIndexRef.current = levelIndex
    animateViewport(snappedZoom, {
      x: SPACE_MAP_VIEW.centerX - point.x * snappedZoom,
      y: SPACE_MAP_VIEW.centerY - point.y * snappedZoom
    }, SPACE_MAP_ZOOM.focusAnimationMs)
  }

  useEffect(() => () => {
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current)
  }, [])

  useEffect(() => {
    const entity = orbitalEntities.find((item) => item.id === selectedId)
    if (!entity) return
    const star = getStar(entity.starId)
    if (!star) return
    const starPoint = starPosition(star.position)
    setFocusedStar(entity.starId)
    focusWorldPoint(
      { x: starPoint.x + entity.position.x, y: starPoint.y + entity.position.y },
      entity.kind === 'station' ? SPACE_MAP_ZOOM.stationFocus : SPACE_MAP_ZOOM.shipFocus
    )
  }, [selectedId])

  const onWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const now = performance.now()
    if (now - lastWheelAtRef.current < SPACE_MAP_ZOOM.wheelThrottleMs) return
    lastWheelAtRef.current = now
    const rect = event.currentTarget.getBoundingClientRect()
    const cursor = {
      x: ((event.clientX - rect.left) / rect.width) * SPACE_MAP_VIEW.width,
      y: ((event.clientY - rect.top) / rect.height) * SPACE_MAP_VIEW.height
    }
    const direction = event.deltaY < 0 ? 1 : -1
    const nextLevelIndex = Math.min(SPACE_MAP_ZOOM.levels.length - 1, Math.max(0, zoomLevelIndexRef.current + direction))
    if (nextLevelIndex === zoomLevelIndexRef.current) return
    zoomLevelIndexRef.current = nextLevelIndex
    const nextZoom = SPACE_MAP_ZOOM.levels[nextLevelIndex]
    const worldPoint = { x: (cursor.x - panRef.current.x) / zoomRef.current, y: (cursor.y - panRef.current.y) / zoomRef.current }
    animateViewport(nextZoom, { x: cursor.x - worldPoint.x * nextZoom, y: cursor.y - worldPoint.y * nextZoom }, SPACE_MAP_ZOOM.wheelAnimationMs)
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 2) return
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current)
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ x: event.clientX, y: event.clientY, panX: panRef.current.x, panY: panRef.current.y })
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag) return
    const rect = event.currentTarget.getBoundingClientRect()
    const nextPan = {
      x: drag.panX + (event.clientX - drag.x) * SPACE_MAP_VIEW.width / rect.width,
      y: drag.panY + (event.clientY - drag.y) * SPACE_MAP_VIEW.height / rect.height
    }
    panRef.current = nextPan
    setPan(nextPan)
  }

  const clearFocus = () => {
    setFocusedStar(null)
    onSelect(null)
  }

  const renderOrbitingBodies = (entries: [string, PlanetMapEntry][], systemPoint: WorldPoint, centerX = 0, centerY = 0, depth = 0, path = ''): ReactNode[] => entries.map(([bodyId, body], index) => {
    const orbit = projectOrbitalRadius(body.position?.orbitalRadius ?? 0, depth === 0 ? planetAuLengthFactor : moonAuLengthFactor)
    const period = body.position?.orbitalPeriod ?? 0
    const initialAngle = ((index * ORBIT_VISUALIZATION.siblingAngleStepDegrees + depth * ORBIT_VISUALIZATION.depthAngleStepDegrees) * Math.PI) / 180
    const angle = calculateOrbitalAngle(time, period, initialAngle)
    const x = centerX + Math.cos(angle) * orbit
    const y = centerY + Math.sin(angle) * orbit
    const bodySelected = selectedId === bodyId
    const hasSurface = (body.surface?.resource?.length ?? 0) > 0
    const displayRadius = depth === 0 ? planetDisplayRadius : moonDisplayRadius
    const radius = displayRadius * SPACE_MAP_VISUAL.celestialRadiusUnitScale
    const bodyPath = path ? `${path}/${bodyId}` : bodyId
    const children = Object.entries(body.planet ?? {}) as [string, PlanetMapEntry][]
    const absoluteCenter = { x: systemPoint.x + centerX, y: systemPoint.y + centerY }
    const absoluteBody = { x: systemPoint.x + x, y: systemPoint.y + y }
    const orbitVisible = doesOrbitIntersectView(absoluteCenter, orbit, cameraViewBox, SPACE_MAP_VISUAL.orbitCullingPadding / zoom)
    const bodyVisible = doesDiscIntersectView(absoluteBody, radius, cameraViewBox, SPACE_MAP_VISUAL.bodyCullingPadding / zoom)
    const childNodes = children.length > 0 ? renderOrbitingBodies(children, systemPoint, x, y, depth + 1, bodyPath) : []
    if (!orbitVisible && !bodyVisible && !childNodes.some(Boolean)) return null
    return <g key={bodyPath} className={`body-group ${bodySelected ? 'selected' : ''}`} onClick={(event) => { event.stopPropagation(); onSelect(bodyId, 'body') }} onDoubleClick={(event) => { event.stopPropagation(); if (hasSurface) onEnterSurface(bodyId) }}>
      {orbitVisible && <circle cx={centerX} cy={centerY} r={orbit} className={depth === 0 ? 'orbit-line' : 'orbit-line moon-orbit'} vectorEffect="non-scaling-stroke" />}
      {bodyVisible && <OrbitingBodyVisual x={x} y={y} radius={radius} zoom={zoom} depth={depth} bodyId={bodyId} selected={bodySelected} hasSurface={hasSurface} typeName={planetTypes[body.planetType ?? '']?.displayName ?? (depth === 0 ? '行星' : '卫星')} labelOpacity={depth === 0 ? metaOpacity : systemOpacity} />}
      {childNodes}
    </g>
  })

  return <div className="system-canvas">
    <div className="scene-label"><span className="scene-kicker">{detailMode ? 'STAR SYSTEM / CONTINUOUS SPACE' : 'GALACTIC MAP / SPACE'}</span><strong>{detailMode ? activeStar?.displayName ?? '恒星系' : '深空星图'}</strong><small>{detailMode ? `${starTypes[activeStar?.starType ?? '']?.displayName ?? '恒星系'} · 连续空间倍率 ${zoom.toFixed(2)}×` : '滚轮缩放 · 右键拖动 · 空白处取消选择'}</small></div>
    <svg className="system-svg map-galaxy" viewBox={`${cameraViewBox.x} ${cameraViewBox.y} ${cameraViewBox.width} ${cameraViewBox.height}`} onContextMenu={(event) => event.preventDefault()} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
      <SpaceMapGradientDefs />
      <rect x={cameraViewBox.x} y={cameraViewBox.y} width={cameraViewBox.width} height={cameraViewBox.height} fill="transparent" onClick={clearFocus} />
      {visibleStars.map(({ starId, star, point }) => {
        const selected = selectedId === starId || focusedStar === starId
        const planets = Object.entries(star.planet)
        const outerOrbit = planets.reduce((largest, [, planet]) => Math.max(largest, projectOrbitalRadius(planet.position?.orbitalRadius ?? 0, planetAuLengthFactor)), 0) || SPACE_MAP_VISUAL.fallbackOuterOrbit
        const overviewRadius = outerOrbit * Math.max(1, overviewMarkerMinZoom / zoom)
        const overviewOpacity = 1 - systemOpacity
        return <g key={starId} transform={`translate(${point.x} ${point.y})`}>
          <g className={`map-star ${selected ? 'selected' : ''}`} onClick={(event) => { event.stopPropagation(); setFocusedStar(starId); onSelect(starId, 'body') }} onDoubleClick={(event) => { event.stopPropagation(); setFocusedStar(starId); focusWorldPoint(point) }}><StarSystemMarkerVisual name={star.displayName} typeName={starTypes[star.starType ?? '']?.displayName ?? '恒星'} planetCount={planets.length} zoom={zoom} overviewRadius={overviewRadius} starRadius={renderedStarRadius} overviewOpacity={overviewOpacity} systemOpacity={systemOpacity} labelOpacity={labelOpacity} metaOpacity={metaOpacity} /></g>
          {starId === activeStarId && systemOpacity > 0 && <g opacity={systemOpacity} className="system-detail-layer" pointerEvents={systemOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? 'auto' : 'none'}>
            {renderOrbitingBodies(planets as [string, PlanetMapEntry][], point)}
            <g opacity={entityOpacity} pointerEvents={entityOpacity > SPACE_MAP_VISUAL.entityPointerOpacityThreshold ? 'auto' : 'none'}>{orbitalEntities.filter((entity) => entity.starId === starId).map((entity) => <g key={entity.id} className={`space-entity ${entity.kind === 'ship' ? 'ship-entity' : ''} ${selectedId === entity.id ? 'selected' : ''}`} transform={`translate(${entity.position.x} ${entity.position.y})`} onClick={(event) => { event.stopPropagation(); onSelect(entity.id, entity.kind) }} onDoubleClick={(event) => { event.stopPropagation(); focusWorldPoint({ x: point.x + entity.position.x, y: point.y + entity.position.y }, entity.kind === 'station' ? SPACE_MAP_ZOOM.stationFocus : SPACE_MAP_ZOOM.shipFocus) }}>
              <OrbitalEntityGlyph kind={entity.kind} radius={renderedOrbitalEntityRadius} />
              <text x="0" y={renderedOrbitalEntityRadius + SPACE_MAP_VISUAL.textOffset.entityLabel / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.label / zoom}px` }} className="entity-label">{entity.name}</text>
            </g>)}</g>
          </g>}
        </g>
      })}
    </svg>
    <div className="system-legend"><span><i className="legend-dot star" />恒星系</span><span><i className="legend-dot planet" />行星</span><span><i className="legend-dot station" />右键拖动</span></div>
    <div className="time-card"><div className="time-card-head"><span>{detailMode ? '恒星系缩放级别' : '星图缩放级别'}</span><span className="cyan">{Number((zoom * 100).toFixed(3))}%</span></div><strong>{detailMode ? activeStar?.displayName ?? 'SYSTEM' : `${stars.length} SYSTEMS`}</strong><div className="time-line"><span style={{ width: `${Math.min(100, Math.max(2, (zoomLevelIndexRef.current / (SPACE_MAP_ZOOM.levels.length - 1)) * 100))}%` }} /></div><small>{SPACE_MAP_LABEL.minimumZoomPercent}% — {SPACE_MAP_LABEL.maximumZoomPercent}% · 每级 2×</small></div>
  </div>
}
