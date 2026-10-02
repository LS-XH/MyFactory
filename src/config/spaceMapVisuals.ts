import { UI_COLORS } from './visualTokens'

export const SPACE_MAP_VIEW = {
  width: 1000,
  height: 760,
  centerX: 500,
  centerY: 380
} as const

export const SPACE_MAP_ZOOM = {
  levels: [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512] as readonly number[],
  initial: 1,
  systemDetail: 2,
  entityDetail: 4,
  stationFocus: 8,
  shipFocus: 11,
  wheelThrottleMs: 90,
  wheelAnimationMs: 360,
  defaultAnimationMs: 420,
  focusAnimationMs: 680
} as const

export const SPACE_MAP_VISUAL = {
  celestialRadiusUnitScale: 0.1,
  fallbackOuterOrbit: 24,
  detailModeOpacityThreshold: 0.28,
  pointerOpacityThreshold: 0.18,
  entityPointerOpacityThreshold: 0.2,
  cullingPadding: 80,
  overviewPadding: 32,
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
  overviewGradient: [
    { offset: '0', color: UI_COLORS.star, opacity: 0.78 },
    { offset: '.55', color: UI_COLORS.star, opacity: 0.78 },
    { offset: '.7', color: UI_COLORS.star, opacity: 0.58 },
    { offset: '.84', color: UI_COLORS.star, opacity: 0.3 },
    { offset: '.94', color: UI_COLORS.star, opacity: 0.1 },
    { offset: '1', color: UI_COLORS.star, opacity: 0 }
  ]
} as const

export const ORBIT_VISUALIZATION = {
  timeUnitMs: 1000,
  siblingAngleStepDegrees: 126,
  depthAngleStepDegrees: 57
} as const

export const SPACE_MAP_LABEL = {
  minimumZoomPercent: SPACE_MAP_ZOOM.levels[0] * 100,
  maximumZoomPercent: SPACE_MAP_ZOOM.levels[SPACE_MAP_ZOOM.levels.length - 1] * 100
} as const
