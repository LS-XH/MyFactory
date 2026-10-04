export const CAMERA_DIRECTIONS = ['up', 'left', 'down', 'right'] as const
export type CameraDirection = typeof CAMERA_DIRECTIONS[number]

export const CAMERA_KEY_FIELDS = {
  up: 'cameraKeyUp',
  left: 'cameraKeyLeft',
  down: 'cameraKeyDown',
  right: 'cameraKeyRight'
} as const

export const CAMERA_DIRECTION_LABELS: Record<CameraDirection, string> = {
  up: '向上移动', left: '向左移动', down: '向下移动', right: '向右移动'
}

export function isCameraKeyCode(code: string): boolean {
  return /^(Key[A-Z]|Digit[0-9]|Arrow(?:Up|Down|Left|Right))$/.test(code)
}

export function displayCameraKey(code: string): string {
  const arrows: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }
  return arrows[code] ?? code.replace(/^(Key|Digit)/, '')
}
