import { SPACE_MAP_VISUAL } from '../../config/spaceMapVisuals'
import { doesDiscIntersectView, type MapViewBounds, type PlanetMapEntry } from '../../domain/spaceMap'
import { getOrbitalOffset } from '../../domain/orbitalPosition'
import type { WorldPoint } from './types'

type VisiblePlanetOptions = {
  starId: string
  systemPoint: WorldPoint
  view: MapViewBounds
  zoom: number
  elapsedSeconds: number
  planetAuLengthFactor: number
  moonAuLengthFactor: number
  planetDisplayRadius: number
  moonDisplayRadius: number
}

/** Uses the same orbit projection and visibility padding as the rendered planet layer. */
export function collectVisiblePlanetIds(planets: Record<string, PlanetMapEntry>, options: VisiblePlanetOptions): string[] {
  const ids: string[] = []
  const visit = (entries: [string, PlanetMapEntry][], parent: WorldPoint, depth: number, parentPath: string) => {
    entries.forEach(([bodyId, body], index) => {
      const offset = getOrbitalOffset(body, index, depth, options.elapsedSeconds, options.planetAuLengthFactor, options.moonAuLengthFactor)
      const local = { x: parent.x + offset.x, y: parent.y + offset.y }
      const radius = (depth === 0 ? options.planetDisplayRadius : options.moonDisplayRadius) * SPACE_MAP_VISUAL.celestialRadiusUnitScale
      const world = { x: options.systemPoint.x + local.x, y: options.systemPoint.y + local.y }
      const path = `${parentPath}/${bodyId}`
      if (doesDiscIntersectView(world, radius, options.view, SPACE_MAP_VISUAL.bodyCullingPadding / options.zoom)) ids.push(path)
      visit(Object.entries(body.planet ?? {}) as [string, PlanetMapEntry][], local, depth + 1, path)
    })
  }
  visit(Object.entries(planets) as [string, PlanetMapEntry][], { x: 0, y: 0 }, 0, options.starId)
  return ids
}
