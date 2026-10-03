import { spaceMap } from './spaceMap'

export type OrbitalPoint = { x: number; y: number }
const starCoordinates = Object.entries(spaceMap).map(([id, star]) => ({ id, x: star.position.x, y: star.position.y }))

/** Star and ship positions share map world units; the star projection's fixed offset cancels out. */
export function starWorldOrigin(starId: string, starAuLengthFactor: number): OrbitalPoint | undefined {
  const star = spaceMap[starId]
  return star ? { x: star.position.x * starAuLengthFactor, y: -star.position.y * starAuLengthFactor } : undefined
}

export function orbitalWorldPosition(starId: string, local: OrbitalPoint, starAuLengthFactor: number): OrbitalPoint | undefined {
  const origin = starWorldOrigin(starId, starAuLengthFactor)
  return origin ? { x: origin.x + local.x, y: origin.y + local.y } : undefined
}

export function orbitalLocalPosition(starId: string, world: OrbitalPoint, starAuLengthFactor: number): OrbitalPoint | undefined {
  const origin = starWorldOrigin(starId, starAuLengthFactor)
  return origin ? { x: world.x - origin.x, y: world.y - origin.y } : undefined
}

/** The nearest stellar center owns each point in the continuous map. */
export function nearestStarId(world: OrbitalPoint, starAuLengthFactor: number): string {
  let nearestId = ''
  let nearestDistanceSquared = Infinity
  for (const star of starCoordinates) {
    const dx = world.x - star.x * starAuLengthFactor
    const dy = world.y + star.y * starAuLengthFactor
    const distanceSquared = dx * dx + dy * dy
    if (distanceSquared < nearestDistanceSquared) {
      nearestId = star.id
      nearestDistanceSquared = distanceSquared
    }
  }
  return nearestId
}
