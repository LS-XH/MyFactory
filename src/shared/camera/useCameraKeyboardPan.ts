import { useEffect, useRef } from 'react'
import { useGameStore } from '../../state/gameStore'
import { cameraDirection, isTypingTarget } from './cameraKeyboard'

/** Pan both map renderers in screen pixels per second; the renderer converts pixels to its camera space. */
export function useCameraKeyboardPan(onMove: (xPixels: number, yPixels: number) => void) {
  const up = useGameStore((state) => state.cameraKeyUp)
  const left = useGameStore((state) => state.cameraKeyLeft)
  const down = useGameStore((state) => state.cameraKeyDown)
  const right = useGameStore((state) => state.cameraKeyRight)
  const speed = useGameStore((state) => state.cameraMoveSpeed)
  const boostSpeed = useGameStore((state) => state.cameraBoostSpeed)
  const overlay = useGameStore((state) => state.overlay)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  useEffect(() => {
    if (overlay) return
    const bindings = { up, left, down, right }
    const keys = new Set(Object.values(bindings))
    const pressed = new Set<string>()
    let shiftHeld = false
    let frameId: number | null = null
    let previousFrame: number | null = null
    const frame = (now: number) => {
      frameId = null
      const direction = cameraDirection(pressed, bindings)
      if (direction.x === 0 && direction.y === 0) { previousFrame = null; return }
      if (previousFrame !== null) {
        const seconds = Math.min(0.05, (now - previousFrame) / 1000)
        const distance = (shiftHeld ? boostSpeed : speed) * seconds
        onMoveRef.current(direction.x * distance, direction.y * distance)
      }
      previousFrame = now
      frameId = window.requestAnimationFrame(frame)
    }
    const startFrame = () => { if (frameId === null) frameId = window.requestAnimationFrame(frame) }
    const clear = () => {
      pressed.clear()
      shiftHeld = false
      previousFrame = null
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = null
    }
    const keyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      shiftHeld = event.shiftKey
      if (!keys.has(event.code)) return
      event.preventDefault()
      pressed.add(event.code)
      startFrame()
    }
    const keyUp = (event: KeyboardEvent) => {
      shiftHeld = event.shiftKey
      pressed.delete(event.code)
      if (pressed.size) startFrame()
    }
    const visibilityChange = () => { if (document.hidden) clear() }
    window.addEventListener('keydown', keyDown, true)
    window.addEventListener('keyup', keyUp, true)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', visibilityChange)
    return () => {
      clear()
      window.removeEventListener('keydown', keyDown, true)
      window.removeEventListener('keyup', keyUp, true)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', visibilityChange)
    }
  }, [up, left, down, right, speed, boostSpeed, overlay])
}
