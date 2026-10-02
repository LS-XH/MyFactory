import { Orbit, Radio, type LucideIcon } from 'lucide-react'
import { UI_COLORS } from '../../config/visualTokens'
import { PLAYER_FACTION_ID } from '../../domain/factions'

export type EntityVisualKind = 'star' | 'planet' | 'moon' | 'station' | 'ship' | 'resource'

export type EntityVisualDefinition = {
  icon: LucideIcon
  color: string
}

/** Shared visual assets for space entities. Add model-specific entries here as ship/station content grows. */
export const entityVisualRegistry: Readonly<Record<string, EntityVisualDefinition>> = {
  star: { icon: Orbit, color: UI_COLORS.star },
  planet: { icon: Orbit, color: UI_COLORS.planet },
  moon: { icon: Orbit, color: UI_COLORS.moon },
  station: { icon: Radio, color: UI_COLORS.station },
  ship: { icon: Orbit, color: UI_COLORS.ship },
  resource: { icon: Orbit, color: UI_COLORS.mining }
}

export function resolveEntityVisual(kind: EntityVisualKind, definitionId?: string): EntityVisualDefinition {
  return (definitionId && entityVisualRegistry[definitionId]) || entityVisualRegistry[kind] || entityVisualRegistry.planet!
}

/** Ownership affects orbital-object icon color, not the underlying model's visual definition. */
export function resolveEntityVisualColor(kind: EntityVisualKind, ownerFactionId?: string, definitionId?: string): string {
  if ((kind === 'ship' || kind === 'station') && ownerFactionId === PLAYER_FACTION_ID) {
    return UI_COLORS.playerOwnedObject
  }
  return resolveEntityVisual(kind, definitionId).color
}
