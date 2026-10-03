import { SPACE_MAP_ZOOM } from './spaceMapVisuals'

export const GAME_SETTING_LIMITS = {
  orbitFps: { min: 10, max: 240, step: 1, default: 120 },
  inventoryScale: { min: 0.5, max: 1, step: 0.05, default: 1 },
  displayRadius: { min: 0.2, max: 8, step: 0.1 },
  overviewMarkerMinZoom: { min: 0.03125, max: 1, step: 0.03125, default: 0.0625 },
  starLayerTransitionZoom: {
    min: SPACE_MAP_ZOOM.levels[0],
    max: SPACE_MAP_ZOOM.levels[SPACE_MAP_ZOOM.levels.length - 1],
    defaultOverviewFadeStart: 1,
    defaultOverviewFadeEnd: SPACE_MAP_ZOOM.systemDetail,
    defaultSystemFadeStart: 1,
    defaultSystemFadeEnd: SPACE_MAP_ZOOM.systemDetail
  },
  objectIconZoom: {
    min: SPACE_MAP_ZOOM.levels[0],
    max: SPACE_MAP_ZOOM.levels[SPACE_MAP_ZOOM.levels.length - 1],
    defaultMin: 16,
    defaultMax: 128
  },
  surfaceCardZoom: { min: 0.03125, max: 32, gap: 0.01, defaultCompactMax: 0.5, defaultDetailMin: 2, defaultIconMin: 0.25 },
  auLengthFactor: { min: 0.000000000001, max: 1_000_000_000 }
} as const

export const DEFAULT_DISPLAY_RADIUS = {
  star: 4.9,
  planet: 1,
  moon: 0.3,
  orbitalEntity: 0.8
} as const

export const DEFAULT_AU_LENGTH_FACTOR = {
  star: 100,
  planet: 5,
  moon: 3
} as const

export const DEFAULT_GAME_SETTINGS = {
  orbitAnimation: true,
  celestialNamesAlwaysVisible: true,
  objectNamesAlwaysVisible: true,
  orbitFps: GAME_SETTING_LIMITS.orbitFps.default,
  inventoryScale: GAME_SETTING_LIMITS.inventoryScale.default,
  starDisplayRadius: DEFAULT_DISPLAY_RADIUS.star,
  planetDisplayRadius: DEFAULT_DISPLAY_RADIUS.planet,
  moonDisplayRadius: DEFAULT_DISPLAY_RADIUS.moon,
  orbitalEntityDisplayRadius: DEFAULT_DISPLAY_RADIUS.orbitalEntity,
  overviewMarkerMinZoom: GAME_SETTING_LIMITS.overviewMarkerMinZoom.default,
  overviewFadeStartZoom: GAME_SETTING_LIMITS.starLayerTransitionZoom.defaultOverviewFadeStart,
  overviewFadeEndZoom: GAME_SETTING_LIMITS.starLayerTransitionZoom.defaultOverviewFadeEnd,
  systemFadeStartZoom: GAME_SETTING_LIMITS.starLayerTransitionZoom.defaultSystemFadeStart,
  systemFadeEndZoom: GAME_SETTING_LIMITS.starLayerTransitionZoom.defaultSystemFadeEnd,
  objectIconMinZoom: GAME_SETTING_LIMITS.objectIconZoom.defaultMin,
  objectIconMaxZoom: GAME_SETTING_LIMITS.objectIconZoom.defaultMax,
  surfaceCardCompactMaxZoom: GAME_SETTING_LIMITS.surfaceCardZoom.defaultCompactMax,
  surfaceCardDetailMinZoom: GAME_SETTING_LIMITS.surfaceCardZoom.defaultDetailMin,
  surfaceIconMinZoom: GAME_SETTING_LIMITS.surfaceCardZoom.defaultIconMin,
  starAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.star,
  planetAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.planet,
  moonAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.moon
} as const

const surfaceZoomLevels = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32] as const

export const SURFACE_VIEW = {
  zoomLevels: surfaceZoomLevels,
  initialZoom: 1,
  minZoom: surfaceZoomLevels[0],
  maxZoom: surfaceZoomLevels[surfaceZoomLevels.length - 1],
  wheelThrottleMs: 90,
  zoomAnimationMs: 360,
  fitPadding: 0.3,
  gridGap: 32,
  gridSize: 1,
  factoryNodeWidth: 205,
  factoryNodeHeight: 156,
  resourceNodeWidth: 205,
  resourceNodeHeight: 156
} as const

export const SURFACE_PRODUCTION = {
  tickSeconds: 0.1,
  miningSecondsPerItem: 1,
  formulaSecondsPerCycle: 1
} as const
