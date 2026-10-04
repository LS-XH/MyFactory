import type { MapViewBounds } from '../../domain/spaceMap'
import type { WorldPoint } from './types'

const GLOBAL_ORIGIN: WorldPoint = { x: 0, y: 0 }

/** Only SVG presentation is rebased; simulation, selection and saves stay in world space. */
export function createRenderSpace(worldView: MapViewBounds, activeStarPoint: WorldPoint | undefined, useLocalSpace: boolean) {
  const origin = useLocalSpace && activeStarPoint ? activeStarPoint : GLOBAL_ORIGIN
  const viewBox = {
    x: worldView.x - origin.x,
    y: worldView.y - origin.y,
    width: worldView.width,
    height: worldView.height
  }
  return {
    origin,
    viewBox,
    toLocal: (point: WorldPoint): WorldPoint => ({ x: point.x - origin.x, y: point.y - origin.y }),
    toWorld: (point: WorldPoint): WorldPoint => ({ x: point.x + origin.x, y: point.y + origin.y }),
    toScreen: (point: WorldPoint, zoom: number): WorldPoint => ({
      x: (point.x - origin.x - viewBox.x) * zoom,
      y: (point.y - origin.y - viewBox.y) * zoom
    })
  }
}

/** Restrict long cross-system guides to the visible SVG viewport before painting. */
export function clipLineToView(from: WorldPoint, to: WorldPoint, view: MapViewBounds): { from: WorldPoint; to: WorldPoint } | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const p = [-dx, dx, -dy, dy]
  const q = [from.x - view.x, view.x + view.width - from.x, from.y - view.y, view.y + view.height - from.y]
  let start = 0
  let end = 1
  for (let index = 0; index < 4; index += 1) {
    if (p[index] === 0) {
      if (q[index] < 0) return null
      continue
    }
    const ratio = q[index] / p[index]
    if (p[index] < 0) start = Math.max(start, ratio)
    else end = Math.min(end, ratio)
    if (start > end) return null
  }
  return {
    from: { x: from.x + dx * start, y: from.y + dy * start },
    to: { x: from.x + dx * end, y: from.y + dy * end }
  }
}
