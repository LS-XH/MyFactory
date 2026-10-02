import { describe, expect, it } from 'vitest'
import { orbitalIconWorldRadius } from './orbitalEntityScale'

describe('orbital entity icon zoom thresholds', () => {
  it('preserves current scaling between thresholds and freezes screen size outside them', () => {
    const baseRadius = 0.5
    const minZoom = 4
    const maxZoom = 16
    const screenRadius = (zoom: number) => orbitalIconWorldRadius(baseRadius, zoom, minZoom, maxZoom) * zoom

    expect(screenRadius(2)).toBe(2)
    expect(screenRadius(4)).toBe(2)
    expect(screenRadius(8)).toBe(4)
    expect(screenRadius(16)).toBe(8)
    expect(screenRadius(32)).toBe(8)
  })

  it('retains the original behavior when both defaults span the entire zoom range', () => {
    expect(orbitalIconWorldRadius(0.5, 8, 0.03125, 512)).toBe(0.5)
  })
})
