import { describe, expect, it } from 'vitest'
import planetTypeDefinitions from '../../assets/legacy/planetType.json'
import { PLANET_TYPE_COLORS, resolvePlanetTypeColor } from './planetTypeVisuals'

describe('planet type colors', () => {
  it('assigns every planet category a distinct light color', () => {
    const types = Object.keys(planetTypeDefinitions)
    expect(Object.keys(PLANET_TYPE_COLORS).sort()).toEqual(types.sort())
    expect(new Set(Object.values(PLANET_TYPE_COLORS)).size).toBe(types.length)
    for (const color of Object.values(PLANET_TYPE_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(Math.min(...[1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16)))).toBeGreaterThanOrEqual(130)
    }
  })

  it('keeps the caller fallback for unknown or missing types', () => {
    expect(resolvePlanetTypeColor('OceanlPlanet')).toBe(PLANET_TYPE_COLORS.OceanlPlanet)
    expect(resolvePlanetTypeColor('UnknownPlanet', '#ddeeff')).toBe('#ddeeff')
    expect(resolvePlanetTypeColor(undefined, '#ddeeff')).toBe('#ddeeff')
  })
})
