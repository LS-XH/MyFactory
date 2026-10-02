import { useState, type CSSProperties } from 'react'
import { Activity, Factory, MoreHorizontal, Radio, SlidersHorizontal, Truck } from 'lucide-react'
import { ICON_SIZES } from '../../config/visualTokens'
import { content } from '../../domain/content'
import type { SceneId } from '../../state/gameStore'
import { resolveFactoryIcon } from '../../shared/icons/iconRegistry'
import { ORBITAL_BUILD_CATEGORIES } from './catalog'
import { isPlayerControllable, objectRepository } from '../../domain/objects'
import { resolveObjectActionIcon } from './objectActionIcons'

type OrbitalCategory = keyof typeof ORBITAL_BUILD_CATEGORIES

type BottomBarProps = {
  scene: SceneId
  selectedId: string | null
  speed: 0 | 1 | 2
  onSpeed: (speed: 0 | 1 | 2) => void
  onScene: (scene: SceneId) => void
  onAdd: (factoryId: string) => void
  onAction: (actionId: string) => void
  selectedIds: string[]
}

export function BottomBar({ scene, selectedId, selectedIds, speed, onSpeed, onAdd, onAction }: BottomBarProps) {
  const [category, setCategory] = useState('production')
  const [orbitalCategory, setOrbitalCategory] = useState<OrbitalCategory>('station')
  const types = content.factoryTypes
  const visibleFactories = content.factories.filter((factory) => scene === 'surface' && (factory.type === category || category === 'all'))
  const orbitalDefinition = ORBITAL_BUILD_CATEGORIES[orbitalCategory]
  const OrbitalIcon = orbitalCategory === 'station' ? Radio : Truck
  const actions = objectRepository.actionsFor(selectedIds)
  const canControlSelection = selectedIds.every((id) => isPlayerControllable(objectRepository.get(id)))
  return <div className="bottom-bar">
    <div className="bottom-context"><span className="scene-kicker">{selectedId ? 'OBJECT ACTIONS' : scene === 'system' ? 'ORBITAL BUILD' : 'SURFACE BUILD'}</span><strong>{selectedId ? '已选中对象 · 可用操作' : scene === 'system' ? '轨道设施与交通' : '地表生产设施'}</strong></div>
    {selectedId
      ? <div className="selected-actions">{actions.map((action) => { const Icon = resolveObjectActionIcon(action.id); return <button key={action.id} onClick={() => onAction(action.id)}><Icon size={ICON_SIZES.action} />{action.label}</button> })}{canControlSelection && <><button onClick={() => onAction('configure')}><SlidersHorizontal size={ICON_SIZES.action} />配置</button><button onClick={() => onAction('more')}><MoreHorizontal size={ICON_SIZES.action} />更多</button></>}</div>
      : scene === 'system'
        ? <div className="build-palette"><div className="palette-categories"><button className={orbitalCategory === 'station' ? 'active' : ''} onClick={() => setOrbitalCategory('station')}><Radio size={ICON_SIZES.category} />空间站</button><button className={orbitalCategory === 'transport' ? 'active' : ''} onClick={() => setOrbitalCategory('transport')}><Truck size={ICON_SIZES.category} />交通</button></div><div className="palette-items">{orbitalDefinition.options.map((option) => <button className="build-item" key={option} title="预留建造项目"><span className="palette-icon" style={{ '--node-color': orbitalDefinition.color } as CSSProperties}><OrbitalIcon size={ICON_SIZES.node} /></span>{option}<small>LOCKED</small></button>)}</div></div>
        : <div className="build-palette"><div className="palette-categories">{types.map((type) => { const Icon = resolveFactoryIcon(type.icon); return <button className={category === type.id ? 'active' : ''} key={type.id} onClick={() => setCategory(type.id)}><Icon size={ICON_SIZES.category} />{type.label}</button> })}</div><div className="palette-items">{visibleFactories.map((factory) => <button className="build-item" key={factory.id} onClick={() => factory.status === '可用' && onAdd(factory.id)}><span className="palette-icon" style={{ '--node-color': factory.color } as CSSProperties}><Factory size={ICON_SIZES.node} /></span>{factory.name}{factory.status !== '可用' && <small>LOCKED</small>}</button>)}</div></div>}
    <div className="sim-controls"><span className="sim-label"><Activity size={ICON_SIZES.category} />SIM</span><button className={speed === 0 ? 'active' : ''} onClick={() => onSpeed(0)}>Ⅱ</button><button className={speed === 1 ? 'active' : ''} onClick={() => onSpeed(1)}>1×</button><button className={speed === 2 ? 'active' : ''} onClick={() => onSpeed(2)}>2×</button></div><div className="bar-corner" />
  </div>
}
