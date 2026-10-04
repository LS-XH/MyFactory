import { SPACE_MAP_VISUAL } from '../../../config/spaceMapVisuals'
import type { MapViewport } from '../mapViewport'
import type { WorldPoint } from '../types'

export type ScreenMapLabel = {
  key: string
  kind: 'star' | 'body' | 'entity'
  point: WorldPoint
  radius: number
  name: string
  meta?: string
  nameOffset: number
  metaOffset?: number
  nameSize: number
  metaSize?: number
  opacity: number
  nameOpacity?: number
  metaOpacity?: number
  visible: boolean
  selectedMeta?: string
}

/** Text stays at a stable pixel size; only its screen position follows the SVG camera. */
export function ScreenSpaceLabels({ labels, zoom, toScreen, viewport }: { labels: ScreenMapLabel[]; zoom: number; toScreen: (point: WorldPoint, zoom: number) => WorldPoint; viewport: MapViewport }) {
  return <svg className="system-label-svg" viewBox={`0 0 ${viewport.width} ${viewport.height}`} aria-hidden="true" pointerEvents="none">
    {labels.map((label) => {
      const point = toScreen(label.point, zoom)
      // The active system may remain selected while its center is far outside the camera.
      if (point.x < -viewport.width || point.x > viewport.width * 2 || point.y < -viewport.height || point.y > viewport.height * 2) return null
      const baseY = point.y + label.radius * zoom
      const isEntity = label.kind === 'entity'
      return <g key={label.key}>
        <g className={isEntity ? 'orbital-name' : 'celestial-name'} style={{ opacity: label.visible ? label.opacity : 0 }}>
          <text x={point.x} y={baseY + label.nameOffset} textAnchor="middle" style={{ fontSize: `${label.nameSize}px` }} className={label.kind === 'star' ? 'map-star-label' : isEntity ? 'entity-label' : 'body-label'} opacity={label.nameOpacity ?? 1}>{label.name}</text>
          {label.meta && label.metaOffset !== undefined && <text x={point.x} y={baseY + label.metaOffset} textAnchor="middle" style={{ fontSize: `${label.metaSize ?? SPACE_MAP_VISUAL.fontSize.meta}px` }} className={label.kind === 'star' ? 'map-star-meta' : 'body-meta'} opacity={label.metaOpacity ?? 1}>{label.meta}</text>}
        </g>
        {label.selectedMeta && <text x={point.x} y={baseY + SPACE_MAP_VISUAL.textOffset.selectedMeta} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.moon}px` }} className="body-meta" opacity={label.opacity}>{label.selectedMeta}</text>}
      </g>
    })}
  </svg>
}
