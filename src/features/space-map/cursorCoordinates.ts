import { SPACE_MAP_VIEW } from '../../config/spaceMapVisuals'
import type { WorldPoint } from './types'

/** Reverse the star-map projection to recover the AU coordinates stored in spaceMap.json. */
export function worldPointToMapAu(point: WorldPoint, mapCenter: WorldPoint, starAuLengthFactor: number): WorldPoint {
  return {
    x: mapCenter.x + (point.x - SPACE_MAP_VIEW.centerX) / starAuLengthFactor,
    y: mapCenter.y - (point.y - SPACE_MAP_VIEW.centerY) / starAuLengthFactor
  }
}

/** Keep cursor movement legible at both the widest and closest zoom levels. */
export function formatMapAuCoordinate(value: number, zoom: number, starAuLengthFactor: number): string {
  const digits = Math.max(2, Math.min(6, Math.ceil(Math.log10(Math.max(1, zoom * starAuLengthFactor)))))
  const rounded = Number(value.toFixed(digits))
  return rounded.toFixed(digits)
}

/** Display the actual SVG viewBox coordinate with sub-pixel precision at close zoom. */
export function formatSvgCoordinate(value: number, zoom: number): string {
  const digits = Math.max(2, Math.min(8, Math.ceil(Math.log10(Math.max(1, zoom * 100)))))
  const rounded = Number(value.toFixed(digits))
  return rounded.toFixed(digits)
}
