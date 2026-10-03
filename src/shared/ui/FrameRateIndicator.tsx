import { useEffect, useSyncExternalStore } from 'react'
import { gameFrameRateMeter } from '../timing/frameRateMeter'

/** Shared shell HUD; the meter is fed by the game loop in both map scenes. */
export function FrameRateIndicator() {
  const fps = useSyncExternalStore(gameFrameRateMeter.subscribe, gameFrameRateMeter.getSnapshot, gameFrameRateMeter.getSnapshot)

  useEffect(() => {
    const resetWhenVisibilityChanges = () => gameFrameRateMeter.reset()
    document.addEventListener('visibilitychange', resetWhenVisibilityChanges)
    return () => document.removeEventListener('visibilitychange', resetWhenVisibilityChanges)
  }, [])

  return <div className="frame-rate-indicator" aria-label={`实时帧率 ${fps} FPS`} title="最近一秒实际执行的游戏帧数">
    <span>实时帧率</span><strong>{fps}</strong><span>FPS</span>
  </div>
}
