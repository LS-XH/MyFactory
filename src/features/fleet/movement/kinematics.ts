import type { FleetEntity, Vector2 } from '../domain/fleetTypes'

const MAX_STEP_SECONDS = 0.05
const ALIGNMENT_DEGREES = 2

function magnitude(vector: Vector2) { return Math.hypot(vector.x, vector.y) }
function distance(from: Vector2, to: Vector2) { return Math.hypot(to.x - from.x, to.y - from.y) }
export function hasReachedDestination(position: Vector2, destination: Vector2, toleranceWorld: number) {
  return distance(position, destination) <= Math.max(0, toleranceWorld)
}
function normalizedAngle(degrees: number) { return ((degrees + 180) % 360 + 360) % 360 - 180 }
export function headingErrorDegrees(entity: FleetEntity, target: Vector2) {
  return Math.abs(normalizedAngle(Math.atan2(target.y - entity.position.y, target.x - entity.position.x) * 180 / Math.PI - entity.headingDegrees))
}
function approach(current: number, target: number, maximumChange: number) {
  return current + Math.max(-maximumChange, Math.min(maximumChange, target - current))
}

function steer(entity: FleetEntity, desiredHeading: number, deltaSeconds: number) {
  const difference = normalizedAngle(desiredHeading - entity.headingDegrees)
  const maximumSpeed = Math.max(0, entity.movement.turnSpeedDegrees)
  const acceleration = Math.max(0, entity.movement.turnAccelerationDegrees)
  const angularVelocity = entity.angularVelocityDegrees
  const brakingSpeed = Math.sqrt(2 * acceleration * Math.abs(difference))
  const targetVelocity = Math.sign(difference) * Math.min(maximumSpeed, brakingSpeed)
  const nextVelocity = approach(angularVelocity, targetVelocity, acceleration * deltaSeconds)
  const changeTime = acceleration > 0 ? Math.min(deltaSeconds, Math.abs(nextVelocity - angularVelocity) / acceleration) : 0
  const turn = (angularVelocity + nextVelocity) * changeTime / 2 + nextVelocity * (deltaSeconds - changeTime)
  if (difference !== 0 && Math.sign(turn) === Math.sign(difference) && Math.abs(turn) >= Math.abs(difference)) {
    return { headingDegrees: normalizedAngle(desiredHeading), angularVelocityDegrees: 0 }
  }
  return { headingDegrees: normalizedAngle(entity.headingDegrees + turn), angularVelocityDegrees: nextVelocity }
}

/** Rotate toward a point while braking translation. The facing task ends after angular motion settles. */
export function stepFleetFacing(entity: FleetEntity, target: Vector2, deltaSeconds: number): FleetEntity {
  if (deltaSeconds <= 0) return entity
  const linear = brakeLinear(entity, deltaSeconds)
  const dx = target.x - linear.position.x
  const dy = target.y - linear.position.y
  if (Math.hypot(dx, dy) < 1e-9) return { ...linear, ...steer(linear, linear.headingDegrees, deltaSeconds) }
  const turned = steer(linear, Math.atan2(dy, dx) * 180 / Math.PI, deltaSeconds)
  return { ...linear, ...turned }
}

export function hasFinishedFacing(entity: FleetEntity, target: Vector2): boolean {
  const dx = target.x - entity.position.x
  const dy = target.y - entity.position.y
  const stopped = Math.hypot(entity.velocity.x, entity.velocity.y) < 1e-6 && Math.abs(entity.angularVelocityDegrees) < 0.25
  if (Math.hypot(dx, dy) < 1e-9) return stopped
  const difference = normalizedAngle(Math.atan2(dy, dx) * 180 / Math.PI - entity.headingDegrees)
  return Math.abs(difference) <= 1 && stopped
}

