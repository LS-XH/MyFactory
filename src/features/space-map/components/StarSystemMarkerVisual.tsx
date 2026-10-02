import { SPACE_MAP_VISUAL } from '../../../config/spaceMapVisuals'
import { CornerFrame } from './CornerFrame'

type StarSystemMarkerVisualProps = {
  name: string
  typeName: string
  planetCount: number
  zoom: number
  overviewRadius: number
  starRadius: number
  overviewOpacity: number
  systemOpacity: number
  labelOpacity: number
  metaOpacity: number
}

export function StarSystemMarkerVisual(props: StarSystemMarkerVisualProps) {
  const { name, typeName, planetCount, zoom, overviewRadius, starRadius, overviewOpacity, systemOpacity, labelOpacity, metaOpacity } = props
  return <>
    {overviewOpacity > 0 && <g className="map-star-overview" opacity={overviewOpacity} pointerEvents={overviewOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? 'auto' : 'none'}>
      <circle r={overviewRadius} className="map-star-overview-dot" />
      <CornerFrame half={overviewRadius + SPACE_MAP_VISUAL.overviewCornerPadding / zoom} corner={SPACE_MAP_VISUAL.overviewCornerLength / zoom} />
      <g className="celestial-name">
        <text x="0" y={overviewRadius + SPACE_MAP_VISUAL.textOffset.overviewLabel / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.primary / zoom}px` }} className="map-star-label" opacity={labelOpacity}>{name}</text>
        <text x="0" y={overviewRadius + SPACE_MAP_VISUAL.textOffset.overviewMeta / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.meta / zoom}px` }} className="map-star-meta" opacity={metaOpacity}>{typeName} · {planetCount} 颗行星</text>
      </g>
    </g>}
    {systemOpacity > 0 && <g className="map-star-center" opacity={systemOpacity} pointerEvents={systemOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? 'auto' : 'none'}>
      <circle r={starRadius} className="map-star-core" />
      <CornerFrame half={starRadius + SPACE_MAP_VISUAL.starCornerPadding / zoom} corner={SPACE_MAP_VISUAL.starCornerLength / zoom} />
      <g className="celestial-name">
        <text x="0" y={starRadius + SPACE_MAP_VISUAL.textOffset.starLabel / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.primary / zoom}px` }} className="map-star-label">{name}</text>
        <text x="0" y={starRadius + SPACE_MAP_VISUAL.textOffset.starMeta / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.meta / zoom}px` }} className="map-star-meta" opacity={metaOpacity}>{typeName} · {planetCount} 颗行星</text>
      </g>
    </g>}
  </>
}
