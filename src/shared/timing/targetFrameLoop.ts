/** Run once per available display frame, capped by the requested target FPS. */
export function startTargetFrameLoop(targetFps: number, onFrame: (elapsedMs: number) => void) {
  const frameInterval = 1000 / targetFps
  let animationFrame = 0
  let previousFrame = performance.now()
  let nextFrame = previousFrame
  let elapsedSinceFrame = 0

  const frame = (now: number) => {
    elapsedSinceFrame += now - previousFrame
    previousFrame = now
    if (now >= nextFrame) {
      const elapsed = elapsedSinceFrame
      elapsedSinceFrame = 0
      nextFrame += frameInterval
      if (now - nextFrame > frameInterval) nextFrame = now + frameInterval
      onFrame(elapsed)
    }
    animationFrame = window.requestAnimationFrame(frame)
  }

  animationFrame = window.requestAnimationFrame(frame)
  return () => window.cancelAnimationFrame(animationFrame)
}
