import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AU_LENGTH_FACTOR, DEFAULT_DISPLAY_RADIUS, GAME_SETTING_LIMITS } from '../config/gameplay'
import { content, defaultEdges, defaultNodes, FactoryEdgeState, FactoryNodeState, getFactory } from '../domain/content'
import { SimulationEngine } from '../domain/simulation'
import { findCelestialLocalPosition } from '../domain/orbitalPosition'
import { getOrbitalTimeSeconds } from './orbitalClock'
import { isPlayerControllable, objectRepository, type MovementCapability, type SlotGroup, type SlotSize } from '../domain/objects'
import { fleetCommandBus } from '../features/fleet/application/fleetCommandBus'
import type { FleetEntity } from '../features/fleet/domain/fleetTypes'
import { MOVEMENT_WORLD_UNIT_SCALE, stepFleetBraking, stepFleetMovement } from '../features/fleet/movement/kinematics'

export type SceneId = 'system' | 'surface'
export type OverlayId = 'settings' | 'tech' | 'map' | null

type GameState = {
  scene: SceneId
  selectedId: string | null
  selectedIds: string[]
  objectRevision: number
  orbitalRevision: number
  selectedKind: 'body' | 'factory' | 'station' | 'ship' | null
  overlay: OverlayId
  surfacePlanet: string
  nodes: FactoryNodeState[]
  edges: FactoryEdgeState[]
  speed: 0 | 1 | 2
  orbitAnimation: boolean
  orbitFps: number
  celestialNamesAlwaysVisible: boolean
  objectNamesAlwaysVisible: boolean
  starDisplayRadius: number
  planetDisplayRadius: number
  moonDisplayRadius: number
  orbitalEntityDisplayRadius: number
  overviewMarkerMinZoom: number
  objectIconMinZoom: number
  objectIconMaxZoom: number
  starAuLengthFactor: number
  planetAuLengthFactor: number
  moonAuLengthFactor: number
  zoomLevel: number
  setScene: (scene: SceneId) => void
  select: (id: string | null, kind?: GameState['selectedKind'], additive?: boolean) => void
  executeObjectAction: (actionId: string, targetId?: string, position?: { x: number; y: number }, actorIds?: string[]) => boolean
  renameOrbitalObject: (objectId: string, name: string) => boolean
  setOrbitalOwner: (objectId: string, factionId: string) => boolean
  installEquipment: (objectId: string, group: SlotGroup, size: SlotSize, slotIndex: number, equipmentId: string) => boolean
  setOverlay: (overlay: OverlayId) => void
  enterSurface: (planetId: string) => void
  addNode: (factoryId: string, x?: number, y?: number) => void
  moveNode: (id: string, x: number, y: number) => void
  addEdge: (edge: FactoryEdgeState) => void
  removeNode: (id: string) => void
  setSpeed: (speed: 0 | 1 | 2) => void
  toggleOrbitAnimation: () => void
  toggleCelestialNamesAlwaysVisible: () => void
  toggleObjectNamesAlwaysVisible: () => void
  setOrbitFps: (fps: number) => void
  setStarDisplayRadius: (radius: number) => void
  setPlanetDisplayRadius: (radius: number) => void
  setMoonDisplayRadius: (radius: number) => void
  setOrbitalEntityDisplayRadius: (radius: number) => void
  setOverviewMarkerMinZoom: (zoom: number) => void
  setObjectIconMinZoom: (zoom: number) => void
  setObjectIconMaxZoom: (zoom: number) => void
  setStarAuLengthFactor: (factor: number) => void
  setPlanetAuLengthFactor: (factor: number) => void
  setMoonAuLengthFactor: (factor: number) => void
  setZoomLevel: (zoom: number) => void
  tick: () => void
  advanceFleet: (elapsedSeconds: number) => void
  reset: () => void
}

type PersistedGameState = Pick<GameState,
  'scene' | 'selectedId' | 'selectedKind' | 'overlay' | 'surfacePlanet' |
  'nodes' | 'edges' | 'speed' | 'orbitAnimation' | 'orbitFps' | 'celestialNamesAlwaysVisible' | 'objectNamesAlwaysVisible' |
  'starDisplayRadius' | 'planetDisplayRadius' | 'moonDisplayRadius' | 'orbitalEntityDisplayRadius' | 'overviewMarkerMinZoom' | 'objectIconMinZoom' | 'objectIconMaxZoom' |
  'starAuLengthFactor' | 'planetAuLengthFactor' | 'moonAuLengthFactor' | 'zoomLevel'
