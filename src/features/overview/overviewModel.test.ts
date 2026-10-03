import { describe, expect, it } from 'vitest'
import { GameObject } from '../../domain/objects'
import { PLAYER_FACTION_ID } from '../../domain/factions'
import { filterOverviewEntries, makeSpaceAssetEntries, makeVisibleSpaceEntries, type OverviewEntry } from './overviewModel'
import { spaceMap } from '../../domain/spaceMap'

const entries: OverviewEntry[] = [
  { id: 'player-ship', name: '玩家飞船', meta: '', category: 'ship', selectionKind: 'ship', color: '', ownerFactionId: PLAYER_FACTION_ID },
  { id: 'other-ship', name: '其他飞船', meta: '', category: 'ship', selectionKind: 'ship', color: '', ownerFactionId: 'Terran' },
  { id: 'station', name: '空间站', meta: '', category: 'station', selectionKind: 'station', color: '', ownerFactionId: PLAYER_FACTION_ID },
  { id: 'star', name: '恒星', meta: '', category: 'planet', selectionKind: 'body', color: '' }
]

describe('overview filtering', () => {
  it('requires every enabled label and shows all entries when none is enabled', () => {
    expect(filterOverviewEntries(entries, new Set(['player'])).map((entry) => entry.id)).toEqual(['player-ship', 'station'])
    expect(filterOverviewEntries(entries, new Set(['ship'])).map((entry) => entry.id)).toEqual(['player-ship', 'other-ship'])
    expect(filterOverviewEntries(entries, new Set(['player', 'ship'])).map((entry) => entry.id)).toEqual(['player-ship'])
    expect(filterOverviewEntries(entries, new Set(['hostile', 'ship'])).map((entry) => entry.id)).toEqual(['other-ship'])
    expect(filterOverviewEntries(entries, new Set(['ship', 'station']))).toEqual([])
    expect(filterOverviewEntries(entries, new Set()).map((entry) => entry.id)).toEqual(entries.map((entry) => entry.id))
  })

  it('applies the same conjunction to asset and surface lists', () => {
    expect(filterOverviewEntries(entries, new Set(['station'])).map((entry) => entry.id)).toEqual(['station'])
    const surfaceEntries: OverviewEntry[] = [
      { id: 'factory', name: '设备', meta: '', category: 'factory', selectionKind: 'factory', color: '' },
      { id: 'resource', name: '资源', meta: '', category: 'resource', selectionKind: 'body', color: '' }
    ]
    expect(filterOverviewEntries(surfaceEntries, new Set(['resource'])).map((entry) => entry.id)).toEqual(['resource'])
    expect(filterOverviewEntries(surfaceEntries, new Set(['resource', 'factory']))).toEqual([])
    expect(filterOverviewEntries(surfaceEntries, new Set())).toEqual(surfaceEntries)
  })

  it('keeps player assets separate from non-player orbital objects', () => {
    const player = new GameObject('player-ship', 'ship', 'Imicus', '玩家飞船', {}, { x: 0, y: 0 }, PLAYER_FACTION_ID)
    const other = new GameObject('other-ship', 'ship', 'Imicus', '其他飞船', {}, { x: 0, y: 0 }, 'Terran')
    const assets = makeSpaceAssetEntries([player, other] as Parameters<typeof makeSpaceAssetEntries>[0])
    expect(assets.map((entry) => entry.id)).toContain('player-ship')
    expect(assets.map((entry) => entry.id)).not.toContain('other-ship')
    expect(assets.some((entry) => entry.category === 'planet')).toBe(true)
    expect(assets.find((entry) => entry.category === 'planet')?.ownerFactionId).toBe(PLAYER_FACTION_ID)
  })

  it('marks stars separately from planets without changing their filter category', () => {
    const [starId, star] = Object.entries(spaceMap)[0]
    const [planetId] = Object.keys(star.planet)
    const visible = makeVisibleSpaceEntries([starId, `${starId}/${planetId}`], [])
    expect(visible[0]).toMatchObject({ category: 'planet', celestialKind: 'star' })
    expect(visible[1]).toMatchObject({ category: 'planet', celestialKind: 'planet' })
  })
})
