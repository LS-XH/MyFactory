import { useEffect, useState, type CSSProperties } from 'react'
import { CircleHelp, GitBranch, Maximize2, Orbit, Pencil, Pickaxe, SlidersHorizontal, Sparkles, Target, X } from 'lucide-react'
import { ICON_SIZES, UI_COLORS } from '../../config/visualTokens'
import { resolveItemColor } from '../../shared/icons/itemVisualRegistry'
import { content, getFactory, getItem, getRecipe, type FactoryDefinition, type FactoryNodeState } from '../../domain/content'
import { formulasForFactory } from '../../domain/surfaceContent'
import { findCelestialObject, getResourcePoints, getStar } from '../../domain/spaceMap'
import { useGameStore, type SceneId } from '../../state/gameStore'
import { getOrbitalDisplayInfo, objectRepository, type DamageableCapability } from '../../domain/objects'
import { getFactionDisplayName, PLAYER_FACTION_ID } from '../../domain/factions'
import { EntityIcon } from '../../shared/icons/EntityIcon'
import { ItemGlyph } from '../../shared/icons/ItemGlyph'
import { FactoryGlyph } from '../../shared/icons/FactoryGlyph'
import { resolveEntityVisualColor } from '../../shared/icons/entityVisualRegistry'
import { ShipInspector } from './ShipInspector'
import { buildShipInspectorData, type ShipInspectorData } from './shipInspectorModel'
import { TaskQueuePanel } from './TaskQueuePanel'
import type { FocusedTask } from '../space-map/types'

type InspectorProps = {
  selectedId: string | null
  focusedTask: FocusedTask | null
  scene: SceneId
  onClose: () => void
  onNotify: (message: string) => void
  onEnterSurface: (id: string) => void
}

export function Inspector({ selectedId, focusedTask, scene, onClose, onNotify, onEnterSurface }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'tasks'>('details')
  useEffect(() => { setActiveTab(focusedTask?.objectId === selectedId ? 'tasks' : 'details') }, [selectedId, focusedTask?.requestId])
  useGameStore((state) => state.objectRevision)
  const starAuLengthFactor = useGameStore((state) => state.starAuLengthFactor)
  useGameStore((state) => state.resourceReserves)
  const nodes = useGameStore((state) => state.nodes)
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const node = nodes.find((item) => item.id === selectedId)
  const factory = node && getFactory(node.factoryId)
  const spaceDetails = selectedId ? resolveSpaceInspectorDetails(selectedId, surfacePlanet, starAuLengthFactor) : undefined
  const title = factory?.name ?? spaceDetails?.name ?? '未知对象'
  const canRename = (spaceDetails?.kind === 'ship' || spaceDetails?.kind === 'station') && spaceDetails.ownerFactionId === PLAYER_FACTION_ID
  const hasTaskQueue = spaceDetails?.kind === 'ship' || spaceDetails?.kind === 'station'
  return <>{selectedId ? <><div className="inspector-head"><div><small>OBJECT INSPECTOR / 04</small>{canRename ? <EditableOrbitalName key={`heading-${selectedId}`} id={selectedId} name={title} heading /> : <h2>{title}</h2>}</div><button className="icon-button" onClick={onClose}><X size={ICON_SIZES.topBar} /></button></div><div className="inspector-tabs"><button className={activeTab === 'details' ? 'active' : ''} onClick={() => setActiveTab('details')}>详情</button>{hasTaskQueue && <button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}>任务队列</button>}</div>{activeTab === 'tasks' && hasTaskQueue ? <TaskQueuePanel objectId={selectedId} focusedTaskId={focusedTask?.objectId === selectedId ? focusedTask.taskId : undefined} /> : factory ? <FactoryInspector node={node!} factory={factory} onNotify={onNotify} /> : spaceDetails ? <SpaceInspector key={spaceDetails.id} details={spaceDetails} onEnterSurface={onEnterSurface} /> : <UnknownObjectInspector selectedId={selectedId} />}</> : <EmptyInspector scene={scene} />}</>
}

function EmptyInspector({ scene }: { scene: SceneId }) {
  return <div className="empty-inspector"><div className="crosshair"><Target size={21} /></div><strong>未选择对象</strong><p>{scene === 'system' ? '选择恒星系内的资产查看详细状态' : '选择生产设备查看配方、库存与操作'}</p><div className="empty-divider" /><small>TIP 右键对象可快速调用操作菜单</small></div>
}

