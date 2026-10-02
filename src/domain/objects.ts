import { content } from './content'
import { findCelestialObject, spaceMap } from './spaceMap'
import { orbitalSaveSchema, type OrbitalEntitySave, type OrbitalSave } from './orbitalSave'
import shipDefinitions from '../../assets/legacy/ship.json'
import shipTypeDefinitions from '../../assets/legacy/shipType.json'
import stationDefinitions from '../../assets/legacy/station.json'
import stationTypeDefinitions from '../../assets/legacy/stationType.json'
import equipmentDefinitions from '../../assets/legacy/equipment.json'
import { PLAYER_FACTION_ID } from './factions'

export type SlotSize = 'S' | 'M' | 'L' | 'XL' | 'T'
export type SlotGroup = 'turretSlots' | 'engineSlots' | 'defenseSlots' | 'utilitySlots' | 'moduleSlots'
export type ObjectAction = { id: string; label: string; target?: boolean; targetCapability?: CapabilityId }
export type CapabilityId = 'equipment' | 'movement' | 'damageable' | 'attack' | 'carrier' | 'production' | 'shipyard' | 'logistics' | 'mining'
export type ObjectCapability = { id: CapabilityId; getActions: () => ObjectAction[] }

export class EquipmentCapability implements ObjectCapability {
  readonly id = 'equipment' as const
  readonly slots: Record<SlotGroup, Record<SlotSize, string[]>>
  constructor(slotData: Partial<Record<SlotGroup, Array<{ slotSize: SlotSize }>>> = {}) {
    this.slots = Object.fromEntries((['turretSlots','engineSlots','defenseSlots','utilitySlots','moduleSlots'] as SlotGroup[]).map(group => [group, Object.fromEntries((['S','M','L','XL','T'] as SlotSize[]).map(size => [size, (slotData[group] ?? []).filter(slot => slot.slotSize === size).map(() => '')]))])) as Record<SlotGroup, Record<SlotSize, string[]>>
  }
  install(group: SlotGroup, size: SlotSize, index: number, equipmentId: string) {
    const equipment = (equipmentDefinitions as Record<string, { size?: SlotSize; equipmentType?: string }>)[equipmentId]
    const compatibleGroup: Record<string, SlotGroup> = { Turret: 'turretSlots', Engine: 'engineSlots', Shield: 'defenseSlots', Armor: 'defenseSlots', Module: 'moduleSlots', Utility: 'utilitySlots' }
    if (!equipment || equipment.size !== size || compatibleGroup[equipment.equipmentType ?? ''] !== group || index < 0 || index >= this.slots[group][size].length) return false
    this.slots[group][size][index] = equipmentId
    return true
  }
  getActions() { return [{ id: 'fit-equipment', label: '装配装备' }] }
}

export class MovementCapability implements ObjectCapability {
  readonly id = 'movement' as const
  destination?: { x: number; y: number } | { objectId: string }
  speed = 0
  velocity = { x: 0, y: 0 }
  headingDegrees = 0
  constructor(readonly maximumSpeed = 8, readonly acceleration = 1, readonly turnRate = 1, readonly warpSpeed = 0) {}
  moveTo(target: { x: number; y: number } | { objectId: string }) { this.destination = target }
  stop() { this.destination = undefined }
  getActions() { return [{ id: 'move', label: '前往', target: true }, { id: 'warp-to', label: '跃迁到', target: true }, { id: 'stop', label: '停止' }] }
}

export class DamageableCapability implements ObjectCapability {
  readonly id = 'damageable' as const
  constructor(public shieldHp: number, public armorHp: number, public structureHp: number) {}
  applyDamage(amount: number) { let remaining = amount; const shieldDamage = Math.min(this.shieldHp, remaining); this.shieldHp -= shieldDamage; remaining -= shieldDamage; const armorDamage = Math.min(this.armorHp, remaining); this.armorHp -= armorDamage; remaining -= armorDamage; this.structureHp = Math.max(0, this.structureHp - remaining) }
  getActions() { return [] }
}

