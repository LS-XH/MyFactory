import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_GAME_SETTINGS, GAME_SETTING_LIMITS, SURFACE_VIEW } from '../config/gameplay'
import { CAMERA_DIRECTIONS, CAMERA_KEY_FIELDS, isCameraKeyCode, type CameraDirection } from '../config/cameraControls'
import { SPACE_MAP_ZOOM, zoomLevelAfter, zoomLevelBefore } from '../config/spaceMapVisuals'
import { defaultEdges, defaultNodes, FactoryEdgeState, FactoryNodeState, getFactory, getFactoryPortItems } from '../domain/content'
import { SimulationEngine } from '../domain/simulation'
import { stepSurfaceProduction } from '../domain/surfaceSimulation'
import { formulasForFactory } from '../domain/surfaceContent'
import { getDefaultPlanet, getStar } from '../domain/spaceMap'
import { findCelestialLocalPosition } from '../domain/orbitalPosition'
import { getOrbitalTimeSeconds } from './orbitalClock'
import { EquipmentCapability, getOrbitalObjects, isMovementTaskAction, isPlayerControllable, objectRepository, TaskQueueCapability, type MovementCapability, type ObjectTask, type SlotGroup, type SlotSize } from '../domain/objects'
import { getEquipmentDefinition } from '../domain/equipment'
import { getItemDefinition } from '../domain/items'
import { fleetCommandBus } from '../features/fleet/application/fleetCommandBus'
import type { FleetEntity } from '../features/fleet/domain/fleetTypes'
import { hasFinishedFacing, hasReachedDestination, orbitApproachPoint, stepFleetBraking, stepFleetFacing, stepFleetMovement } from '../features/fleet/movement/kinematics'
import { moveInventoryStack, StorageCapability } from '../domain/storage'
import { nearestStarId, orbitalLocalPosition, orbitalWorldPosition, worldUnitsPerKm } from '../domain/orbitalSpace'

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
  resourceReserves: Record<string, number>
  speed: 0 | 1 | 2
  orbitAnimation: boolean
  reduceMotion: boolean
  orbitFps: number
  cameraKeyUp: string
  cameraKeyLeft: string
  cameraKeyDown: string
  cameraKeyRight: string
  cameraMoveSpeed: number
  cameraBoostSpeed: number
  inventoryScale: number
  movementArrivalToleranceAu: number
  kmToAu: number
  starMapGridSpacingAu: number
  starMapGridFadeStartZoom: number
  starMapGridFadeEndZoom: number
  objectFocusZoom: number
  celestialNamesAlwaysVisible: boolean
  objectNamesAlwaysVisible: boolean
  starDisplayRadius: number
  planetDisplayRadius: number
  moonDisplayRadius: number
  orbitalEntityDisplayRadius: number
  overviewMarkerMinZoom: number
  overviewFadeStartZoom: number
  overviewFadeEndZoom: number
  systemFadeStartZoom: number
  systemFadeEndZoom: number
  objectIconMinZoom: number
  objectIconMaxZoom: number
  surfaceCardCompactMaxZoom: number
  surfaceCardDetailMinZoom: number
  surfaceIconMinZoom: number
  starAuLengthFactor: number
  planetAuLengthFactor: number
  moonAuLengthFactor: number
  zoomLevel: number
  setScene: (scene: SceneId) => void
  select: (id: string | null, kind?: GameState['selectedKind'], additive?: boolean) => void
  executeObjectAction: (actionId: string, targetId?: string, position?: { x: number; y: number }, actorIds?: string[], positionStarId?: string, appendTask?: boolean, parameters?: { distanceKm?: number; offsetKm?: { x: number; y: number } }) => boolean
  moveObjectTask: (objectId: string, taskId: string, targetIndex: number) => boolean
  retargetObjectTask: (objectId: string, taskId: string, position: { x: number; y: number }, starId: string) => boolean
  removeObjectTask: (objectId: string, taskId: string) => boolean
  renameOrbitalObject: (objectId: string, name: string) => boolean
  setOrbitalOwner: (objectId: string, factionId: string) => boolean
  changeEquipment: (objectId: string, group: SlotGroup, size: SlotSize, slotIndex: number, inventorySlot: number | null) => { ok: boolean; reason?: string }
  moveInventoryItem: (sourceId: string, sourceSlot: number, targetId: string, targetSlot: number) => { ok: boolean; reason?: string }
  sortInventory: (objectId: string) => { ok: boolean; changed?: boolean; reason?: string }
  setOverlay: (overlay: OverlayId) => void
  enterSurface: (planetId: string) => void
  addNode: (factoryId: string, x?: number, y?: number) => void
  moveNode: (id: string, x: number, y: number) => void
  addEdge: (edge: FactoryEdgeState) => void
  removeNode: (id: string) => void
  setNodeRecipe: (id: string, recipeId: string) => void
  setSpeed: (speed: 0 | 1 | 2) => void
  toggleOrbitAnimation: () => void
  toggleReduceMotion: () => void
  toggleCelestialNamesAlwaysVisible: () => void
  toggleObjectNamesAlwaysVisible: () => void
  setOrbitFps: (fps: number) => void
  setCameraKeyBinding: (direction: CameraDirection, code: string) => void
  setCameraMoveSpeed: (speed: number) => void
  setCameraBoostSpeed: (speed: number) => void
  setInventoryScale: (scale: number) => void
  setMovementArrivalToleranceAu: (tolerance: number) => void
  setKmToAu: (value: number) => void
  setStarMapGridSpacingAu: (value: number) => void
  setStarMapGridFadeStartZoom: (zoom: number) => void
  setStarMapGridFadeEndZoom: (zoom: number) => void
  setObjectFocusZoom: (zoom: number) => void
  setStarDisplayRadius: (radius: number) => void
  setPlanetDisplayRadius: (radius: number) => void
  setMoonDisplayRadius: (radius: number) => void
  setOrbitalEntityDisplayRadius: (radius: number) => void
  setOverviewMarkerMinZoom: (zoom: number) => void
  setOverviewFadeStartZoom: (zoom: number) => void
  setOverviewFadeEndZoom: (zoom: number) => void
  setSystemFadeStartZoom: (zoom: number) => void
  setSystemFadeEndZoom: (zoom: number) => void
  setObjectIconMinZoom: (zoom: number) => void
  setObjectIconMaxZoom: (zoom: number) => void
  setSurfaceCardCompactMaxZoom: (zoom: number) => void
  setSurfaceCardDetailMinZoom: (zoom: number) => void
  setSurfaceIconMinZoom: (zoom: number) => void
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
  'nodes' | 'edges' | 'resourceReserves' | 'speed' | 'zoomLevel'
