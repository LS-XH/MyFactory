import starTypeDefinitions from '../../assets/legacy/starType.json'

export type StarTypeId = keyof typeof starTypeDefinitions

type StarTypeVisual = {
  coreColor: string
  glowColor: string
}

/** Astronomical color families, brightened slightly for the dark tactical map. */
export const STAR_TYPE_VISUALS: Readonly<Record<StarTypeId, StarTypeVisual>> = {
  OTypeBlueSupergiant: { coreColor: '#9ecaff', glowColor: '#78b7ff' },
  BTypeBlueGiant: { coreColor: '#c2dcff', glowColor: '#a5caff' },
  ATypeWhiteStar: { coreColor: '#f4f7ff', glowColor: '#dce8ff' },
  FTypeYellowWhiteStar: { coreColor: '#fff5d9', glowColor: '#ffe9b7' },
  GTypeYellowDwarf: { coreColor: '#ffe18a', glowColor: '#ffce6d' },
  KTypeOrangeDwarf: { coreColor: '#ffba73', glowColor: '#ff9f58' },
  MTypeRedDwarf: { coreColor: '#ff8279', glowColor: '#ff665f' },
  RedGiant: { coreColor: '#ff9b74', glowColor: '#ff785d' },
  RedSupergiant: { coreColor: '#ff7467', glowColor: '#f55c55' },
  WhiteDwarf: { coreColor: '#e9f5ff', glowColor: '#c9e7ff' },
  NeutronStar: { coreColor: '#d2f1ff', glowColor: '#9edfff' },
  // A black hole has no luminous surface; the warm halo depicts nearby emitting matter.
  BlackHole: { coreColor: '#080c13', glowColor: '#ffbd7b' }
}

export const DEFAULT_STAR_VISUAL: StarTypeVisual = STAR_TYPE_VISUALS.GTypeYellowDwarf

export function resolveStarTypeVisual(starType?: string): StarTypeVisual {
  return starType && starType in STAR_TYPE_VISUALS
    ? STAR_TYPE_VISUALS[starType as StarTypeId]
    : DEFAULT_STAR_VISUAL
}

export function starOverviewGradientId(starType?: string): string {
  return `overview-star-${starType && starType in STAR_TYPE_VISUALS ? starType : 'GTypeYellowDwarf'}`
}
