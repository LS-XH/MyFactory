import { describe, expect, it } from 'vitest'
import { clipLineToView, createRenderSpace } from './renderSpace'

const view = { x: 999_997.5, y: -799_997.5, width: 7.8125, height: 5.9375 }
const star = { x: 1_000_000, y: -800_000 }

describe('space-map rendering coordinates', () => {
  it('keeps the deep-space view in global coordinates', () => {
    const space = createRenderSpace(view, star, false)
    expect(space.viewBox).toEqual(view)
    expect(space.toLocal(star)).toEqual(star)
  })

  it('rebases the detailed system without changing its screen position or world target', () => {
    const global = createRenderSpace(view, star, false)
    const local = createRenderSpace(view, star, true)
    const object = { x: star.x + 0.125, y: star.y - 0.25 }
    expect(local.viewBox).toEqual({ x: -2.5, y: 2.5, width: view.width, height: view.height })
    expect(local.toLocal(object)).toEqual({ x: 0.125, y: -0.25 })
    expect(local.toWorld(local.toLocal(object))).toEqual(object)
    expect(local.toScreen(object, 128)).toEqual(global.toScreen(object, 128))
  })

  it('clips a cross-system task line before it reaches the SVG renderer', () => {
    const clipped = clipLineToView({ x: -1_000_000, y: 0 }, { x: 1_000_000, y: 0 }, { x: -4, y: -3, width: 8, height: 6 })
    expect(clipped?.from.x).toBeCloseTo(-4)
    expect(clipped?.to.x).toBeCloseTo(4)
    expect(clipLineToView({ x: -20, y: 20 }, { x: 20, y: 20 }, { x: -4, y: -3, width: 8, height: 6 })).toBeNull()
  })
})
