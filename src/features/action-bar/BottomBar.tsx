import { useState, type CSSProperties } from 'react'
import { Activity, MoreHorizontal, Radio, SlidersHorizontal, Truck, type LucideIcon } from 'lucide-react'
import { ICON_SIZES } from '../../config/visualTokens'
import { content, surfaceFactoryDefinitions } from '../../domain/content'
import type { SceneId } from '../../state/gameStore'
import { resolveFactoryIcon } from '../../shared/icons/iconRegistry'
import { FactoryGlyph } from '../../shared/icons/FactoryGlyph'
import { ORBITAL_BUILD_CATEGORIES } from './catalog'
import { isPlayerControllable, objectRepository } from '../../domain/objects'
import { resolveObjectActionIcon } from './objectActionIcons'
import { SURFACE_FACTORY_DRAG_TYPE } from '../surface/buildDrag'
import './bottomBar.css'

type OrbitalCategory = keyof typeof ORBITAL_BUILD_CATEGORIES

function ObjectActionButton({ label, Icon, active, onClick }: { label: string; Icon: LucideIcon; active?: boolean; onClick: () => void }) {
  return <button
    type="button"
    className={`object-action-button ${active ? 'targeting-active' : ''}`}
    aria-label={label}
    aria-pressed={active}
    data-tooltip={label}
    onClick={onClick}
  ><Icon size={ICON_SIZES.objectAction} aria-hidden="true" /></button>
}

type BottomBarProps = {
  scene: SceneId
  selectedId: string | null
  speed: 0 | 1 | 2
  onSpeed: (speed: 0 | 1 | 2) => void
  onScene: (scene: SceneId) => void
  onBuildDragStart: (factoryId: string) => void
  onBuildDragEnd: () => void
  onAction: (actionId: string) => void
  selectedIds: string[]
  pendingActionId: string | null
}

export function BottomBar({ scene, selectedId, selectedIds, pendingActionId, speed, onSpeed, onBuildDragStart, onBuildDragEnd, onAction }: BottomBarProps) {
  const [category, setCategory] = useState('production')
  const [orbitalCategory, setOrbitalCategory] = useState<OrbitalCategory>('station')
  const types = content.factoryTypes
  const visibleFactories = surfaceFactoryDefinitions.filter((factory) => scene === 'surface' && (factory.type === category || category === 'all'))
  const orbitalDefinition = ORBITAL_BUILD_CATEGORIES[orbitalCategory]
  const OrbitalIcon = orbitalCategory === 'station' ? Radio : Truck
  const actions = objectRepository.actionsFor(selectedIds)
  const canControlSelection = selectedIds.every((id) => isPlayerControllable(objectRepository.get(id)))
  return <div className="bottom-bar">
    <div className="bottom-context"><span className="scene-kicker">{selectedId ? 'OBJECT ACTIONS' : scene === 'system' ? 'ORBITAL BUILD' : 'SURFACE BUILD'}</span><strong>{selectedId ? '已选中对象 · 可用操作' : scene === 'system' ? '轨道设施与交通' : '地表生产设施'}</strong></div>
    {selectedId
      ? <div className="selected-actions">{actions.map((action) => <ObjectActionButton key={action.id} label={action.label} Icon={resolveObjectActionIcon(action.id)} active={pendingActionId === action.id} onClick={() => onAction(action.id)} />)}{canControlSelection && <><ObjectActionButton label="配置" Icon={SlidersHorizontal} onClick={() => onAction('configure')} /><ObjectActionButton label="更多" Icon={MoreHorizontal} onClick={() => onAction('more')} /></>}</div>
      : scene === 'system'
        ? <div className="build-palette"><div className="palette-categories"><button className={orbitalCategory === 'station' ? 'active' : ''} onClick={() => setOrbitalCategory('station')}><Radio size={ICON_SIZES.category} />空间站</button><button className={orbitalCategory === 'transport' ? 'active' : ''} onClick={() => setOrbitalCategory('transport')}><Truck size={ICON_SIZES.category} />交通</button></div><div className="palette-items">{orbitalDefinition.options.map((option) => <button className="build-item" key={option} title="预留建造项目"><span className="palette-icon" style={{ '--node-color': orbitalDefinition.color } as CSSProperties}><OrbitalIcon size={ICON_SIZES.node} /></span>{option}<small>LOCKED</small></button>)}</div></div>
        : <div className="build-palette"><div className="palette-categories">{types.map((type) => { const Icon = resolveFactoryIcon(type.icon); return <button className={category === type.id ? 'active' : ''} key={type.id} onClick={() => setCategory(type.id)}><Icon size={ICON_SIZES.category} />{type.label}</button> })}</div><div className="palette-items">{visibleFactories.map((factory) => <button className="build-item" key={factory.id} draggable={factory.status === '可用'} title={factory.status === '可用' ? '拖拽到地表建造' : '尚未解锁'} onDragStart={(event) => { if (factory.status !== '可用') { event.preventDefault(); return } event.dataTransfer.setData(SURFACE_FACTORY_DRAG_TYPE, factory.id); event.dataTransfer.effectAllowed = 'copy'; onBuildDragStart(factory.id) }} onDragEnd={onBuildDragEnd}><span className="palette-icon" style={{ '--node-color': factory.color } as CSSProperties}><FactoryGlyph factoryId={factory.id} size={ICON_SIZES.node} fallbackCategoryIcon={types.find((type) => type.id === factory.type)?.icon} /></span>{factory.name}{factory.status !== '可用' && <small>LOCKED</small>}</button>)}</div></div>}
    <div className="sim-controls"><span className="sim-label"><Activity size={ICON_SIZES.category} />SIM</span><button className={speed === 0 ? 'active' : ''} onClick={() => onSpeed(0)}>Ⅱ</button><button className={speed === 1 ? 'active' : ''} onClick={() => onSpeed(1)}>1×</button><button className={speed === 2 ? 'active' : ''} onClick={() => onSpeed(2)}>2×</button></div><div className="bar-corner" />
  </div>
}
