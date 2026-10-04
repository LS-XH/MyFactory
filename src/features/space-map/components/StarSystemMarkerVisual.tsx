import { SPACE_MAP_VISUAL } from '../../../config/spaceMapVisuals'
import { resolveStarTypeVisual, starOverviewGradientId } from '../../../config/starTypeVisuals'
import { CornerFrame } from './CornerFrame'

type StarSystemMarkerVisualProps = {
  name: string
  starType?: string
  typeName: string
  planetCount: number
  zoom: number
  overviewRadius: number
  starRadius: number
  overviewOpacity: number
  systemOpacity: number
  labelOpacity: number
  metaOpacity: number
  hideLabels?: boolean
}

export function StarSystemMarkerVisual(props: StarSystemMarkerVisualProps) {
  const { name, starType, typeName, planetCount, zoom, overviewRadius, starRadius, overviewOpacity, systemOpacity, labelOpacity, metaOpacity, hideLabels = false } = props
  const visual = resolveStarTypeVisual(starType)
  return <>
    {overviewOpacity > 0 && <g className="map-star-overview" opacity={overviewOpacity} pointerEvents={overviewOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? 'auto' : 'none'}>
      <circle r={overviewRadius * SPACE_MAP_VISUAL.overviewGlowRadiusScale} className="map-star-overview-dot" fill={`url(#${starOverviewGradientId(starType)})`} pointerEvents="none" />
      <circle r={overviewRadius} fill="transparent" pointerEvents="all" />
      <CornerFrame half={overviewRadius + SPACE_MAP_VISUAL.overviewCornerPadding / zoom} corner={SPACE_MAP_VISUAL.overviewCornerLength / zoom} />
      {!hideLabels && <g className="celestial-name">
        <text x="0" y={overviewRadius + SPACE_MAP_VISUAL.textOffset.overviewLabel / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.primary / zoom}px` }} className="map-star-label" opacity={labelOpacity}>{name}</text>
        <text x="0" y={overviewRadius + SPACE_MAP_VISUAL.textOffset.overviewMeta / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.meta / zoom}px` }} className="map-star-meta" opacity={metaOpacity}>{typeName} · {planetCount} 颗行星</text>
      </g>}
    </g>}
    {systemOpacity > 0 && <g className="map-star-center" opacity={systemOpacity} pointerEvents={systemOpacity > SPACE_MAP_VISUAL.pointerOpacityThreshold ? 'auto' : 'none'}>
      <circle r={starRadius} className="map-star-core" style={{ fill: visual.coreColor }} />
      <CornerFrame half={starRadius + SPACE_MAP_VISUAL.starCornerPadding / zoom} corner={SPACE_MAP_VISUAL.starCornerLength / zoom} />
      {!hideLabels && <g className="celestial-name">
        <text x="0" y={starRadius + SPACE_MAP_VISUAL.textOffset.starLabel / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.primary / zoom}px` }} className="map-star-label">{name}</text>
        <text x="0" y={starRadius + SPACE_MAP_VISUAL.textOffset.starMeta / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.meta / zoom}px` }} className="map-star-meta" opacity={metaOpacity}>{typeName} · {planetCount} 颗行星</text>
      </g>}
    </g>}
  </>
}
