export const GAME_SETTING_LIMITS = {
  orbitFps: { min: 10, max: 240, step: 1, default: 120 },
  displayRadius: { min: 0.2, max: 8, step: 0.1 },
  overviewMarkerMinZoom: { min: 0.03125, max: 1, step: 0.03125, default: 0.125 },
  auLengthFactor: { min: 0.000000000001, max: 1_000_000_000 }
} as const

export const DEFAULT_DISPLAY_RADIUS = {
  star: 7,
  planet: 4,
  moon: 2.5,
  orbitalEntity: 5
} as const

export const DEFAULT_AU_LENGTH_FACTOR = {
  star: 0.6,
  planet: 24,
  moon: 16
} as const

export const SURFACE_VIEW = {
  minZoom: 0.08,
  maxZoom: 32,
  wheelSensitivity: 0.0054,
  zoomAnimationMs: 300,
  fitPadding: 0.3,
  gridGap: 32,
  gridSize: 1
} as const

