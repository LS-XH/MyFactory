import { z } from 'zod'
import spaceMapJson from '../../assets/legacy/spaceMap.json'
import starTypesJson from '../../assets/legacy/starType.json'
import planetTypesJson from '../../assets/legacy/planetType.json'
import { getResourceTypeName } from './resourceTypes'

export { resourceTypes } from './resourceTypes'

const positionSchema = z.object({ x: z.number(), y: z.number() })
const resourceSchema = z.object({ resourceType: z.string(), item: z.string(), position: positionSchema, reserves: z.number() })
const planetSchema: z.ZodTypeAny = z.lazy(() => z.object({
  displayName: z.string().optional(),
  planetType: z.string().optional(),
  position: z.object({ orbitalRadius: z.number(), orbitalPeriod: z.number(), radius: z.number() }).optional(),
  surface: z.object({ resource: z.array(resourceSchema).default([]) }).default({ resource: [] }),
  planet: z.record(planetSchema).default({})
}))
const starSchema = z.object({ displayName: z.string(), starType: z.string().optional(), position: positionSchema, surface: z.record(z.any()).default({}), planet: z.record(planetSchema).default({}) })

export type SpaceMap = Record<string, z.infer<typeof starSchema>>
export type PlanetMapEntry = z.infer<typeof planetSchema>
export type ResourcePoint = z.infer<typeof resourceSchema> & { id: string; displayName: string; resourceTypeName: string }
type RawResource = z.infer<typeof resourceSchema>

export type CelestialObject = {
  id: string
  kind: 'star' | 'planet' | 'moon'
  displayName: string
  typeName: string
  starId: string
  starName: string
  parentId?: string
  parentName?: string
  mapPosition?: { x: number; y: number }
  orbitalPosition?: { orbitalRadius: number; orbitalPeriod: number; radius: number }
  planetCount: number
  satelliteCount: number
  resourceCount: number
  totalReserves: number
  hasSurface: boolean
}

export const spaceMap = z.record(starSchema).parse(spaceMapJson) as SpaceMap
export const starTypes = starTypesJson as Record<string, { displayName: string }>
export const planetTypes = planetTypesJson as Record<string, { displayName?: string }>

// AU data remains untouched. Each hierarchy applies its user-configurable linear
// length factor only when projecting source values into the SVG world.
export function projectStarPosition(position: { x: number; y: number }, center: { x: number; y: number }, auLengthFactor: number) {
  return { x: 500 + (position.x - center.x) * auLengthFactor, y: 380 - (position.y - center.y) * auLengthFactor }
}

export function projectOrbitalRadius(orbitalRadiusAu: number, auLengthFactor: number) {
  return orbitalRadiusAu * auLengthFactor
}

export type MapViewBounds = { x: number; y: number; width: number; height: number }

export function isProjectedPointVisible(point: { x: number; y: number }, view: MapViewBounds, padding = 0) {
  return point.x >= view.x - padding
    && point.x <= view.x + view.width + padding
    && point.y >= view.y - padding
    && point.y <= view.y + view.height + padding
}

function distanceToView(point: { x: number; y: number }, view: MapViewBounds) {
  const closestX = Math.max(view.x, Math.min(point.x, view.x + view.width))
  const closestY = Math.max(view.y, Math.min(point.y, view.y + view.height))
  return Math.hypot(point.x - closestX, point.y - closestY)
}

/** True when any filled part of a circular body overlaps the camera. */
export function doesDiscIntersectView(center: { x: number; y: number }, radius: number, view: MapViewBounds, padding = 0) {
  const expanded = { x: view.x - padding, y: view.y - padding, width: view.width + padding * 2, height: view.height + padding * 2 }
  return distanceToView(center, expanded) <= radius
}

/** True only when the circumference of an orbit crosses the camera. */
export function doesOrbitIntersectView(center: { x: number; y: number }, radius: number, view: MapViewBounds, padding = 0) {
  const expanded = { x: view.x - padding, y: view.y - padding, width: view.width + padding * 2, height: view.height + padding * 2 }
  const nearestDistance = distanceToView(center, expanded)
  const farthestDistance = Math.hypot(
    Math.max(Math.abs(center.x - expanded.x), Math.abs(center.x - (expanded.x + expanded.width))),
    Math.max(Math.abs(center.y - expanded.y), Math.abs(center.y - (expanded.y + expanded.height)))
  )
  return radius >= nearestDistance && radius <= farthestDistance
}

export function calculateOrbitalAngle(elapsedSeconds: number, orbitalPeriodSeconds: number, initialAngle = 0) {
  if (orbitalPeriodSeconds <= 0) return initialAngle
  return initialAngle + (elapsedSeconds / orbitalPeriodSeconds) * Math.PI * 2
}

const celestialDisplayNames: Record<string, string> = {
  Earth: '地球',
  Marks: '火星',
  Moon: '月球'
}

