import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import { SPACE_MAP_CANVAS, SPACE_MAP_LABEL, SPACE_MAP_VIEW, SPACE_MAP_VISUAL, SPACE_MAP_ZOOM } from '../../config/spaceMapVisuals'
import { doesDiscIntersectView, doesOrbitIntersectView, getStar, isProjectedPointVisible, planetTypes, projectOrbitalRadius, projectStarPosition, spaceMap, starTypes, type PlanetMapEntry } from '../../domain/spaceMap'
import { findCelestialLocalPosition, getOrbitalOffset } from '../../domain/orbitalPosition'
import { useGameStore } from '../../state/gameStore'
import { getOrbitalTimeSeconds, subscribeOrbitalTime } from '../../state/orbitalClock'
import { getOrbitalObjects, isMovementTaskAction, isPlayerControllable, objectRepository, TaskQueueCapability, type MovementCapability, type ObjectAction } from '../../domain/objects'
import { worldUnitsPerKm } from '../../domain/orbitalSpace'
import { CornerFrame } from './components/CornerFrame'
import { OrbitingBodyVisual } from './components/OrbitingBodyVisual'
import { OrbitalEntityGlyph } from './components/OrbitalEntityGlyph'
import { SpaceMapGradientDefs } from './components/SpaceMapGradientDefs'
import { StarSystemMarkerVisual } from './components/StarSystemMarkerVisual'
import { SpaceMapDotGrid } from './components/SpaceMapDotGrid'
import { ScreenSpaceLabels, type ScreenMapLabel } from './components/ScreenSpaceLabels'
import { orbitalIconWorldRadius } from './orbitalEntityScale'
import { TargetingGuide } from './components/TargetingGuide'
import { MapTaskIcon } from './components/MapTaskIcon'
import { collectVisiblePlanetIds } from './visibleObjectIds'
import { formatMapAuCoordinate, formatSvgCoordinate, worldPointToMapAu } from './cursorCoordinates'
import { smoothStep, starLayerOpacities } from './starLayerOpacity'
import { clipLineToView, createRenderSpace } from './renderSpace'
import { cameraPlanePoint, cameraViewForViewport, mapViewportForCanvas } from './mapViewport'
import { useCameraKeyboardPan } from '../../shared/camera/useCameraKeyboardPan'
import { SquarePlus } from 'lucide-react'
import { resolveObjectActionIcon } from '../action-bar/objectActionIcons'
import type { SystemViewProps, WorldPoint } from './types'