export class AttackCapability implements ObjectCapability {
  readonly id = 'attack' as const
  constructor(public damage: { equipmentId: string; amount: number }[] = []) {}
  attack(target: RuntimeObject) { const damageable = target.getCapability<DamageableCapability>('damageable'); if (!damageable) return false; const amount = this.damage.reduce((sum, entry) => sum + entry.amount, 0) || 100; damageable.applyDamage(amount); if (damageable.structureHp <= 0) target.state.status = 'destroyed'; return true }
  getActions() { return [{ id: 'attack', label: '攻击', target: true, targetCapability: 'damageable' as const }] }
}

export class CarrierCapability implements ObjectCapability {
  readonly id = 'carrier' as const
  constructor(public craftIds: string[] = []) {}
  getActions() { return [{ id: 'command-craft', label: '命令舰载机', target: true }] }
}

export class ProductionCapability implements ObjectCapability {
  readonly id = 'production' as const
  getActions() { return [{ id: 'configure-production', label: '配置生产' }, { id: 'view-recipe', label: '查看配方' }] }
}

export type RuntimeObject = { id: string; kind: 'star'|'planet'|'moon'|'ship'|'station'|'factory'|'resource'; definitionId: string; displayName: string; staticData: Record<string, unknown>; ownerFactionId?: string; capabilities: ObjectCapability[]; position?: {x:number;y:number}; state: Record<string, unknown>; getCapability<T>(id: CapabilityId): T | undefined; addCapability(capability: ObjectCapability): void; removeCapability(id: CapabilityId): void; getActions(): ObjectAction[]; installEquipment(group: SlotGroup, size: SlotSize, index: number, equipmentId: string): boolean }
export function isPlayerControllable(object: Pick<RuntimeObject, 'kind' | 'ownerFactionId'> | undefined): boolean {
  return Boolean(object && ((object.kind !== 'ship' && object.kind !== 'station') || object.ownerFactionId === PLAYER_FACTION_ID))
}
export class GameObject implements RuntimeObject {
  capabilities: ObjectCapability[] = []
  state: Record<string, unknown> = { status: 'online' }
  constructor(public id: string, public kind: RuntimeObject['kind'], public definitionId: string, public displayName: string, public staticData: Record<string, unknown>, public position?: {x:number;y:number}, public ownerFactionId?: string) {}
  getCapability<T>(id: CapabilityId) { return this.capabilities.find(value => value.id === id) as T | undefined }
  addCapability(capability: ObjectCapability) { this.removeCapability(capability.id); this.capabilities.push(capability) }
  removeCapability(id: CapabilityId) { this.capabilities = this.capabilities.filter(value => value.id !== id) }
  getActions() { if (!isPlayerControllable(this)) return []; return [...this.capabilities.flatMap(capability => capability.getActions()), ...(['ship', 'station'].includes(this.kind) ? [{ id: 'self-destruct', label: '自毁' }] : [])] }
  installEquipment(group: SlotGroup, size: SlotSize, index: number, equipmentId: string) {
    const equipment = this.getCapability<EquipmentCapability>('equipment')
    if (!equipment?.install(group, size, index, equipmentId)) return false
    const definition = (equipmentDefinitions as Record<string, { attactDamage?: number; grants?: CapabilityId[] }>)[equipmentId]
    const attack = this.getCapability<AttackCapability>('attack')
    if (attack && group === 'turretSlots') attack.damage.push({ equipmentId, amount: definition.attactDamage ?? 0 })
    if (definition.grants?.includes('carrier')) this.addCapability(new CarrierCapability())
    return true
  }
}

export function findInstallableEquipment(object: RuntimeObject) {
  const slots = object.getCapability<EquipmentCapability>('equipment')
  if (!slots) return undefined
  const equipment = equipmentDefinitions as Record<string, { size?: SlotSize; equipmentType?: string }>
  const groupForType: Record<string, SlotGroup> = { Turret: 'turretSlots', Engine: 'engineSlots', Shield: 'defenseSlots', Armor: 'defenseSlots', Module: 'moduleSlots', Utility: 'utilitySlots' }
  for (const group of Object.keys(slots.slots) as SlotGroup[]) for (const size of ['S', 'M', 'L', 'XL', 'T'] as SlotSize[]) {
    const index = slots.slots[group][size].findIndex(equipmentId => !equipmentId)
    if (index < 0) continue
    const equipmentId = Object.keys(equipment).find(id => equipment[id]?.size === size && groupForType[equipment[id]?.equipmentType ?? ''] === group)
    if (equipmentId) return { group, size, index, equipmentId }
  }
  return undefined
}