function FactoryInspector({ node, factory, onNotify }: { node: FactoryNodeState; factory: FactoryDefinition; onNotify: (message: string) => void }) {
  const setNodeRecipe = useGameStore((state) => state.setNodeRecipe)
  const formulas = formulasForFactory(factory.id)
  const recipe = getRecipe(node.recipeId ?? factory.recipe ?? '')
  const Factory = ({ size }: { size: number }) => <FactoryGlyph factoryId={factory.id} size={size} fallbackCategoryIcon={content.factoryTypes.find((type) => type.id === factory.type)?.icon} />
  return <div className="inspector-content"><div className="object-identity"><span className="large-object-icon" style={{ '--node-color': factory.color } as CSSProperties}><Factory size={ICON_SIZES.inspector} /></span><div><strong>{factory.name}</strong><small>{content.factoryTypes.find((type) => type.id === factory.type)?.label} · NODE-{node.id.slice(-3).toUpperCase()}</small></div><span className={`status-tag ${node.status}`}>{node.status === 'online' ? '运行中' : node.status === 'blocked' ? '堵塞' : '待机'}</span></div><div className="metric-grid"><Metric label="生产进度" value={`${Math.round(node.progress * 100)}%`} /><Metric label="缓存库存" value={node.surfaceId ? `${node.buffer.toFixed(0)} 件` : `${node.buffer.toFixed(0)} / ${factory.capacity ?? 20}`} /><Metric label="输入速率" value={`${factory.rate?.toFixed(1) ?? '—'} /s`} /><Metric label="功率负载" value={factory.power ? `${factory.power} kW` : '—'} /></div>{node.surfaceId && <div className="info-list">{Object.entries(node.inventory ?? {}).filter(([, count]) => count > 0).map(([item, count]) => <div key={item}><span>{getItem(item)?.name ?? item}</span><strong>{count} 件</strong></div>)}</div>}{formulas.length > 1 && <label className="surface-recipe-select">生产配方 <select value={node.recipeId ?? factory.recipe} onChange={(event) => setNodeRecipe(node.id, event.target.value)}>{formulas.map(([id, formula]) => <option key={id} value={id}>{formula.displayName}</option>)}</select></label>}{recipe && <div className="recipe-card"><div className="card-heading"><span>当前配方</span><button onClick={() => onNotify('配方已置顶到操作台')}><Maximize2 size={13} /></button></div><strong>{recipe.name}</strong><div className="recipe-flow">{recipe.inputs.map((input) => <ItemChip key={input.item} itemId={input.item} amount={input.amount} />)}<span>→</span>{recipe.outputs.map((output) => <ItemChip key={output.item} itemId={output.item} amount={output.amount} />)}</div>{recipe.duration > 0 && <small>周期 {recipe.duration}s · 自动运行</small>}</div>}<div className="inspector-actions"><button onClick={() => onNotify('物流配置已打开')}><GitBranch size={ICON_SIZES.action} />配置物流</button><button onClick={() => onNotify('设备已切换为维护模式')}><SlidersHorizontal size={ICON_SIZES.action} />维护模式</button></div></div>
}

type SpaceInspectorDetails = {
  id: string
  definitionId?: string
  ownerFactionId?: string
  kind: 'star' | 'planet' | 'moon' | 'station' | 'ship' | 'resource'
  name: string
  subtitle: string
  status: string
  color: string
  metrics: { label: string; value: string }[]
  facts: { label: string; value: string }[]
  ship?: ShipInspectorData
  surfaceTarget?: string
}

