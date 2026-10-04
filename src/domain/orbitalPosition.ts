import { ORBIT_VISUALIZATION } from '../config/spaceMapVisuals'
import { calculateOrbitalAngle, projectOrbitalRadius, spaceMap, type PlanetMapEntry } from './spaceMap'

export type LocalOrbitalPosition = { starId: string; position: { x: number; y: number } }

const legacyBodyPaths = new Map<string, string>()
for (const [starId, star] of Object.entries(spaceMap)) {
  const indexBodies = (bodies: Record<string, PlanetMapEntry>, parentPath: string): void => {
    for (const [bodyId, body] of Object.entries(bodies)) {
      const path = `${parentPath}/${bodyId}`
      if (!legacyBodyPaths.has(bodyId)) legacyBodyPaths.set(bodyId, path)
      indexBodies(body.planet ?? {}, path)
    }
  }
  indexBodies(star.planet, starId)
}

/** The same parent-relative coordinates used for drawing planets and moons. */
export function getOrbitalOffset(body: PlanetMapEntry, index: number, depth: number, elapsedSeconds: number, planetAuLengthFactor: number, moonAuLengthFactor: number) {
  const radius = projectOrbitalRadius(body.position?.orbitalRadius ?? 0, depth === 0 ? planetAuLengthFactor : moonAuLengthFactor)
  const period = body.position?.orbitalPeriod ?? 0
  const initialAngle = (index * ORBIT_VISUALIZATION.siblingAngleStepDegrees + depth * ORBIT_VISUALIZATION.depthAngleStepDegrees) * Math.PI / 180
  const angle = calculateOrbitalAngle(elapsedSeconds, period, initialAngle)
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, radius }
}

/** Resolve a celestial body's visible center in its star's local map coordinates. */
export function findCelestialLocalPosition(objectId: string, elapsedSeconds: number, planetAuLengthFactor: number, moonAuLengthFactor: number): LocalOrbitalPosition | undefined {
  const [pathStarId, ...bodyPath] = (spaceMap[objectId] ? objectId : legacyBodyPaths.get(objectId) ?? objectId).split('/')
  const pathStar = spaceMap[pathStarId]
  if (pathStar) {
    if (bodyPath.length === 0) return { starId: pathStarId, position: { x: 0, y: 0 } }
    let entries = Object.entries(pathStar.planet) as [string, PlanetMapEntry][]
    let position = { x: 0, y: 0 }
    for (const [depth, bodyId] of bodyPath.entries()) {
      const index = entries.findIndex(([id]) => id === bodyId)
      if (index < 0) return undefined
      const body = entries[index]![1]
      const offset = getOrbitalOffset(body, index, depth, elapsedSeconds, planetAuLengthFactor, moonAuLengthFactor)
      position = { x: position.x + offset.x, y: position.y + offset.y }
      entries = Object.entries(body.planet ?? {}) as [string, PlanetMapEntry][]
    }
    return { starId: pathStarId, position }
  }
  return undefined
}