/** UI labels come from the referenced model and type definitions, never from instance saves. */
export function getOrbitalDisplayInfo(object: RuntimeObject) {
  const definitions = (object.kind === 'ship' ? shipDefinitions : stationDefinitions) as Record<string, { displayName?: string; shipType?: string; stationType?: string }>
  const definition = definitions[object.definitionId]
  const modelName = definition?.displayName ?? object.definitionId
  const typeId = object.kind === 'ship' ? definition?.shipType : definition?.stationType
  if (typeof typeId !== 'string') return { modelName, typeName: object.kind === 'ship' ? '飞船' : '空间站' }
  if (object.kind === 'station') return { modelName, typeName: (stationTypeDefinitions as Record<string, string>)[typeId] ?? typeId }
  const families = shipTypeDefinitions as Record<string, Record<string, { displayName: string }>>
  const typeName = Object.values(families).find((variants) => variants[typeId])?.[typeId].displayName ?? typeId
  return { modelName, typeName }
}

const objects = new Map<string, RuntimeObject>()
function put(object: RuntimeObject) { objects.set(object.id, object); return object }
for (const [starId, star] of Object.entries(spaceMap)) {
  put(new GameObject(starId, 'star', star.starType ?? 'star', star.displayName, star as unknown as Record<string, unknown>))
  const visit = (planets: typeof star.planet, parentPath: string, depth = 0) => Object.entries(planets).forEach(([id, body]) => { const bodyPath = `${parentPath}/${id}`; const found = findCelestialObject(bodyPath); put(new GameObject(bodyPath, depth ? 'moon' : 'planet', body.planetType ?? 'planet', found?.displayName ?? id, { ...body, celestial: found, parentId: parentPath } as unknown as Record<string, unknown>)); visit(body.planet, bodyPath, depth + 1) })
  visit(star.planet, starId)
}
for (const body of content.starSystem.bodies as Array<{id:string;name:string;type:string;orbit:number;hasSurface:boolean;color:string;status:string;population:string}>) {
  if (!objects.has(body.id)) put(new GameObject(body.id, 'planet', body.type, body.name, body as unknown as Record<string, unknown>))
}
type OrbitalDefinition = { slots?: Partial<Record<SlotGroup, Array<{ slotSize: SlotSize }>>>; HP?: { shieldHP?: { maxHp: number }; armorHP?: { maxHp: number }; structureHP?: { maxHp: number } }; movement?: { maxSpeed: number; acceleration: number; turnSpeed: number; warpSpeed: number } }

function createOrbitalObject(entity: OrbitalEntitySave): GameObject {
  const definitions = (entity.kind === 'ship' ? shipDefinitions : stationDefinitions) as Record<string, OrbitalDefinition>
  const definition = definitions[entity.definitionId]
  if (!definition) throw new Error(`存档对象 ${entity.id} 引用了不存在的型号 ${entity.definitionId}`)
  if (!spaceMap[entity.starId]) throw new Error(`存档对象 ${entity.id} 引用了不存在的恒星系 ${entity.starId}`)
  const object = new GameObject(entity.id, entity.kind, entity.definitionId, entity.name, { ...definition, starId: entity.starId, orbit: entity.orbit, dockingCapacity: entity.dockingCapacity, communicationDelayMs: entity.communicationDelayMs }, { ...entity.position }, entity.ownerFactionId)
  object.state.status = entity.status ?? 'online'
  object.addCapability(new EquipmentCapability(definition.slots))
  object.addCapability(new DamageableCapability(entity.health?.shieldHp ?? definition.HP?.shieldHP?.maxHp ?? 100, entity.health?.armorHp ?? definition.HP?.armorHP?.maxHp ?? 100, entity.health?.structureHp ?? definition.HP?.structureHP?.maxHp ?? 100))
  object.addCapability(new AttackCapability())
  if (entity.kind === 'ship') {
    const movement = new MovementCapability(definition.movement?.maxSpeed, definition.movement?.acceleration, definition.movement?.turnSpeed, definition.movement?.warpSpeed)
    if (entity.movement) { movement.destination = entity.movement.destination; movement.velocity = { ...entity.movement.velocity }; movement.speed = Math.hypot(movement.velocity.x, movement.velocity.y); movement.headingDegrees = entity.movement.headingDegrees }
    object.addCapability(movement)
  }
  for (const installed of entity.installedEquipment ?? []) {
    if (!object.installEquipment(installed.group, installed.size, installed.index, installed.equipmentId)) throw new Error(`存档对象 ${entity.id} 的装备 ${installed.equipmentId} 与槽位不匹配`)
  }
  if (entity.damage) object.getCapability<AttackCapability>('attack')!.damage = entity.damage.map((entry) => ({ ...entry }))
  return object
}

