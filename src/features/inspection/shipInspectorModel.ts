import { DEFAULT_AU_LENGTH_FACTOR } from '../../config/gameplay'
import { getOrbitalDisplayInfo, objectRepository, type DamageableCapability, type MovementCapability, type RuntimeObject } from '../../domain/objects'
import { getFactionDisplayName } from '../../domain/factions'
import { orbitalWorldPosition } from '../../domain/orbitalSpace'

export type MeterReading = { current: number | null; maximum: number | null }

export type ShipInspectorData = {
  typeName: string
  modelName: string
  modelId: string
  manufacturerName: string
  ownerFactionName: string
  speed: MeterReading
  acceleration: MeterReading
  angularSpeed: MeterReading
  angularAcceleration: MeterReading
  velocityDirectionDegrees: number | null
  accelerationDirectionDegrees: number | null
  headingDegrees: number | null
  targetHeadingDegrees: number | null
  shield: MeterReading
  armor: MeterReading
  structure: MeterReading
}

type HitPoints = {
  shieldHP?: { maxHp?: number }
  armorHP?: { maxHp?: number }
  structureHP?: { maxHp?: number }
}

function nonnegativeFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function directionDegrees(vector: { x: number; y: number } | undefined): number | null {
  if (!vector || Math.hypot(vector.x, vector.y) < 1e-9) return null
  return ((Math.atan2(vector.y, vector.x) * 180 / Math.PI) + 360) % 360
}

function targetHeadingDegrees(ship: RuntimeObject, movement: MovementCapability | undefined, starAuLengthFactor: number): number | null {
  if (!ship.position || !movement?.destination) return null
  const source = orbitalWorldPosition(String(ship.staticData.starId), ship.position, starAuLengthFactor)
  if (!source) return null
  const destination = movement.destination
  const target = 'objectId' in destination ? objectRepository.get(destination.objectId) : undefined
  const goal = 'objectId' in destination
    ? target?.position ? orbitalWorldPosition(String(target.staticData.starId), target.position, starAuLengthFactor) : undefined
    : orbitalWorldPosition(movement.destinationStarId ?? String(ship.staticData.starId), destination, starAuLengthFactor)
  if (!goal) return null
  return directionDegrees({ x: goal.x - source.x, y: goal.y - source.y })
}

export function meterFraction(reading: MeterReading): number {
  if (reading.current === null || reading.maximum === null || reading.maximum <= 0) return 0
  return Math.min(1, Math.max(0, reading.current / reading.maximum))
}

/** Movement capability and ship model readings both use km, km/s and km/s². */
export function buildShipInspectorData(ship: RuntimeObject & { kind: 'ship' }, starAuLengthFactor: number = DEFAULT_AU_LENGTH_FACTOR.star): ShipInspectorData {
  const display = getOrbitalDisplayInfo(ship)
  const movement = ship.getCapability<MovementCapability>('movement')
  const damage = ship.getCapability<DamageableCapability>('damageable')
  const hp = ship.staticData.HP as HitPoints | undefined
  const manufacturerFactionId = typeof ship.staticData.faction === 'string' ? ship.staticData.faction : undefined

  return {
    typeName: display.typeName,
    modelName: display.modelName,
    modelId: ship.definitionId,
    manufacturerName: getFactionDisplayName(manufacturerFactionId),
    ownerFactionName: getFactionDisplayName(ship.ownerFactionId),
    speed: {
      current: movement ? nonnegativeFinite(movement.speed) : null,
      maximum: nonnegativeFinite(movement?.warpPhase !== 'idle' ? movement?.warpSpeed : movement?.maximumSpeed)
    },
    acceleration: {
      current: movement ? nonnegativeFinite(Math.hypot(movement.accelerationVector.x, movement.accelerationVector.y)) : null,
      maximum: nonnegativeFinite(movement?.warpPhase !== 'idle' ? movement?.warpAcceleration : movement?.acceleration)
    },
    angularSpeed: { current: finite(movement?.angularVelocityDegrees), maximum: nonnegativeFinite(movement?.turnRate) },
    angularAcceleration: { current: finite(movement?.angularAccelerationDegrees), maximum: nonnegativeFinite(movement?.turnAcceleration) },
    velocityDirectionDegrees: directionDegrees(movement?.velocity),
    accelerationDirectionDegrees: directionDegrees(movement?.accelerationVector),
    headingDegrees: movement && Number.isFinite(movement.headingDegrees)
      ? ((movement.headingDegrees % 360) + 360) % 360
      : null,
    targetHeadingDegrees: targetHeadingDegrees(ship, movement, starAuLengthFactor),
    shield: { current: nonnegativeFinite(damage?.shieldHp), maximum: nonnegativeFinite(hp?.shieldHP?.maxHp) },
    armor: { current: nonnegativeFinite(damage?.armorHp), maximum: nonnegativeFinite(hp?.armorHP?.maxHp) },
    structure: { current: nonnegativeFinite(damage?.structureHp), maximum: nonnegativeFinite(hp?.structureHP?.maxHp) }
  }
}
