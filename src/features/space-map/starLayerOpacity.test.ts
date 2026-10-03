import { describe, expect, it } from 'vitest'
import { DEFAULT_GAME_SETTINGS } from '../../config/gameplay'
import { smoothStep, starLayerOpacities } from './starLayerOpacity'

describe('star-map layer transition', () => {
  it('preserves the original 100% to 200% crossfade by default', () => {
    expect(starLayerOpacities(1, DEFAULT_GAME_SETTINGS)).toEqual({ overviewOpacity: 1, systemOpacity: 0 })
    expect(starLayerOpacities(1.5, DEFAULT_GAME_SETTINGS)).toEqual({ overviewOpacity: 0.5, systemOpacity: 0.5 })
    expect(starLayerOpacities(2, DEFAULT_GAME_SETTINGS)).toEqual({ overviewOpacity: 0, systemOpacity: 1 })
  })

  it('allows the overview and internal system to fade independently', () => {
    const thresholds = { overviewFadeStartZoom: 2, overviewFadeEndZoom: 4, systemFadeStartZoom: 1, systemFadeEndZoom: 2 }
    expect(starLayerOpacities(1.5, thresholds)).toEqual({ overviewOpacity: 1, systemOpacity: 0.5 })
    expect(starLayerOpacities(3, thresholds)).toEqual({ overviewOpacity: 0.5, systemOpacity: 1 })
    expect(starLayerOpacities(4, thresholds)).toEqual({ overviewOpacity: 0, systemOpacity: 1 })
  })

  it('handles a degenerate range without producing NaN', () => {
    expect(smoothStep(2, 2, 1)).toBe(0)
    expect(smoothStep(2, 2, 2)).toBe(1)
  })
})
