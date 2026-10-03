import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import starTypeDefinitions from '../../assets/legacy/starType.json'
import { overviewGlowGradientOffset, SPACE_MAP_VISUAL } from './spaceMapVisuals'
import { STAR_TYPE_VISUALS, resolveStarTypeVisual, starOverviewGradientId } from './starTypeVisuals'
import { SpaceMapGradientDefs } from '../features/space-map/components/SpaceMapGradientDefs'
import { StarSystemMarkerVisual } from '../features/space-map/components/StarSystemMarkerVisual'

describe('star-system mask visuals', () => {
  it('has a distinct palette entry and gradient for every starType in content', () => {
    expect(Object.keys(STAR_TYPE_VISUALS).sort()).toEqual(Object.keys(starTypeDefinitions).sort())
    const definitions = renderToStaticMarkup(createElement('svg', null, createElement(SpaceMapGradientDefs)))
    for (const starType of Object.keys(starTypeDefinitions)) {
      expect(definitions).toContain(`id="${starOverviewGradientId(starType)}"`)
      expect(resolveStarTypeVisual(starType).coreColor).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('uses an opaque core, abrupt 70% transparency, and a fading outer halo', () => {
    const stops = SPACE_MAP_VISUAL.overviewGradient
    expect(stops[0].opacity).toBe(1)
    expect(stops[1].opacity).toBe(1)
    expect(stops[2].opacity).toBe(0.3)
    expect(stops[2].offset - stops[1].offset).toBeLessThan(0.001)
    expect(stops.at(-1)?.opacity).toBe(0)
    expect(stops.at(-1)?.offset).toBe(1)
    const core = SPACE_MAP_VISUAL.overviewCoreRadiusFraction
    const outer = SPACE_MAP_VISUAL.overviewGlowRadiusScale
    expect((outer - core) / (1 - core)).toBeCloseTo(3)
    expect(overviewGlowGradientOffset(core) * outer).toBeCloseTo(core)
    expect(overviewGlowGradientOffset(stops[2].offset) - overviewGlowGradientOffset(core)).toBeLessThan(0.001)
    expect(overviewGlowGradientOffset(1)).toBe(1)
  })

  it('binds a star marker to its type-specific glow', () => {
    const markup = renderToStaticMarkup(createElement(StarSystemMarkerVisual, {
      name: '测试恒星', starType: 'OTypeBlueSupergiant', typeName: 'O 型蓝超巨星', planetCount: 0,
      zoom: 1, overviewRadius: 30, starRadius: 2, overviewOpacity: 1, systemOpacity: 0,
      labelOpacity: 1, metaOpacity: 1
    }))
    expect(markup).toContain(`fill="url(#${starOverviewGradientId('OTypeBlueSupergiant')})"`)
    expect(markup).toContain('pointer-events="none"')
    expect(markup).toContain('fill="transparent" pointer-events="all"')
    const circleRadii = [...markup.matchAll(/<circle r="([\d.]+)"/g)].map((match) => Number(match[1]))
    expect(circleRadii[0]).toBeCloseTo(30 * SPACE_MAP_VISUAL.overviewGlowRadiusScale)
    expect(circleRadii[1]).toBe(30)
  })
})
