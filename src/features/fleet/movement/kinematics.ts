import type { FleetEntity, Vector2 } from '../domain/fleetTypes'

function distance(from: Vector2, to: Vector2) {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

/** Pure movement step; rendering and input layers remain independent. */
export function stepFleetMovement(entity: FleetEntity, destination: Vector2, deltaSeconds: number): FleetEntity {
  const remaining = distance(entity.position, destination)
  if (remaining === 0 || deltaSeconds <= 0) return entity
  const currentSpeed = Math.hypot(entity.velocity.x, entity.velocity.y)
  const nextSpeed = Math.min(entity.movement.maxSpeed, currentSpeed + entity.movement.acceleration * deltaSeconds)
  const travel = Math.min(remaining, nextSpeed * deltaSeconds)
  const direction = { x: (destination.x - entity.position.x) / remaining, y: (destination.y - entity.position.y) / remaining }
  return {
    ...entity,
    position: { x: entity.position.x + direction.x * travel, y: entity.position.y + direction.y * travel },
    velocity: remaining === travel ? { x: 0, y: 0 } : { x: direction.x * nextSpeed, y: direction.y * nextSpeed },
    headingDegrees: Math.atan2(direction.y, direction.x) * 180 / Math.PI
  }
}

