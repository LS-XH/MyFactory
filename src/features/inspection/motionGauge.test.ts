import { describe, expect, it } from 'vitest'
import { signedGaugeGeometry } from './motionGauge'

describe('centered angular gauges', () => {
  it('keeps zero in the center and extends positive and negative values to opposite sides', () => {
    expect(signedGaugeGeometry({ current: 0, maximum: 20 })).toEqual({ magnitudePercent: 0, fillPercent: 0, leftPercent: 50, positionPercent: 50 })
    expect(signedGaugeGeometry({ current: -10, maximum: 20 })).toEqual({ magnitudePercent: 50, fillPercent: 25, leftPercent: 25, positionPercent: 25 })
    expect(signedGaugeGeometry({ current: 10, maximum: 20 })).toEqual({ magnitudePercent: 50, fillPercent: 25, leftPercent: 50, positionPercent: 75 })
  })

  it('clamps the visual length without making it negative or inventing missing readings', () => {
    expect(signedGaugeGeometry({ current: -30, maximum: 20 })).toEqual({ magnitudePercent: 100, fillPercent: 50, leftPercent: 0, positionPercent: 0 })
    expect(signedGaugeGeometry({ current: 30, maximum: 20 })).toEqual({ magnitudePercent: 100, fillPercent: 50, leftPercent: 50, positionPercent: 100 })
    expect(signedGaugeGeometry({ current: null, maximum: 20 })).toEqual({ magnitudePercent: 0, fillPercent: 0, leftPercent: 50, positionPercent: 50 })
    expect(signedGaugeGeometry({ current: -10, maximum: 0 })).toEqual({ magnitudePercent: 0, fillPercent: 0, leftPercent: 50, positionPercent: 50 })
    expect(signedGaugeGeometry({ current: Number.NaN, maximum: 20 })).toEqual({ magnitudePercent: 0, fillPercent: 0, leftPercent: 50, positionPercent: 50 })
  })
})
