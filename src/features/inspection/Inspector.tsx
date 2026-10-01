import type { CSSProperties } from 'react'
import { CircleHelp, Factory, GitBranch, Maximize2, Orbit, Pickaxe, Radio, Rocket, SlidersHorizontal, Sparkles, Target, X } from 'lucide-react'
import { ICON_SIZES, UI_COLORS } from '../../config/visualTokens'
import { content, getFactory, getItem, getRecipe, type FactoryDefinition, type FactoryNodeState } from '../../domain/content'
import { findCelestialObject, getResourcePoints, getStar } from '../../domain/spaceMap'
import { useGameStore, type SceneId } from '../../state/gameStore'
import { orbitalEntities } from '../space-map/content'

type InspectorProps = {
  selectedId: string | null
  scene: SceneId
  onClose: () => void
  onNotify: (message: string) => void
  onEnterSurface: (id: string) => void
}

export function Inspector({ selectedId, scene, onClose, onNotify, onEnterSurface }: InspectorProps) {
  const nodes = useGameStore((state) => state.nodes)
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const node = nodes.find((item) => item.id === selectedId)
  const factory = node && getFactory(node.factoryId)
  const spaceDetails = selectedId ? resolveSpaceInspectorDetails(selectedId, surfacePlanet) : undefined
  const title = factory?.name ?? spaceDetails?.name ?? '未知对象'
  return <>{selectedId ? <><div className="inspector-head"><div><small>OBJECT INSPECTOR / 04</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={ICON_SIZES.topBar} /></button></div><div className="inspector-tabs"><button className="active">详情</button><button>配置</button><button>日志</button></div>{factory ? <FactoryInspector node={node!} factory={factory} onNotify={onNotify} /> : spaceDetails ? <SpaceInspector details={spaceDetails} onEnterSurface={onEnterSurface} /> : <UnknownObjectInspector selectedId={selectedId} />}</> : <EmptyInspector scene={scene} />}</>
}

function EmptyInspector({ scene }: { scene: SceneId }) {
  return <div className="empty-inspector"><div className="crosshair"><Target size={21} /></div><strong>未选择对象</strong><p>{scene === 'system' ? '选择恒星系内的资产查看详细状态' : '选择生产设备查看配方、库存与操作'}</p><div className="empty-divider" /><small>TIP 右键对象可快速调用操作菜单</small></div>
}

function FactoryInspector({ node, factory, onNotify }: { node: FactoryNodeState; factory: FactoryDefinition; onNotify: (message: string) => void }) {
  const recipe = factory.recipe ? getRecipe(factory.recipe) : null
  return <div className="inspector-content"><div className="object-identity"><span className="large-object-icon" style={{ '--node-color': factory.color } as CSSProperties}><Factory size={ICON_SIZES.inspector} /></span><div><strong>{factory.name}</strong><small>{content.factoryTypes.find((type) => type.id === factory.type)?.label} · NODE-{node.id.slice(-3).toUpperCase()}</small></div><span className={`status-tag ${node.status}`}>{node.status === 'online' ? '运行中' : node.status === 'blocked' ? '堵塞' : '待机'}</span></div><div className="metric-grid"><Metric label="生产进度" value={`${Math.round(node.progress * 100)}%`} /><Metric label="缓存库存" value={`${node.buffer.toFixed(0)} / ${factory.capacity ?? 20}`} /><Metric label="输入速率" value={`${factory.rate?.toFixed(1) ?? '—'} /s`} /><Metric label="功率负载" value={factory.power ? `${factory.power} kW` : '—'} /></div>{recipe && <div className="recipe-card"><div className="card-heading"><span>当前配方</span><button onClick={() => onNotify('配方已置顶到操作台')}><Maximize2 size={13} /></button></div><strong>{recipe.name}</strong><div className="recipe-flow"><ItemChip itemId={recipe.inputs[0].item} amount={recipe.inputs[0].amount} /><span>→</span><ItemChip itemId={recipe.outputs[0].item} amount={recipe.outputs[0].amount} /></div><small>周期 {recipe.duration}s · 自动运行</small></div>}<div className="inspector-actions"><button onClick={() => onNotify('物流配置已打开')}><GitBranch size={ICON_SIZES.action} />配置物流</button><button onClick={() => onNotify('设备已切换为维护模式')}><SlidersHorizontal size={ICON_SIZES.action} />维护模式</button></div></div>
}