>

const initial = { scene: 'system' as SceneId, selectedId: null, selectedIds: [] as string[], objectRevision: 0, orbitalRevision: 0, selectedKind: null, overlay: null as OverlayId, surfacePlanet: 'aurelia', nodes: defaultNodes, edges: defaultEdges, speed: 1 as 0 | 1 | 2, orbitAnimation: true, orbitFps: GAME_SETTING_LIMITS.orbitFps.default, celestialNamesAlwaysVisible: true, objectNamesAlwaysVisible: true, starDisplayRadius: DEFAULT_DISPLAY_RADIUS.star, planetDisplayRadius: DEFAULT_DISPLAY_RADIUS.planet, moonDisplayRadius: DEFAULT_DISPLAY_RADIUS.moon, orbitalEntityDisplayRadius: DEFAULT_DISPLAY_RADIUS.orbitalEntity, overviewMarkerMinZoom: GAME_SETTING_LIMITS.overviewMarkerMinZoom.default, objectIconMinZoom: GAME_SETTING_LIMITS.objectIconZoom.defaultMin, objectIconMaxZoom: GAME_SETTING_LIMITS.objectIconZoom.defaultMax, starAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.star, planetAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.planet, moonAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.moon, zoomLevel: 1 }

for (const node of defaultNodes) { const factory = getFactory(node.factoryId); objectRepository.ensureFactory(node.id, node.factoryId, factory?.name ?? node.factoryId, { ...node }) }

function clampDisplayRadius(radius: number, fallback: number) {
  return Math.min(GAME_SETTING_LIMITS.displayRadius.max, Math.max(GAME_SETTING_LIMITS.displayRadius.min, Number.isFinite(radius) ? radius : fallback))
}

function clampOverviewMarkerMinZoom(zoom: number) {
  return Math.min(GAME_SETTING_LIMITS.overviewMarkerMinZoom.max, Math.max(GAME_SETTING_LIMITS.overviewMarkerMinZoom.min, Number.isFinite(zoom) ? zoom : initial.overviewMarkerMinZoom))
}

function clampObjectIconZoom(zoom: number, fallback: number) {
  return Math.min(GAME_SETTING_LIMITS.objectIconZoom.max, Math.max(GAME_SETTING_LIMITS.objectIconZoom.min, Number.isFinite(zoom) ? zoom : fallback))
}

function clampAuLengthFactor(factor: number, fallback: number) {
  return Math.min(GAME_SETTING_LIMITS.auLengthFactor.max, Math.max(GAME_SETTING_LIMITS.auLengthFactor.min, Number.isFinite(factor) ? factor : fallback))
}