export function loadOrbitalObjects(raw: unknown) {
  const save = orbitalSaveSchema.parse(raw)
  const loaded = save.entities.map(createOrbitalObject)
  for (const object of objects.values()) if (object.kind === 'ship' || object.kind === 'station') objects.delete(object.id)
  for (const object of loaded) put(object)
  return loaded
}

export function getOrbitalObjects() { return [...objects.values()].filter((object): object is RuntimeObject & { kind: 'ship' | 'station' } => object.kind === 'ship' || object.kind === 'station') }

export function serializeOrbitalObjects(): OrbitalSave {
  const entities = getOrbitalObjects().map((object): OrbitalEntitySave => {
    if (!object.ownerFactionId) throw new Error(`轨道对象 ${object.id} 缺少所属势力`)
    const health = object.getCapability<DamageableCapability>('damageable')
    const attack = object.getCapability<AttackCapability>('attack')
    const equipment = object.getCapability<EquipmentCapability>('equipment')
    const movement = object.getCapability<MovementCapability>('movement')
    const installedEquipment = equipment ? (Object.entries(equipment.slots) as [SlotGroup, Record<SlotSize, string[]>][]).flatMap(([group, sizes]) => (Object.entries(sizes) as [SlotSize, string[]][]).flatMap(([size, slots]) => slots.flatMap((equipmentId, index) => equipmentId ? [{ group, size, index, equipmentId }] : []))) : []
    return { id: object.id, kind: object.kind, definitionId: object.definitionId, name: object.displayName, starId: String(object.staticData.starId), position: { ...(object.position ?? { x: 0, y: 0 }) }, orbit: Number(object.staticData.orbit ?? 0), ownerFactionId: object.ownerFactionId, dockingCapacity: typeof object.staticData.dockingCapacity === 'number' ? object.staticData.dockingCapacity : undefined, communicationDelayMs: typeof object.staticData.communicationDelayMs === 'number' ? object.staticData.communicationDelayMs : undefined, status: String(object.state.status ?? 'online'), health: health ? { shieldHp: health.shieldHp, armorHp: health.armorHp, structureHp: health.structureHp } : undefined, damage: attack?.damage.map((entry) => ({ ...entry })), installedEquipment, movement: movement ? { destination: movement.destination, velocity: { ...movement.velocity }, headingDegrees: movement.headingDegrees } : undefined }
  })
  return { schemaVersion: 1, entities }
}
export const objectRepository = {
  get: (id: string) => objects.get(id),
  all: () => [...objects.values()],
  add: (object: RuntimeObject) => objects.set(object.id, object),
  remove: (id: string) => objects.delete(id),
  ensureFactory(id: string, definitionId: string, displayName: string, state: Record<string, unknown> = {}) {
    let object = objects.get(id)
    if (!object) { object = new GameObject(id, 'factory', definitionId, displayName, { definitionId }); objects.set(id, object) }
    if (!object.getCapability('production')) object.addCapability(new ProductionCapability())
    object.state = { ...object.state, ...state }
    return object
  },
  ensureResource(id: string, displayName: string, staticData: Record<string, unknown>, position?: { x: number; y: number }) {
    let object = objects.get(id)
    if (!object) { object = new GameObject(id, 'resource', String(staticData.item ?? 'resource'), displayName, staticData, position); objects.set(id, object) }
    return object
  },
  actionsFor(ids: string[]) { if (!ids.length) return []; const idsByAction = new Map<string, ObjectAction>(); for (const action of this.get(ids[0]!)?.getActions() ?? []) idsByAction.set(action.id, action); return [...idsByAction.values()].filter(action => ids.every(id => this.get(id)?.getActions().some(candidate => candidate.id === action.id))) }
}
