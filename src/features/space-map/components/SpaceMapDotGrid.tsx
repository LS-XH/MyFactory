import type { MapViewBounds } from '../../../domain/spaceMap'
import { resolveDotGrid } from '../dotGrid'

type SpaceMapDotGridProps = {
  view: MapViewBounds
  origin: { x: number; y: number }
  zoom: number
  spacingAu: number
  worldUnitsPerAu: number
  startZoom: number
  endZoom: number
  reduceMotion: boolean
}

const patternId = 'space-map-au-dot-grid'

export function SpaceMapDotGrid({ view, origin, zoom, spacingAu, worldUnitsPerAu, startZoom, endZoom, reduceMotion }: SpaceMapDotGridProps) {
  const grid = resolveDotGrid(zoom, spacingAu, worldUnitsPerAu, origin, startZoom, endZoom, reduceMotion)
  if (!grid) return null

  return <>
    <defs>
      <pattern id={patternId} patternUnits="userSpaceOnUse" x={grid.phaseX} y={grid.phaseY} width={grid.spacing} height={grid.spacing}>
        <circle cx={grid.spacing / 2} cy={grid.spacing / 2} r={grid.radius} fill="var(--color-map-grid-dot)" />
      </pattern>
    </defs>
    <rect className="space-map-dot-grid" x={view.x} y={view.y} width={view.width} height={view.height} fill={`url(#${patternId})`} opacity={grid.opacity} pointerEvents="none" aria-hidden="true" />
  </>
}
