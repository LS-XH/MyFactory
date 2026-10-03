import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GalaxyIcon } from './GalaxyIcon'
import { OverviewList } from '../../features/overview/AssetLists'
import type { OverviewEntry } from '../../features/overview/overviewModel'

describe('GalaxyIcon', () => {
  it('renders the Lucide Galaxy glyph with the supplied size', () => {
    const markup = renderToStaticMarkup(createElement(GalaxyIcon, { size: 18 }))
    expect(markup).toContain('lucide-galaxy')
    expect(markup).toContain('width="18"')
    expect(markup).toContain('<circle cx="12" cy="12" r="1" fill="currentColor"')
  })

  it('uses Galaxy only for stars in the overview list', () => {
    const entries: OverviewEntry[] = [
      { id: 'star', name: '恒星', meta: '', category: 'planet', celestialKind: 'star', selectionKind: 'body', color: '#fff' },
      { id: 'planet', name: '行星', meta: '', category: 'planet', celestialKind: 'planet', selectionKind: 'body', color: '#fff' }
    ]
    const markup = renderToStaticMarkup(createElement(OverviewList, {
      entries, resetKey: '', selectedIds: [], onSelect: () => {}, onDoubleClick: () => {}
    }))
    expect(markup).toContain('lucide-galaxy')
    expect(markup).toContain('lucide-orbit')
  })
})
