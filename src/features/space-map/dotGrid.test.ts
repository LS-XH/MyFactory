import { describe, expect, it } from 'vitest'
import { SPACE_MAP_DOT_GRID } from '../../config/spaceMapVisuals'
import { dotGridOpacity, resolveDotGrid } from './dotGrid'

describe('space-map AU dot grid', () => {
  it('fades reversibly between independently configured start and end levels', () => {
    expect(dotGridOpacity(1, 1, 4)).toBe(0)
    expect(dotGridOpacity(2.5, 1, 4)).toBeCloseTo(SPACE_MAP_DOT_GRID.opacity / 2)
    expect(dotGridOpacity(4, 1, 4)).toBe(SPACE_MAP_DOT_GRID.opacity)
    expect(dotGridOpacity(2.5, 1, 4)).toBeLessThan(dotGridOpacity(4, 1, 4))
    expect(resolveDotGrid(1, 1, 1, { x: 0, y: 0 }, 1, 4)).toBeNull()
    expect(resolveDotGrid(2.5, 1, 1, { x: 0, y: 0 }, 1, 4)?.opacity).toBeCloseTo(SPACE_MAP_DOT_GRID.opacity / 2)
    expect(resolveDotGrid(2, 10, 1, { x: 0, y: 0 }, 1, 2)).not.toBeNull()
    expect(resolveDotGrid(2, 10, 1, { x: 0, y: 0 }, 4, 8)).toBeNull()
  })

  it('skips the fade when reduced motion is enabled', () => {
    expect(dotGridOpacity(1.5, 1, 2, true)).toBe(0)
    expect(dotGridOpacity(2, 1, 2, true)).toBe(SPACE_MAP_DOT_GRID.opacity)
  })

  it('keeps a fixed AU distance while its screen spacing grows with zoom', () => {
    const atTwo = resolveDotGrid(2, 1, 1, { x: 0, y: 0 }, 1, 2)!
    const atFour = resolveDotGrid(4, 1, 1, { x: 0, y: 0 }, 1, 2)!
    expect(atTwo.spacing).toBe(1)
    expect(atFour.spacing).toBe(1)
    expect(atFour.spacing * 4).toBe(2 * atTwo.spacing * 2)
  })

  it('keeps world-aligned dots in the same place after local-coordinate rebasing', () => {
    const origin = { x: 1250000.03, y: -800000.04 }
    const grid = resolveDotGrid(4, 1, 1, origin, 1, 2)!
    expect((grid.phaseX + grid.spacing / 2 + origin.x) / grid.spacing).toBeCloseTo(Math.round((grid.phaseX + grid.spacing / 2 + origin.x) / grid.spacing))
    expect((grid.phaseY + grid.spacing / 2 + origin.y) / grid.spacing).toBeCloseTo(Math.round((grid.phaseY + grid.spacing / 2 + origin.y) / grid.spacing))
  })

  it('uses the configured AU interval and the star-map AU length factor', () => {
    expect(resolveDotGrid(2, 2.5, 100, { x: 0, y: 0 }, 1, 2)!.spacing).toBe(250)
  })

  it('hides unresolvably dense dots without changing their physical distance', () => {
    expect(resolveDotGrid(2, 0.1, 1, { x: 0, y: 0 }, 1, 2)).toBeNull()
    const visible = resolveDotGrid(16, 0.1, 1, { x: 0, y: 0 }, 1, 2)!
    expect(visible.spacing).toBe(0.1)
    expect(visible.radius * 16).toBeLessThanOrEqual(visible.spacing * 16 * SPACE_MAP_DOT_GRID.maximumDotRadiusFraction)
  })
})
