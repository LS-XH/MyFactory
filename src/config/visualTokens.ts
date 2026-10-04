/** Shared visual defaults. Keep component code free of duplicated color and size literals. */
export const UI_COLORS = {
  accent: 'var(--color-accent)',
  star: 'var(--color-star)',
  planet: 'var(--color-planet)',
  moon: 'var(--color-moon)',
  station: 'var(--color-station)',
  ship: 'var(--color-ship)',
  playerOwnedObject: 'var(--color-player-owned-object)',
  hostile: 'var(--color-hostile-filter)',
  transport: 'var(--color-transport)',
  mining: 'var(--color-mining)',
  logistics: 'var(--color-logistics)',
  text: 'var(--color-map-label)',
  edgeLabel: 'var(--color-edge-label)',
  edgeLabelBackground: 'var(--color-edge-label-background)',
  surfaceGrid: 'var(--color-surface-grid)',
  minimapMask: 'var(--color-minimap-mask)',
  transparent: 'transparent',
  selected: 'var(--color-selected-frame)',
  starInfo: 'var(--color-star-info)',
  planetInfo: 'var(--color-planet-info)',
  moonInfo: 'var(--color-moon-info)'
} as const

export const ICON_SIZES = {
  topBar: 16,
  panelTitle: 17,
  asset: 16,
  node: 15,
  inspector: 25,
  action: 15,
  objectAction: 23,
  category: 14,
  placeholder: 29
} as const

export const APP_TIMING = {
  simulationTickMs: 100,
  frameRateSampleMs: 1000,
  toastDurationMs: 2400
} as const
