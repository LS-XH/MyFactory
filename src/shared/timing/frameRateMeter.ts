import { APP_TIMING } from '../../config/visualTokens'

/** Counts completed game-loop frames over each elapsed one-second window. */
export function createFrameRateMeter(sampleMs = APP_TIMING.frameRateSampleMs) {
  let windowStart: number | null = null
  let frameCount = 0
  let framesPerSecond = 0
  const listeners = new Set<() => void>()

  const publish = (nextValue: number) => {
    if (framesPerSecond === nextValue) return
    framesPerSecond = nextValue
    for (const listener of listeners) listener()
  }

  return {
    getSnapshot: () => framesPerSecond,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    recordFrame: (nowMs: number) => {
      if (windowStart === null) {
        windowStart = nowMs
        return
      }
      frameCount += 1
      const elapsedMs = nowMs - windowStart
      if (elapsedMs < sampleMs) return
      publish(Math.round(frameCount * 1000 / elapsedMs))
      windowStart = nowMs
      frameCount = 0
    },
    reset: () => {
      windowStart = null
      frameCount = 0
      publish(0)
    }
  }
}

export const gameFrameRateMeter = createFrameRateMeter()
