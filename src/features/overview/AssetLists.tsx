import type { CSSProperties } from 'react'
import { Factory, Orbit, Radio, Rocket } from 'lucide-react'
import { ICON_SIZES, UI_COLORS } from '../../config/visualTokens'
import { getFactory } from '../../domain/content'
import { useGameStore } from '../../state/gameStore'
import type { SpaceSelectionKind } from '../space-map/types'

const SYSTEM_ASSETS = [
  { id: 'aurelia', name: '奥瑞利亚', meta: '类地行星 · 已殖民', color: UI_COLORS.planet, kind: 'body' as const },
  { id: 'station-horizon', name: '地平线 · 铁壁', meta: '空间站 · 人类联邦', color: UI_COLORS.station, kind: 'station' as const },
  { id: 'ship-imicus', name: '伊米卡斯级 · 侦察 01', meta: '护卫舰 · 运行中', color: UI_COLORS.ship, kind: 'ship' as const }
] as const

export function SystemAssetList({ onSelect, selectedId, onEnterSurface }: { onSelect: (id: string, kind: SpaceSelectionKind) => void; selectedId: string | null; onEnterSurface: (id: string) => void }) {
  return <div className="asset-list">{SYSTEM_ASSETS.map((asset) => <button className={`asset-item ${selectedId === asset.id ? 'selected' : ''}`} key={asset.id} onClick={() => onSelect(asset.id, asset.kind)} onDoubleClick={() => asset.kind === 'body' && onEnterSurface(asset.id)}><span className="asset-icon" style={{ '--asset-color': asset.color } as CSSProperties}>{asset.kind === 'body' ? <Orbit size={ICON_SIZES.asset} /> : asset.kind === 'station' ? <Radio size={ICON_SIZES.asset} /> : <Rocket size={ICON_SIZES.asset} />}</span><span className="asset-copy"><strong>{asset.name}</strong><small>{asset.meta}</small></span><span className="item-arrow">›</span></button>)}</div>
}

export function FactoryAssetList({ onSelect, selectedId }: { onSelect: (id: string, kind: 'factory') => void; selectedId: string | null }) {
  const nodes = useGameStore((state) => state.nodes)
  return <div className="asset-list">{nodes.map((node) => {
    const factory = getFactory(node.factoryId)
    return <button className={`asset-item ${selectedId === node.id ? 'selected' : ''}`} key={node.id} onClick={() => onSelect(node.id, 'factory')}><span className="asset-icon" style={{ '--asset-color': factory?.color } as CSSProperties}><Factory size={ICON_SIZES.asset} /></span><span className="asset-copy"><strong>{factory?.name}</strong><small>{node.status === 'blocked' ? '物流堵塞' : node.status === 'online' ? '运行中' : '待机'} · {node.buffer.toFixed(0)} 单位</small></span><span className={`mini-status ${node.status}`} /></button>
  })}</div>
}