function closestZoomLevelIndex(zoom: number) {
  return SPACE_MAP_ZOOM.levels.reduce((closest, level, index) => Math.abs(level - zoom) < Math.abs(SPACE_MAP_ZOOM.levels[closest] - zoom) ? index : closest, 0)
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

type TaskMarkerDrag = { objectId: string; taskId: string; pointerId: number; startX: number; startY: number; offset: WorldPoint; point: WorldPoint }
const TASK_MARKER_COLORS = { focused: '#a8ffc7', active: '#b8edff' } as const

export function SystemView({ selectedIds, targetingAction, focusedTask, focusRequest, onSelect, onBeginTargetAction, onBeginDistanceAction, onConfirmDistanceAction, onFocusTask, onEnterSurface, onNotify, onOpenInventory, onVisibleObjectIdsChange }: SystemViewProps) {
  const objectRevision = useGameStore((state) => state.objectRevision)
  const orbitalEntities = getOrbitalObjects()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; actorIds: string[]; selfOperation: boolean; targetId?: string; position?: WorldPoint; positionStarId?: string; actions: ObjectAction[] } | null>(null)
  const [shiftHeld, setShiftHeld] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [shiftDrag, setShiftDrag] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null)
  const [targetCursor, setTargetCursor] = useState<WorldPoint | null>(null)
  const [taskDrag, setTaskDrag] = useState<TaskMarkerDrag | null>(null)
  const suppressClickRef = useRef(false)
  const starDisplayRadius = useGameStore((state) => state.starDisplayRadius)
  const planetDisplayRadius = useGameStore((state) => state.planetDisplayRadius)
  const moonDisplayRadius = useGameStore((state) => state.moonDisplayRadius)
  const orbitalEntityDisplayRadius = useGameStore((state) => state.orbitalEntityDisplayRadius)
  const objectIconMinZoom = useGameStore((state) => state.objectIconMinZoom)
  const objectIconMaxZoom = useGameStore((state) => state.objectIconMaxZoom)
  const objectFocusZoom = useGameStore((state) => state.objectFocusZoom)
  const celestialNamesAlwaysVisible = useGameStore((state) => state.celestialNamesAlwaysVisible)
  const objectNamesAlwaysVisible = useGameStore((state) => state.objectNamesAlwaysVisible)
  const overviewMarkerMinZoom = useGameStore((state) => state.overviewMarkerMinZoom)
  const overviewFadeStartZoom = useGameStore((state) => state.overviewFadeStartZoom)
  const overviewFadeEndZoom = useGameStore((state) => state.overviewFadeEndZoom)
  const systemFadeStartZoom = useGameStore((state) => state.systemFadeStartZoom)
  const systemFadeEndZoom = useGameStore((state) => state.systemFadeEndZoom)
  const starMapGridSpacingAu = useGameStore((state) => state.starMapGridSpacingAu)
  const starMapGridFadeStartZoom = useGameStore((state) => state.starMapGridFadeStartZoom)
  const starMapGridFadeEndZoom = useGameStore((state) => state.starMapGridFadeEndZoom)
  const reduceMotion = useGameStore((state) => state.reduceMotion)
  const prefersReducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const starAuLengthFactor = useGameStore((state) => state.starAuLengthFactor)
  const kmToAu = useGameStore((state) => state.kmToAu)
  const planetAuLengthFactor = useGameStore((state) => state.planetAuLengthFactor)
  const moonAuLengthFactor = useGameStore((state) => state.moonAuLengthFactor)
  const time = useSyncExternalStore(subscribeOrbitalTime, getOrbitalTimeSeconds)
  const [zoom, setZoom] = useState<number>(SPACE_MAP_ZOOM.initial)
  const [pan, setPan] = useState<WorldPoint>({ x: 0, y: 0 })
  // Camera targeting is separate from global selection and only persists until manual navigation.
  const [cameraTargetStarId, setCameraTargetStarId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const zoomRef = useRef<number>(SPACE_MAP_ZOOM.initial)
  const zoomLevelIndexRef = useRef(closestZoomLevelIndex(SPACE_MAP_ZOOM.initial))
  const lastWheelAtRef = useRef(0)
  const panRef = useRef<WorldPoint>({ x: 0, y: 0 })
  const animationRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: SPACE_MAP_CANVAS.referenceMaxWidthPx, height: SPACE_MAP_CANVAS.referenceMaxWidthPx * SPACE_MAP_VIEW.height / SPACE_MAP_VIEW.width })
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const updateSize = (width: number, height: number) => {
      setCanvasSize(current => current.width === width && current.height === height ? current : { width, height })
    }
    const initialBounds = canvas.getBoundingClientRect()
    updateSize(initialBounds.width, initialBounds.height)
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      updateSize(width, height)
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])
  const mapViewport = useMemo(() => mapViewportForCanvas(canvasSize.width, canvasSize.height), [canvasSize.width, canvasSize.height])
  const cursorClientRef = useRef<WorldPoint | null>(null)
  const cursorXRef = useRef<HTMLSpanElement>(null)
  const cursorYRef = useRef<HTMLSpanElement>(null)
  const canvasXRef = useRef<HTMLSpanElement>(null)
  const canvasYRef = useRef<HTMLSpanElement>(null)
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
  const projectedStarById = useMemo(() => new Map(projectedStars.map(({ starId, point }) => [starId, point])), [projectedStars])
  const starPosition = (position: WorldPoint) => projectStarPosition(position, starMapCenter, starAuLengthFactor)
  const labelOpacity = smoothStep(0.5, 1, zoom)
  const { overviewOpacity, systemOpacity } = starLayerOpacities(zoom, { overviewFadeStartZoom, overviewFadeEndZoom, systemFadeStartZoom, systemFadeEndZoom })
  const metaOpacity = systemOpacity
  const renderedStarRadius = starDisplayRadius * SPACE_MAP_VISUAL.celestialRadiusUnitScale
  const renderedOrbitalEntityRadius = orbitalIconWorldRadius(
    orbitalEntityDisplayRadius * SPACE_MAP_VISUAL.celestialRadiusUnitScale,
    zoom,
    objectIconMinZoom,
    objectIconMaxZoom
  )
  const kmWorldScale = worldUnitsPerKm(kmToAu, starAuLengthFactor)
  const worldCenter = { x: (SPACE_MAP_VIEW.centerX - pan.x) / zoom, y: (SPACE_MAP_VIEW.centerY - pan.y) / zoom }
  const nearestStarId = useMemo(() => projectedStars.reduce<{ id: string; distance: number } | undefined>((nearest, projected) => {
    const distance = Math.hypot(projected.point.x - worldCenter.x, projected.point.y - worldCenter.y)
    return !nearest || distance < nearest.distance ? { id: projected.starId, distance } : nearest
  }, undefined)?.id ?? '', [projectedStars, worldCenter.x, worldCenter.y])
  const activeStarId = cameraTargetStarId ?? nearestStarId ?? stars[0]?.[0] ?? 'Solar'
  const activeStar = getStar(activeStarId)
  const detailMode = systemOpacity > SPACE_MAP_VISUAL.detailModeOpacityThreshold
  const cameraViewBox = useMemo(() => cameraViewForViewport(pan, zoom, mapViewport), [pan.x, pan.y, zoom, mapViewport])
  const renderSpace = createRenderSpace(cameraViewBox, projectedStarById.get(activeStarId), detailMode)
  useCameraKeyboardPan((xPixels, yPixels) => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setCameraTargetStarId(null)
    const nextPan = { x: panRef.current.x - xPixels * mapViewport.unitsPerPixel, y: panRef.current.y - yPixels * mapViewport.unitsPerPixel }
    panRef.current = nextPan
    setPan(nextPan)
  })
  const updateCursorCoordinates = (client: WorldPoint) => {
    const screenMatrix = svgRef.current?.getScreenCTM()
    if (!screenMatrix) return
    const localPoint = new DOMPoint(client.x, client.y).matrixTransform(screenMatrix.inverse())
    const coordinates = worldPointToMapAu(renderSpace.toWorld(localPoint), starMapCenter, starAuLengthFactor)
    if (cursorXRef.current) cursorXRef.current.textContent = formatMapAuCoordinate(coordinates.x, zoom, starAuLengthFactor)
    if (cursorYRef.current) cursorYRef.current.textContent = formatMapAuCoordinate(coordinates.y, zoom, starAuLengthFactor)
    if (canvasXRef.current) canvasXRef.current.textContent = formatSvgCoordinate(localPoint.x, zoom)
    if (canvasYRef.current) canvasYRef.current.textContent = formatSvgCoordinate(localPoint.y, zoom)
  }
  useEffect(() => {
    if (cursorClientRef.current) updateCursorCoordinates(cursorClientRef.current)
  }, [cameraViewBox, renderSpace.origin.x, renderSpace.origin.y, starMapCenter, starAuLengthFactor])
  const visibleStars = useMemo(() => projectedStars.filter(({ starId, star, point }) => {
    if (detailMode && starId === activeStarId) return true
    const outerOrbit = Object.values(star.planet).reduce((largest, planet) => Math.max(largest, projectOrbitalRadius(planet.position?.orbitalRadius ?? 0, planetAuLengthFactor)), 0)
    const overviewRadius = outerOrbit * Math.max(1, overviewMarkerMinZoom / zoom)
    const padding = overviewOpacity > 0
      ? Math.max(SPACE_MAP_VISUAL.cullingPadding / zoom, overviewRadius * SPACE_MAP_VISUAL.overviewGlowRadiusScale + SPACE_MAP_VISUAL.overviewPadding / zoom)
      : SPACE_MAP_VISUAL.cullingPadding / zoom
    return isProjectedPointVisible(point, cameraViewBox, padding)
  }), [projectedStars, detailMode, activeStarId, planetAuLengthFactor, overviewMarkerMinZoom, zoom, cameraViewBox, overviewOpacity])
  const visibleOrbitalEntities = orbitalEntities.flatMap((entity) => {
    const origin = projectedStarById.get(String(entity.staticData.starId))
    if (!origin || !entity.position) return []
    const point = { x: origin.x + entity.position.x, y: origin.y + entity.position.y }
    return doesDiscIntersectView(point, renderedOrbitalEntityRadius, cameraViewBox, SPACE_MAP_VISUAL.bodyCullingPadding / zoom)
      ? [{ entity, point }]
      : []
  })
  const taskMarkers = orbitalEntities.flatMap(entity => {
    const origin = projectedStarById.get(String(entity.staticData.starId))
    const tasks = entity.getCapability<TaskQueueCapability>('taskQueue')?.tasks
    if (!origin || !entity.position || !tasks?.length) return []
    let from = { x: origin.x + entity.position.x, y: origin.y + entity.position.y }
    return tasks.flatMap((task, index) => {
      const destination = task.destination
      const target = 'objectId' in destination ? objectRepository.get(destination.objectId) : undefined
      const celestial = task.actionId !== 'move' && task.targetId && !target?.position
        ? findCelestialLocalPosition(task.targetId, time, planetAuLengthFactor, moonAuLengthFactor)
        : undefined
      const starId = target?.position ? String(target.staticData.starId) : celestial?.starId ?? task.destinationStarId ?? String(entity.staticData.starId)
      const targetPosition = target?.position ?? celestial?.position ?? ('objectId' in destination ? undefined : destination)
      const targetOrigin = projectedStarById.get(starId)
      if (!targetPosition || !targetOrigin) return []
      const anchor = { x: targetOrigin.x + targetPosition.x, y: targetOrigin.y + targetPosition.y }
      const offset = task.actionId === 'warp-to' && task.offsetKm
        ? { x: task.offsetKm.x * kmWorldScale, y: task.offsetKm.y * kmWorldScale }
        : { x: 0, y: 0 }
      const point = taskDrag?.objectId === entity.id && taskDrag.taskId === task.id
        ? taskDrag.point
        : { x: anchor.x + offset.x, y: anchor.y + offset.y }
      const marker = { key: task.id, objectId: entity.id, index, from, point, anchor, actionId: task.actionId, distanceKm: task.distanceKm, offsetKm: task.offsetKm }
      from = point
      return [marker]
    })
  })
  const lastTaskPointByObject = new Map<string, WorldPoint>(taskMarkers.map((marker) => [marker.objectId, marker.point]))
  const distanceAnchor = (() => {
    if (targetingAction?.stage !== 'distance') return null
    const target = targetingAction.targetId ? objectRepository.get(targetingAction.targetId) : undefined
    const celestial = targetingAction.targetId && !target?.position
      ? findCelestialLocalPosition(targetingAction.targetId, time, planetAuLengthFactor, moonAuLengthFactor)
      : undefined
    const starId = target?.position ? String(target.staticData.starId) : celestial?.starId ?? targetingAction.targetStarId
    const position = target?.position ?? celestial?.position ?? targetingAction.targetPosition
    const origin = starId ? projectedStarById.get(starId) : undefined
    return origin && position ? { x: origin.x + position.x, y: origin.y + position.y } : null
  })()
  const distanceReadout = targetingAction?.stage === 'distance' && distanceAnchor && targetCursor
    ? {
      x: (targetCursor.x - cameraViewBox.x) / cameraViewBox.width * canvasSize.width,
      y: (targetCursor.y - cameraViewBox.y) / cameraViewBox.height * canvasSize.height,
      km: Math.hypot(targetCursor.x - distanceAnchor.x, targetCursor.y - distanceAnchor.y) / kmWorldScale
    }
    : null

  const visibilityTimeBucket = Math.floor(time * 4)
  const visibleCelestialIds = useMemo(() => {
    const ids: string[] = []
    for (const { starId, star, point } of visibleStars) {
      const outerOrbit = Object.values(star.planet).reduce((largest, planet) => Math.max(largest, projectOrbitalRadius(planet.position?.orbitalRadius ?? 0, planetAuLengthFactor)), 0) || SPACE_MAP_VISUAL.fallbackOuterOrbit
      const overviewRadius = outerOrbit * Math.max(1, overviewMarkerMinZoom / zoom) * SPACE_MAP_VISUAL.overviewGlowRadiusScale
      const markerRadius = overviewOpacity > 0 ? Math.max(overviewRadius, renderedStarRadius) : renderedStarRadius
      if (doesDiscIntersectView(point, markerRadius, cameraViewBox)) ids.push(starId)
    }
    if (systemOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold && activeStar) {
      const systemPoint = projectedStarById.get(activeStarId)
      if (systemPoint) ids.push(...collectVisiblePlanetIds(activeStar.planet as Record<string, PlanetMapEntry>, {
        starId: activeStarId, systemPoint, view: cameraViewBox, zoom, elapsedSeconds: time,
        planetAuLengthFactor, moonAuLengthFactor, planetDisplayRadius, moonDisplayRadius
      }))
    }
    return ids
  }, [visibleStars, cameraViewBox, overviewOpacity, systemOpacity, activeStar, activeStarId, projectedStarById, planetAuLengthFactor, moonAuLengthFactor, overviewMarkerMinZoom, zoom, renderedStarRadius, planetDisplayRadius, moonDisplayRadius, visibilityTimeBucket])
  const visibleObjectIds = useMemo(() => {
    const ids = [...visibleCelestialIds]
    for (const entity of orbitalEntities) {
      const origin = projectedStarById.get(String(entity.staticData.starId))
      if (!origin || !entity.position) continue
      const point = { x: origin.x + entity.position.x, y: origin.y + entity.position.y }
      if (doesDiscIntersectView(point, renderedOrbitalEntityRadius, cameraViewBox, SPACE_MAP_VISUAL.bodyCullingPadding / zoom)) ids.push(entity.id)
    }
    return ids
  }, [visibleCelestialIds, projectedStarById, renderedOrbitalEntityRadius, cameraViewBox, zoom, objectRevision])
  const visibleObjectKey = visibleObjectIds.join('|')
  useEffect(() => onVisibleObjectIdsChange(visibleObjectIds), [visibleObjectKey, onVisibleObjectIdsChange])

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

  const focusWorldPoint = (point: WorldPoint, targetZoom: number = systemFadeEndZoom) => {
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
    if (!contextMenu && !targetingAction) { setShiftHeld(false); return }
    const updateShift = (event: KeyboardEvent) => setShiftHeld(event.key === 'Shift' ? event.type === 'keydown' : event.shiftKey)
    const clearShift = () => setShiftHeld(false)
    document.addEventListener('keydown', updateShift)
    document.addEventListener('keyup', updateShift)
    window.addEventListener('blur', clearShift)
    return () => {
      document.removeEventListener('keydown', updateShift)
      document.removeEventListener('keyup', updateShift)
      window.removeEventListener('blur', clearShift)
    }
  }, [Boolean(contextMenu), Boolean(targetingAction)])

  useEffect(() => {
    if (!taskDrag) return
    const cancelDrag = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setTaskDrag(null) }
    }
    document.addEventListener('keydown', cancelDrag)
    return () => document.removeEventListener('keydown', cancelDrag)
  }, [taskDrag !== null])

  useEffect(() => {
    if (!focusRequest) return
    const entity = orbitalEntities.find((item) => item.id === focusRequest.objectId)
    const celestial = !entity?.position
      ? findCelestialLocalPosition(focusRequest.objectId, time, planetAuLengthFactor, moonAuLengthFactor)
      : undefined
    const starId = entity?.position ? String(entity.staticData.starId) : celestial?.starId
    if (!starId) return
    const star = getStar(starId)
    if (!star) return
    const position = entity?.position ?? celestial?.position
    if (!position) return
    const starPoint = starPosition(star.position)
    setCameraTargetStarId(starId)
    focusWorldPoint(
      { x: starPoint.x + position.x, y: starPoint.y + position.y },
      !entity && focusRequest.objectId === starId ? systemFadeEndZoom : objectFocusZoom
    )
  }, [focusRequest?.requestId])

  const onWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const now = performance.now()
    if (now - lastWheelAtRef.current < SPACE_MAP_ZOOM.wheelThrottleMs) return
    lastWheelAtRef.current = now
    const rect = event.currentTarget.getBoundingClientRect()
    const cursor = cameraPlanePoint({ x: event.clientX, y: event.clientY }, rect, mapViewport)
    const direction = event.deltaY < 0 ? 1 : -1
    const nextLevelIndex = Math.min(SPACE_MAP_ZOOM.levels.length - 1, Math.max(0, zoomLevelIndexRef.current + direction))
    if (nextLevelIndex === zoomLevelIndexRef.current) return
    setCameraTargetStarId(null)
    zoomLevelIndexRef.current = nextLevelIndex
    const nextZoom = SPACE_MAP_ZOOM.levels[nextLevelIndex]
    const worldPoint = { x: (cursor.x - panRef.current.x) / zoomRef.current, y: (cursor.y - panRef.current.y) / zoomRef.current }
    animateViewport(nextZoom, { x: cursor.x - worldPoint.x * nextZoom, y: cursor.y - worldPoint.y * nextZoom }, SPACE_MAP_ZOOM.wheelAnimationMs)
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button === 0 && event.shiftKey && !targetingAction) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setShiftDrag({ startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY })
      return
    }
    if (event.button !== 0 || targetingAction) return
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setDrag({ x: event.clientX, y: event.clientY, panX: panRef.current.x, panY: panRef.current.y })
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    setHoveredId((event.target as Element).closest('[data-selectable-id]')?.getAttribute('data-selectable-id') ?? null)
    if (taskDrag?.pointerId === event.pointerId) {
      const rect = event.currentTarget.getBoundingClientRect()
      setTaskDrag({ ...taskDrag, point: { x: cameraViewBox.x + (event.clientX - rect.left) / rect.width * cameraViewBox.width + taskDrag.offset.x, y: cameraViewBox.y + (event.clientY - rect.top) / rect.height * cameraViewBox.height + taskDrag.offset.y } })
      return
    }
    if (targetingAction) {
      setShiftHeld(event.shiftKey)
      const rect = event.currentTarget.getBoundingClientRect()
      setTargetCursor({ x: cameraViewBox.x + (event.clientX - rect.left) / rect.width * cameraViewBox.width, y: cameraViewBox.y + (event.clientY - rect.top) / rect.height * cameraViewBox.height })
    }
    if (shiftDrag) { setShiftDrag({ ...shiftDrag, x: event.clientX, y: event.clientY }); return }
    if (!drag) return
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < SPACE_MAP_VISUAL.cameraFocusReleaseDragPx) return
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
    setCameraTargetStarId(null)
    const rect = event.currentTarget.getBoundingClientRect()
    const nextPan = {
      x: drag.panX + (event.clientX - drag.x) * mapViewport.width / rect.width,
      y: drag.panY + (event.clientY - drag.y) * mapViewport.height / rect.height
    }
    panRef.current = nextPan
    setPan(nextPan)
  }

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (taskDrag?.pointerId === event.pointerId) {
      const moved = Math.hypot(event.clientX - taskDrag.startX, event.clientY - taskDrag.startY) >= 4
      if (moved) {
        const rect = event.currentTarget.getBoundingClientRect()
        const point = { x: cameraViewBox.x + (event.clientX - rect.left) / rect.width * cameraViewBox.width + taskDrag.offset.x, y: cameraViewBox.y + (event.clientY - rect.top) / rect.height * cameraViewBox.height + taskDrag.offset.y }
        const nearest = projectedStars.reduce<{ starId: string; point: WorldPoint; distance: number } | null>((current, star) => {
          const distance = Math.hypot(point.x - star.point.x, point.y - star.point.y)
          return !current || distance < current.distance ? { starId: star.starId, point: star.point, distance } : current
        }, null)
        if (nearest) useGameStore.getState().retargetObjectTask(taskDrag.objectId, taskDrag.taskId, { x: point.x - nearest.point.x, y: point.y - nearest.point.y }, nearest.starId)
      } else onFocusTask(taskDrag.objectId, taskDrag.taskId)
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
      setTaskDrag(null)
      return
    }
    if (drag && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= SPACE_MAP_VISUAL.cameraFocusReleaseDragPx) {
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
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

  const clearFocus = (event: React.MouseEvent<SVGRectElement>) => {
    if (targetingAction) {
      if (targetingAction.stage === 'target' && isMovementTaskAction(targetingAction.id)) {
        const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
        const origin = projectedStarById.get(activeStarId)
        if (rect && origin) {
          const world = { x: cameraViewBox.x + (event.clientX - rect.left) / rect.width * cameraViewBox.width, y: cameraViewBox.y + (event.clientY - rect.top) / rect.height * cameraViewBox.height }
          onSelect(null, undefined, false, { x: world.x - origin.x, y: world.y - origin.y }, activeStarId, event.shiftKey)
          return
        }
      }
      onSelect(null)
      return
    }
    setCameraTargetStarId(null)
    onSelect(null)
  }

  const openContextMenu = (event: React.MouseEvent<SVGElement>, targetId?: string) => {
    event.preventDefault()
    event.stopPropagation()
    if (targetingAction?.stage === 'distance') return
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement
    const rect = svg?.getBoundingClientRect()
    if (!rect) return
    const actors = useGameStore.getState().selectedIds
    const selfOperation = Boolean(targetId && (!actors.length || (actors.length === 1 && actors[0] === targetId)))
    const actorIds = selfOperation ? [targetId!] : actors
    const worldPosition = !targetId && actors.length ? (() => {
      const world = { x: cameraViewBox.x + (event.clientX - rect.left) / rect.width * cameraViewBox.width, y: cameraViewBox.y + (event.clientY - rect.top) / rect.height * cameraViewBox.height }
      const star = getStar(activeStarId)
      if (!star) return world
      const origin = starPosition(star.position)
      return { x: world.x - origin.x, y: world.y - origin.y }
    })() : undefined
    const targetObject = targetId ? objectRepository.get(targetId) : undefined
    const celestialPosition = targetId && !targetObject?.position ? findCelestialLocalPosition(targetId, time, planetAuLengthFactor, moonAuLengthFactor)?.position : undefined
    const actions = objectRepository.actionsFor(actorIds).filter(action => selfOperation || Boolean(targetId && action.target && (!action.targetCapability || targetObject?.capabilities.some(capability => capability.id === action.targetCapability))))
    if (worldPosition) for (const action of objectRepository.actionsFor(actorIds)) {
      if (isMovementTaskAction(action.id)) actions.push({ ...action, label: action.id === 'move' ? '前往此处' : action.id === 'orbit' ? '环绕此处' : action.id === 'keep-distance' ? '与此处保持距离' : action.id === 'warp-to' ? '跃迁到此处' : '朝向此处' })
    }
    if (!actions.length) { setContextMenu(null); return }
    setShiftHeld(event.shiftKey)
    setContextMenu({ x: event.clientX, y: event.clientY, actorIds, selfOperation, targetId: selfOperation ? undefined : targetId, position: worldPosition ?? celestialPosition, positionStarId: worldPosition ? activeStarId : undefined, actions })
  }

  const screenLabels: ScreenMapLabel[] = []
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
    const typeName = planetTypes[body.planetType ?? '']?.displayName ?? (depth === 0 ? '行星' : '卫星')
    if (detailMode && bodyVisible) screenLabels.push({
      key: bodyPath, kind: 'body', point: absoluteBody, radius,
      name: body.displayName ?? bodyId,
      nameOffset: depth === 0 ? SPACE_MAP_VISUAL.textOffset.planetLabel : SPACE_MAP_VISUAL.textOffset.moonLabel,
      nameSize: depth === 0 ? SPACE_MAP_VISUAL.fontSize.label : SPACE_MAP_VISUAL.fontSize.moon,
      opacity: systemOpacity, nameOpacity: depth === 0 ? metaOpacity : systemOpacity,
      visible: celestialNamesAlwaysVisible || hoveredId === bodyPath || bodySelected,
      selectedMeta: bodySelected ? `${typeName} · ${hasSurface ? '双击进入地表' : '无资源点'}` : undefined
    })
    return <g key={bodyPath} data-selectable-id={bodyVisible && systemOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? bodyPath : undefined} data-selectable-kind="body" data-selectable-x={x} data-selectable-y={y} className={`body-group ${bodySelected ? 'selected' : ''}`} onContextMenu={(event) => openContextMenu(event, bodyPath)} onClick={(event) => { if (suppressClickRef.current) { suppressClickRef.current = false; return }; event.stopPropagation(); onSelect(bodyPath, 'body', event.ctrlKey || event.metaKey, { x, y }, undefined, event.shiftKey) }} onDoubleClick={(event) => { event.stopPropagation(); if (hasSurface) onEnterSurface(bodyPath) }}>
      {orbitVisible && <circle cx={centerX} cy={centerY} r={orbit} className={depth === 0 ? 'orbit-line' : 'orbit-line moon-orbit'} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
      {bodyVisible && <OrbitingBodyVisual x={x} y={y} radius={radius} zoom={zoom} depth={depth} bodyId={body.displayName ?? bodyId} selected={bodySelected} hasSurface={hasSurface} typeName={typeName} labelOpacity={depth === 0 ? metaOpacity : systemOpacity} hideLabels={detailMode} />}
      {childNodes}
    </g>
  })

  return <div ref={canvasRef} className="system-canvas" onPointerMove={(event) => {
    const client = { x: event.clientX, y: event.clientY }
    cursorClientRef.current = client
    updateCursorCoordinates(client)
  }} onPointerLeave={() => {
    cursorClientRef.current = null
    if (cursorXRef.current) cursorXRef.current.textContent = '—'
    if (cursorYRef.current) cursorYRef.current.textContent = '—'
    if (canvasXRef.current) canvasXRef.current.textContent = '—'
    if (canvasYRef.current) canvasYRef.current.textContent = '—'
  }} onClickCapture={(event) => {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }}>
    <div className="scene-label"><span className="scene-kicker">{detailMode ? 'STAR SYSTEM / CONTINUOUS SPACE' : 'GALACTIC MAP / SPACE'}</span><strong>{detailMode ? activeStar?.displayName ?? '恒星系' : '深空星图'}</strong><small>{detailMode ? `${starTypes[activeStar?.starType ?? '']?.displayName ?? '恒星系'} · 连续空间倍率 ${zoom.toFixed(2)}×` : '滚轮缩放 · 左键拖动 · 空白处取消选择'}</small></div>
    <div className="viewport-hud"><div className="hud-pill map-coordinate-hud">
      <div className="map-coordinate-row"><span className="live-dot" /><span className="map-coordinate-kind">全局</span> X <span ref={cursorXRef}>—</span> <span>·</span> Y <span ref={cursorYRef}>—</span> AU</div>
      <div className="map-coordinate-row map-coordinate-canvas"><span className="map-coordinate-kind">画布</span> X <span ref={canvasXRef}>—</span> <span>·</span> Y <span ref={canvasYRef}>—</span></div>
    </div></div>
    <svg ref={svgRef} className={`system-svg map-galaxy ${celestialNamesAlwaysVisible ? '' : 'celestial-names-hover-only'} ${objectNamesAlwaysVisible ? '' : 'object-names-hover-only'}`} viewBox={`${renderSpace.viewBox.x} ${renderSpace.viewBox.y} ${renderSpace.viewBox.width} ${renderSpace.viewBox.height}`} onContextMenu={(event) => { event.preventDefault(); if (event.target === event.currentTarget) openContextMenu(event) }} onClickCapture={(event) => {
      if (targetingAction?.stage !== 'distance') return
      event.preventDefault()
      event.stopPropagation()
      if (!distanceAnchor) { onNotify('目标位置不可用'); return }
      const rect = event.currentTarget.getBoundingClientRect()
      const cursor = { x: cameraViewBox.x + (event.clientX - rect.left) / rect.width * cameraViewBox.width, y: cameraViewBox.y + (event.clientY - rect.top) / rect.height * cameraViewBox.height }
      const scale = worldUnitsPerKm(kmToAu, starAuLengthFactor)
      const offsetKm = { x: (cursor.x - distanceAnchor.x) / scale, y: (cursor.y - distanceAnchor.y) / scale }
      const distanceKm = Math.hypot(offsetKm.x, offsetKm.y)
      if (targetingAction.id === 'orbit' && distanceKm < 0.001) { onNotify('请选择大于零的环绕半径'); return }
      onConfirmDistanceAction(distanceKm, offsetKm, event.shiftKey)
    }} onClick={(event) => { if (suppressClickRef.current) { suppressClickRef.current = false; event.preventDefault() } }} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerLeave={() => { setTargetCursor(null); setHoveredId(null) }} onPointerUp={onPointerUp} onPointerCancel={() => { setDrag(null); setShiftDrag(null); setTaskDrag(null); setTargetCursor(null) }}>
      <SpaceMapGradientDefs />
      <rect x={renderSpace.viewBox.x} y={renderSpace.viewBox.y} width={renderSpace.viewBox.width} height={renderSpace.viewBox.height} fill="transparent" onContextMenu={(event) => openContextMenu(event)} onClick={clearFocus} />
      <SpaceMapDotGrid view={renderSpace.viewBox} origin={renderSpace.origin} zoom={zoom} spacingAu={starMapGridSpacingAu} worldUnitsPerAu={starAuLengthFactor} startZoom={starMapGridFadeStartZoom} endZoom={starMapGridFadeEndZoom} reduceMotion={reduceMotion || prefersReducedMotion} />
      {visibleStars.map(({ starId, star, point }) => {
        const selected = selectedIds.includes(starId)
        const planets = Object.entries(star.planet)
        const outerOrbit = planets.reduce((largest, [, planet]) => Math.max(largest, projectOrbitalRadius(planet.position?.orbitalRadius ?? 0, planetAuLengthFactor)), 0) || SPACE_MAP_VISUAL.fallbackOuterOrbit
        const overviewRadius = outerOrbit * Math.max(1, overviewMarkerMinZoom / zoom)
        const localPoint = renderSpace.toLocal(point)
        if (detailMode && overviewOpacity > 0) screenLabels.push({ key: `${starId}-overview`, kind: 'star', point, radius: overviewRadius, name: star.displayName, meta: `${starTypes[star.starType ?? '']?.displayName ?? '恒星'} · ${planets.length} 颗行星`, nameOffset: SPACE_MAP_VISUAL.textOffset.overviewLabel, metaOffset: SPACE_MAP_VISUAL.textOffset.overviewMeta, nameSize: SPACE_MAP_VISUAL.fontSize.primary, metaSize: SPACE_MAP_VISUAL.fontSize.meta, opacity: overviewOpacity, nameOpacity: labelOpacity, metaOpacity, visible: celestialNamesAlwaysVisible || hoveredId === starId || selected })
        if (detailMode && systemOpacity > 0) screenLabels.push({ key: `${starId}-center`, kind: 'star', point, radius: renderedStarRadius, name: star.displayName, meta: `${starTypes[star.starType ?? '']?.displayName ?? '恒星'} · ${planets.length} 颗行星`, nameOffset: SPACE_MAP_VISUAL.textOffset.starLabel, metaOffset: SPACE_MAP_VISUAL.textOffset.starMeta, nameSize: SPACE_MAP_VISUAL.fontSize.primary, metaSize: SPACE_MAP_VISUAL.fontSize.meta, opacity: systemOpacity, metaOpacity, visible: celestialNamesAlwaysVisible || hoveredId === starId || selected })
        return <g key={starId} transform={`translate(${localPoint.x} ${localPoint.y})`}>
          <g data-selectable-id={starId} data-selectable-kind="body" className={`map-star ${selected ? 'selected' : ''}`} onContextMenu={(event) => openContextMenu(event, starId)} onClick={(event) => { if (suppressClickRef.current) { suppressClickRef.current = false; return }; event.stopPropagation(); setCameraTargetStarId(null); onSelect(starId, 'body', event.ctrlKey || event.metaKey, { x: 0, y: 0 }, undefined, event.shiftKey) }} onDoubleClick={(event) => { event.stopPropagation(); setCameraTargetStarId(starId); focusWorldPoint(point) }}><StarSystemMarkerVisual name={star.displayName} starType={star.starType} typeName={starTypes[star.starType ?? '']?.displayName ?? '恒星'} planetCount={planets.length} zoom={zoom} overviewRadius={overviewRadius} starRadius={renderedStarRadius} overviewOpacity={overviewOpacity} systemOpacity={systemOpacity} labelOpacity={labelOpacity} metaOpacity={metaOpacity} hideLabels={detailMode} /></g>
          {starId === activeStarId && systemOpacity > 0 && <g opacity={systemOpacity} className="system-detail-layer" pointerEvents={systemOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? 'auto' : 'none'}>
            {renderOrbitingBodies(planets as [string, PlanetMapEntry][], point, 0, 0, 0, starId)}
          </g>}
        </g>
      })}
      <g className="map-task-layer">
        {taskMarkers.map(({ key, objectId, index, from, point, anchor, actionId, distanceKm, offsetKm }) => {
          const active = index === 0
          const focused = focusedTask?.objectId === objectId && focusedTask.taskId === key
          const controllable = isPlayerControllable(objectRepository.get(objectId))
          const warpActive = active && actionId === 'warp-to' && objectRepository.get(objectId)?.getCapability<MovementCapability>('movement')?.warpPhase === 'warping'
          const draggableTask = controllable
          const color = warpActive ? '#ffffff' : focused ? TASK_MARKER_COLORS.focused : active ? TASK_MARKER_COLORS.active : '#62d8c5'
          const localFrom = renderSpace.toLocal(from)
          const localPoint = renderSpace.toLocal(point)
          const localAnchor = renderSpace.toLocal(anchor)
          const orbitRadius = actionId === 'orbit' ? (distanceKm ?? 0) * kmWorldScale : 0
          const holdPoint = actionId === 'keep-distance' && offsetKm ? { x: localPoint.x + offsetKm.x * kmWorldScale, y: localPoint.y + offsetKm.y * kmWorldScale } : null
          const visibleLine = clipLineToView(localFrom, localPoint, renderSpace.viewBox)
          const markerVisible = doesDiscIntersectView(point, Math.max(renderedOrbitalEntityRadius, 9 / zoom), cameraViewBox)
          const orbitVisible = orbitRadius > 0 && doesOrbitIntersectView(point, orbitRadius, cameraViewBox)
          const holdVisible = holdPoint && clipLineToView(localPoint, holdPoint, renderSpace.viewBox)
          const warpOffsetVisible = actionId === 'warp-to' && (offsetKm?.x || offsetKm?.y) ? clipLineToView(localAnchor, localPoint, renderSpace.viewBox) : null
          if (!visibleLine && !markerVisible && !orbitVisible && !holdVisible && !warpOffsetVisible) return null
          return <g key={`${objectId}-${key}`} opacity={active || focused || taskDrag?.objectId === objectId && taskDrag.taskId === key ? 1 : selectedIds.includes(objectId) ? 0.95 : 0.4}>
            {visibleLine && <line x1={visibleLine.from.x} y1={visibleLine.from.y} x2={visibleLine.to.x} y2={visibleLine.to.y} stroke={color} strokeWidth={1.4 / zoom} strokeDasharray={active ? undefined : `${5 / zoom} ${4 / zoom}`} pointerEvents="none" />}
            {orbitRadius > 0 && <circle cx={localPoint.x} cy={localPoint.y} r={orbitRadius} fill="none" stroke={color} strokeWidth={1.1 / zoom} strokeDasharray={`${5 / zoom} ${5 / zoom}`} opacity="0.7" pointerEvents="none" />}
            {holdPoint && <><line x1={localPoint.x} y1={localPoint.y} x2={holdPoint.x} y2={holdPoint.y} stroke={color} strokeWidth={1.1 / zoom} strokeDasharray={`${4 / zoom} ${4 / zoom}`} pointerEvents="none" /><circle cx={holdPoint.x} cy={holdPoint.y} r={Math.max(2 / zoom, renderedOrbitalEntityRadius * 0.25)} fill={color} pointerEvents="none" /></>}
            {warpOffsetVisible && <><line x1={warpOffsetVisible.from.x} y1={warpOffsetVisible.from.y} x2={warpOffsetVisible.to.x} y2={warpOffsetVisible.to.y} stroke={color} strokeWidth={1.1 / zoom} strokeDasharray={`${4 / zoom} ${4 / zoom}`} opacity="0.7" pointerEvents="none" /><circle cx={localAnchor.x} cy={localAnchor.y} r={Math.max(2 / zoom, renderedOrbitalEntityRadius * 0.25)} fill={color} pointerEvents="none" /></>}
            {markerVisible && <g transform={`translate(${localPoint.x} ${localPoint.y})`} pointerEvents={targetingAction ? 'none' : 'auto'} tabIndex={0} role="button" aria-label={`查看第 ${index + 1} 项${actionId === 'move' ? '前往' : actionId === 'orbit' ? '环绕' : actionId === 'keep-distance' ? '保持距离' : actionId === 'warp-to' ? '跃迁到' : '朝向'}任务`} style={{ cursor: draggableTask ? taskDrag?.objectId === objectId && taskDrag.taskId === key ? 'grabbing' : 'grab' : 'pointer' }} onPointerDown={(event) => {
              if (event.button !== 0 || event.shiftKey || targetingAction || !draggableTask) return
              event.preventDefault()
              event.stopPropagation()
              const svg = event.currentTarget.ownerSVGElement
              const rect = svg?.getBoundingClientRect()
              if (!svg || !rect) return
              const pointer = { x: cameraViewBox.x + (event.clientX - rect.left) / rect.width * cameraViewBox.width, y: cameraViewBox.y + (event.clientY - rect.top) / rect.height * cameraViewBox.height }
              svg.setPointerCapture(event.pointerId)
              setTaskDrag({ objectId, taskId: key, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offset: { x: point.x - pointer.x, y: point.y - pointer.y }, point })
            }} onClick={(event) => { event.stopPropagation(); if (!draggableTask) onFocusTask(objectId, key) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onFocusTask(objectId, key) } }} onContextMenu={(event) => openContextMenu(event)}>
              <title>{draggableTask ? '点击查看任务，拖动修改目标' : '点击查看任务'}</title>
              <circle r={Math.max(renderedOrbitalEntityRadius, 9 / zoom)} fill="transparent" />
              <g>
                {warpActive && <>
                  <circle r={renderedOrbitalEntityRadius + 2.8 / zoom} fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth={5 / zoom} pointerEvents="none" />
                  <circle r={renderedOrbitalEntityRadius + 1.2 / zoom} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth={2.4 / zoom} pointerEvents="none" />
                </>}
                <circle r={renderedOrbitalEntityRadius} fill={warpActive ? '#17242c' : focused ? '#123626' : active ? '#102d42' : '#112e32'} stroke={color} strokeWidth={focused || warpActive ? 2.2 / zoom : active ? 1.9 / zoom : 1.2 / zoom} />
                <MapTaskIcon actionId={actionId} radius={renderedOrbitalEntityRadius} color={warpActive ? '#ffffff' : focused ? '#d8ffe7' : active ? '#f0fbff' : '#d9fff2'} />
              </g>
              <text y={-renderedOrbitalEntityRadius - 4 / zoom} textAnchor="middle" fill={color} fontSize={9 / zoom}>{index + 1}</text>
              {actionId === 'warp-to' && offsetKm && <text y={renderedOrbitalEntityRadius + 11 / zoom} textAnchor="middle" fill={color} fontSize={9 / zoom}>{Math.hypot(offsetKm.x, offsetKm.y).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} km</text>}
            </g>}
          </g>
        })}
      </g>
      {visibleOrbitalEntities.map(({ entity, point }) => {
        const heading = entity.getCapability<MovementCapability>('movement')?.headingDegrees
        const rotation = entity.kind === 'ship' && heading !== undefined ? heading + 90 : 0
        const localPoint = renderSpace.toLocal(point)
        if (detailMode) screenLabels.push({ key: entity.id, kind: 'entity', point, radius: renderedOrbitalEntityRadius, name: entity.displayName, nameOffset: SPACE_MAP_VISUAL.textOffset.entityLabel, nameSize: SPACE_MAP_VISUAL.fontSize.label, opacity: 1, visible: objectNamesAlwaysVisible || hoveredId === entity.id || selectedIds.includes(entity.id) })
        return <g key={entity.id} data-selectable-id={entity.id} data-selectable-kind={entity.kind} className={`space-entity ${entity.kind === 'ship' ? 'ship-entity' : ''} ${selectedIds.includes(entity.id) ? 'selected' : ''}`} transform={`translate(${localPoint.x} ${localPoint.y})`} onContextMenu={(event) => openContextMenu(event, entity.id)} onClick={(event) => { if (suppressClickRef.current) { suppressClickRef.current = false; return }; event.stopPropagation(); onSelect(entity.id, entity.kind, event.ctrlKey || event.metaKey, undefined, undefined, event.shiftKey) }} onDoubleClick={(event) => { event.stopPropagation(); setCameraTargetStarId(String(entity.staticData.starId)); focusWorldPoint(point, objectFocusZoom) }}>
          <g className="orbital-visual" transform={`rotate(${rotation} 0 0)`}>
            <OrbitalEntityGlyph kind={entity.kind} definitionId={entity.definitionId} ownerFactionId={entity.ownerFactionId} radius={renderedOrbitalEntityRadius} />
            <CornerFrame half={renderedOrbitalEntityRadius + SPACE_MAP_VISUAL.entityCornerPadding / zoom} corner={SPACE_MAP_VISUAL.entityCornerLength / zoom} />
          </g>
          {!detailMode && <g className="orbital-name"><text x="0" y={renderedOrbitalEntityRadius + SPACE_MAP_VISUAL.textOffset.entityLabel / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.label / zoom}px` }} className="entity-label">{entity.displayName}</text></g>}
        </g>
      })}
      {targetingAction && (targetCursor || distanceAnchor) && <TargetingGuide action={targetingAction} cursor={targetCursor ?? distanceAnchor!} distanceAnchor={distanceAnchor} markerRadius={renderedOrbitalEntityRadius} zoom={zoom} renderOrigin={renderSpace.origin} renderViewBox={renderSpace.viewBox} starPoints={projectedStarById} lastTaskPoints={lastTaskPointByObject} appendTask={targetingAction.task && Boolean(targetingAction.appendTask || shiftHeld)} />}
    </svg>
    {distanceReadout && <div className="target-distance-readout" style={{ left: distanceReadout.x, top: distanceReadout.y }}>{distanceReadout.km.toLocaleString('zh-CN', { maximumFractionDigits: 1 })} km</div>}
    {detailMode && <ScreenSpaceLabels labels={screenLabels} zoom={zoom} toScreen={renderSpace.toScreen} viewport={mapViewport} />}
    {shiftDrag && <div className="selection-box" style={{ left: Math.min(shiftDrag.startX, shiftDrag.x), top: Math.min(shiftDrag.startY, shiftDrag.y), width: Math.abs(shiftDrag.x - shiftDrag.startX), height: Math.abs(shiftDrag.y - shiftDrag.startY) }} />}
    {contextMenu && <div ref={contextMenuRef} className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
      <small>{contextMenu.targetId ? 'OBJECT TO DO' : contextMenu.position ? 'ORDER / POSITION' : 'TO OBJECT'}</small>
      {contextMenu.actions.map(action => { const ActionIcon = resolveObjectActionIcon(action.id); return <button key={action.id} onClick={(event) => {
        if (contextMenu.selfOperation && action.target) {
          onBeginTargetAction(action.id, contextMenu.actorIds, event.shiftKey)
          onNotify('请选择目标对象或星图中的位置')
          setContextMenu(null)
          return
        }
        if (action.id === 'open-inventory' || action.id === 'transfer-items') {
          onOpenInventory(contextMenu.actorIds, action.id === 'transfer-items' ? contextMenu.targetId : undefined)
          setContextMenu(null)
          return
        }
        if (action.id === 'orbit' || action.id === 'keep-distance' || action.id === 'warp-to') {
          onBeginDistanceAction(action.id, contextMenu.actorIds, contextMenu.targetId, contextMenu.position, contextMenu.positionStarId, event.shiftKey)
          setContextMenu(null)
          return
        }
        const accepted = useGameStore.getState().executeObjectAction(action.id, contextMenu.targetId, contextMenu.position, contextMenu.actorIds, contextMenu.positionStarId, event.shiftKey && action.kind === 'task')
        if (!accepted) onNotify('目标位置不可用')
        setContextMenu(null)
      }}><ActionIcon className="context-action-icon" size={15} aria-hidden="true" /><span className="context-action-label">{action.label}</span>{shiftHeld && action.kind === 'task' && <SquarePlus className="context-task-plus" size={15} aria-hidden="true" />}</button> })}
    </div>}
    <div className="system-legend"><span><i className="legend-dot star" />恒星系</span><span><i className="legend-dot planet" />行星</span><span><i className="legend-dot station" />右键操作</span></div>
    <div className="time-card"><div className="time-card-head"><span>{detailMode ? '恒星系缩放级别' : '星图缩放级别'}</span><span className="cyan">{Number((zoom * 100).toFixed(3))}%</span></div><strong>{detailMode ? activeStar?.displayName ?? 'SYSTEM' : `${stars.length} SYSTEMS`}</strong><div className="time-line"><span style={{ width: `${Math.min(100, Math.max(2, (zoomLevelIndexRef.current / (SPACE_MAP_ZOOM.levels.length - 1)) * 100))}%` }} /></div><small>{SPACE_MAP_LABEL.minimumZoomPercent}% — {SPACE_MAP_LABEL.maximumZoomPercent}% · 每级 2×</small></div>
  </div>
}