function formatNumber(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function resolveSpaceInspectorDetails(selectedId: string, surfacePlanet: string, starAuLengthFactor: number): SpaceInspectorDetails | undefined {
  const entity = objectRepository.get(selectedId)
  const celestial = entity?.kind === 'ship' || entity?.kind === 'station' ? undefined : findCelestialObject(selectedId)
  if (celestial) {
    const position = celestial.orbitalPosition
    const kindName = celestial.kind === 'star' ? '恒星系' : celestial.kind === 'planet' ? '行星' : '卫星'
    const metrics = celestial.kind === 'star'
      ? [
          { label: '行星数量', value: `${celestial.planetCount}` },
          { label: '卫星数量', value: `${celestial.satelliteCount}` },
          { label: '资源点', value: `${celestial.resourceCount}` },
          { label: '已探明储量', value: `${formatNumber(celestial.totalReserves)} t` }
        ]
      : [
          { label: '天体半径', value: position ? `${formatNumber(position.radius)} km` : '未知' },
          { label: '轨道半径', value: position ? `${formatNumber(position.orbitalRadius)} AU` : '未知' },
          { label: '公转周期', value: position ? `${formatNumber(position.orbitalPeriod)} s` : '未知' },
          { label: '卫星数量', value: `${celestial.satelliteCount}` }
        ]
    const facts = celestial.kind === 'star'
      ? [
          { label: '恒星类型', value: celestial.typeName },
          { label: '星图坐标', value: celestial.mapPosition ? `X ${formatNumber(celestial.mapPosition.x)} / Y ${formatNumber(celestial.mapPosition.y)} AU` : '未知' },
          { label: '对象编号', value: celestial.id }
        ]
      : [
          { label: '天体类型', value: celestial.typeName },
          { label: '所属恒星系', value: celestial.starName },
          { label: celestial.kind === 'moon' ? '环绕天体' : '资源点', value: celestial.kind === 'moon' ? (celestial.parentName ?? '未知') : `${celestial.resourceCount}` },
          { label: '已探明储量', value: `${formatNumber(celestial.totalReserves)} t` },
          { label: '对象编号', value: celestial.id }
        ]
    return {
      id: celestial.id,
      kind: celestial.kind,
      name: celestial.displayName,
      subtitle: `${kindName} · ${celestial.typeName}`,
      status: celestial.kind === 'star' ? '稳定' : '已扫描',
      color: celestial.kind === 'star' ? UI_COLORS.starInfo : celestial.kind === 'planet' ? UI_COLORS.planetInfo : UI_COLORS.moonInfo,
      metrics,
      facts,
      surfaceTarget: celestial.hasSurface ? celestial.id : undefined
    }
  }

  if (entity && (entity.kind === 'ship' || entity.kind === 'station')) {
    const isStation = entity.kind === 'station'
    const { modelName, typeName } = getOrbitalDisplayInfo(entity)
    const damage = entity.getCapability<DamageableCapability>('damageable')
    const hp = entity.staticData.HP as { shieldHP?: { maxHp?: number }; armorHP?: { maxHp?: number }; structureHP?: { maxHp?: number } } | undefined
    const percent = (current: number | undefined, maximum: number | undefined) => `${Math.round((current ?? 0) / Math.max(maximum ?? 0, 1) * 100)}%`
    return {
      id: entity.id,
      definitionId: entity.definitionId,
      ownerFactionId: entity.ownerFactionId,
      kind: entity.kind,
      name: entity.displayName,
      subtitle: `${modelName} · ${typeName}`,
      status: entity.state.status === 'destroyed' ? '已摧毁' : '在线',
      color: resolveEntityVisualColor(entity.kind, entity.ownerFactionId),
      ship: entity.kind === 'ship' ? buildShipInspectorData(entity as typeof entity & { kind: 'ship' }, starAuLengthFactor) : undefined,
      metrics: [
        { label: '护盾', value: percent(damage?.shieldHp, hp?.shieldHP?.maxHp) },
        { label: '装甲', value: percent(damage?.armorHp, hp?.armorHP?.maxHp) },
        { label: '结构', value: percent(damage?.structureHp, hp?.structureHP?.maxHp) },
        { label: isStation ? '停泊位' : '航行状态', value: isStation ? String(entity.staticData.dockingCapacity ?? '—') : String(entity.getCapability<{ speed: number }>('movement')?.speed ?? 0) }
      ],
      facts: [
        ...(isStation ? [
          { label: '生产商', value: getFactionDisplayName(typeof entity.staticData.faction === 'string' ? entity.staticData.faction : undefined) },
          { label: '所属势力', value: getFactionDisplayName(entity.ownerFactionId) }
        ] : []),
        { label: '轨道位置', value: `${getStar(String(entity.staticData.starId))?.displayName ?? entity.staticData.starId} / ORBIT ${entity.staticData.orbit}` },
        { label: '通信延迟', value: typeof entity.staticData.communicationDelayMs === 'number' ? `${entity.staticData.communicationDelayMs} ms` : '—' },
        { label: '对象编号', value: entity.id }
      ]
    }
  }

  const legacyBody = content.starSystem.bodies.find((item) => item.id === selectedId) as { id: string; name: string; color: string; status: string; population: string; orbit: number; hasSurface: boolean } | undefined
  if (legacyBody) return {
    id: legacyBody.id,
    kind: 'planet',
    name: legacyBody.name,
    subtitle: `行星 · ${legacyBody.status}`,
    status: '已扫描',
    color: legacyBody.color,
    metrics: [{ label: '轨道序号', value: `${legacyBody.orbit}` }, { label: '人口', value: legacyBody.population }, { label: '地表状态', value: legacyBody.hasSurface ? '可进入' : '不可进入' }, { label: '通信延迟', value: '24 ms' }],
    facts: [{ label: '所属恒星系', value: content.starSystem.name }, { label: '对象编号', value: legacyBody.id }],
    surfaceTarget: legacyBody.hasSurface ? legacyBody.id : undefined
  }

  const [resourceStarId, ...resourcePath] = surfacePlanet.split('/')
  const resourcePlanetId = resourcePath.join('/')
  const resource = getResourcePoints(resourceStarId, resourcePlanetId).find((item) => item.id === selectedId)
  const remaining = resource ? useGameStore.getState().resourceReserves[resource.id] ?? resource.reserves : 0
  if (resource) return {
    id: resource.id,
    kind: 'resource',
    name: resource.resourceTypeName,
    subtitle: `地表资源点 · ${resource.item}`,
    status: '可开采',
    color: UI_COLORS.mining,
    metrics: [{ label: '储量', value: `${formatNumber(remaining)} t` }, { label: '资源物', value: resource.item }, { label: '地表 X', value: `${Math.round(resource.position.x)} km` }, { label: '地表 Y', value: `${Math.round(resource.position.y)} km` }],
    facts: [{ label: '资源类型', value: resource.resourceTypeName }, { label: '所属行星', value: resourcePlanetId }, { label: '对象编号', value: resource.id }]
  }
  return undefined
}

function EditableOrbitalName({ id, name, heading = false }: { id: string; name: string; heading?: boolean }) {
  const [draftName, setDraftName] = useState<string | null>(null)
  const renameOrbitalObject = useGameStore((state) => state.renameOrbitalObject)
  const className = `object-name-row${draftName !== null ? ' is-editing' : ''}${heading ? ' is-heading' : ''}`
  const content = draftName === null
    ? <button className="object-name-button" type="button" aria-label={`重命名${name}`} onClick={() => setDraftName(name)}><span className="object-name-text">{name}</span><Pencil className="object-name-pencil" size={12} aria-hidden="true" /></button>
    : <><input className="object-name-input" aria-label="对象名称" value={draftName} autoFocus onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraftName(event.target.value)} onBlur={() => setDraftName(null)} onKeyDown={(event) => {
      if (event.key === 'Escape') { setDraftName(null); return }
      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
      if (renameOrbitalObject(id, draftName)) setDraftName(null)
    }} /><Pencil className="object-name-pencil" size={12} aria-hidden="true" /></>
  return heading ? <h2 className={className}>{content}</h2> : <div className={className}>{content}</div>
}

