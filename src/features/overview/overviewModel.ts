import { UI_COLORS } from '../../config/visualTokens'
import { resolveStarTypeVisual } from '../../config/starTypeVisuals'
import { getFactory, type FactoryNodeState } from '../../domain/content'
import { PLAYER_FACTION_ID, getFactionDisplayName } from '../../domain/factions'
import { getOrbitalDisplayInfo, type RuntimeObject } from '../../domain/objects'
import { findCelestialObject, getDefaultPlanet, getResourcePoints, spaceMap, starTypes } from '../../domain/spaceMap'
import { resolveEntityVisualColor } from '../../shared/icons/entityVisualRegistry'

export type OverviewPage = 'assets' | 'objects'
export type OverviewCategory = 'ship' | 'station' | 'planet' | 'factory' | 'resource'
export type OverviewFilterId = OverviewCategory | 'player' | 'hostile'
export type OverviewSelectionKind = 'body' | 'ship' | 'station' | 'factory'

export type OverviewEntry = {
  id: string
  name: string
  meta: string
  category: OverviewCategory
  celestialKind?: 'star' | 'planet' | 'moon'
  selectionKind: OverviewSelectionKind
  color: string
  definitionId?: string
  ownerFactionId?: string
}

type OrbitalObject = RuntimeObject & { kind: 'ship' | 'station' }
const startingPlanet = getDefaultPlanet()
const startingPlanetId = `${startingPlanet.starId}/${startingPlanet.planetId}`

function orbitalEntry(entity: OrbitalObject): OverviewEntry {
  const { typeName } = getOrbitalDisplayInfo(entity)
  return {
    id: entity.id,
    name: entity.displayName,
    meta: `${typeName} · ${getFactionDisplayName(entity.ownerFactionId)}`,
    category: entity.kind,
    selectionKind: entity.kind,
    color: resolveEntityVisualColor(entity.kind, entity.ownerFactionId),
    definitionId: entity.definitionId,
    ownerFactionId: entity.ownerFactionId
  }
}

function celestialEntry(id: string): OverviewEntry | undefined {
  const star = spaceMap[id]
  if (star) return {
    id,
    name: star.displayName,
    meta: `${starTypes[star.starType ?? '']?.displayName ?? '恒星'} · 恒星系`,
    category: 'planet',
    celestialKind: 'star',
    selectionKind: 'body',
    color: resolveStarTypeVisual(star.starType).glowColor
  }
  const body = findCelestialObject(id)
  if (!body || body.kind === 'star') return undefined
  return {
    id,
    name: body.displayName,
    meta: `${body.typeName} · ${body.starName}`,
    category: 'planet',
    celestialKind: body.kind,
    selectionKind: 'body',
    color: body.kind === 'moon' ? UI_COLORS.moon : UI_COLORS.planet,
    ownerFactionId: id === startingPlanetId ? PLAYER_FACTION_ID : undefined
  }
}

/** Planet ownership is not yet modeled in spaceMap.json; the starting surface is the player's planet asset. */
export function makeSpaceAssetEntries(orbitalObjects: OrbitalObject[]): OverviewEntry[] {
  const planetAsset = celestialEntry(startingPlanetId)
  return [
    ...(planetAsset ? [planetAsset] : []),
    ...orbitalObjects.filter((entity) => entity.ownerFactionId === PLAYER_FACTION_ID).map(orbitalEntry)
  ]
}

export function makeVisibleSpaceEntries(ids: string[], orbitalObjects: OrbitalObject[]): OverviewEntry[] {
  const byId = new Map(orbitalObjects.map((entity) => [entity.id, entity]))
  return ids.flatMap((id) => {
    const orbital = byId.get(id)
    const entry = orbital ? orbitalEntry(orbital) : celestialEntry(id)
    return entry ? [entry] : []
  })
}

function factoryEntry(node: FactoryNodeState): OverviewEntry | undefined {
  const factory = getFactory(node.factoryId)
  if (!factory) return undefined
  return {
    id: node.id,
    name: factory.name,
    meta: `${node.status === 'blocked' ? '物流堵塞' : node.status === 'online' ? '运行中' : '待机'} · ${node.buffer.toFixed(0)} 件`,
    category: 'factory',
    selectionKind: 'factory',
    color: factory.color,
    definitionId: factory.id,
    ownerFactionId: PLAYER_FACTION_ID
  }
}

export function makeSurfaceAssetEntries(nodes: FactoryNodeState[], surfaceId: string): OverviewEntry[] {
  return nodes.filter((node) => node.surfaceId === surfaceId).flatMap((node) => factoryEntry(node) ?? [])
}

export function makeVisibleSurfaceEntries(ids: string[], nodes: FactoryNodeState[], surfaceId: string): OverviewEntry[] {
  const factories = new Map(makeSurfaceAssetEntries(nodes, surfaceId).map((entry) => [entry.id, entry]))
  const [starId, ...planetPath] = surfaceId.split('/')
  const resources = new Map(getResourcePoints(starId, planetPath.join('/')).map((resource) => [resource.id, resource]))
  return ids.flatMap((id) => {
    const factory = factories.get(id)
    if (factory) return [factory]
    const resource = resources.get(id)
    return resource ? [{
      id: resource.id,
      name: resource.displayName,
      meta: `${resource.item} · ${resource.reserves.toLocaleString()} t`,
      category: 'resource' as const,
      selectionKind: 'body' as const,
      color: UI_COLORS.mining
    }] : []
  })
}

export function filterOverviewEntries(entries: OverviewEntry[], enabled: ReadonlySet<OverviewFilterId>): OverviewEntry[] {
  const activeFilters = [...enabled]
  if (activeFilters.length === 0) return entries
  return entries.filter((entry) => activeFilters.every((filter) => {
    if (filter === 'player') return entry.ownerFactionId === PLAYER_FACTION_ID
    // Until faction relations are defined, "hostile" is the non-player orbital bucket.
    if (filter === 'hostile') return entry.category !== 'planet' && entry.ownerFactionId !== PLAYER_FACTION_ID
    return entry.category === filter
  }))
}
