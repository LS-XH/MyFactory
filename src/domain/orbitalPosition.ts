import { ORBIT_VISUALIZATION } from '../config/spaceMapVisuals'
import { calculateOrbitalAngle, projectOrbitalRadius, spaceMap, type PlanetMapEntry } from './spaceMap'

export type LocalOrbitalPosition = { starId: string; position: { x: number; y: number } }

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
  for (const [starId, star] of Object.entries(spaceMap)) {
    if (objectId === starId) return { starId, position: { x: 0, y: 0 } }
    const visit = (entries: [string, PlanetMapEntry][], parent: { x: number; y: number }, depth: number, parentPath: string): LocalOrbitalPosition | undefined => {
      for (const [index, [bodyId, body]] of entries.entries()) {
        const bodyPath = `${parentPath}/${bodyId}`
        const offset = getOrbitalOffset(body, index, depth, elapsedSeconds, planetAuLengthFactor, moonAuLengthFactor)
        const position = { x: parent.x + offset.x, y: parent.y + offset.y }
        if (bodyPath === objectId || bodyId === objectId) return { starId, position }
        const child = visit(Object.entries(body.planet ?? {}) as [string, PlanetMapEntry][], position, depth + 1, bodyPath)
        if (child) return child
      }
      return undefined
    }
    const found = visit(Object.entries(star.planet) as [string, PlanetMapEntry][], { x: 0, y: 0 }, 0, starId)
    if (found) return found
  }
  return undefined
}
