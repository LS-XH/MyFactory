import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import shipTypeDefinitions from '../../../assets/legacy/shipType.json'
import { shipTypeIconArtwork } from './shipTypeIconArtwork'
import { shipTypeIconRegistry, unconfiguredShipIconTypes } from './shipTypeIconRegistry'

const contentIds = [...new Set(Object.entries(shipTypeDefinitions).flatMap(([family, variants]) => [family, ...Object.keys(variants)]))]

describe('ship type icons', () => {
  it('draws every configured ship type without a placeholder', () => {
    expect(contentIds).toHaveLength(39)
    expect(unconfiguredShipIconTypes).toEqual([])
    expect(Object.keys(shipTypeIconRegistry).sort()).toEqual([...contentIds].sort())
  })

  it('gives each ship type one distinct, filled silhouette without interior patterns or a hit rectangle', () => {
    const icons = contentIds.map((id) => renderToStaticMarkup(createElement(shipTypeIconRegistry[id])))
    expect(new Set(Object.values(shipTypeIconArtwork).map(({ hull }) => hull)).size).toBe(contentIds.length)
    expect(new Set(icons).size).toBe(contentIds.length)
    for (const markup of icons) {
      expect(markup).toContain('<svg')
      expect(markup).toContain('fill:currentColor')
      expect(markup.match(/<path\b/g)).toHaveLength(1)
      expect(markup).not.toContain('<rect')
    }
  })
})