/** Choose a point ahead on a clockwise orbit. The moving goal keeps the task active. */
export function orbitApproachPoint(entity: FleetEntity, center: Vector2, radius: number, minimumLead: number): Vector2 {
  const dx = entity.position.x - center.x
  const dy = entity.position.y - center.y
  const length = Math.hypot(dx, dy)
  const heading = entity.headingDegrees * Math.PI / 180
  const radial = length > 1e-9 ? { x: dx / length, y: dy / length } : { x: Math.cos(heading), y: Math.sin(heading) }
  const tangent = { x: -radial.y, y: radial.x }
  const lead = Math.max(radius * 0.35, Math.min(radius * 0.7, minimumLead))
  return { x: center.x + radial.x * radius + tangent.x * lead, y: center.y + radial.y * radius + tangent.y * lead }
}

/** Brake with bounded deceleration; the ship still travels while its speed falls. */
function brakeLinear(entity: FleetEntity, deltaSeconds: number): FleetEntity {
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

/** Stop both translation and rotation without discarding angular momentum. */
export function stepFleetBraking(entity: FleetEntity, deltaSeconds: number): FleetEntity {
  if (deltaSeconds <= 0) return entity
  const linear = brakeLinear(entity, deltaSeconds)
  const angularVelocity = entity.angularVelocityDegrees
  if (angularVelocity === 0) return linear
  const acceleration = Math.max(0, entity.movement.turnAccelerationDegrees)
  const nextVelocity = approach(angularVelocity, 0, acceleration * deltaSeconds)
  const brakingTime = acceleration > 0 ? Math.min(deltaSeconds, Math.abs(angularVelocity) / acceleration) : deltaSeconds
  return {
    ...linear,
    headingDegrees: normalizedAngle(entity.headingDegrees + (angularVelocity + nextVelocity) * brakingTime / 2),
    angularVelocityDegrees: nextVelocity
  }
}

/** Rate limited steering, thrust and braking over short simulation steps. */
export function stepFleetMovement(entity: FleetEntity, destination: Vector2, deltaSeconds: number, arrivalToleranceWorld: number): FleetEntity {
  if (deltaSeconds <= 0) return entity
  const acceleration = Math.max(0, entity.movement.acceleration)
  const maximumSpeed = Math.max(0, entity.movement.maxSpeed)
  const arrivalDistance = Math.max(0, arrivalToleranceWorld)
  const steps = Math.ceil(deltaSeconds / MAX_STEP_SECONDS)
  const stepSeconds = deltaSeconds / steps
  let current = entity

  for (let step = 0; step < steps; step += 1) {
    const remaining = distance(current.position, destination)
    const speed = magnitude(current.velocity)
    if (remaining <= arrivalDistance) return current
    const direction = remaining > 0
      ? { x: (destination.x - current.position.x) / remaining, y: (destination.y - current.position.y) / remaining }
      : { x: 0, y: 0 }
    const desiredHeading = remaining > 0 ? Math.atan2(direction.y, direction.x) * 180 / Math.PI : current.headingDegrees
    const { headingDegrees, angularVelocityDegrees } = steer(current, desiredHeading, stepSeconds)
    const headingError = Math.abs(normalizedAngle(desiredHeading - headingDegrees))
    const closingSpeed = current.velocity.x * direction.x + current.velocity.y * direction.y
    const lateralSpeed = Math.abs(current.velocity.x * direction.y - current.velocity.y * direction.x)
    const stoppingDistance = acceleration > 0 ? speed * speed / (2 * acceleration) : Infinity
    const mustBrake = headingError > ALIGNMENT_DEGREES || closingSpeed < 0 ||
      lateralSpeed > Math.max(0.01, speed * 0.1) || stoppingDistance + Math.max(0, closingSpeed) * stepSeconds >= remaining - arrivalDistance

    if (mustBrake || acceleration === 0 || maximumSpeed === 0) {
      current = brakeLinear({ ...current, headingDegrees, angularVelocityDegrees }, stepSeconds)
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
      angularVelocityDegrees,
      position: {
        x: current.position.x + (current.velocity.x + velocity.x) * stepSeconds / 2,
        y: current.position.y + (current.velocity.y + velocity.y) * stepSeconds / 2
      },
      velocity
    }
  }
  return current
}
