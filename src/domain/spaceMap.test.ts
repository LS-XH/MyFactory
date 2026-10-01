import { describe, expect, it } from 'vitest'
import { calculateOrbitalAngle, doesDiscIntersectView, doesOrbitIntersectView, findCelestialObject, isProjectedPointVisible, projectOrbitalRadius, projectStarPosition, spaceMap } from './spaceMap'

describe('space map object lookup', () => {
  it('resolves stars with aggregate system information', () => {
    const [starId, star] = Object.entries(spaceMap)[0]
    expect(findCelestialObject(starId)).toMatchObject({
      id: starId,
      kind: 'star',
      displayName: star.displayName,
      planetCount: Object.keys(star.planet).length
    })
  })

  it('resolves a planet from the current content without fixed object IDs', () => {
    const [starId, star] = Object.entries(spaceMap).find(([, item]) => Object.keys(item.planet).length > 0)!
    const [planetId, planet] = Object.entries(star.planet)[0]
    expect(findCelestialObject(planetId)).toMatchObject({
      id: planetId,
      kind: 'planet',
      starId,
      starName: star.displayName,
      satelliteCount: Object.keys(planet.planet).length
    })
  })

  it('projects JSON coordinates and orbit data without changing their ratios', () => {
    const earthOrbit = projectOrbitalRadius(1, 24)
    const marsOrbit = projectOrbitalRadius(1.5237, 24)
    expect(marsOrbit / earthOrbit).toBeCloseTo(1.5237, 10)

    const center = { x: 3_500_000, y: 7_000_000 }
    const solar = projectStarPosition({ x: 9_000_000, y: 8_000_000 }, center, 0.00006)
    const orion = projectStarPosition({ x: -2_000_000, y: 6_000_000 }, center, 0.00006)
    expect((solar.x - orion.x) / (orion.y - solar.y)).toBeCloseTo(11_000_000 / 2_000_000, 10)

    expect(projectOrbitalRadius(12, 3)).toBe(36)
    expect(projectOrbitalRadius(12, 7)).toBe(84)

    expect(calculateOrbitalAngle(27.32, 27.32)).toBeCloseTo(Math.PI * 2, 10)
    expect(calculateOrbitalAngle(365, 365)).toBeCloseTo(Math.PI * 2, 10)
  })

  it('culls projected star systems outside the current camera bounds', () => {
    const view = { x: 100, y: 200, width: 400, height: 300 }
    expect(isProjectedPointVisible({ x: 300, y: 350 }, view)).toBe(true)
    expect(isProjectedPointVisible({ x: 80, y: 350 }, view)).toBe(false)
    expect(isProjectedPointVisible({ x: 80, y: 350 }, view, 20)).toBe(true)
    expect(isProjectedPointVisible({ x: 900, y: 350 }, view, 20)).toBe(false)
  })

  it('culls huge orbit paths and bodies that do not intersect a zoomed camera', () => {
    const view = { x: -1, y: -1, width: 2, height: 2 }
    expect(doesOrbitIntersectView({ x: 0, y: 0 }, 0.5, view)).toBe(true)
    expect(doesOrbitIntersectView({ x: 0, y: 0 }, 100, view)).toBe(false)
    expect(doesDiscIntersectView({ x: 3, y: 0 }, 2.1, view)).toBe(true)
    expect(doesDiscIntersectView({ x: 20, y: 0 }, 2.1, view)).toBe(false)
  })
})