function SpaceInspector({ details, onEnterSurface }: { details: SpaceInspectorDetails; onEnterSurface: (id: string) => void }) {
  const canRename = (details.kind === 'ship' || details.kind === 'station') && details.ownerFactionId === PLAYER_FACTION_ID
  const Icon = details.kind === 'star' ? Sparkles : details.kind === 'resource' ? Pickaxe : Orbit
  const identityIcon = details.kind === 'ship' || details.kind === 'station'
    ? <EntityIcon kind={details.kind} definitionId={details.definitionId} ownerFactionId={details.ownerFactionId} size={ICON_SIZES.inspector} />
    : <Icon size={ICON_SIZES.inspector} />
  return <div className="inspector-content">
    <div className="object-identity">
      <span className="large-object-icon" style={{ '--node-color': details.color } as CSSProperties}>{identityIcon}</span>
      <div className="object-name-block">
        {canRename ? <EditableOrbitalName id={details.id} name={details.name} /> : <strong>{details.name}</strong>}
        <small>{details.subtitle}</small>
      </div>
      <span className="status-tag online">{details.status}</span>
    </div>
    {details.ship ? <ShipInspector data={details.ship} facts={details.facts} /> : <>
      <div className="metric-grid">{details.metrics.map((metric) => <Metric key={metric.label} label={metric.label} value={metric.value} />)}</div>
      <div className="info-list">{details.facts.map((fact) => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>)}</div>
    </>}
    {details.surfaceTarget && <button className="enter-surface-button" onClick={() => onEnterSurface(details.surfaceTarget!)}><Orbit size={ICON_SIZES.action} />进入地表操作视图 <span>↗</span></button>}
  </div>
}

function UnknownObjectInspector({ selectedId }: { selectedId: string }) {
  return <div className="empty-inspector"><div className="crosshair"><CircleHelp size={21} /></div><strong>对象资料不可用</strong><p>已选择 {selectedId}，但静态内容中没有对应定义。</p></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

function ItemChip({ itemId, amount }: { itemId: string; amount: number }) {
  const item = getItem(itemId)
  return <span className="item-chip" style={{ '--item-color': resolveItemColor(itemId, item) } as CSSProperties}><ItemGlyph itemId={itemId} item={item} variant="chip" /><small>×{amount}</small></span>
}
