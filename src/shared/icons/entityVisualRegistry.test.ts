import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UI_COLORS } from '../../config/visualTokens'
import { PLAYER_FACTION_ID } from '../../domain/factions'
import { EntityIcon } from './EntityIcon'
import { resolveEntityVisualColor } from './entityVisualRegistry'

describe('orbital object ownership colors', () => {
  it('colors player-owned ships and stations yellow-green', () => {
    for (const kind of ['ship', 'station'] as const) {
      expect(resolveEntityVisualColor(kind, PLAYER_FACTION_ID)).toBe(UI_COLORS.playerOwnedObject)
      const markup = renderToStaticMarkup(createElement(EntityIcon, { kind, ownerFactionId: PLAYER_FACTION_ID }))
      expect(markup).toContain('color:var(--color-player-owned-object)')
    }
  })

  it('preserves other owners and celestial colors', () => {
    expect(resolveEntityVisualColor('ship', 'Other')).toBe(UI_COLORS.ship)
    expect(resolveEntityVisualColor('station', undefined)).toBe(UI_COLORS.station)
    expect(resolveEntityVisualColor('planet', PLAYER_FACTION_ID)).toBe(UI_COLORS.planet)
  })
})
