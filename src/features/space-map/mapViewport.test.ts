import { describe, expect, it } from 'vitest'
import { cameraPlanePoint, cameraViewForViewport, mapViewportForCanvas } from './mapViewport'

describe('full-canvas universe viewport', () => {
  it('keeps the previous glyph scale while extending the visible world to the panel edges', () => {
    const viewport = mapViewportForCanvas(1382, 940)
    expect(viewport.unitsPerPixel).toBeCloseTo(1 / 0.92)
    expect(viewport.width).toBeGreaterThan(1000)
    expect(viewport.height).toBeGreaterThan(760)
    const view = cameraViewForViewport({ x: 0, y: 0 }, 1, viewport)
    expect(view.x + view.width / 2).toBeCloseTo(500)
    expect(view.y + view.height / 2).toBeCloseTo(380)
    const edge = cameraPlanePoint({ x: 1382, y: 940 }, { left: 0, top: 0, width: 1382, height: 940 }, viewport)
    expect(edge.x).toBeCloseTo(view.x + view.width)
    expect(edge.y).toBeCloseTo(view.y + view.height)
  })

  it('preserves the cursor world point across zoom changes', () => {
    const viewport = mapViewportForCanvas(1382, 940)
    const cursor = cameraPlanePoint({ x: 1000, y: 600 }, { left: 0, top: 0, width: 1382, height: 940 }, viewport)
    const point = { x: (cursor.x - 20) / 2, y: (cursor.y + 12) / 2 }
    const nextPan = { x: cursor.x - point.x * 4, y: cursor.y - point.y * 4 }
    const view = cameraViewForViewport(nextPan, 4, viewport)
    expect(point.x).toBeCloseTo(view.x + 1000 / 1382 * view.width)
    expect(point.y).toBeCloseTo(view.y + 600 / 940 * view.height)
  })
})
