import type { FleetEntity, Vector2 } from '../domain/fleetTypes'

// Ship definitions use gameplay units; the system map uses projected world units.
export const MOVEMENT_WORLD_UNIT_SCALE = 0.02

const MAX_STEP_SECONDS = 0.05
const ARRIVAL_DISTANCE = 0.001
const ALIGNMENT_DEGREES = 2

function magnitude(vector: Vector2) { return Math.hypot(vector.x, vector.y) }
function distance(from: Vector2, to: Vector2) { return Math.hypot(to.x - from.x, to.y - from.y) }
function normalizedAngle(degrees: number) { return ((degrees + 180) % 360 + 360) % 360 - 180 }

function turnToward(current: number, desired: number, maximumTurn: number) {
  const difference = normalizedAngle(desired - current)
  return normalizedAngle(current + Math.max(-maximumTurn, Math.min(maximumTurn, difference)))
}

/** Brake with bounded deceleration; the ship still travels while its speed falls. */
export function stepFleetBraking(entity: FleetEntity, deltaSeconds: number): FleetEntity {
  if (deltaSeconds <= 0) return entity
  const speed = magnitude(entity.velocity)
  if (speed === 0) return entity
  const deceleration = Math.max(0, entity.movement.acceleration)
  if (deceleration === 0) return { ...entity, position: { x: entity.position.x + entity.velocity.x * deltaSeconds, y: entity.position.y + entity.velocity.y * deltaSeconds } }
  const brakingTime = Math.min(deltaSeconds, speed / deceleration)
  const travel = speed * brakingTime - deceleration * brakingTime * brakingTime / 2
  const remainingSpeed = Math.max(0, speed - deceleration * brakingTime)
  const direction = { x: entity.velocity.x / speed, y: entity.velocity.y / speed }
  return {
    ...entity,
    position: { x: entity.position.x + direction.x * travel, y: entity.position.y + direction.y * travel },
    velocity: { x: direction.x * remainingSpeed, y: direction.y * remainingSpeed }
  }
}

/** Rate limited steering, thrust and braking over short simulation steps. */
export function stepFleetMovement(entity: FleetEntity, destination: Vector2, deltaSeconds: number): FleetEntity {
  if (deltaSeconds <= 0) return entity
  const acceleration = Math.max(0, entity.movement.acceleration)
  const maximumSpeed = Math.max(0, entity.movement.maxSpeed)
  const turnSpeed = Math.max(0, entity.movement.turnSpeedDegrees)
  const steps = Math.ceil(deltaSeconds / MAX_STEP_SECONDS)
  const stepSeconds = deltaSeconds / steps
  let current = entity

  for (let step = 0; step < steps; step += 1) {
    const remaining = distance(current.position, destination)
    const speed = magnitude(current.velocity)
    if (remaining <= ARRIVAL_DISTANCE && speed <= Math.sqrt(2 * acceleration * ARRIVAL_DISTANCE)) {
      return { ...current, position: { ...destination }, velocity: { x: 0, y: 0 } }
    }
    const direction = remaining > 0
      ? { x: (destination.x - current.position.x) / remaining, y: (destination.y - current.position.y) / remaining }
      : { x: 0, y: 0 }
    const desiredHeading = remaining > 0 ? Math.atan2(direction.y, direction.x) * 180 / Math.PI : current.headingDegrees
    const headingDegrees = turnToward(current.headingDegrees, desiredHeading, turnSpeed * stepSeconds)
    const headingError = Math.abs(normalizedAngle(desiredHeading - headingDegrees))
    const closingSpeed = current.velocity.x * direction.x + current.velocity.y * direction.y
    const lateralSpeed = Math.abs(current.velocity.x * direction.y - current.velocity.y * direction.x)
    const stoppingDistance = acceleration > 0 ? speed * speed / (2 * acceleration) : Infinity
    const mustBrake = remaining === 0 || headingError > ALIGNMENT_DEGREES || closingSpeed < 0 ||
      lateralSpeed > Math.max(0.01, speed * 0.1) || stoppingDistance + Math.max(0, closingSpeed) * stepSeconds >= remaining

    if (mustBrake || acceleration === 0 || maximumSpeed === 0) {
      current = stepFleetBraking({ ...current, headingDegrees }, stepSeconds)
      continue
    }

    const radians = headingDegrees * Math.PI / 180
    const thrust = { x: Math.cos(radians) * acceleration, y: Math.sin(radians) * acceleration }
    const unboundedVelocity = { x: current.velocity.x + thrust.x * stepSeconds, y: current.velocity.y + thrust.y * stepSeconds }
    const unboundedSpeed = magnitude(unboundedVelocity)
    const speedRatio = unboundedSpeed > maximumSpeed ? maximumSpeed / unboundedSpeed : 1
    const velocity = { x: unboundedVelocity.x * speedRatio, y: unboundedVelocity.y * speedRatio }
    current = {
      ...current,
      headingDegrees,
      position: {
        x: current.position.x + (current.velocity.x + velocity.x) * stepSeconds / 2,
        y: current.position.y + (current.velocity.y + velocity.y) * stepSeconds / 2
      },
      velocity
    }
  }
  return current
}
