import type { CSSProperties } from 'react'
import { resolveEntityVisual, resolveEntityVisualColor, type EntityVisualKind } from './entityVisualRegistry'
import { resolveShipType, resolveShipTypeIcon } from './shipTypeIconRegistry'

type EntityIconProps = {
  kind: EntityVisualKind
  definitionId?: string
  ownerFactionId?: string
  size?: number
  className?: string
  style?: CSSProperties
  x?: number
  y?: number
}

/** Renders an entity's registered shared icon in panels and SVG map layers. */
export function EntityIcon({ kind, definitionId, ownerFactionId, size = 16, className, style, x, y }: EntityIconProps) {
  const color = resolveEntityVisualColor(kind, ownerFactionId, definitionId)
  const iconStyle = { ...style, color, stroke: color }
  if (kind === 'ship') {
    const Icon = resolveShipTypeIcon(resolveShipType(definitionId))
    return <Icon className={className} width={size} height={size} color={color} style={iconStyle} x={x} y={y} />
  }
  const visual = resolveEntityVisual(kind, definitionId)
  const Icon = visual.icon
  return <Icon className={className} size={size} color={color} style={iconStyle} x={x} y={y} />
}
