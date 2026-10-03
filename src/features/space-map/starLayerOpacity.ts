export type StarLayerThresholds = {
  overviewFadeStartZoom: number
  overviewFadeEndZoom: number
  systemFadeStartZoom: number
  systemFadeEndZoom: number
}

export function smoothStep(from: number, to: number, value: number) {
  if (to <= from) return value >= to ? 1 : 0
  const ratio = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return ratio * ratio * (3 - 2 * ratio)
}

export function starLayerOpacities(zoom: number, thresholds: StarLayerThresholds) {
  return {
    overviewOpacity: 1 - smoothStep(thresholds.overviewFadeStartZoom, thresholds.overviewFadeEndZoom, zoom),
    systemOpacity: smoothStep(thresholds.systemFadeStartZoom, thresholds.systemFadeEndZoom, zoom)
  }
}