type SpaceInspectorDetails = {
  id: string
  kind: 'star' | 'planet' | 'moon' | 'station' | 'ship' | 'resource'
  name: string
  subtitle: string
  status: string
  color: string
  metrics: { label: string; value: string }[]
  facts: { label: string; value: string }[]
  surfaceTarget?: string
}

function formatNumber(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function resolveSpaceInspectorDetails(selectedId: string, surfacePlanet: string): SpaceInspectorDetails | undefined {
  const celestial = findCelestialObject(selectedId)
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

  const entity = orbitalEntities.find((item) => item.id === selectedId)
  if (entity) {
    const isStation = entity.kind === 'station'
    return {
      id: entity.id,
      kind: entity.kind,
      name: entity.name,
      subtitle: isStation ? 'Fortizar · 轨道空间站' : '伊米卡斯级 · 侦察护卫舰',
      status: '在线',
      color: isStation ? UI_COLORS.station : UI_COLORS.ship,
      metrics: isStation
        ? [{ label: '护盾', value: '100%' }, { label: '装甲', value: '86%' }, { label: '结构', value: '100%' }, { label: '停泊位', value: '12' }]
        : [{ label: '护盾', value: '100%' }, { label: '装甲', value: '86%' }, { label: '结构', value: '100%' }, { label: '航行状态', value: '巡航' }],
      facts: [
        { label: '所属势力', value: entity.faction },
        { label: '轨道位置', value: `${getStar(entity.starId)?.displayName ?? entity.starId} / ORBIT ${entity.orbit}` },
        { label: '通信延迟', value: '24 ms' },
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

  const resourcePlanetId = surfacePlanet === 'aurelia' ? 'Earth' : surfacePlanet
  const resource = getResourcePoints('Solar', resourcePlanetId).find((item) => item.id === selectedId)
  if (resource) return {
    id: resource.id,
    kind: 'resource',
    name: resource.resourceTypeName,
    subtitle: `地表资源点 · ${resource.item}`,
    status: '可开采',
    color: UI_COLORS.mining,
    metrics: [{ label: '储量', value: `${formatNumber(resource.reserves)} t` }, { label: '资源物', value: resource.item }, { label: '地表 X', value: `${formatNumber(resource.position.x)} km` }, { label: '地表 Y', value: `${formatNumber(resource.position.y)} km` }],
    facts: [{ label: '资源类型', value: resource.resourceTypeName }, { label: '所属行星', value: resourcePlanetId }, { label: '对象编号', value: resource.id }]
  }
  return undefined
}

function SpaceInspector({ details, onEnterSurface }: { details: SpaceInspectorDetails; onEnterSurface: (id: string) => void }) {
  const Icon = details.kind === 'star' ? Sparkles : details.kind === 'station' ? Radio : details.kind === 'ship' ? Rocket : details.kind === 'resource' ? Pickaxe : Orbit
  return <div className="inspector-content"><div className="object-identity"><span className="large-object-icon" style={{ '--node-color': details.color } as CSSProperties}><Icon size={ICON_SIZES.inspector} /></span><div><strong>{details.name}</strong><small>{details.subtitle}</small></div><span className="status-tag online">{details.status}</span></div><div className="metric-grid">{details.metrics.map((metric) => <Metric key={metric.label} label={metric.label} value={metric.value} />)}</div><div className="info-list">{details.facts.map((fact) => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>)}</div>{details.surfaceTarget && <button className="enter-surface-button" onClick={() => onEnterSurface(details.surfaceTarget!)}><Orbit size={ICON_SIZES.action} />进入地表操作视图 <span>↗</span></button>}</div>
}

function UnknownObjectInspector({ selectedId }: { selectedId: string }) {
  return <div className="empty-inspector"><div className="crosshair"><CircleHelp size={21} /></div><strong>对象资料不可用</strong><p>已选择 {selectedId}，但静态内容中没有对应定义。</p></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

function ItemChip({ itemId, amount }: { itemId: string; amount: number }) {
  const item = getItem(itemId)
  return <span className="item-chip" style={{ '--item-color': item?.color } as CSSProperties}><span>{item?.symbol}</span><small>×{amount}</small></span>
}