export const useGameStore = create<GameState>()(persist((set) => ({
  ...initial,
  setScene: (scene) => set({ scene, selectedId: null, selectedIds: [], selectedKind: null }),
  select: (id, selectedKind = null, additive = false) => set((state) => {
    if (!id) return { selectedId: null, selectedIds: [], selectedKind: null }
    const selectedIds = additive ? state.selectedIds.includes(id) ? state.selectedIds.filter(item => item !== id) : [...state.selectedIds, id] : [id]
    if (id.startsWith('node-')) { const node = state.nodes.find(item => item.id === id); const factory = node && getFactory(node.factoryId); if (node) objectRepository.ensureFactory(id, node.factoryId, factory?.name ?? node.factoryId, { ...node }) }
    return { selectedIds, selectedId: selectedIds.length === 1 ? selectedIds[0]! : null, selectedKind: selectedIds.length === 1 ? selectedKind : null }
  }),
  executeObjectAction: (actionId, targetId, position, actorIds) => {
    if (actionId === 'warp-to') return false
    let accepted = true
    set((state) => {
      const commandActorIds = actorIds ?? state.selectedIds
      if (commandActorIds.some((id) => !isPlayerControllable(objectRepository.get(id)))) { accepted = false; return state }
      const celestialTarget = actionId === 'move' && targetId
        ? findCelestialLocalPosition(targetId, getOrbitalTimeSeconds(), state.planetAuLengthFactor, state.moonAuLengthFactor)
        : undefined
      const targetObject = targetId ? objectRepository.get(targetId) : undefined
      const targetStarId = celestialTarget?.starId ?? (targetObject?.kind === 'ship' || targetObject?.kind === 'station' ? String(targetObject.staticData.starId) : undefined)
      if (actionId === 'move' && targetId && !celestialTarget && !targetObject?.position) { accepted = false; return state }
      if (actionId === 'move' && targetStarId && commandActorIds.some((id) => {
        const actor = objectRepository.get(id)
        return (actor?.kind === 'ship' || actor?.kind === 'station') && actor.staticData.starId !== targetStarId
      })) { accepted = false; return state }
      const destination = position ?? celestialTarget?.position
      for (const id of commandActorIds) {
        const object = objectRepository.get(id)
        if (!object) continue
        if (actionId === 'stop') object.getCapability<{ stop(): void }>('movement')?.stop()
        if (actionId === 'move' && (targetId || position)) object.getCapability<{ moveTo(target: { objectId: string } | { x: number; y: number }): void }>('movement')?.moveTo(destination ?? { objectId: targetId! })
        if (actionId === 'attack' && targetId) { const target = objectRepository.get(targetId); if (target) object.getCapability<{ attack(target: typeof object): boolean }>('attack')?.attack(target) }
        if (actionId === 'self-destruct') { const damageable = object.getCapability<{ applyDamage(amount: number): void; structureHp: number }>('damageable'); if (damageable) { damageable.applyDamage(Number.MAX_SAFE_INTEGER); object.state.status = 'destroyed' } }
        object.state.lastAction = { actionId, targetId, position: destination, at: Date.now() }
      }
      if (actionId === 'stop') fleetCommandBus.dispatch({ type: 'stop', entityIds: commandActorIds })
      if (actionId === 'move' && (targetId || position)) {
        const commandDestination = destination ?? targetObject?.position
        if (commandDestination) fleetCommandBus.dispatch({ type: 'move', entityIds: commandActorIds, destination: commandDestination })
      }
      if (actionId === 'attack' && targetId) fleetCommandBus.dispatch({ type: 'attack', entityIds: commandActorIds, targetId })
      const changedOrbitalObject = commandActorIds.some((id) => { const kind = objectRepository.get(id)?.kind; return kind === 'ship' || kind === 'station' }) || Boolean(targetId && ['ship', 'station'].includes(objectRepository.get(targetId)?.kind ?? ''))
      return { objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + (changedOrbitalObject ? 1 : 0) }
    })
    return accepted
  },
  renameOrbitalObject: (objectId, name) => {
    const trimmedName = name.trim()
    const object = objectRepository.get(objectId)
    if (!trimmedName || (object?.kind !== 'ship' && object?.kind !== 'station') || !isPlayerControllable(object)) return false
    if (object.displayName === trimmedName) return true
    object.displayName = trimmedName
    set((state) => ({ objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 }))
    return true
  },
  setOrbitalOwner: (objectId, factionId) => {
    const ownerFactionId = factionId.trim()
    const object = objectRepository.get(objectId)
    if (!ownerFactionId || (object?.kind !== 'ship' && object?.kind !== 'station')) return false
    if (object.ownerFactionId === ownerFactionId) return true
    object.ownerFactionId = ownerFactionId
    set((state) => ({ objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 }))
    return true
  },
  installEquipment: (objectId, group, size, slotIndex, equipmentId) => {
    let installed = false
    set((state) => { const object = objectRepository.get(objectId); installed = object && isPlayerControllable(object) ? object.installEquipment(group, size, slotIndex, equipmentId) : false; return { objectRevision: installed ? state.objectRevision + 1 : state.objectRevision, orbitalRevision: installed && (object?.kind === 'ship' || object?.kind === 'station') ? state.orbitalRevision + 1 : state.orbitalRevision } })
    return installed
  },
  setOverlay: (overlay) => set({ overlay }),
  enterSurface: (surfacePlanet) => set({ scene: 'surface', surfacePlanet, selectedId: null, selectedIds: [], selectedKind: null }),
  addNode: (factoryId, x = 560, y = 360) => set((state) => { const node = { id: `node-${factoryId}-${Date.now()}`, factoryId, x, y, buffer: 0, progress: 0, status: 'idle' as const }; objectRepository.ensureFactory(node.id, factoryId, getFactory(factoryId)?.name ?? factoryId, { ...node }); return { nodes: [...state.nodes, node] } }),
  moveNode: (id, x, y) => set((state) => { const object = objectRepository.get(id); if (object) object.position = { x, y }; return { nodes: state.nodes.map((node) => node.id === id ? { ...node, x, y } : node) } }),
  addEdge: (edge) => set((state) => ({ edges: state.edges.some((existing) => existing.id === edge.id) ? state.edges : [...state.edges, edge] })),
  removeNode: (id) => set((state) => { objectRepository.remove(id); const selectedIds = state.selectedIds.filter(selected => selected !== id); return { nodes: state.nodes.filter((node) => node.id !== id), edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id), selectedIds, selectedId: selectedIds.length === 1 ? selectedIds[0]! : null, selectedKind: null } }),
  setSpeed: (speed) => set({ speed }),
  toggleOrbitAnimation: () => set((state) => ({ orbitAnimation: !state.orbitAnimation })),
  toggleCelestialNamesAlwaysVisible: () => set((state) => ({ celestialNamesAlwaysVisible: !state.celestialNamesAlwaysVisible })),
  toggleObjectNamesAlwaysVisible: () => set((state) => ({ objectNamesAlwaysVisible: !state.objectNamesAlwaysVisible })),
  setOrbitFps: (fps) => set({ orbitFps: Math.round(Math.min(GAME_SETTING_LIMITS.orbitFps.max, Math.max(GAME_SETTING_LIMITS.orbitFps.min, Number.isFinite(fps) ? fps : GAME_SETTING_LIMITS.orbitFps.default))) }),
  setStarDisplayRadius: (radius) => set({ starDisplayRadius: clampDisplayRadius(radius, initial.starDisplayRadius) }),
  setPlanetDisplayRadius: (radius) => set({ planetDisplayRadius: clampDisplayRadius(radius, initial.planetDisplayRadius) }),
  setMoonDisplayRadius: (radius) => set({ moonDisplayRadius: clampDisplayRadius(radius, initial.moonDisplayRadius) }),
  setOrbitalEntityDisplayRadius: (radius) => set({ orbitalEntityDisplayRadius: clampDisplayRadius(radius, initial.orbitalEntityDisplayRadius) }),
  setOverviewMarkerMinZoom: (zoom) => set({ overviewMarkerMinZoom: clampOverviewMarkerMinZoom(zoom) }),
  setObjectIconMinZoom: (zoom) => set((state) => ({ objectIconMinZoom: Math.min(clampObjectIconZoom(zoom, initial.objectIconMinZoom), state.objectIconMaxZoom) })),
  setObjectIconMaxZoom: (zoom) => set((state) => ({ objectIconMaxZoom: Math.max(clampObjectIconZoom(zoom, initial.objectIconMaxZoom), state.objectIconMinZoom) })),
  setStarAuLengthFactor: (factor) => set({ starAuLengthFactor: clampAuLengthFactor(factor, initial.starAuLengthFactor) }),
  setPlanetAuLengthFactor: (factor) => set({ planetAuLengthFactor: clampAuLengthFactor(factor, initial.planetAuLengthFactor) }),
  setMoonAuLengthFactor: (factor) => set({ moonAuLengthFactor: clampAuLengthFactor(factor, initial.moonAuLengthFactor) }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.min(1.2, Math.max(0.85, zoomLevel)) }),
  tick: () => set((state) => ({ nodes: SimulationEngine.step(state.nodes, state.speed) })),
  advanceFleet: (elapsedSeconds) => set((state) => {
    const deltaSeconds = state.speed * elapsedSeconds
    let moved = false
    if (deltaSeconds > 0) for (const object of objectRepository.all()) {
      const movement = object.getCapability<MovementCapability>('movement')
      if (!movement || !object.position || (object.kind !== 'ship' && object.kind !== 'station')) continue
      const destination = movement.destination && ('objectId' in movement.destination ? objectRepository.get(movement.destination.objectId)?.position : movement.destination)
      if (movement.destination && !destination) { movement.destination = undefined; moved = true }
      if (!destination && Math.hypot(movement.velocity.x, movement.velocity.y) === 0) continue
      const fleetEntity: FleetEntity = {
        id: object.id,
        definitionId: object.definitionId,
        kind: object.kind,
        factionId: object.ownerFactionId ?? '',
        starId: String(object.staticData.starId ?? ''),
        position: object.position,
        velocity: movement.velocity,
        headingDegrees: movement.headingDegrees,
        movement: {
          maxSpeed: movement.maximumSpeed * MOVEMENT_WORLD_UNIT_SCALE,
          acceleration: movement.acceleration * MOVEMENT_WORLD_UNIT_SCALE,
          turnSpeedDegrees: movement.turnRate,
          warpSpeed: movement.warpSpeed
        },
        capabilities: []
      }
      const stepped = destination ? stepFleetMovement(fleetEntity, destination, deltaSeconds) : stepFleetBraking(fleetEntity, deltaSeconds)
      object.position = stepped.position; movement.velocity = stepped.velocity; movement.headingDegrees = stepped.headingDegrees; movement.speed = Math.hypot(stepped.velocity.x, stepped.velocity.y); moved = true
      if (destination && Math.hypot(destination.x - stepped.position.x, destination.y - stepped.position.y) === 0 && movement.speed === 0) movement.destination = undefined
    }
    return moved ? { objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 } : state
  }),
  reset: () => set(initial)
}), {
  name: 'my-factory-rts-demo',
  version: 7,
  migrate: (persistedState, version): PersistedGameState => {
    const state = persistedState as PersistedGameState
    const migrated = version < 2
      ? { ...state, starAuLengthFactor: initial.starAuLengthFactor, planetAuLengthFactor: initial.planetAuLengthFactor, moonAuLengthFactor: initial.moonAuLengthFactor }
      : state
    const objectIconMinZoom = clampObjectIconZoom(migrated.objectIconMinZoom, initial.objectIconMinZoom)
    const objectIconMaxZoom = Math.max(objectIconMinZoom, clampObjectIconZoom(migrated.objectIconMaxZoom, initial.objectIconMaxZoom))
    return {
      ...migrated,
      selectedId: null,
      selectedKind: null,
      celestialNamesAlwaysVisible: typeof migrated.celestialNamesAlwaysVisible === 'boolean' ? migrated.celestialNamesAlwaysVisible : initial.celestialNamesAlwaysVisible,
      objectNamesAlwaysVisible: typeof migrated.objectNamesAlwaysVisible === 'boolean' ? migrated.objectNamesAlwaysVisible : initial.objectNamesAlwaysVisible,
      starDisplayRadius: clampDisplayRadius(migrated.starDisplayRadius, initial.starDisplayRadius),
      planetDisplayRadius: clampDisplayRadius(migrated.planetDisplayRadius, initial.planetDisplayRadius),
      moonDisplayRadius: clampDisplayRadius(migrated.moonDisplayRadius, initial.moonDisplayRadius),
      orbitalEntityDisplayRadius: clampDisplayRadius(migrated.orbitalEntityDisplayRadius, initial.orbitalEntityDisplayRadius),
      overviewMarkerMinZoom: clampOverviewMarkerMinZoom(migrated.overviewMarkerMinZoom),
      objectIconMinZoom,
      objectIconMaxZoom
    }
  },
  partialize: (state): PersistedGameState => ({
    scene: state.scene, selectedId: state.selectedId, selectedKind: state.selectedKind,
    overlay: state.overlay, surfacePlanet: state.surfacePlanet, nodes: state.nodes,
    edges: state.edges, speed: state.speed, orbitAnimation: state.orbitAnimation,
    orbitFps: state.orbitFps, celestialNamesAlwaysVisible: state.celestialNamesAlwaysVisible,
    objectNamesAlwaysVisible: state.objectNamesAlwaysVisible, starDisplayRadius: state.starDisplayRadius,
    planetDisplayRadius: state.planetDisplayRadius, moonDisplayRadius: state.moonDisplayRadius,
    orbitalEntityDisplayRadius: state.orbitalEntityDisplayRadius,
    overviewMarkerMinZoom: state.overviewMarkerMinZoom,
    objectIconMinZoom: state.objectIconMinZoom, objectIconMaxZoom: state.objectIconMaxZoom,
    starAuLengthFactor: state.starAuLengthFactor, planetAuLengthFactor: state.planetAuLengthFactor,
    moonAuLengthFactor: state.moonAuLengthFactor, zoomLevel: state.zoomLevel
  })
}))