>

const defaultSurface = getDefaultPlanet()
const defaultSurfaceId = `${defaultSurface.starId}/${defaultSurface.planetId}`
const initial = { scene: 'system' as SceneId, selectedId: null, selectedIds: [] as string[], objectRevision: 0, orbitalRevision: 0, selectedKind: null, overlay: null as OverlayId, surfacePlanet: defaultSurfaceId, nodes: defaultNodes.map((node) => ({ ...node, surfaceId: defaultSurfaceId, x: Math.round(node.x / SURFACE_VIEW.gridGap), y: Math.round(node.y / SURFACE_VIEW.gridGap) })) as FactoryNodeState[], edges: defaultEdges, resourceReserves: {} as Record<string, number>, speed: 1 as 0 | 1 | 2, ...DEFAULT_GAME_SETTINGS, zoomLevel: 1 }

function activateFirstTask(objectId: string) {
  const object = objectRepository.get(objectId)
  const movement = object?.getCapability<MovementCapability>('movement')
  if (!movement) return
  const task = object?.getCapability<TaskQueueCapability>('taskQueue')?.tasks[0]
  if (task && isMovementTaskAction(task.actionId)) movement.moveTo(task.destination, task.destinationStarId)
  else movement.stop()
}

function clampDisplayRadius(radius: number, fallback: number) {
  return Math.min(GAME_SETTING_LIMITS.displayRadius.max, Math.max(GAME_SETTING_LIMITS.displayRadius.min, Number.isFinite(radius) ? radius : fallback))
}

function clampInventoryScale(scale: number) {
  return Math.min(GAME_SETTING_LIMITS.inventoryScale.max, Math.max(GAME_SETTING_LIMITS.inventoryScale.min, Number.isFinite(scale) ? scale : GAME_SETTING_LIMITS.inventoryScale.default))
}

function clampMovementArrivalToleranceAu(tolerance: number) {
  const limits = GAME_SETTING_LIMITS.movementArrivalToleranceAu
  return Math.min(limits.max, Math.max(limits.min, Number.isFinite(tolerance) ? tolerance : limits.default))
}

function clampKmToAu(value: number) {
  const limits = GAME_SETTING_LIMITS.kmToAu
  return Math.min(limits.max, Math.max(limits.min, Number.isFinite(value) ? value : limits.default))
}

function clampOverviewMarkerMinZoom(zoom: number) {
  return Math.min(GAME_SETTING_LIMITS.overviewMarkerMinZoom.max, Math.max(GAME_SETTING_LIMITS.overviewMarkerMinZoom.min, Number.isFinite(zoom) ? zoom : initial.overviewMarkerMinZoom))
}

function clampStarLayerZoom(zoom: number, fallback: number) {
  const { min, max } = GAME_SETTING_LIMITS.starLayerTransitionZoom
  return Math.min(max, Math.max(min, Number.isFinite(zoom) ? zoom : fallback))
}

function clampObjectIconZoom(zoom: number, fallback: number) {
  return Math.min(GAME_SETTING_LIMITS.objectIconZoom.max, Math.max(GAME_SETTING_LIMITS.objectIconZoom.min, Number.isFinite(zoom) ? zoom : fallback))
}

function clampSurfaceCardZoom(zoom: number, fallback: number) {
  const { min, max } = GAME_SETTING_LIMITS.surfaceCardZoom
  return Math.min(max, Math.max(min, Number.isFinite(zoom) ? zoom : fallback))
}

function clampAuLengthFactor(factor: number, fallback: number) {
  return Math.min(GAME_SETTING_LIMITS.auLengthFactor.max, Math.max(GAME_SETTING_LIMITS.auLengthFactor.min, Number.isFinite(factor) ? factor : fallback))
}

