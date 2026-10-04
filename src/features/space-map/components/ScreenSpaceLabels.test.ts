import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScreenSpaceLabels, type ScreenMapLabel } from './ScreenSpaceLabels'

const label: ScreenMapLabel = {
  key: 'ship', kind: 'entity', point: { x: 1_000_000.125, y: -800_000 }, radius: 0.02,
  name: '测试飞船', nameOffset: 18, nameSize: 10, opacity: 1, visible: true
}

describe('screen-space map labels', () => {
  it('uses a stable pixel font size and a small screen coordinate at high zoom', () => {
    const markup = renderToStaticMarkup(createElement(ScreenSpaceLabels, {
      labels: [label], zoom: 128, viewport: { width: 1000, height: 760, unitsPerPixel: 1 },
      toScreen: (point: { x: number; y: number }) => ({ x: (point.x - 1_000_000) * 128 + 500, y: (point.y + 800_000) * 128 + 380 })
    }))
    expect(markup).toContain('viewBox="0 0 1000 760"')
    expect(markup).toContain('x="516"')
    expect(markup).toContain('font-size:10px')
    expect(markup).toContain('测试飞船')
    expect(markup).not.toContain('1000000.125')
  })
})
