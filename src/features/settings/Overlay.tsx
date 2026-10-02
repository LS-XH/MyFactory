import { Map, Sparkles, Trash2, X } from 'lucide-react'
import { GAME_SETTING_LIMITS } from '../../config/gameplay'
import { SPACE_MAP_ZOOM } from '../../config/spaceMapVisuals'
import { ICON_SIZES } from '../../config/visualTokens'
import { useGameStore, type OverlayId } from '../../state/gameStore'

export function Overlay({ id, onClose, onNotify }: { id: OverlayId; onClose: () => void; onNotify: (message: string) => void }) {
  const reset = useGameStore((state) => state.reset)
  const title = id === 'settings' ? '系统设置' : id === 'tech' ? '科技树' : '星图'
  return <div className="overlay-backdrop" onMouseDown={onClose}><div className="overlay-card" onMouseDown={(event) => event.stopPropagation()}><div className="overlay-header"><div><small>SYSTEM MODULE / {id?.toUpperCase()}</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={ICON_SIZES.panelTitle} /></button></div>{id === 'settings' ? <SettingsOverlay onNotify={onNotify} reset={reset} /> : <PlaceholderOverlay id={id} />}</div></div>
}

function SettingsOverlay({ onNotify, reset }: { onNotify: (message: string) => void; reset: () => void }) {
  const orbitAnimation = useGameStore((state) => state.orbitAnimation)
  const celestialNamesAlwaysVisible = useGameStore((state) => state.celestialNamesAlwaysVisible)
  const objectNamesAlwaysVisible = useGameStore((state) => state.objectNamesAlwaysVisible)
  const orbitFps = useGameStore((state) => state.orbitFps)
  const starDisplayRadius = useGameStore((state) => state.starDisplayRadius)
  const planetDisplayRadius = useGameStore((state) => state.planetDisplayRadius)
  const moonDisplayRadius = useGameStore((state) => state.moonDisplayRadius)
  const orbitalEntityDisplayRadius = useGameStore((state) => state.orbitalEntityDisplayRadius)
  const overviewMarkerMinZoom = useGameStore((state) => state.overviewMarkerMinZoom)
  const objectIconMinZoom = useGameStore((state) => state.objectIconMinZoom)
  const objectIconMaxZoom = useGameStore((state) => state.objectIconMaxZoom)
  const starAuLengthFactor = useGameStore((state) => state.starAuLengthFactor)
  const planetAuLengthFactor = useGameStore((state) => state.planetAuLengthFactor)
  const moonAuLengthFactor = useGameStore((state) => state.moonAuLengthFactor)
  const toggleOrbitAnimation = useGameStore((state) => state.toggleOrbitAnimation)
  const toggleCelestialNamesAlwaysVisible = useGameStore((state) => state.toggleCelestialNamesAlwaysVisible)
  const toggleObjectNamesAlwaysVisible = useGameStore((state) => state.toggleObjectNamesAlwaysVisible)
  const setOrbitFps = useGameStore((state) => state.setOrbitFps)
  const setStarDisplayRadius = useGameStore((state) => state.setStarDisplayRadius)
  const setPlanetDisplayRadius = useGameStore((state) => state.setPlanetDisplayRadius)
  const setMoonDisplayRadius = useGameStore((state) => state.setMoonDisplayRadius)
  const setOrbitalEntityDisplayRadius = useGameStore((state) => state.setOrbitalEntityDisplayRadius)
  const setOverviewMarkerMinZoom = useGameStore((state) => state.setOverviewMarkerMinZoom)
  const setObjectIconMinZoom = useGameStore((state) => state.setObjectIconMinZoom)
  const setObjectIconMaxZoom = useGameStore((state) => state.setObjectIconMaxZoom)
  const setStarAuLengthFactor = useGameStore((state) => state.setStarAuLengthFactor)
  const setPlanetAuLengthFactor = useGameStore((state) => state.setPlanetAuLengthFactor)
  const setMoonAuLengthFactor = useGameStore((state) => state.setMoonAuLengthFactor)
  return <div className="settings-list">
    <div className="setting-row"><div><strong>轨道动画</strong><small>使用 JSON 中的公转周期推进天体运动</small></div><button className={`toggle ${orbitAnimation ? 'on' : ''}`} onClick={toggleOrbitAnimation}><span /></button></div>
    <div className="setting-row"><div><strong>星体名称常亮</strong><small>恒星、行星与卫星；关闭后仅悬浮或选中时显示</small></div><button type="button" aria-label="星体名称常亮" aria-pressed={celestialNamesAlwaysVisible} className={`toggle ${celestialNamesAlwaysVisible ? 'on' : ''}`} onClick={toggleCelestialNamesAlwaysVisible}><span /></button></div>
    <div className="setting-row"><div><strong>对象名称常亮</strong><small>飞船与空间站；关闭后仅悬浮或选中时显示</small></div><button type="button" aria-label="对象名称常亮" aria-pressed={objectNamesAlwaysVisible} className={`toggle ${objectNamesAlwaysVisible ? 'on' : ''}`} onClick={toggleObjectNamesAlwaysVisible}><span /></button></div>
    <div className="setting-row"><div><strong>目标帧率</strong><small>飞船与星体共用 · {GAME_SETTING_LIMITS.orbitFps.min}–{GAME_SETTING_LIMITS.orbitFps.max} FPS · 受屏幕刷新率限制</small></div><div className="fps-control"><input aria-label="轨道动画目标帧率" type="range" min={GAME_SETTING_LIMITS.orbitFps.min} max={GAME_SETTING_LIMITS.orbitFps.max} step={GAME_SETTING_LIMITS.orbitFps.step} value={orbitFps} onChange={(event) => setOrbitFps(event.currentTarget.valueAsNumber)} /><label><input aria-label="轨道动画帧率数值" type="number" min={GAME_SETTING_LIMITS.orbitFps.min} max={GAME_SETTING_LIMITS.orbitFps.max} step={GAME_SETTING_LIMITS.orbitFps.step} value={orbitFps} onChange={(event) => setOrbitFps(event.currentTarget.valueAsNumber)} /><span>FPS</span></label></div></div>
    <div className="setting-row celestial-radius-setting"><div><strong>天体显示半径</strong><small>1 u = 0.1 地图单位，会随视图缩放同步改变大小</small></div><div className="radius-controls"><RadiusControl label="恒星" value={starDisplayRadius} onChange={setStarDisplayRadius} /><RadiusControl label="行星" value={planetDisplayRadius} onChange={setPlanetDisplayRadius} /><RadiusControl label="卫星" value={moonDisplayRadius} onChange={setMoonDisplayRadius} /><RadiusControl label="舰船/空间站" value={orbitalEntityDisplayRadius} onChange={setOrbitalEntityDisplayRadius} /></div></div>
    <div className="setting-row"><div><strong>恒星系遮罩固定阈值</strong><small>低于该缩放倍率时，遮罩仅改变间距，不再缩小</small></div><ZoomThresholdControl value={overviewMarkerMinZoom} onChange={setOverviewMarkerMinZoom} /></div>
    <div className="setting-row"><div><strong>对象图标放大阈值</strong><small>高于该倍率时，飞船与空间站图标不再放大</small></div><ObjectIconZoomControl label="对象图标放大阈值" value={objectIconMaxZoom} minimum={objectIconMinZoom} maximum={GAME_SETTING_LIMITS.objectIconZoom.max} onChange={setObjectIconMaxZoom} /></div>
    <div className="setting-row"><div><strong>对象图标缩小阈值</strong><small>低于该倍率时，飞船与空间站图标不再缩小</small></div><ObjectIconZoomControl label="对象图标缩小阈值" value={objectIconMinZoom} minimum={GAME_SETTING_LIMITS.objectIconZoom.min} maximum={objectIconMaxZoom} onChange={setObjectIconMinZoom} /></div>
    <div className="setting-row au-factor-setting"><div><strong>Au长度系数</strong><small>JSON 中的 AU 数值 × 对应系数 = 画面长度</small></div><div className="factor-controls"><LengthFactorControl label="恒星单位长度轨道系数" value={starAuLengthFactor} onChange={setStarAuLengthFactor} /><LengthFactorControl label="行星单位长度轨道系数" value={planetAuLengthFactor} onChange={setPlanetAuLengthFactor} /><LengthFactorControl label="卫星单位长度轨道系数" value={moonAuLengthFactor} onChange={setMoonAuLengthFactor} /></div></div>
    <div className="setting-row"><div><strong>界面密度</strong><small>控制面板的间距与信息密度</small></div><span className="setting-value">紧凑</span></div>
    <div className="setting-row"><div><strong>本地存档</strong><small>每次操作自动保存到浏览器</small></div><span className="save-ok"><span className="status-dot" />已同步</span></div>
    <button className="reset-button" onClick={() => { reset(); onNotify('Demo 已恢复默认布局') }}><Trash2 size={ICON_SIZES.node} />重置 Demo 数据</button>
  </div>
}

function RadiusControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.displayRadius
  return <label><span>{label}</span><input aria-label={`${label}默认显示半径`} type="range" min={limits.min} max={limits.max} step={limits.step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><output>{value.toFixed(1)} u</output></label>
}

function ZoomThresholdControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.overviewMarkerMinZoom
  return <div className="zoom-threshold-control"><input aria-label="恒星系遮罩固定阈值" type="range" min={limits.min} max={limits.max} step={limits.step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><output>{Number((value * 100).toFixed(3))}%</output></div>
}

function ObjectIconZoomControl({ label, value, minimum, maximum, onChange }: { label: string; value: number; minimum: number; maximum: number; onChange: (value: number) => void }) {
  const levels = SPACE_MAP_ZOOM.levels
  const first = levels.findIndex((level) => level >= minimum)
  const last = levels.reduce((index, level, nextIndex) => level <= maximum ? nextIndex : index, 0)
  const current = levels.reduce((index, level, nextIndex) => Math.abs(level - value) < Math.abs(levels[index] - value) ? nextIndex : index, 0)
  return <div className="zoom-threshold-control"><input aria-label={label} type="range" min={Math.max(0, first)} max={last} step={1} value={current} onChange={(event) => onChange(levels[event.currentTarget.valueAsNumber])} /><output>{Number((value * 100).toFixed(3))}%</output></div>
}

function LengthFactorControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.auLengthFactor
  return <label><span>{label}</span><input key={value} aria-label={label} type="number" min={limits.min} max={limits.max} step="any" defaultValue={value} onBlur={(event) => onChange(event.currentTarget.valueAsNumber)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
}

function PlaceholderOverlay({ id }: { id: OverlayId }) {
  return <div className="placeholder-module"><div className="placeholder-icon">{id === 'tech' ? <Sparkles size={ICON_SIZES.placeholder} /> : <Map size={ICON_SIZES.placeholder} />}</div><strong>{id === 'tech' ? '科技网络正在编译' : '星图索引已就绪'}</strong><p>{id === 'tech' ? '研究节点、解锁条件和势力科技将在此处展开。' : '跨恒星系航线、跃迁节点和远端资产将在此处展开。'}</p><span>MODULE RESERVED · DEMO 0.1</span></div>
}
