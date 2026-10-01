import type { CapabilityId } from '../../../domain/contracts'

export type FleetEntityKind = 'ship' | 'station'
export type Vector2 = { x: number; y: number }

export type MovementProfile = {
  acceleration: number
  maxSpeed: number
  turnSpeedDegrees: number
  warpSpeed: number
}

export type FleetEntity = {
  id: string
  definitionId: string
  kind: FleetEntityKind
  factionId: string
  starId: string
  position: Vector2
  velocity: Vector2
  headingDegrees: number
  movement: MovementProfile
  capabilities: CapabilityId[]
}

export type FleetCommand =
  | { type: 'move'; entityIds: string[]; destination: Vector2 }
  | { type: 'attack'; entityIds: string[]; targetId: string }
  | { type: 'dock'; entityIds: string[]; stationId: string }
  | { type: 'stop'; entityIds: string[] }

