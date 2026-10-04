import { describe, expect, it } from 'vitest'
import { formatMapAuCoordinate, formatSvgCoordinate, worldPointToMapAu } from './cursorCoordinates'

describe('universe cursor coordinates', () => {
  it('reverses the JSON AU-to-SVG projection, including a nonzero map center', () => {
    const center = { x: 12, y: -7 }
    // The forward projection places (16.25, -3.5) at (925, 30).
    expect(worldPointToMapAu({ x: 925, y: 30 }, center, 100)).toEqual({ x: 16.25, y: -3.5 })
  })

  it('uses more decimals at close zoom and does not show negative zero', () => {
    expect(formatMapAuCoordinate(1.234567, 1, 100)).toBe('1.23')
    expect(formatMapAuCoordinate(1.234567, 512, 100)).toBe('1.23457')
    expect(formatMapAuCoordinate(-0.000001, 1, 100)).toBe('0.00')
  })

  it('formats the SVG coordinate without losing sub-pixel precision at high zoom', () => {
    expect(formatSvgCoordinate(12.345678, 1)).toBe('12.35')
    expect(formatSvgCoordinate(12.345678, 512)).toBe('12.34568')
    expect(formatSvgCoordinate(-0.000001, 1)).toBe('0.00')
  })
})
