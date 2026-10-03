import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Orbit, Pickaxe } from 'lucide-react'
import { OVERVIEW_VISUAL } from '../../config/overviewVisuals'
import { ICON_SIZES } from '../../config/visualTokens'
import { EntityIcon } from '../../shared/icons/EntityIcon'
import { GalaxyIcon } from '../../shared/icons/GalaxyIcon'
import { FactoryGlyph } from '../../shared/icons/FactoryGlyph'
import type { OverviewEntry } from './overviewModel'

type OverviewListProps = {
  entries: OverviewEntry[]
  resetKey: string
  selectedIds: string[]
  onSelect: (entry: OverviewEntry, additive: boolean, appendTask: boolean) => void
  onDoubleClick: (entry: OverviewEntry) => void
}

function OverviewRow({ entry, selected, onSelect, onDoubleClick }: {
  entry: OverviewEntry
  selected: boolean
  onSelect: (entry: OverviewEntry, additive: boolean, appendTask: boolean) => void
  onDoubleClick: (entry: OverviewEntry) => void
}) {
  const icon = entry.category === 'ship' || entry.category === 'station'
    ? <EntityIcon kind={entry.category} definitionId={entry.definitionId} ownerFactionId={entry.ownerFactionId} size={ICON_SIZES.asset} />
    : entry.category === 'factory' ? <FactoryGlyph factoryId={entry.definitionId ?? entry.id} size={ICON_SIZES.asset} />
      : entry.category === 'resource' ? <Pickaxe size={ICON_SIZES.asset} />
        : entry.celestialKind === 'star' ? <GalaxyIcon size={ICON_SIZES.asset} />
          : <Orbit size={ICON_SIZES.asset} />

  return <button
    className={`asset-item overview-item ${selected ? 'selected' : ''}`}
    style={{ height: OVERVIEW_VISUAL.rowHeight }}
    onClick={(event) => onSelect(entry, event.ctrlKey || event.metaKey, event.shiftKey)}
    onDoubleClick={() => onDoubleClick(entry)}
    type="button"
    title={entry.name}
  >
    <span className="asset-icon" style={{ '--asset-color': entry.color } as CSSProperties}>{icon}</span>
    <span className="asset-copy"><strong>{entry.name}</strong><small>{entry.meta}</small></span>
    <span className="item-arrow">›</span>
  </button>
}

/** A fixed-height window renders only rows near the scrollbar, even with thousands of systems. */
export function OverviewList({ entries, resetKey, selectedIds, onSelect, onDoubleClick }: OverviewListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [listHeight, setListHeight] = useState<number>(OVERVIEW_VISUAL.initialListHeight)

  useEffect(() => {
    const element = scrollerRef.current
    if (!element) return
    const observer = new ResizeObserver(() => setListHeight(element.clientHeight))
    observer.observe(element)
    setListHeight(element.clientHeight)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = scrollerRef.current
    if (element) element.scrollTop = 0
    setScrollTop(0)
  }, [resetKey])

  const first = Math.max(0, Math.floor(scrollTop / OVERVIEW_VISUAL.rowHeight) - OVERVIEW_VISUAL.overscanRows)
  const last = Math.min(entries.length, Math.ceil((scrollTop + listHeight) / OVERVIEW_VISUAL.rowHeight) + OVERVIEW_VISUAL.overscanRows)
  const visible = entries.slice(first, last)

  return <div className="overview-list-scroll" ref={scrollerRef} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
    {entries.length === 0 ? <div className="overview-empty">当前筛选下没有对象</div> : <>
      <div aria-hidden="true" style={{ height: first * OVERVIEW_VISUAL.rowHeight }} />
      <div className="asset-list">{visible.map((entry) => <OverviewRow key={entry.id} entry={entry} selected={selectedIds.includes(entry.id)} onSelect={onSelect} onDoubleClick={onDoubleClick} />)}</div>
      <div aria-hidden="true" style={{ height: (entries.length - last) * OVERVIEW_VISUAL.rowHeight }} />
    </>}
  </div>
}
