import factionDefinitions from '../../assets/legacy/faction.json'

export const PLAYER_FACTION_ID = 'Player'

export function getFactionDisplayName(factionId: string | undefined): string {
  if (!factionId) return '未知'
  const factions = factionDefinitions as Record<string, { displayName?: string }>
  return factions[factionId]?.displayName ?? factionId
}
