import { overviewGlowGradientOffset, SPACE_MAP_VISUAL } from '../../../config/spaceMapVisuals'
import { STAR_TYPE_VISUALS, starOverviewGradientId } from '../../../config/starTypeVisuals'

export function SpaceMapGradientDefs() {
  return <defs>{Object.entries(STAR_TYPE_VISUALS).map(([starType, visual]) =>
    <radialGradient key={starType} id={starOverviewGradientId(starType)}>
      {SPACE_MAP_VISUAL.overviewGradient.map((stop) => <stop key={stop.offset} offset={overviewGlowGradientOffset(stop.offset)} stopColor={stop.region === 'core' ? visual.coreColor : visual.glowColor} stopOpacity={stop.opacity} />)}
    </radialGradient>
  )}</defs>
}
