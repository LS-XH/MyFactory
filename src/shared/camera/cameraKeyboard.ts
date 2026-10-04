import type { CameraDirection } from '../../config/cameraControls'

export type CameraBindings = Record<CameraDirection, string>

/** Normalized camera direction prevents diagonal input from being faster. */
export function cameraDirection(pressed: ReadonlySet<string>, bindings: CameraBindings): { x: number; y: number } {
  const x = Number(pressed.has(bindings.right)) - Number(pressed.has(bindings.left))
  const y = Number(pressed.has(bindings.down)) - Number(pressed.has(bindings.up))
  const length = Math.hypot(x, y)
  return length ? { x: x / length, y: y / length } : { x: 0, y: 0 }
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
}
