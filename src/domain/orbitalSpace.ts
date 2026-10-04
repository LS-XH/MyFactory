import { spaceMap } from './spaceMap'

export type OrbitalPoint = { x: number; y: number }
type StarCoordinate = { id: string; x: number; y: number; order: number }
type StarNode = { star: StarCoordinate; axis: 'x' | 'y'; left?: StarNode; right?: StarNode }
const starCoordinates: StarCoordinate[] = Object.entries(spaceMap).map(([id, star], order) => ({ id, x: star.position.x, y: star.position.y, order }))

function buildStarIndex(stars: StarCoordinate[], depth = 0): StarNode | undefined {
  if (!stars.length) return undefined
  const axis = depth % 2 === 0 ? 'x' : 'y'
  stars.sort((a, b) => a[axis] - b[axis] || a.order - b.order)
  const middle = Math.floor(stars.length / 2)
  return {
    star: stars[middle]!, axis,
    left: buildStarIndex(stars.slice(0, middle), depth + 1),
    right: buildStarIndex(stars.slice(middle + 1), depth + 1)
  }
}

const starIndex = buildStarIndex(starCoordinates.slice())

/** Ship model distances use km; stellar map positions use AU before projection. */
export function worldUnitsPerKm(kmToAu: number, starAuLengthFactor: number): number {
  return kmToAu * starAuLengthFactor
}

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
  if (!starIndex || !Number.isFinite(starAuLengthFactor) || starAuLengthFactor <= 0) return starCoordinates[0]?.id ?? ''
  const point = { x: world.x / starAuLengthFactor, y: -world.y / starAuLengthFactor }
  let nearest = starIndex.star
  let bestDistanceSquared = Infinity
  const visit = (node: StarNode | undefined): void => {
    if (!node) return
    const dx = point.x - node.star.x
    const dy = point.y - node.star.y
    const distanceSquared = dx * dx + dy * dy
    if (distanceSquared < bestDistanceSquared || distanceSquared === bestDistanceSquared && node.star.order < nearest.order) {
      nearest = node.star
      bestDistanceSquared = distanceSquared
    }
    const offset = point[node.axis] - node.star[node.axis]
    visit(offset < 0 ? node.left : node.right)
    if (offset * offset <= bestDistanceSquared) visit(offset < 0 ? node.right : node.left)
  }
  visit(starIndex)
  return nearest.id
}