export const useGameStore = create<GameState>()(persist((set) => ({
  ...initial,
  setScene: (scene) => set({ scene, selectedId: null, selectedIds: [], selectedKind: null }),
  select: (id, selectedKind = null, additive = false) => set((state) => {
    if (!id) return state.selectedIds.length === 0 && state.selectedId === null ? state : { selectedId: null, selectedIds: [], selectedKind: null }
    if (!additive && state.selectedIds.length === 1 && state.selectedIds[0] === id && state.selectedKind === selectedKind) return state
    const selectedIds = additive ? state.selectedIds.includes(id) ? state.selectedIds.filter(item => item !== id) : [...state.selectedIds, id] : [id]
    if (id.startsWith('node-')) { const node = state.nodes.find(item => item.id === id); const factory = node && getFactory(node.factoryId); if (node) objectRepository.ensureFactory(id, node.factoryId, factory?.name ?? node.factoryId, { ...node }) }
    return { selectedIds, selectedId: selectedIds.length === 1 ? selectedIds[0]! : null, selectedKind: selectedIds.length === 1 ? selectedKind : null }
  }),
  executeObjectAction: (actionId, targetId, position, actorIds, positionStarId, appendTask = false, parameters) => {
    let accepted = true
    set((state) => {
      const commandActorIds = actorIds ?? state.selectedIds
      if (commandActorIds.some((id) => !isPlayerControllable(objectRepository.get(id)))) { accepted = false; return state }
      const movementTask = isMovementTaskAction(actionId)
      const targetObject = targetId ? objectRepository.get(targetId) : undefined
      const celestialTarget = movementTask && targetId && !targetObject?.position
        ? findCelestialLocalPosition(targetId, getOrbitalTimeSeconds(), state.planetAuLengthFactor, state.moonAuLengthFactor)
        : undefined
      const targetStarId = celestialTarget?.starId ?? (targetObject?.kind === 'ship' || targetObject?.kind === 'station' ? String(targetObject.staticData.starId) : undefined)
      if (movementTask && targetId && !celestialTarget && !targetObject?.position) { accepted = false; return state }
      if (actionId === 'warp-to' && commandActorIds.some(id => { const movement = objectRepository.get(id)?.getCapability<MovementCapability>('movement'); return !movement || movement.warpSpeed <= 0 || movement.warpAcceleration <= 0 })) { accepted = false; return state }
      const destination = celestialTarget?.position ?? position
      if (movementTask && !targetId && !destination) { accepted = false; return state }
      if (actionId === 'orbit' && (!parameters?.distanceKm || !Number.isFinite(parameters.distanceKm) || parameters.distanceKm <= 0)) { accepted = false; return state }
      if ((actionId === 'keep-distance' || actionId === 'warp-to') && (!parameters?.offsetKm || !Number.isFinite(parameters.offsetKm.x) || !Number.isFinite(parameters.offsetKm.y) || !Number.isFinite(Math.hypot(parameters.offsetKm.x, parameters.offsetKm.y)))) { accepted = false; return state }
      const startedMoveIds: string[] = []
      for (const id of commandActorIds) {
        const object = objectRepository.get(id)
        if (!object) continue
        if (actionId === 'stop') { object.getCapability<TaskQueueCapability>('taskQueue')?.clear(); activateFirstTask(id) }
        if (movementTask && (targetId || destination)) {
          const queue = object.getCapability<TaskQueueCapability>('taskQueue')
          if (queue) {
            const startsNow = !appendTask || queue.tasks.length === 0
            const task: ObjectTask = { id: crypto.randomUUID(), actionId, targetId, destination: destination ? { ...destination } : { objectId: targetId! }, destinationStarId: destination ? targetStarId ?? positionStarId ?? String(object.staticData.starId) : undefined, distanceKm: parameters?.distanceKm, offsetKm: parameters?.offsetKm ? { ...parameters.offsetKm } : undefined }
            if (appendTask) queue.append(task)
            else queue.replace(task)
            activateFirstTask(id)
            if (startsNow) startedMoveIds.push(id)
          }
        }
        if (actionId === 'attack' && targetId) { const target = objectRepository.get(targetId); if (target) { object.getCapability<{ attack(target: typeof object): boolean }>('attack')?.attack(target); if (target.state.status === 'destroyed') { target.getCapability<TaskQueueCapability>('taskQueue')?.clear(); activateFirstTask(target.id) } } }
        if (actionId === 'self-destruct') { const damageable = object.getCapability<{ applyDamage(amount: number): void; structureHp: number }>('damageable'); if (damageable) { damageable.applyDamage(Number.MAX_SAFE_INTEGER); object.state.status = 'destroyed'; object.getCapability<TaskQueueCapability>('taskQueue')?.clear(); activateFirstTask(id) } }
        object.state.lastAction = { actionId, targetId, position: destination, at: Date.now() }
      }
      if (actionId === 'stop') fleetCommandBus.dispatch({ type: 'stop', entityIds: commandActorIds })
      if (actionId === 'move' && startedMoveIds.length) {
        const commandDestination = destination ?? targetObject?.position
        if (commandDestination) fleetCommandBus.dispatch({ type: 'move', entityIds: startedMoveIds, destination: commandDestination })
      }
      if (actionId === 'attack' && targetId) fleetCommandBus.dispatch({ type: 'attack', entityIds: commandActorIds, targetId })
      const changedOrbitalObject = commandActorIds.some((id) => { const kind = objectRepository.get(id)?.kind; return kind === 'ship' || kind === 'station' }) || Boolean(targetId && ['ship', 'station'].includes(objectRepository.get(targetId)?.kind ?? ''))
      return { objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + (changedOrbitalObject ? 1 : 0) }
    })
    return accepted
  },
  moveObjectTask: (objectId, taskId, targetIndex) => {
    const object = objectRepository.get(objectId)
    if (!isPlayerControllable(object)) return false
    const moved = object?.getCapability<TaskQueueCapability>('taskQueue')?.move(taskId, targetIndex) ?? false
    if (moved) { activateFirstTask(objectId); set((state) => ({ objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 })) }
    return moved
  },
  retargetObjectTask: (objectId, taskId, position, starId) => {
    const object = objectRepository.get(objectId)
    if (!isPlayerControllable(object) || !getStar(starId) || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return false
    const queue = object?.getCapability<TaskQueueCapability>('taskQueue')
    const task = queue?.tasks.find(entry => entry.id === taskId)
    const scale = worldUnitsPerKm(useGameStore.getState().kmToAu, useGameStore.getState().starAuLengthFactor)
    const targetPosition = task?.actionId === 'warp-to' && task.offsetKm
      ? { x: position.x - task.offsetKm.x * scale, y: position.y - task.offsetKm.y * scale }
      : position
    const changed = queue?.retarget(taskId, targetPosition, starId) ?? false
    if (changed) { activateFirstTask(objectId); set((state) => ({ objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 })) }
    return changed
  },
  removeObjectTask: (objectId, taskId) => {
    const object = objectRepository.get(objectId)
    if (!isPlayerControllable(object)) return false
    const removed = object?.getCapability<TaskQueueCapability>('taskQueue')?.remove(taskId) ?? false
    if (removed) { activateFirstTask(objectId); set((state) => ({ objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 })) }
    return removed
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
  changeEquipment: (objectId, group, size, slotIndex, inventorySlot) => {
    const object = objectRepository.get(objectId)
    const storage = object?.getCapability<StorageCapability>('storage')
    const equipment = object?.getCapability<EquipmentCapability>('equipment')
    if (!object || !isPlayerControllable(object) || !storage || !equipment) return { ok: false, reason: '该对象无法装配装备' }
    const installedId = equipment.slots[group]?.[size]?.[slotIndex]
    if (installedId === undefined) return { ok: false, reason: '目标槽位无效' }
    if (inventorySlot === null && !installedId) return { ok: false, reason: '该槽位没有已安装装备' }
    const stack = inventorySlot === null ? undefined : storage.slots.find((entry) => entry.slot === inventorySlot)
    const incoming = stack && getEquipmentDefinition(stack.itemId)
    if (inventorySlot !== null && !incoming) return { ok: false, reason: stack && getItemDefinition(stack.itemId)?.itemType === 'equipment' ? '装备静态资源中的类别配置不一致' : '请从物品栏选择装备' }
    if (incoming && (incoming.slotGroup !== group || incoming.size !== size)) return { ok: false, reason: '装备类别或尺寸与槽位不匹配' }
    if (incoming && stack?.itemId === installedId) return { ok: false, reason: '该槽位已安装相同装备' }
    const outgoingItem = installedId ? getItemDefinition(installedId) : undefined
    if (installedId && !outgoingItem) return { ok: false, reason: '已安装装备缺少物品定义' }
    const nextVolume = storage.usedVolume - (incoming ? getItemDefinition(stack!.itemId)!.volume : 0) + (outgoingItem?.volume ?? 0)
    if (nextVolume > storage.maxVolume + 1e-9) return { ok: false, reason: '卸下的装备将超过物品栏体积上限' }
    const originalInventory = storage.slots.map((entry) => ({ ...entry }))
    const outgoingId = installedId ? object.uninstallEquipment(group, size, slotIndex) : undefined
    if (installedId && !outgoingId) return { ok: false, reason: '无法卸下原装备' }
    if (incoming && !object.installEquipment(group, size, slotIndex, stack!.itemId)) {
      if (outgoingId) object.installEquipment(group, size, slotIndex, outgoingId)
      return { ok: false, reason: '无法将装备安装到该槽位' }
    }
    if ((incoming && !storage.take(stack!.itemId, 1)) || (outgoingId && !storage.add(outgoingId, 1))) {
      if (incoming) object.uninstallEquipment(group, size, slotIndex)
      if (outgoingId) object.installEquipment(group, size, slotIndex, outgoingId)
      storage.slots = originalInventory
      return { ok: false, reason: '物品栏更新失败' }
    }
    set((state) => ({ objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 }))
    return { ok: true }
  },
  moveInventoryItem: (sourceId, sourceSlot, targetId, targetSlot) => {
    const sourceObject = objectRepository.get(sourceId)
    const targetObject = objectRepository.get(targetId)
    if (!isPlayerControllable(sourceObject) || !isPlayerControllable(targetObject)) return { ok: false, reason: '只有玩家所属对象可以转移物品' }
    const source = sourceObject?.getCapability<StorageCapability>('storage')
    const target = targetObject?.getCapability<StorageCapability>('storage')
    if (!source || !target) return { ok: false, reason: '目标没有物品栏' }
    if (sourceId === targetId && sourceSlot === targetSlot) return { ok: true }
    const result = moveInventoryStack(source, sourceSlot, target, targetSlot)
    if (result.ok) set((state) => ({ objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 }))
    return result
  },
  sortInventory: (objectId) => {
    const object = objectRepository.get(objectId)
    const storage = object?.getCapability<StorageCapability>('storage')
    if (!isPlayerControllable(object) || !storage) return { ok: false, reason: '该对象没有可整理的玩家物品栏' }
    const changed = storage.sortAndStack()
    if (changed) set((state) => ({ objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 }))
    return { ok: true, changed }
  },
  setOverlay: (overlay) => set({ overlay }),
  enterSurface: (surfacePlanet) => set({ scene: 'surface', surfacePlanet, selectedId: null, selectedIds: [], selectedKind: null }),
  addNode: (factoryId, x, y) => set((state) => { const count = state.nodes.filter((node) => node.surfaceId === state.surfacePlanet).length; const node = { id: `node-${factoryId}-${Date.now()}`, factoryId, surfaceId: state.surfacePlanet, x: Math.round(x ?? 5 + count * 3), y: Math.round(y ?? 5 + count * 3), buffer: 0, progress: 0, status: 'idle' as const }; objectRepository.ensureFactory(node.id, factoryId, getFactory(factoryId)?.name ?? factoryId, { ...node }); return { nodes: [...state.nodes, node] } }),
  moveNode: (id, x, y) => set((state) => { const position = { x: Math.round(x), y: Math.round(y) }; const object = objectRepository.get(id); if (object) object.position = position; return { nodes: state.nodes.map((node) => node.id === id ? { ...node, ...position } : node) } }),
  addEdge: (edge) => set((state) => state.edges.some((existing) => existing.source === edge.source && existing.target === edge.target && existing.itemId === edge.itemId) ? state : { edges: [...state.edges, edge] }),
  removeNode: (id) => set((state) => { objectRepository.remove(id); const selectedIds = state.selectedIds.filter(selected => selected !== id); return { nodes: state.nodes.filter((node) => node.id !== id), edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id), selectedIds, selectedId: selectedIds.length === 1 ? selectedIds[0]! : null, selectedKind: null } }),
  setNodeRecipe: (id, recipeId) => set((state) => {
    const node = state.nodes.find((item) => item.id === id)
    const factory = node && getFactory(node.factoryId)
    if (!node || !factory || !formulasForFactory(factory.id).some(([formulaId]) => formulaId === recipeId) || node.recipeId === recipeId) return state
    const ports = getFactoryPortItems(factory, { ...node, recipeId })
    return {
      nodes: state.nodes.map((item) => item.id === id ? { ...item, recipeId, progress: 0 } : item),
      edges: state.edges.filter((edge) => (edge.source !== id || ports.outputs.includes(edge.itemId)) && (edge.target !== id || ports.inputs.includes(edge.itemId)))
    }
  }),
  setSpeed: (speed) => set({ speed }),
  toggleOrbitAnimation: () => set((state) => ({ orbitAnimation: !state.orbitAnimation })),
  toggleReduceMotion: () => set((state) => ({ reduceMotion: !state.reduceMotion })),
  toggleCelestialNamesAlwaysVisible: () => set((state) => ({ celestialNamesAlwaysVisible: !state.celestialNamesAlwaysVisible })),
  toggleObjectNamesAlwaysVisible: () => set((state) => ({ objectNamesAlwaysVisible: !state.objectNamesAlwaysVisible })),
  setOrbitFps: (fps) => set({ orbitFps: Math.round(Math.min(GAME_SETTING_LIMITS.orbitFps.max, Math.max(GAME_SETTING_LIMITS.orbitFps.min, Number.isFinite(fps) ? fps : GAME_SETTING_LIMITS.orbitFps.default))) }),
  setCameraKeyBinding: (direction, code) => set((state) => {
    if (!isCameraKeyCode(code)) return state
    const field = CAMERA_KEY_FIELDS[direction]
    const current = state[field]
    if (current === code) return state
    const otherDirection = CAMERA_DIRECTIONS.find((item) => item !== direction && state[CAMERA_KEY_FIELDS[item]] === code)
    return otherDirection ? { [field]: code, [CAMERA_KEY_FIELDS[otherDirection]]: current } : { [field]: code }
  }),
  setCameraMoveSpeed: (speed) => set((state) => ({ cameraMoveSpeed: Math.min(state.cameraBoostSpeed, Math.max(GAME_SETTING_LIMITS.cameraMoveSpeed.min, Math.min(GAME_SETTING_LIMITS.cameraMoveSpeed.max, Number.isFinite(speed) ? speed : GAME_SETTING_LIMITS.cameraMoveSpeed.default))) })),
  setCameraBoostSpeed: (speed) => set((state) => ({ cameraBoostSpeed: Math.max(state.cameraMoveSpeed, Math.min(GAME_SETTING_LIMITS.cameraBoostSpeed.max, Math.max(GAME_SETTING_LIMITS.cameraBoostSpeed.min, Number.isFinite(speed) ? speed : GAME_SETTING_LIMITS.cameraBoostSpeed.default))) })),
  setInventoryScale: (scale) => set({ inventoryScale: clampInventoryScale(scale) }),
  setMovementArrivalToleranceAu: (tolerance) => set({ movementArrivalToleranceAu: clampMovementArrivalToleranceAu(tolerance) }),
  setKmToAu: (value) => set({ kmToAu: clampKmToAu(value) }),
  setStarMapGridSpacingAu: (value) => set({ starMapGridSpacingAu: Math.min(GAME_SETTING_LIMITS.starMapGridSpacingAu.max, Math.max(GAME_SETTING_LIMITS.starMapGridSpacingAu.min, Number.isFinite(value) ? value : initial.starMapGridSpacingAu)) }),
  setStarMapGridFadeStartZoom: (zoom) => set((state) => ({ starMapGridFadeStartZoom: Math.min(clampStarLayerZoom(zoom, initial.starMapGridFadeStartZoom), zoomLevelBefore(state.starMapGridFadeEndZoom)) })),
  setStarMapGridFadeEndZoom: (zoom) => set((state) => ({ starMapGridFadeEndZoom: Math.max(clampStarLayerZoom(zoom, initial.starMapGridFadeEndZoom), zoomLevelAfter(state.starMapGridFadeStartZoom)) })),
  setObjectFocusZoom: (zoom) => set({ objectFocusZoom: Number.isFinite(zoom) ? SPACE_MAP_ZOOM.levels.reduce((closest, level) => Math.abs(level - zoom) < Math.abs(closest - zoom) ? level : closest, initial.objectFocusZoom) : initial.objectFocusZoom }),
  setStarDisplayRadius: (radius) => set({ starDisplayRadius: clampDisplayRadius(radius, initial.starDisplayRadius) }),
  setPlanetDisplayRadius: (radius) => set({ planetDisplayRadius: clampDisplayRadius(radius, initial.planetDisplayRadius) }),
  setMoonDisplayRadius: (radius) => set({ moonDisplayRadius: clampDisplayRadius(radius, initial.moonDisplayRadius) }),
  setOrbitalEntityDisplayRadius: (radius) => set({ orbitalEntityDisplayRadius: clampDisplayRadius(radius, initial.orbitalEntityDisplayRadius) }),
  setOverviewMarkerMinZoom: (zoom) => set({ overviewMarkerMinZoom: clampOverviewMarkerMinZoom(zoom) }),
  setOverviewFadeStartZoom: (zoom) => set((state) => ({ overviewFadeStartZoom: Math.min(clampStarLayerZoom(zoom, initial.overviewFadeStartZoom), zoomLevelBefore(state.overviewFadeEndZoom)) })),
  setOverviewFadeEndZoom: (zoom) => set((state) => ({ overviewFadeEndZoom: Math.max(clampStarLayerZoom(zoom, initial.overviewFadeEndZoom), zoomLevelAfter(state.overviewFadeStartZoom)) })),
  setSystemFadeStartZoom: (zoom) => set((state) => ({ systemFadeStartZoom: Math.min(clampStarLayerZoom(zoom, initial.systemFadeStartZoom), zoomLevelBefore(state.systemFadeEndZoom)) })),
  setSystemFadeEndZoom: (zoom) => set((state) => ({ systemFadeEndZoom: Math.max(clampStarLayerZoom(zoom, initial.systemFadeEndZoom), zoomLevelAfter(state.systemFadeStartZoom)) })),
  setObjectIconMinZoom: (zoom) => set((state) => ({ objectIconMinZoom: Math.min(clampObjectIconZoom(zoom, initial.objectIconMinZoom), state.objectIconMaxZoom) })),
  setObjectIconMaxZoom: (zoom) => set((state) => ({ objectIconMaxZoom: Math.max(clampObjectIconZoom(zoom, initial.objectIconMaxZoom), state.objectIconMinZoom) })),
  setSurfaceCardCompactMaxZoom: (zoom) => set((state) => { const next = Math.max(GAME_SETTING_LIMITS.surfaceCardZoom.min, Math.min(clampSurfaceCardZoom(zoom, initial.surfaceCardCompactMaxZoom), state.surfaceCardDetailMinZoom - GAME_SETTING_LIMITS.surfaceCardZoom.gap)); return { surfaceCardCompactMaxZoom: next, surfaceIconMinZoom: Math.min(state.surfaceIconMinZoom, next) } }),
  setSurfaceCardDetailMinZoom: (zoom) => set((state) => ({ surfaceCardDetailMinZoom: Math.min(GAME_SETTING_LIMITS.surfaceCardZoom.max, Math.max(clampSurfaceCardZoom(zoom, initial.surfaceCardDetailMinZoom), state.surfaceCardCompactMaxZoom + GAME_SETTING_LIMITS.surfaceCardZoom.gap)) })),
  setSurfaceIconMinZoom: (zoom) => set((state) => ({ surfaceIconMinZoom: Math.min(clampSurfaceCardZoom(zoom, initial.surfaceIconMinZoom), state.surfaceCardCompactMaxZoom) })),
  setStarAuLengthFactor: (factor) => set({ starAuLengthFactor: clampAuLengthFactor(factor, initial.starAuLengthFactor) }),
  setPlanetAuLengthFactor: (factor) => set({ planetAuLengthFactor: clampAuLengthFactor(factor, initial.planetAuLengthFactor) }),
  setMoonAuLengthFactor: (factor) => set({ moonAuLengthFactor: clampAuLengthFactor(factor, initial.moonAuLengthFactor) }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.min(1.2, Math.max(0.85, zoomLevel)) }),
  tick: () => set((state) => stepSurfaceProduction({ nodes: SimulationEngine.step(state.nodes, state.speed), edges: state.edges, resourceReserves: state.resourceReserves }, state.speed)),
  advanceFleet: (elapsedSeconds) => set((state) => {
    const deltaSeconds = state.speed * elapsedSeconds
    const arrivalToleranceWorld = state.movementArrivalToleranceAu * state.starAuLengthFactor
    const kmWorldScale = worldUnitsPerKm(state.kmToAu, state.starAuLengthFactor)
    let moved = false
    if (deltaSeconds > 0) for (const object of getOrbitalObjects()) {
      const movement = object.getCapability<MovementCapability>('movement')
      if (!movement || !object.position || (object.kind !== 'ship' && object.kind !== 'station')) continue
      const currentStarId = String(object.staticData.starId)
      const worldPosition = orbitalWorldPosition(currentStarId, object.position, state.starAuLengthFactor)
      if (!worldPosition) continue
      const activeTask = object.getCapability<TaskQueueCapability>('taskQueue')?.tasks[0]
      const activeTargetObject = activeTask?.targetId ? objectRepository.get(activeTask.targetId) : undefined
      const celestialTarget = activeTask && activeTask.actionId !== 'move' && activeTask.targetId && !activeTargetObject?.position
        ? findCelestialLocalPosition(activeTask.targetId, getOrbitalTimeSeconds(), state.planetAuLengthFactor, state.moonAuLengthFactor)
        : undefined
      const destination = celestialTarget
        ? orbitalWorldPosition(celestialTarget.starId, celestialTarget.position, state.starAuLengthFactor)
        : movement.destination && ('objectId' in movement.destination
        ? (() => {
          const target = objectRepository.get(movement.destination.objectId)
          return target?.position ? orbitalWorldPosition(String(target.staticData.starId), target.position, state.starAuLengthFactor) : undefined
        })()
        : orbitalWorldPosition(movement.destinationStarId ?? currentStarId, movement.destination, state.starAuLengthFactor))
      if (movement.destination && !destination) { object.getCapability<TaskQueueCapability>('taskQueue')?.complete(); activateFirstTask(object.id); moved = true; continue }
      if (!destination && Math.hypot(movement.velocity.x, movement.velocity.y) === 0 && movement.angularVelocityDegrees === 0 && movement.warpPhase === 'idle') continue
      const isWarpTask = Boolean(destination && activeTask?.actionId === 'warp-to')
      const fleetEntity: FleetEntity = {
        id: object.id,
        definitionId: object.definitionId,
        kind: object.kind,
        factionId: object.ownerFactionId ?? '',
        starId: currentStarId,
        position: worldPosition,
        velocity: { x: movement.velocity.x * kmWorldScale, y: movement.velocity.y * kmWorldScale },
        headingDegrees: movement.headingDegrees,
        angularVelocityDegrees: movement.angularVelocityDegrees,
        movement: {
          maxSpeed: (isWarpTask ? movement.warpSpeed : movement.maximumSpeed) * kmWorldScale,
          acceleration: (isWarpTask ? movement.warpAcceleration : movement.acceleration) * kmWorldScale,
          turnSpeedDegrees: movement.turnRate,
          turnAccelerationDegrees: movement.turnAcceleration
        },
        capabilities: []
      }
      const orbitGoal = destination && activeTask?.actionId === 'orbit'
        ? orbitApproachPoint(fleetEntity, destination, (activeTask.distanceKm ?? 0) * kmWorldScale, Math.max(arrivalToleranceWorld * 2, fleetEntity.movement.maxSpeed * 2))
        : undefined
      const orbitToleranceWorld = activeTask?.actionId === 'orbit'
        ? Math.min(arrivalToleranceWorld, Math.max((activeTask.distanceKm ?? 0) * kmWorldScale * 0.1, 1e-9))
        : arrivalToleranceWorld
      const holdGoal = destination && activeTask?.actionId === 'keep-distance' && activeTask.offsetKm
        ? { x: destination.x + activeTask.offsetKm.x * kmWorldScale, y: destination.y + activeTask.offsetKm.y * kmWorldScale }
        : undefined
      const warpGoal = destination && activeTask?.actionId === 'warp-to' && activeTask.offsetKm
        ? { x: destination.x + activeTask.offsetKm.x * kmWorldScale, y: destination.y + activeTask.offsetKm.y * kmWorldScale }
        : destination
      const previousWarpPhase = movement.warpPhase
      movement.warpPhase = isWarpTask ? 'warping' : 'idle'
      const stepped = destination && activeTask?.actionId === 'face'
        ? stepFleetFacing(fleetEntity, destination, deltaSeconds)
        : orbitGoal ? stepFleetMovement(fleetEntity, orbitGoal, deltaSeconds, orbitToleranceWorld)
          : holdGoal ? hasReachedDestination(fleetEntity.position, holdGoal, arrivalToleranceWorld)
            ? stepFleetBraking(fleetEntity, deltaSeconds)
            : stepFleetMovement(fleetEntity, holdGoal, deltaSeconds, arrivalToleranceWorld)
            : warpGoal ? stepFleetMovement(fleetEntity, warpGoal, deltaSeconds, arrivalToleranceWorld)
              : stepFleetBraking(fleetEntity, deltaSeconds)
      const measuredAcceleration = {
        x: (stepped.velocity.x - fleetEntity.velocity.x) / (deltaSeconds * kmWorldScale),
        y: (stepped.velocity.y - fleetEntity.velocity.y) / (deltaSeconds * kmWorldScale)
      }
      const measuredMagnitude = Math.hypot(measuredAcceleration.x, measuredAcceleration.y)
      const maximumAcceleration = Math.max(0, isWarpTask ? movement.warpAcceleration : movement.acceleration)
      const accelerationRatio = measuredMagnitude > maximumAcceleration ? maximumAcceleration / measuredMagnitude : 1
      const accelerationVector = { x: measuredAcceleration.x * accelerationRatio, y: measuredAcceleration.y * accelerationRatio }
      const angularAccelerationDegrees = Math.max(-movement.turnAcceleration, Math.min(movement.turnAcceleration, (stepped.angularVelocityDegrees - movement.angularVelocityDegrees) / deltaSeconds))
      const nextStarId = nearestStarId(stepped.position, state.starAuLengthFactor)
      const localPosition = orbitalLocalPosition(nextStarId, stepped.position, state.starAuLengthFactor)
      if (!localPosition) continue
      const arrived = warpGoal && (activeTask?.actionId === 'move' || activeTask?.actionId === 'warp-to')
        ? hasReachedDestination(stepped.position, warpGoal, arrivalToleranceWorld)
        : destination && activeTask?.actionId === 'face' ? hasFinishedFacing(stepped, destination)
          : false
      const speedKm = Math.hypot(stepped.velocity.x, stepped.velocity.y) / kmWorldScale
      const stationary = speedKm === 0 && stepped.angularVelocityDegrees === 0
      const nextAcceleration = stationary ? { x: 0, y: 0 } : accelerationVector
      const nextAngularAcceleration = stationary ? 0 : angularAccelerationDegrees
      const kinematicsChanged = nextStarId !== currentStarId || stepped.position.x !== worldPosition.x || stepped.position.y !== worldPosition.y
        || stepped.velocity.x !== fleetEntity.velocity.x || stepped.velocity.y !== fleetEntity.velocity.y
        || stepped.headingDegrees !== movement.headingDegrees || stepped.angularVelocityDegrees !== movement.angularVelocityDegrees
        || nextAcceleration.x !== movement.accelerationVector.x || nextAcceleration.y !== movement.accelerationVector.y
        || nextAngularAcceleration !== movement.angularAccelerationDegrees || movement.warpPhase !== previousWarpPhase
      object.staticData.starId = nextStarId
      object.position = localPosition
      movement.velocity = { x: stepped.velocity.x / kmWorldScale, y: stepped.velocity.y / kmWorldScale }; movement.headingDegrees = stepped.headingDegrees; movement.angularVelocityDegrees = stepped.angularVelocityDegrees; movement.speed = speedKm
      movement.accelerationVector = nextAcceleration
      movement.angularAccelerationDegrees = nextAngularAcceleration
      if (arrived) { movement.warpPhase = 'idle'; object.getCapability<TaskQueueCapability>('taskQueue')?.complete(); activateFirstTask(object.id) }
      moved = moved || kinematicsChanged || arrived
    }
    return moved ? { objectRevision: state.objectRevision + 1, orbitalRevision: state.orbitalRevision + 1 } : state
  }),
  reset: () => set(initial)
}), {
  name: 'my-factory-rts-demo',
  version: 11,
  migrate: (persistedState, version): PersistedGameState => {
    const state = persistedState as Partial<PersistedGameState>
    return {
      scene: state.scene ?? initial.scene,
      selectedId: null,
      selectedKind: null,
      overlay: state.overlay ?? initial.overlay,
      surfacePlanet: state.surfacePlanet === 'aurelia' ? initial.surfacePlanet : state.surfacePlanet ?? initial.surfacePlanet,
      resourceReserves: state.resourceReserves ?? {},
      nodes: version < 8 ? (state.nodes ?? []).map((node) => node.surfaceId ? node : { ...node, surfaceId: initial.surfacePlanet, x: Math.round(node.x / SURFACE_VIEW.gridGap), y: Math.round(node.y / SURFACE_VIEW.gridGap) }) : state.nodes ?? initial.nodes,
      edges: state.edges ?? initial.edges,
      speed: state.speed ?? initial.speed,
      zoomLevel: state.zoomLevel ?? initial.zoomLevel
    }
  },
  partialize: (state): PersistedGameState => ({
    scene: state.scene, selectedId: state.selectedId, selectedKind: state.selectedKind,
    overlay: state.overlay, surfacePlanet: state.surfacePlanet, nodes: state.nodes,
    edges: state.edges, resourceReserves: state.resourceReserves, speed: state.speed,
    zoomLevel: state.zoomLevel
  })
}))
