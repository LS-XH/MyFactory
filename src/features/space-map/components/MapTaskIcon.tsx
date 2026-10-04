import { resolveObjectActionIcon } from '../../action-bar/objectActionIcons'

/** Keep the Lucide drawing at its native 24-unit size and transform it with the marker. */
export function MapTaskIcon({ actionId, radius, color }: { actionId: string; radius: number; color: string }) {
  const Icon = resolveObjectActionIcon(actionId)
  const scale = radius * 1.1 / 24
  return <g transform={`scale(${scale}) translate(-12 -12)`} pointerEvents="none">
    <Icon size={24} color={color} strokeWidth={2} />
  </g>
}