function getCelestialDisplayName(id: string) {
  return celestialDisplayNames[id] ?? id
}

function summarizePlanets(planets: Record<string, PlanetMapEntry>) {
  return Object.values(planets).reduce((summary, planet) => {
    const children = (planet.planet ?? {}) as Record<string, PlanetMapEntry>
    const childSummary = summarizePlanets(children)
    const resources = (planet.surface?.resource ?? []) as RawResource[]
    return {
      bodies: summary.bodies + 1 + childSummary.bodies,
      resources: summary.resources + resources.length + childSummary.resources,
      reserves: summary.reserves + resources.reduce((total, resource) => total + resource.reserves, 0) + childSummary.reserves
    }
  }, { bodies: 0, resources: 0, reserves: 0 })
}

function findPlanet(
  selectedId: string,
  planets: Record<string, PlanetMapEntry>,
  starId: string,
  starName: string,
  parentId?: string,
  parentName?: string,
  depth = 0,
  parentPath = starId
): CelestialObject | undefined {
  for (const [planetId, planet] of Object.entries(planets)) {
    const bodyPath = `${parentPath}/${planetId}`
    const children = (planet.planet ?? {}) as Record<string, PlanetMapEntry>
    const resources = (planet.surface?.resource ?? []) as RawResource[]
    if (bodyPath === selectedId || planetId === selectedId) {
      const childSummary = summarizePlanets(children)
      return {
        id: selectedId,
        kind: depth === 0 ? 'planet' : 'moon',
        displayName: planet.displayName ?? getCelestialDisplayName(planetId),
        typeName: planetTypes[planet.planetType ?? '']?.displayName ?? '未分类天体',
        starId,
        starName,
        parentId,
        parentName,
        orbitalPosition: planet.position,
        planetCount: 0,
        satelliteCount: childSummary.bodies,
        resourceCount: resources.length + childSummary.resources,
        totalReserves: resources.reduce((total, resource) => total + resource.reserves, 0) + childSummary.reserves,
        hasSurface: resources.length > 0
      }
    }
    const nested = findPlanet(selectedId, children, starId, starName, planetId, planet.displayName ?? getCelestialDisplayName(planetId), depth + 1, bodyPath)
    if (nested) return nested
  }
  return undefined
}

/** Resolves a map object by the same ID used by SVG selection, including nested moons. */
export function findCelestialObject(selectedId: string): CelestialObject | undefined {
  if (selectedId.startsWith('resource-')) return undefined
  const requestedStarId = selectedId.includes('/') ? selectedId.split('/')[0] : undefined
  const stars = requestedStarId ? (spaceMap[requestedStarId] ? [[requestedStarId, spaceMap[requestedStarId]] as const] : []) : Object.entries(spaceMap)
  for (const [starId, star] of stars) {
    const planets = star.planet as Record<string, PlanetMapEntry>
    if (starId === selectedId) {
      const summary = summarizePlanets(planets)
      const directPlanets = Object.keys(planets).length
      return {
        id: starId,
        kind: 'star',
        displayName: star.displayName,
        typeName: starTypes[star.starType ?? '']?.displayName ?? '未分类恒星',
        starId,
        starName: star.displayName,
        mapPosition: star.position,
        planetCount: directPlanets,
        satelliteCount: Math.max(0, summary.bodies - directPlanets),
        resourceCount: summary.resources,
        totalReserves: summary.reserves,
        hasSurface: false
      }
    }
    const planet = findPlanet(selectedId, planets, starId, star.displayName)
    if (planet) return planet
  }
  return undefined
}

export function getStar(starId: string) { return spaceMap[starId] }
export function getPlanet(starId: string, planetId: string): PlanetMapEntry | undefined {
  const path = planetId.split('/').filter(Boolean)
  if (path[0] === starId) path.shift()
  let planets = spaceMap[starId]?.planet as Record<string, PlanetMapEntry> | undefined
  for (const [index, id] of path.entries()) {
    const planet = planets?.[id]
    if (!planet) return undefined
    if (index === path.length - 1) return planet
    planets = planet.planet as Record<string, PlanetMapEntry>
  }
  return undefined
}
export function getResourcePoints(starId: string, planetId: string): ResourcePoint[] {
  const planet = getPlanet(starId, planetId)
  const resources = (planet?.surface?.resource ?? []) as RawResource[]
  return resources.map((resource, index) => {
    const resourceTypeName = getResourceTypeName(resource.resourceType)
    return { ...resource, id: `resource-${starId}-${planetId.replaceAll('/', '-')}-${index}`, displayName: `${resourceTypeName} / ${resource.item}`, resourceTypeName }
  })
}

export function getDefaultPlanet() {
  const starId = Object.keys(spaceMap)[0] ?? 'Solar'
  const planetId = Object.keys(spaceMap[starId]?.planet ?? {})[0] ?? 'Earth'
  return { starId, planetId }
}
