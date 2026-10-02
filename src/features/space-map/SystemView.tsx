import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import { SPACE_MAP_LABEL, SPACE_MAP_VIEW, SPACE_MAP_VISUAL, SPACE_MAP_ZOOM } from '../../config/spaceMapVisuals'
import { doesDiscIntersectView, doesOrbitIntersectView, getStar, isProjectedPointVisible, planetTypes, projectOrbitalRadius, projectStarPosition, spaceMap, starTypes, type PlanetMapEntry } from '../../domain/spaceMap'
import { findCelestialLocalPosition, getOrbitalOffset } from '../../domain/orbitalPosition'
import { useGameStore } from '../../state/gameStore'
import { getOrbitalTimeSeconds, subscribeOrbitalTime } from '../../state/orbitalClock'
import { getOrbitalObjects, objectRepository, type MovementCapability } from '../../domain/objects'
import { CornerFrame } from './components/CornerFrame'
import { OrbitingBodyVisual } from './components/OrbitingBodyVisual'
import { OrbitalEntityGlyph } from './components/OrbitalEntityGlyph'
import { SpaceMapGradientDefs } from './components/SpaceMapGradientDefs'
import { StarSystemMarkerVisual } from './components/StarSystemMarkerVisual'
import { orbitalIconWorldRadius } from './orbitalEntityScale'
import type { SystemViewProps, WorldPoint } from './types'

function closestZoomLevelIndex(zoom: number) {
  return SPACE_MAP_ZOOM.levels.reduce((closest, level, index) => Math.abs(level - zoom) < Math.abs(SPACE_MAP_ZOOM.levels[closest] - zoom) ? index : closest, 0)
}

function smoothStep(from: number, to: number, value: number) {
  const ratio = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return ratio * ratio * (3 - 2 * ratio)
}

function isMarkerInsideSelection(element: SVGGElement, left: number, top: number, right: number, bottom: number) {
  const matrix = element.getScreenCTM()
  if (!matrix) return false
  const localX = Number(element.dataset.selectableX ?? 0)
  const localY = Number(element.dataset.selectableY ?? 0)
  const screenX = matrix.a * localX + matrix.c * localY + matrix.e
  const screenY = matrix.b * localX + matrix.d * localY + matrix.f
  return screenX >= left && screenX <= right && screenY >= top && screenY <= bottom
}

