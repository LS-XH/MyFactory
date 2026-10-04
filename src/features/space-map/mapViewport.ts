import { SPACE_MAP_CANVAS, SPACE_MAP_VIEW } from '../../config/spaceMapVisuals'
import type { MapViewBounds } from '../../domain/spaceMap'
import type { WorldPoint } from './types'

export type MapViewport = { width: number; height: number; unitsPerPixel: number }

/** Preserve the former map scale while extending the SVG to the entire canvas. */
export function mapViewportForCanvas(pixelWidth: number, pixelHeight: number): MapViewport {
  const width = Math.max(1, pixelWidth)
  const height = Math.max(1, pixelHeight)
  const pixelsPerUnit = Math.min(
    Math.min(SPACE_MAP_CANVAS.referenceMaxWidthPx, width * SPACE_MAP_CANVAS.referenceSizeFraction) / SPACE_MAP_VIEW.width,
    Math.min(SPACE_MAP_CANVAS.referenceMaxHeightPx, height * SPACE_MAP_CANVAS.referenceSizeFraction) / SPACE_MAP_VIEW.height
  )
  const unitsPerPixel = 1 / pixelsPerUnit
  return { width: width * unitsPerPixel, height: height * unitsPerPixel, unitsPerPixel }
}

/** Pan remains anchored to the original map center; only the visible extent grows. */
export function cameraViewForViewport(pan: WorldPoint, zoom: number, viewport: MapViewport): MapViewBounds {
  return {
    x: (SPACE_MAP_VIEW.centerX - pan.x - viewport.width / 2) / zoom,
    y: (SPACE_MAP_VIEW.centerY - pan.y - viewport.height / 2) / zoom,
    width: viewport.width / zoom,
    height: viewport.height / zoom
  }
}

/** Cursor in the same camera plane used by pan and zoom, not a local star position. */
export function cameraPlanePoint(client: WorldPoint, rect: { left: number; top: number; width: number; height: number }, viewport: MapViewport): WorldPoint {
  return {
    x: SPACE_MAP_VIEW.centerX + ((client.x - rect.left) / rect.width - 0.5) * viewport.width,
    y: SPACE_MAP_VIEW.centerY + ((client.y - rect.top) / rect.height - 0.5) * viewport.height
  }
}
