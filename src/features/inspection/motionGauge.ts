import type { MeterReading } from './shipInspectorModel'

/** A signed reading occupies one half of a centered meter in either direction. */
export function signedGaugeGeometry(reading: MeterReading) {
  const fraction = reading.current === null || reading.maximum === null
    || !Number.isFinite(reading.current) || !Number.isFinite(reading.maximum) || reading.maximum <= 0
    ? 0
    : Math.min(1, Math.max(-1, reading.current / reading.maximum))
  return {
    magnitudePercent: Math.round(Math.abs(fraction) * 100),
    fillPercent: Math.abs(fraction) * 50,
    leftPercent: 50 + Math.min(0, fraction) * 50,
    positionPercent: 50 + fraction * 50
  }
}