export function SystemView({ selectedIds, focusRequest, onSelect, onEnterSurface, onNotify }: SystemViewProps) {
  useGameStore((state) => state.objectRevision)
  const orbitalEntities = getOrbitalObjects()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; actorIds: string[]; targetId?: string; position?: WorldPoint; actions: { id: string; label: string }[] } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [shiftDrag, setShiftDrag] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null)
  const suppressClickRef = useRef(false)
  const starDisplayRadius = useGameStore((state) => state.starDisplayRadius)
  const planetDisplayRadius = useGameStore((state) => state.planetDisplayRadius)
  const moonDisplayRadius = useGameStore((state) => state.moonDisplayRadius)
  const orbitalEntityDisplayRadius = useGameStore((state) => state.orbitalEntityDisplayRadius)
  const objectIconMinZoom = useGameStore((state) => state.objectIconMinZoom)
  const objectIconMaxZoom = useGameStore((state) => state.objectIconMaxZoom)
  const celestialNamesAlwaysVisible = useGameStore((state) => state.celestialNamesAlwaysVisible)
  const objectNamesAlwaysVisible = useGameStore((state) => state.objectNamesAlwaysVisible)
  const overviewMarkerMinZoom = useGameStore((state) => state.overviewMarkerMinZoom)
  const starAuLengthFactor = useGameStore((state) => state.starAuLengthFactor)
  const planetAuLengthFactor = useGameStore((state) => state.planetAuLengthFactor)
  const moonAuLengthFactor = useGameStore((state) => state.moonAuLengthFactor)
  const time = useSyncExternalStore(subscribeOrbitalTime, getOrbitalTimeSeconds)
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
  const renderedOrbitalEntityRadius = orbitalIconWorldRadius(
    orbitalEntityDisplayRadius * SPACE_MAP_VISUAL.celestialRadiusUnitScale,
    zoom,
    objectIconMinZoom,
    objectIconMaxZoom
  )
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
    if (!contextMenu) return
    const dismissOnLeftPointerDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0 || contextMenuRef.current?.contains(event.target as Node)) return
      setContextMenu(null)
    }
    document.addEventListener('pointerdown', dismissOnLeftPointerDown, true)
    return () => document.removeEventListener('pointerdown', dismissOnLeftPointerDown, true)
  }, [contextMenu])

  useEffect(() => {
    if (!focusRequest) return
    const entity = orbitalEntities.find((item) => item.id === focusRequest.objectId)
    if (!entity?.position) return
    const starId = String(entity.staticData.starId)
    const star = getStar(starId)
    if (!star) return
    const position = entity.position
    const starPoint = starPosition(star.position)
    setFocusedStar(starId)
    focusWorldPoint(
      { x: starPoint.x + position.x, y: starPoint.y + position.y },
      entity.kind === 'station' ? SPACE_MAP_ZOOM.stationFocus : SPACE_MAP_ZOOM.shipFocus
    )
  }, [focusRequest?.requestId])

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
    if (event.button === 0 && event.shiftKey) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setShiftDrag({ startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY })
      return
    }
    if (event.button !== 2) return
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current)
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ x: event.clientX, y: event.clientY, panX: panRef.current.x, panY: panRef.current.y })
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (shiftDrag) { setShiftDrag({ ...shiftDrag, x: event.clientX, y: event.clientY }); return }
    if (!drag) return
    const rect = event.currentTarget.getBoundingClientRect()
    const nextPan = {
      x: drag.panX + (event.clientX - drag.x) * SPACE_MAP_VIEW.width / rect.width,
      y: drag.panY + (event.clientY - drag.y) * SPACE_MAP_VIEW.height / rect.height
    }
    panRef.current = nextPan
    setPan(nextPan)
  }

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    setDrag(null)
    if (!shiftDrag) return
    const left = Math.min(shiftDrag.startX, event.clientX), right = Math.max(shiftDrag.startX, event.clientX)
    const top = Math.min(shiftDrag.startY, event.clientY), bottom = Math.max(shiftDrag.startY, event.clientY)
    if (right - left > 5 || bottom - top > 5) {
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
      const matches = [...event.currentTarget.querySelectorAll<SVGGElement>('[data-selectable-id]')]
        .filter((element) => isMarkerInsideSelection(element, left, top, right, bottom))
      const entries = matches.map(element => ({ id: element.dataset.selectableId!, kind: element.dataset.selectableKind as 'body' | 'ship' | 'station' }))
      if (!entries.length) onSelect(null)
      else entries.forEach((entry, index) => onSelect(entry.id, entry.kind, index > 0))
    }
    setShiftDrag(null)
  }

  const clearFocus = () => {
    setFocusedStar(null)
    onSelect(null)
  }

  const openContextMenu = (event: React.MouseEvent<SVGElement>, targetId?: string) => {
    event.preventDefault()
    event.stopPropagation()
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement
    const rect = svg?.getBoundingClientRect()
    if (!rect) return
    const actors = useGameStore.getState().selectedIds
    const selfOperation = Boolean(targetId && (!actors.length || (actors.length === 1 && actors[0] === targetId)))
    const actorIds = selfOperation ? [targetId!] : actors
    const worldPosition = !targetId && actors.length ? (() => {
      const world = { x: cameraViewBox.x + (event.clientX - rect.left) / rect.width * cameraViewBox.width, y: cameraViewBox.y + (event.clientY - rect.top) / rect.height * cameraViewBox.height }
      const starId = String(objectRepository.get(actorIds[0]!)?.staticData.starId ?? activeStarId)
      const star = getStar(starId)
      if (!star) return world
      const origin = starPosition(star.position)
      return { x: world.x - origin.x, y: world.y - origin.y }
    })() : undefined
    const targetObject = targetId ? objectRepository.get(targetId) : undefined
    const celestialPosition = targetId ? findCelestialLocalPosition(targetId, time, planetAuLengthFactor, moonAuLengthFactor)?.position : undefined
    const actions = objectRepository.actionsFor(actorIds).filter(action => selfOperation ? !action.target : Boolean(targetId && action.target && (!action.targetCapability || targetObject?.capabilities.some(capability => capability.id === action.targetCapability))))
    if (worldPosition && objectRepository.actionsFor(actorIds).some(action => action.id === 'move')) actions.push({ id: 'move', label: '前往此处' })
    if (!actions.length) { setContextMenu(null); return }
    setContextMenu({ x: event.clientX, y: event.clientY, actorIds, targetId: selfOperation ? undefined : targetId, position: worldPosition ?? celestialPosition, actions })
  }

  const renderOrbitingBodies = (entries: [string, PlanetMapEntry][], systemPoint: WorldPoint, centerX = 0, centerY = 0, depth = 0, path = ''): ReactNode[] => entries.map(([bodyId, body], index) => {
    const offset = getOrbitalOffset(body, index, depth, time, planetAuLengthFactor, moonAuLengthFactor)
    const orbit = offset.radius
    const x = centerX + offset.x
    const y = centerY + offset.y
    const bodyPath = `${path}/${bodyId}`
    const bodySelected = selectedIds.includes(bodyPath)
    const hasSurface = (body.surface?.resource?.length ?? 0) > 0
    const displayRadius = depth === 0 ? planetDisplayRadius : moonDisplayRadius
    const radius = displayRadius * SPACE_MAP_VISUAL.celestialRadiusUnitScale
    const children = Object.entries(body.planet ?? {}) as [string, PlanetMapEntry][]
    const absoluteCenter = { x: systemPoint.x + centerX, y: systemPoint.y + centerY }
    const absoluteBody = { x: systemPoint.x + x, y: systemPoint.y + y }
    const orbitVisible = doesOrbitIntersectView(absoluteCenter, orbit, cameraViewBox, SPACE_MAP_VISUAL.orbitCullingPadding / zoom)
    const bodyVisible = doesDiscIntersectView(absoluteBody, radius, cameraViewBox, SPACE_MAP_VISUAL.bodyCullingPadding / zoom)
    const childNodes = children.length > 0 ? renderOrbitingBodies(children, systemPoint, x, y, depth + 1, bodyPath) : []
    if (!orbitVisible && !bodyVisible && !childNodes.some(Boolean)) return null
    return <g key={bodyPath} data-selectable-id={bodyVisible && systemOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? bodyPath : undefined} data-selectable-kind="body" data-selectable-x={x} data-selectable-y={y} className={`body-group ${bodySelected ? 'selected' : ''}`} onContextMenu={(event) => openContextMenu(event, bodyPath)} onClick={(event) => { if (suppressClickRef.current) { suppressClickRef.current = false; return }; event.stopPropagation(); onSelect(bodyPath, 'body', event.ctrlKey || event.metaKey, { x, y }) }} onDoubleClick={(event) => { event.stopPropagation(); if (hasSurface) onEnterSurface(bodyId) }}>
      {orbitVisible && <circle cx={centerX} cy={centerY} r={orbit} className={depth === 0 ? 'orbit-line' : 'orbit-line moon-orbit'} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
      {bodyVisible && <OrbitingBodyVisual x={x} y={y} radius={radius} zoom={zoom} depth={depth} bodyId={bodyId} selected={bodySelected} hasSurface={hasSurface} typeName={planetTypes[body.planetType ?? '']?.displayName ?? (depth === 0 ? '行星' : '卫星')} labelOpacity={depth === 0 ? metaOpacity : systemOpacity} />}
      {childNodes}
    </g>
  })

  return <div className="system-canvas" onClickCapture={(event) => {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }}>
    <div className="scene-label"><span className="scene-kicker">{detailMode ? 'STAR SYSTEM / CONTINUOUS SPACE' : 'GALACTIC MAP / SPACE'}</span><strong>{detailMode ? activeStar?.displayName ?? '恒星系' : '深空星图'}</strong><small>{detailMode ? `${starTypes[activeStar?.starType ?? '']?.displayName ?? '恒星系'} · 连续空间倍率 ${zoom.toFixed(2)}×` : '滚轮缩放 · 右键拖动 · 空白处取消选择'}</small></div>
    <svg className={`system-svg map-galaxy ${celestialNamesAlwaysVisible ? '' : 'celestial-names-hover-only'} ${objectNamesAlwaysVisible ? '' : 'object-names-hover-only'}`} viewBox={`${cameraViewBox.x} ${cameraViewBox.y} ${cameraViewBox.width} ${cameraViewBox.height}`} onContextMenu={(event) => { event.preventDefault(); if (event.target === event.currentTarget) openContextMenu(event) }} onClick={(event) => { if (suppressClickRef.current) { suppressClickRef.current = false; event.preventDefault() } }} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { setDrag(null); setShiftDrag(null) }}>
      <SpaceMapGradientDefs />
      <rect x={cameraViewBox.x} y={cameraViewBox.y} width={cameraViewBox.width} height={cameraViewBox.height} fill="transparent" onContextMenu={(event) => openContextMenu(event)} onClick={clearFocus} />
      {visibleStars.map(({ starId, star, point }) => {
        const selected = selectedIds.includes(starId) || focusedStar === starId
        const planets = Object.entries(star.planet)
        const outerOrbit = planets.reduce((largest, [, planet]) => Math.max(largest, projectOrbitalRadius(planet.position?.orbitalRadius ?? 0, planetAuLengthFactor)), 0) || SPACE_MAP_VISUAL.fallbackOuterOrbit
        const overviewRadius = outerOrbit * Math.max(1, overviewMarkerMinZoom / zoom)
        const overviewOpacity = 1 - systemOpacity
        return <g key={starId} transform={`translate(${point.x} ${point.y})`}>
          <g data-selectable-id={starId} data-selectable-kind="body" className={`map-star ${selected ? 'selected' : ''}`} onContextMenu={(event) => openContextMenu(event, starId)} onClick={(event) => { if (suppressClickRef.current) { suppressClickRef.current = false; return }; event.stopPropagation(); setFocusedStar(starId); onSelect(starId, 'body', event.ctrlKey || event.metaKey, { x: 0, y: 0 }) }} onDoubleClick={(event) => { event.stopPropagation(); setFocusedStar(starId); focusWorldPoint(point) }}><StarSystemMarkerVisual name={star.displayName} typeName={starTypes[star.starType ?? '']?.displayName ?? '恒星'} planetCount={planets.length} zoom={zoom} overviewRadius={overviewRadius} starRadius={renderedStarRadius} overviewOpacity={overviewOpacity} systemOpacity={systemOpacity} labelOpacity={labelOpacity} metaOpacity={metaOpacity} /></g>
          {starId === activeStarId && systemOpacity > 0 && <g opacity={systemOpacity} className="system-detail-layer" pointerEvents={systemOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? 'auto' : 'none'}>
            {renderOrbitingBodies(planets as [string, PlanetMapEntry][], point, 0, 0, 0, starId)}
            <g opacity={entityOpacity} pointerEvents={entityOpacity > SPACE_MAP_VISUAL.entityPointerOpacityThreshold ? 'auto' : 'none'}>{orbitalEntities.filter((entity) => entity.staticData.starId === starId && entity.position).map((entity) => { const position = entity.position!; const heading = entity.getCapability<MovementCapability>('movement')?.headingDegrees; const rotation = entity.kind === 'ship' && heading !== undefined ? heading + 90 : 0; return <g key={entity.id} data-selectable-id={entityOpacity > SPACE_MAP_VISUAL.entityPointerOpacityThreshold ? entity.id : undefined} data-selectable-kind={entity.kind} className={`space-entity ${entity.kind === 'ship' ? 'ship-entity' : ''} ${selectedIds.includes(entity.id) ? 'selected' : ''}`} transform={`translate(${position.x} ${position.y})`} onContextMenu={(event) => openContextMenu(event, entity.id)} onClick={(event) => { if (suppressClickRef.current) { suppressClickRef.current = false; return }; event.stopPropagation(); onSelect(entity.id, entity.kind, event.ctrlKey || event.metaKey) }} onDoubleClick={(event) => { event.stopPropagation(); focusWorldPoint({ x: point.x + position.x, y: point.y + position.y }, entity.kind === 'station' ? SPACE_MAP_ZOOM.stationFocus : SPACE_MAP_ZOOM.shipFocus) }}>
              <g className="orbital-visual" transform={`rotate(${rotation} 0 0)`}>
                <OrbitalEntityGlyph kind={entity.kind} definitionId={entity.definitionId} ownerFactionId={entity.ownerFactionId} radius={renderedOrbitalEntityRadius} />
                <CornerFrame half={renderedOrbitalEntityRadius + SPACE_MAP_VISUAL.entityCornerPadding / zoom} corner={SPACE_MAP_VISUAL.entityCornerLength / zoom} />
              </g>
              <g className="orbital-name"><text x="0" y={renderedOrbitalEntityRadius + SPACE_MAP_VISUAL.textOffset.entityLabel / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.label / zoom}px` }} className="entity-label">{entity.displayName}</text></g>
            </g>})}</g>
          </g>}
        </g>
      })}
    </svg>
    {shiftDrag && <div className="selection-box" style={{ left: Math.min(shiftDrag.startX, shiftDrag.x), top: Math.min(shiftDrag.startY, shiftDrag.y), width: Math.abs(shiftDrag.x - shiftDrag.startX), height: Math.abs(shiftDrag.y - shiftDrag.startY) }} />}
    {contextMenu && <div ref={contextMenuRef} className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}><small>{contextMenu.targetId ? 'OBJECT TO DO' : contextMenu.position ? 'ORDER / POSITION' : 'TO OBJECT'}</small>{contextMenu.actions.map(action => <button key={action.id} onClick={() => { if (action.id === 'warp-to') { onNotify('跃迁到功能尚未实现'); setContextMenu(null); return } const accepted = useGameStore.getState().executeObjectAction(action.id, contextMenu.targetId, contextMenu.position, contextMenu.actorIds); if (!accepted) onNotify('目标位置不可用或不在当前恒星系'); setContextMenu(null) }}>{action.label}</button>)}</div>}
    <div className="system-legend"><span><i className="legend-dot star" />恒星系</span><span><i className="legend-dot planet" />行星</span><span><i className="legend-dot station" />右键操作</span></div>
    <div className="time-card"><div className="time-card-head"><span>{detailMode ? '恒星系缩放级别' : '星图缩放级别'}</span><span className="cyan">{Number((zoom * 100).toFixed(3))}%</span></div><strong>{detailMode ? activeStar?.displayName ?? 'SYSTEM' : `${stars.length} SYSTEMS`}</strong><div className="time-line"><span style={{ width: `${Math.min(100, Math.max(2, (zoomLevelIndexRef.current / (SPACE_MAP_ZOOM.levels.length - 1)) * 100))}%` }} /></div><small>{SPACE_MAP_LABEL.minimumZoomPercent}% — {SPACE_MAP_LABEL.maximumZoomPercent}% · 每级 2×</small></div>
  </div>
}
