import { getOrbitalDisplayInfo, type DamageableCapability, type MovementCapability, type RuntimeObject } from '../../domain/objects'
import { getFactionDisplayName } from '../../domain/factions'
import { MOVEMENT_WORLD_UNIT_SCALE } from '../fleet/movement/kinematics'

export type MeterReading = { current: number | null; maximum: number | null }

export type ShipInspectorData = {
  typeName: string
  modelName: string
  modelId: string
  manufacturerName: string
  ownerFactionName: string
  speed: MeterReading
  headingDegrees: number | null
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

export function meterFraction(reading: MeterReading): number {
  if (reading.current === null || reading.maximum === null || reading.maximum <= 0) return 0
  return Math.min(1, Math.max(0, reading.current / reading.maximum))
}

/** The simulator stores velocity in projected world units; the model's maxSpeed is in ship units. */
export function buildShipInspectorData(ship: RuntimeObject & { kind: 'ship' }): ShipInspectorData {
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
      current: movement ? nonnegativeFinite(movement.speed / MOVEMENT_WORLD_UNIT_SCALE) : null,
      maximum: nonnegativeFinite(movement?.maximumSpeed)
    },
    headingDegrees: movement && Number.isFinite(movement.headingDegrees)
      ? ((movement.headingDegrees % 360) + 360) % 360
      : null,
    shield: { current: nonnegativeFinite(damage?.shieldHp), maximum: nonnegativeFinite(hp?.shieldHP?.maxHp) },
    armor: { current: nonnegativeFinite(damage?.armorHp), maximum: nonnegativeFinite(hp?.armorHP?.maxHp) },
    structure: { current: nonnegativeFinite(damage?.structureHp), maximum: nonnegativeFinite(hp?.structureHP?.maxHp) }
  }
}
