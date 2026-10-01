import { SPACE_MAP_VISUAL } from '../../../config/spaceMapVisuals'
import { CornerFrame } from './CornerFrame'

type OrbitingBodyVisualProps = {
  x: number
  y: number
  radius: number
  zoom: number
  depth: number
  bodyId: string
  selected: boolean
  hasSurface: boolean
  typeName: string
  labelOpacity: number
}

export function OrbitingBodyVisual({ x, y, radius, zoom, depth, bodyId, selected, hasSurface, typeName, labelOpacity }: OrbitingBodyVisualProps) {
  const labelSize = depth === 0 ? SPACE_MAP_VISUAL.fontSize.label : SPACE_MAP_VISUAL.fontSize.moon
  const labelOffset = depth === 0 ? SPACE_MAP_VISUAL.textOffset.planetLabel : SPACE_MAP_VISUAL.textOffset.moonLabel
  return <>
    <circle cx={x} cy={y} r={radius + SPACE_MAP_VISUAL.bodyHitPadding / zoom} className="body-hit" />
    <circle cx={x} cy={y} r={radius} className={depth === 0 ? 'planet-core' : 'moon-core'} />
    <CornerFrame x={x} y={y} half={radius + SPACE_MAP_VISUAL.bodyCornerPadding / zoom} corner={SPACE_MAP_VISUAL.bodyCornerLength / zoom} />
    <text x={x} y={y + radius + labelOffset / zoom} textAnchor="middle" style={{ fontSize: `${labelSize / zoom}px` }} className="body-label" opacity={labelOpacity}>{bodyId}</text>
    {selected && <text x={x} y={y + radius + SPACE_MAP_VISUAL.textOffset.selectedMeta / zoom} textAnchor="middle" style={{ fontSize: `${SPACE_MAP_VISUAL.fontSize.moon / zoom}px` }} className="body-meta">{typeName} · {hasSurface ? '双击进入地表' : '无资源点'}</text>}
  </>
}

