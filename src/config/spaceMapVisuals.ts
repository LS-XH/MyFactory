export const SPACE_MAP_VIEW = {
  width: 1000,
  height: 760,
  centerX: 500,
  centerY: 380
} as const

/** The former centered SVG size defines the on-screen scale; the viewport now fills the canvas. */
export const SPACE_MAP_CANVAS = {
  referenceMaxWidthPx: 920,
  referenceMaxHeightPx: 710,
  referenceSizeFraction: 0.94
} as const

export const SPACE_MAP_ZOOM = {
  levels: [0.00125,0.0025,0.005,0.01,0.04, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512] as readonly number[],
  initial: 1,
  systemDetail: 2,
  entityDetail: 4,
  wheelThrottleMs: 90,
  wheelAnimationMs: 360,
  defaultAnimationMs: 420,
  focusAnimationMs: 680
} as const

export function zoomLevelBefore(zoom: number): number {
  return SPACE_MAP_ZOOM.levels.reduce((previous, level) => level < zoom ? level : previous, SPACE_MAP_ZOOM.levels[0])
}

export function zoomLevelAfter(zoom: number): number {
  return SPACE_MAP_ZOOM.levels.find((level) => level > zoom) ?? SPACE_MAP_ZOOM.levels[SPACE_MAP_ZOOM.levels.length - 1]
}

const overviewCoreRadiusFraction = 0.58
const overviewGlowRangeMultiplier = 3

export const SPACE_MAP_VISUAL = {
  celestialRadiusUnitScale: 0.1,
  fallbackOuterOrbit: 24,
  detailModeOpacityThreshold: 0.28,
  pointerOpacityThreshold: 0.18,
  entityPointerOpacityThreshold: 0.2,
  cameraFocusReleaseDragPx: 8,
  cullingPadding: 80,
  overviewPadding: 32,
  overviewCoreRadiusFraction,
  overviewGlowRangeMultiplier,
  overviewGlowRadiusScale: overviewCoreRadiusFraction + (1 - overviewCoreRadiusFraction) * overviewGlowRangeMultiplier,
  orbitCullingPadding: 3,
  bodyCullingPadding: 36,
  overviewCornerPadding: 5,
  overviewCornerLength: 8,
  starCornerPadding: 7,
  starCornerLength: 5,
  bodyCornerPadding: 5,
  bodyCornerLength: 3.5,
  entityCornerPadding: 5,
  entityCornerLength: 3.5,
  bodyHitPadding: 6,
  fontSize: { primary: 12, label: 10, meta: 9, moon: 8 },
  textOffset: { overviewLabel: 16, overviewMeta: 30, starLabel: 14, starMeta: 28, planetLabel: 12, moonLabel: 9, selectedMeta: 24, entityLabel: 18 },
  // Full-opacity core, a sharp drop to 30% opacity, then a soft outer light falloff.
  overviewGradient: [
    { offset: 0, opacity: 1, region: 'core' },
    { offset: overviewCoreRadiusFraction, opacity: 1, region: 'core' },
    { offset: overviewCoreRadiusFraction + 0.0001, opacity: 0.3, region: 'glow' },
    { offset: 0.72, opacity: 0.19, region: 'glow' },
    { offset: 0.86, opacity: 0.07, region: 'glow' },
    { offset: 1, opacity: 0, region: 'glow' }
  ]
} as const

/** Screen-sized dots on a fixed AU lattice; zoom changes the apparent gap, not its world distance. */
export const SPACE_MAP_DOT_GRID = {
  minimumRenderableSpacingPx: 1.5,
  dotRadiusPx: 1.5,
  maximumDotRadiusFraction: 0.45,
  opacity: 0.52
} as const

/** Expand only the halo's distance from the core; the opaque core keeps its original world radius. */
export function overviewGlowGradientOffset(baseOffset: number): number {
  const { overviewCoreRadiusFraction: core, overviewGlowRangeMultiplier: multiplier, overviewGlowRadiusScale: radiusScale } = SPACE_MAP_VISUAL
  return (baseOffset <= core ? baseOffset : core + (baseOffset - core) * multiplier) / radiusScale
}

export const ORBIT_VISUALIZATION = {
  timeUnitMs: 1000,
  siblingAngleStepDegrees: 126,
  depthAngleStepDegrees: 57
} as const

export const SPACE_MAP_LABEL = {
  minimumZoomPercent: SPACE_MAP_ZOOM.levels[0] * 100,
  maximumZoomPercent: SPACE_MAP_ZOOM.levels[SPACE_MAP_ZOOM.levels.length - 1] * 100
} as const
