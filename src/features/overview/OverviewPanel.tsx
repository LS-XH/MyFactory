import { useMemo, useState, type CSSProperties } from 'react'
import { UI_COLORS } from '../../config/visualTokens'
import { getOrbitalObjects } from '../../domain/objects'
import { useGameStore, type SceneId } from '../../state/gameStore'
import { OverviewList } from './AssetLists'
import {
  filterOverviewEntries,
  makeSpaceAssetEntries,
  makeSurfaceAssetEntries,
  makeVisibleSpaceEntries,
  makeVisibleSurfaceEntries,
  type OverviewEntry,
  type OverviewFilterId,
  type OverviewPage
} from './overviewModel'
import './overview.css'

type FilterDefinition = { id: OverviewFilterId; label: string; color: string; title?: string }

const spaceTypes: FilterDefinition[] = [
  { id: 'ship', label: '飞船', color: UI_COLORS.ship },
  { id: 'station', label: '空间站', color: UI_COLORS.station },
  { id: 'planet', label: '星球', color: UI_COLORS.planet }
]

const filterSets: Record<SceneId, Record<OverviewPage, FilterDefinition[]>> = {
  system: {
    assets: spaceTypes,
    objects: [
      { id: 'player', label: '玩家', color: UI_COLORS.playerOwnedObject },
      { id: 'hostile', label: '敌对', color: UI_COLORS.hostile, title: '暂按非玩家所属归类；阵营敌对关系尚未接入' },
      ...spaceTypes
    ]
  },
  surface: {
    assets: [{ id: 'factory', label: '设备', color: UI_COLORS.accent }],
    objects: [
      { id: 'factory', label: '设备', color: UI_COLORS.accent },
      { id: 'resource', label: '资源点', color: UI_COLORS.mining }
    ]
  }
}

type OverviewPanelProps = {
  scene: SceneId
  selectedIds: string[]
  visibleSpaceIds: string[]
  visibleSurfaceIds: string[]
  onSelect: (entry: OverviewEntry, additive: boolean, appendTask: boolean) => void
  onFocusObject: (id: string) => void
  onEnterSurface: (id: string) => void
}

export function OverviewPanel({ scene, selectedIds, visibleSpaceIds, visibleSurfaceIds, onSelect, onFocusObject, onEnterSurface }: OverviewPanelProps) {
  const [page, setPage] = useState<OverviewPage>('assets')
  const [enabledByScope, setEnabledByScope] = useState<Record<string, OverviewFilterId[]>>({})
  const objectRevision = useGameStore((state) => state.objectRevision)
  const nodes = useGameStore((state) => state.nodes)
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const scope = `${scene}:${page}`
  const filters = filterSets[scene][page]
  const enabled = useMemo(() => new Set<OverviewFilterId>(enabledByScope[scope] ?? []), [enabledByScope, scope])

  const entries = useMemo(() => {
    if (scene === 'system') {
      const orbitalObjects = getOrbitalObjects()
      return page === 'assets' ? makeSpaceAssetEntries(orbitalObjects) : makeVisibleSpaceEntries(visibleSpaceIds, orbitalObjects)
    }
    return page === 'assets'
      ? makeSurfaceAssetEntries(nodes, surfacePlanet)
      : makeVisibleSurfaceEntries(visibleSurfaceIds, nodes, surfacePlanet)
  }, [scene, page, visibleSpaceIds, visibleSurfaceIds, objectRevision, nodes, surfacePlanet])
  const filteredEntries = useMemo(() => filterOverviewEntries(entries, enabled), [entries, enabled])

  const toggleFilter = (id: OverviewFilterId) => setEnabledByScope((current) => {
    const selected = new Set(current[scope] ?? [])
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    return { ...current, [scope]: [...selected] }
  })

  return <>
    <div className="tab-row overview-tabs" role="tablist" aria-label="总览页面">
      <button type="button" role="tab" aria-selected={page === 'assets'} className={`tab ${page === 'assets' ? 'active' : ''}`} onClick={() => setPage('assets')}>资产</button>
      <button type="button" role="tab" aria-selected={page === 'objects'} className={`tab ${page === 'objects' ? 'active' : ''}`} onClick={() => setPage('objects')}>对象</button>
    </div>
    <div className="overview-filter-group" aria-label={`${page === 'assets' ? '资产' : '对象'}筛选器`}>
      {filters.map((filter) => <button
        type="button"
        key={filter.id}
        className={`overview-filter ${enabled.has(filter.id) ? 'is-on' : ''}`}
        aria-pressed={enabled.has(filter.id)}
        onClick={() => toggleFilter(filter.id)}
        title={filter.title}
        style={{ '--filter-color': filter.color } as CSSProperties}
      ><span className="overview-filter-light" aria-hidden="true" />{filter.label}</button>)}
    </div>
    <div className="section-label overview-section-label">
      {page === 'assets' ? (scene === 'system' ? '玩家资产' : '地表资产') : '当前视野对象'}
      <span>{filteredEntries.length} / {entries.length}</span>
    </div>
    <OverviewList
      entries={filteredEntries}
      resetKey={`${scope}:${[...enabled].sort().join(',')}`}
      selectedIds={selectedIds}
      onSelect={onSelect}
      onDoubleClick={(entry) => {
        if (scene === 'system' && page === 'assets' && entry.category === 'planet') onEnterSurface(entry.id)
        else onFocusObject(entry.id)
      }}
    />
  </>
}
