import { describe, expect, it } from 'vitest'
import type { PlanetMapEntry } from '../../domain/spaceMap'
import { collectVisiblePlanetIds } from './visibleObjectIds'

const body = {
  position: { orbitalRadius: 1, orbitalPeriod: 0, radius: 1000 },
  surface: { resource: [] },
  planet: {}
} as PlanetMapEntry

describe('visible planet collection', () => {
  it('includes only planets whose rendered position intersects the camera', () => {
    const ids = collectVisiblePlanetIds({ Near: body, Far: { ...body, position: { ...body.position, orbitalRadius: 100 } } }, {
      starId: 'Solar', systemPoint: { x: 0, y: 0 }, view: { x: 0, y: -10, width: 50, height: 30 },
      zoom: 8, elapsedSeconds: 0, planetAuLengthFactor: 24, moonAuLengthFactor: 16,
      planetDisplayRadius: 4, moonDisplayRadius: 2.5
    })
    expect(ids).toContain('Solar/Near')
    expect(ids).not.toContain('Solar/Far')
  })
})
