import { describe, expect, it } from 'vitest'
import { cameraDirection } from './cameraKeyboard'

const bindings = { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' }

describe('camera keyboard movement', () => {
  it('moves toward the requested direction and cancels opposite keys', () => {
    expect(cameraDirection(new Set(['KeyW']), bindings)).toEqual({ x: 0, y: -1 })
    expect(cameraDirection(new Set(['KeyA', 'KeyD']), bindings)).toEqual({ x: 0, y: 0 })
  })

  it('normalizes diagonal movement', () => {
    const direction = cameraDirection(new Set(['KeyW', 'KeyD']), bindings)
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1)
    expect(direction.x).toBeGreaterThan(0)
    expect(direction.y).toBeLessThan(0)
  })
})
