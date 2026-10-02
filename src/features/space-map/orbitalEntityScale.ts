/**
 * SVG symbols are specified in map units. Dividing by the live zoom cancels
 * further screen-size changes outside the configured zoom interval, while
 * keeping their world position untouched.
 */
export function orbitalIconWorldRadius(baseRadius: number, zoom: number, minZoom: number, maxZoom: number): number {
  const effectiveZoom = Math.min(maxZoom, Math.max(minZoom, zoom))
  return baseRadius * effectiveZoom / zoom
}
