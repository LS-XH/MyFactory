import type { CSSProperties } from 'react'
import { Factory, Orbit } from 'lucide-react'
import { ICON_SIZES, UI_COLORS } from '../../config/visualTokens'
import { getFactory } from '../../domain/content'
import { getOrbitalDisplayInfo, getOrbitalObjects } from '../../domain/objects'
import { getFactionDisplayName } from '../../domain/factions'
import { useGameStore } from '../../state/gameStore'
import { EntityIcon } from '../../shared/icons/EntityIcon'
import { resolveEntityVisualColor } from '../../shared/icons/entityVisualRegistry'
import type { SpaceSelectionKind } from '../space-map/types'

const BODY_ASSETS = [
  { id: 'aurelia', name: '奥瑞利亚', meta: '类地行星 · 已殖民', color: UI_COLORS.planet, kind: 'body' as const, visualId: undefined, ownerFactionId: undefined }
]

export function SystemAssetList({ onSelect, selectedIds, onEnterSurface, onFocusObject }: { onSelect: (id: string, kind: SpaceSelectionKind, additive?: boolean) => void; selectedIds: string[]; onEnterSurface: (id: string) => void; onFocusObject: (id: string) => void }) {
  useGameStore((state) => state.objectRevision)
  const assets = [...BODY_ASSETS, ...getOrbitalObjects().map((entity) => {
    const { typeName } = getOrbitalDisplayInfo(entity)
    const metaSuffix = entity.kind === 'ship'
      ? entity.state.status === 'destroyed' ? '已摧毁' : '运行中'
      : getFactionDisplayName(entity.ownerFactionId)
    return { id: entity.id, name: entity.displayName, meta: `${typeName} · ${metaSuffix}`, color: resolveEntityVisualColor(entity.kind, entity.ownerFactionId), kind: entity.kind, visualId: entity.definitionId, ownerFactionId: entity.ownerFactionId }
  })]
  return <div className="asset-list">{assets.map((asset) => <button className={`asset-item ${selectedIds.includes(asset.id) ? 'selected' : ''}`} key={asset.id} onClick={(event) => onSelect(asset.id, asset.kind, event.ctrlKey || event.metaKey)} onDoubleClick={() => { if (asset.kind === 'body') onEnterSurface(asset.id); else onFocusObject(asset.id) }}><span className="asset-icon" style={{ '--asset-color': asset.color } as CSSProperties}>{asset.kind === 'body' ? <Orbit size={ICON_SIZES.asset} /> : <EntityIcon kind={asset.kind} definitionId={asset.visualId} ownerFactionId={asset.ownerFactionId} size={ICON_SIZES.asset} />}</span><span className="asset-copy"><strong>{asset.name}</strong><small>{asset.meta}</small></span><span className="item-arrow">›</span></button>)}</div>
}

export function FactoryAssetList({ onSelect, selectedIds }: { onSelect: (id: string, kind: 'factory', additive?: boolean) => void; selectedIds: string[] }) {
  const nodes = useGameStore((state) => state.nodes)
  return <div className="asset-list">{nodes.map((node) => {
    const factory = getFactory(node.factoryId)
    return <button className={`asset-item ${selectedIds.includes(node.id) ? 'selected' : ''}`} key={node.id} onClick={(event) => onSelect(node.id, 'factory', event.ctrlKey || event.metaKey)}><span className="asset-icon" style={{ '--asset-color': factory?.color } as CSSProperties}><Factory size={ICON_SIZES.asset} /></span><span className="asset-copy"><strong>{factory?.name}</strong><small>{node.status === 'blocked' ? '物流堵塞' : node.status === 'online' ? '运行中' : '待机'} · {node.buffer.toFixed(0)} 单位</small></span><span className={`mini-status ${node.status}`} /></button>
  })}</div>
}
