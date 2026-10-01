import { SPACE_MAP_VISUAL } from '../../../config/spaceMapVisuals'

export function SpaceMapGradientDefs() {
  return <defs><radialGradient id="overviewStarDot">{SPACE_MAP_VISUAL.overviewGradient.map((stop) => <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />)}</radialGradient></defs>
}

