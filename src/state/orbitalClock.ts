let elapsedSeconds = 0
const listeners = new Set<() => void>()

export function getOrbitalTimeSeconds() { return elapsedSeconds }

export function subscribeOrbitalTime(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function advanceOrbitalTime(deltaSeconds: number, enabled: boolean) {
  if (!enabled || deltaSeconds <= 0) return
  elapsedSeconds += deltaSeconds
  for (const listener of listeners) listener()
}
