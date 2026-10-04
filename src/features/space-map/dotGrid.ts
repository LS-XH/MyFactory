import { SPACE_MAP_DOT_GRID } from '../../config/spaceMapVisuals'
import { smoothStep } from './starLayerOpacity'

export type DotGridGeometry = {
  spacing: number
  phaseX: number
  phaseY: number
  radius: number
  opacity: number
}

/** Independently configured start and end levels bound the reversible fade. */
export function dotGridOpacity(zoom: number, startZoom: number, endZoom: number, reduceMotion = false): number {
  if (reduceMotion) return zoom >= endZoom ? SPACE_MAP_DOT_GRID.opacity : 0
  return SPACE_MAP_DOT_GRID.opacity * smoothStep(startZoom, endZoom, zoom)
}

/** Keep AU grid points fixed in world space even when SVG rendering is rebased. */
export function resolveDotGrid(
  zoom: number,
  spacingAu: number,
  worldUnitsPerAu: number,
  origin: { x: number; y: number },
  startZoom: number,
  endZoom: number,
  reduceMotion = false
): DotGridGeometry | null {
  const opacity = dotGridOpacity(zoom, startZoom, endZoom, reduceMotion)
  if (opacity <= 0 || zoom <= 0 || spacingAu <= 0 || worldUnitsPerAu <= 0) return null

  const spacing = spacingAu * worldUnitsPerAu
  const pixelSpacing = spacing * zoom
  if (!Number.isFinite(pixelSpacing) || pixelSpacing < SPACE_MAP_DOT_GRID.minimumRenderableSpacingPx) return null
  return {
    spacing,
    // Center the dot in its tile; these phases preserve the global lattice in local SVG space.
    phaseX: -(origin.x % spacing) - spacing / 2,
    phaseY: -(origin.y % spacing) - spacing / 2,
    radius: Math.min(SPACE_MAP_DOT_GRID.dotRadiusPx, pixelSpacing * SPACE_MAP_DOT_GRID.maximumDotRadiusFraction) / zoom,
    opacity
  }
}
