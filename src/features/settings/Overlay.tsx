import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Map, Sparkles, Trash2, X } from 'lucide-react'
import { GAME_SETTING_LIMITS, SURFACE_VIEW } from '../../config/gameplay'
import { CAMERA_DIRECTIONS, CAMERA_DIRECTION_LABELS, displayCameraKey, isCameraKeyCode } from '../../config/cameraControls'
import { SPACE_MAP_ZOOM, zoomLevelAfter, zoomLevelBefore } from '../../config/spaceMapVisuals'
import { ICON_SIZES } from '../../config/visualTokens'
import { useGameStore, type OverlayId } from '../../state/gameStore'
import './settings.css'

type SettingsPage = 'global' | 'starMap' | 'surface' | 'shortcuts'

const settingsPages: { id: SettingsPage; label: string }[] = [
  { id: 'global', label: '全局' },
  { id: 'starMap', label: '星图' },
  { id: 'surface', label: '地表' },
  { id: 'shortcuts', label: '快捷键' }
]

export function Overlay({ id, onClose, onNotify }: { id: OverlayId; onClose: () => void; onNotify: (message: string) => void }) {
  const reset = useGameStore((state) => state.reset)
  const title = id === 'settings' ? '系统设置' : id === 'tech' ? '科技树' : '星图'
  return <div className="overlay-backdrop" onMouseDown={onClose}><div className={`overlay-card ${id === 'settings' ? 'settings-overlay-card' : ''}`} onMouseDown={(event) => event.stopPropagation()}><div className="overlay-header"><div><small>SYSTEM MODULE / {id?.toUpperCase()}</small><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={ICON_SIZES.panelTitle} /></button></div>{id === 'settings' ? <SettingsOverlay onNotify={onNotify} reset={reset} /> : <PlaceholderOverlay id={id} />}</div></div>
}

function SettingsOverlay({ onNotify, reset }: { onNotify: (message: string) => void; reset: () => void }) {
  const [page, setPage] = useState<SettingsPage>('global')
  const [displayedPage, setDisplayedPage] = useState<SettingsPage>('global')
  const [pageExiting, setPageExiting] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useGameStore((state) => state.reduceMotion)
  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current) }, [])
  const changePage = (nextPage: SettingsPage) => {
    if (nextPage === page) return
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    setPage(nextPage)
    setPageExiting(true)
    transitionTimer.current = setTimeout(() => {
      pageRef.current?.scrollTo(0, 0)
      setDisplayedPage(nextPage)
      setPageExiting(false)
      transitionTimer.current = null
    }, reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150)
  }
  const orbitAnimation = useGameStore((state) => state.orbitAnimation)
  const celestialNamesAlwaysVisible = useGameStore((state) => state.celestialNamesAlwaysVisible)
  const objectNamesAlwaysVisible = useGameStore((state) => state.objectNamesAlwaysVisible)
  const orbitFps = useGameStore((state) => state.orbitFps)
  const cameraKeyUp = useGameStore((state) => state.cameraKeyUp)
  const cameraKeyLeft = useGameStore((state) => state.cameraKeyLeft)
  const cameraKeyDown = useGameStore((state) => state.cameraKeyDown)
  const cameraKeyRight = useGameStore((state) => state.cameraKeyRight)
  const cameraMoveSpeed = useGameStore((state) => state.cameraMoveSpeed)
  const cameraBoostSpeed = useGameStore((state) => state.cameraBoostSpeed)
  const inventoryScale = useGameStore((state) => state.inventoryScale)
  const movementArrivalToleranceAu = useGameStore((state) => state.movementArrivalToleranceAu)
  const kmToAu = useGameStore((state) => state.kmToAu)
  const starMapGridSpacingAu = useGameStore((state) => state.starMapGridSpacingAu)
  const starMapGridFadeStartZoom = useGameStore((state) => state.starMapGridFadeStartZoom)
  const starMapGridFadeEndZoom = useGameStore((state) => state.starMapGridFadeEndZoom)
  const starDisplayRadius = useGameStore((state) => state.starDisplayRadius)
  const planetDisplayRadius = useGameStore((state) => state.planetDisplayRadius)
  const moonDisplayRadius = useGameStore((state) => state.moonDisplayRadius)
  const orbitalEntityDisplayRadius = useGameStore((state) => state.orbitalEntityDisplayRadius)
  const overviewMarkerMinZoom = useGameStore((state) => state.overviewMarkerMinZoom)
  const overviewFadeStartZoom = useGameStore((state) => state.overviewFadeStartZoom)
  const overviewFadeEndZoom = useGameStore((state) => state.overviewFadeEndZoom)
  const systemFadeStartZoom = useGameStore((state) => state.systemFadeStartZoom)
  const systemFadeEndZoom = useGameStore((state) => state.systemFadeEndZoom)
  const objectIconMinZoom = useGameStore((state) => state.objectIconMinZoom)
  const objectIconMaxZoom = useGameStore((state) => state.objectIconMaxZoom)
  const objectFocusZoom = useGameStore((state) => state.objectFocusZoom)
  const surfaceCardCompactMaxZoom = useGameStore((state) => state.surfaceCardCompactMaxZoom)
  const surfaceCardDetailMinZoom = useGameStore((state) => state.surfaceCardDetailMinZoom)
  const surfaceIconMinZoom = useGameStore((state) => state.surfaceIconMinZoom)
  const starAuLengthFactor = useGameStore((state) => state.starAuLengthFactor)
  const planetAuLengthFactor = useGameStore((state) => state.planetAuLengthFactor)
  const moonAuLengthFactor = useGameStore((state) => state.moonAuLengthFactor)
  const toggleOrbitAnimation = useGameStore((state) => state.toggleOrbitAnimation)
  const toggleReduceMotion = useGameStore((state) => state.toggleReduceMotion)
  const toggleCelestialNamesAlwaysVisible = useGameStore((state) => state.toggleCelestialNamesAlwaysVisible)
  const toggleObjectNamesAlwaysVisible = useGameStore((state) => state.toggleObjectNamesAlwaysVisible)
  const setOrbitFps = useGameStore((state) => state.setOrbitFps)
  const setCameraKeyBinding = useGameStore((state) => state.setCameraKeyBinding)
  const setCameraMoveSpeed = useGameStore((state) => state.setCameraMoveSpeed)
  const setCameraBoostSpeed = useGameStore((state) => state.setCameraBoostSpeed)
  const setInventoryScale = useGameStore((state) => state.setInventoryScale)
  const setMovementArrivalToleranceAu = useGameStore((state) => state.setMovementArrivalToleranceAu)
  const setKmToAu = useGameStore((state) => state.setKmToAu)
  const setStarMapGridSpacingAu = useGameStore((state) => state.setStarMapGridSpacingAu)
  const setStarMapGridFadeStartZoom = useGameStore((state) => state.setStarMapGridFadeStartZoom)
  const setStarMapGridFadeEndZoom = useGameStore((state) => state.setStarMapGridFadeEndZoom)
  const setStarDisplayRadius = useGameStore((state) => state.setStarDisplayRadius)
  const setPlanetDisplayRadius = useGameStore((state) => state.setPlanetDisplayRadius)
  const setMoonDisplayRadius = useGameStore((state) => state.setMoonDisplayRadius)
  const setOrbitalEntityDisplayRadius = useGameStore((state) => state.setOrbitalEntityDisplayRadius)
  const setOverviewMarkerMinZoom = useGameStore((state) => state.setOverviewMarkerMinZoom)
  const setOverviewFadeStartZoom = useGameStore((state) => state.setOverviewFadeStartZoom)
  const setOverviewFadeEndZoom = useGameStore((state) => state.setOverviewFadeEndZoom)
  const setSystemFadeStartZoom = useGameStore((state) => state.setSystemFadeStartZoom)
  const setSystemFadeEndZoom = useGameStore((state) => state.setSystemFadeEndZoom)
  const setObjectIconMinZoom = useGameStore((state) => state.setObjectIconMinZoom)
  const setObjectIconMaxZoom = useGameStore((state) => state.setObjectIconMaxZoom)
  const setObjectFocusZoom = useGameStore((state) => state.setObjectFocusZoom)
  const setSurfaceCardCompactMaxZoom = useGameStore((state) => state.setSurfaceCardCompactMaxZoom)
  const setSurfaceCardDetailMinZoom = useGameStore((state) => state.setSurfaceCardDetailMinZoom)
  const setSurfaceIconMinZoom = useGameStore((state) => state.setSurfaceIconMinZoom)
  const setStarAuLengthFactor = useGameStore((state) => state.setStarAuLengthFactor)
  const setPlanetAuLengthFactor = useGameStore((state) => state.setPlanetAuLengthFactor)
  const setMoonAuLengthFactor = useGameStore((state) => state.setMoonAuLengthFactor)
  return <>
    <div className="settings-tabs" role="tablist" aria-label="设置分类">
      <span className="settings-tab-indicator" aria-hidden="true" style={{ transform: `translateX(${settingsPages.findIndex((tab) => tab.id === page) * 100}%)` }} />
      {settingsPages.map((tab) => <button key={tab.id} id={`settings-tab-${tab.id}`} type="button" role="tab" aria-selected={page === tab.id} aria-controls="settings-page" className={page === tab.id ? 'active' : ''} onClick={() => changePage(tab.id)}>{tab.label}</button>)}
    </div>
    <div id="settings-page" ref={pageRef} className="settings-page" role="tabpanel" aria-labelledby={`settings-tab-${displayedPage}`} aria-busy={pageExiting}>
      <div className={`settings-page-content ${pageExiting ? 'is-exiting' : ''}`}>
      {displayedPage === 'global' && <>
        <SettingsGroup title="运行与界面" description="整个游戏共用的显示与操作参数">
          <div className="setting-row"><div><strong>目标帧率</strong><small>飞船与星体共用 · {GAME_SETTING_LIMITS.orbitFps.min}–{GAME_SETTING_LIMITS.orbitFps.max} FPS · 受屏幕刷新率限制</small></div><div className="fps-control"><input aria-label="轨道动画目标帧率" type="range" min={GAME_SETTING_LIMITS.orbitFps.min} max={GAME_SETTING_LIMITS.orbitFps.max} step={GAME_SETTING_LIMITS.orbitFps.step} value={orbitFps} onChange={(event) => setOrbitFps(event.currentTarget.valueAsNumber)} /><label><input aria-label="轨道动画帧率数值" type="number" min={GAME_SETTING_LIMITS.orbitFps.min} max={GAME_SETTING_LIMITS.orbitFps.max} step={GAME_SETTING_LIMITS.orbitFps.step} value={orbitFps} onChange={(event) => setOrbitFps(event.currentTarget.valueAsNumber)} /><span>FPS</span></label></div></div>
          <div className="setting-row"><div><strong>物品栏缩放倍率</strong><small>缩小格子、图标和文字，一屏显示更多物品</small></div><InventoryScaleControl value={inventoryScale} onChange={setInventoryScale} /></div>
          <div className="setting-row"><div><strong>减少动态效果</strong><small>跳过设置分页过渡与星图网格渐变；轨道动画另行控制</small></div><button type="button" aria-label="减少动态效果" aria-pressed={reduceMotion} className={`toggle ${reduceMotion ? 'on' : ''}`} onClick={toggleReduceMotion}><span /></button></div>
          <div className="setting-row"><div><strong>界面密度</strong><small>控制面板的间距与信息密度</small></div><span className="setting-value">紧凑</span></div>
        </SettingsGroup>
        <SettingsGroup title="本地存档" description="配置文件与场景数据分别自动保存">
          <div className="setting-row"><div><strong>自动保存</strong><small>设置写入 save/config.json；场景与生产线保存在浏览器</small></div><span className="save-ok"><span className="status-dot" />已启用</span></div>
          <button className="reset-button" onClick={() => { reset(); onNotify('Demo 已恢复默认布局') }}><Trash2 size={ICON_SIZES.node} />重置 Demo 数据</button>
        </SettingsGroup>
      </>}
      {displayedPage === 'starMap' && <>
        <SettingsGroup title="动画与名称" description="星图中的天体运动和标签显示">
          <div className="setting-row"><div><strong>轨道动画</strong><small>使用 JSON 中的公转周期推进天体运动</small></div><button type="button" aria-label="轨道动画" aria-pressed={orbitAnimation} className={`toggle ${orbitAnimation ? 'on' : ''}`} onClick={toggleOrbitAnimation}><span /></button></div>
          <div className="setting-row"><div><strong>星体名称常亮</strong><small>恒星、行星与卫星；关闭后仅悬浮或选中时显示</small></div><button type="button" aria-label="星体名称常亮" aria-pressed={celestialNamesAlwaysVisible} className={`toggle ${celestialNamesAlwaysVisible ? 'on' : ''}`} onClick={toggleCelestialNamesAlwaysVisible}><span /></button></div>
          <div className="setting-row"><div><strong>对象名称常亮</strong><small>飞船与空间站；关闭后仅悬浮或选中时显示</small></div><button type="button" aria-label="对象名称常亮" aria-pressed={objectNamesAlwaysVisible} className={`toggle ${objectNamesAlwaysVisible ? 'on' : ''}`} onClick={toggleObjectNamesAlwaysVisible}><span /></button></div>
        </SettingsGroup>
        <SettingsGroup title="舰船移动" description="对象公里单位与星图 AU 单位的换算，以及前往任务的到达判定">
          <div className="setting-row"><div><strong>对象单位换算</strong><small>1 km 对应的 AU；飞船型号速度和加速度按此换算到星图</small></div><KmToAuControl value={kmToAu} onChange={setKmToAu} /></div>
          <div className="setting-row"><div><strong>前往任务到达容差</strong><small>距离目标不超过此范围即完成任务，随后按运动模型制动</small></div><ArrivalToleranceControl value={movementArrivalToleranceAu} onChange={setMovementArrivalToleranceAu} /></div>
        </SettingsGroup>
        <SettingsGroup title="天体显示半径" description="1 u = 0.1 地图单位，会随视图缩放同步改变大小">
          <div className="setting-row settings-control-only"><div className="radius-controls"><RadiusControl label="恒星" value={starDisplayRadius} onChange={setStarDisplayRadius} /><RadiusControl label="行星" value={planetDisplayRadius} onChange={setPlanetDisplayRadius} /><RadiusControl label="卫星" value={moonDisplayRadius} onChange={setMoonDisplayRadius} /><RadiusControl label="舰船/空间站" value={orbitalEntityDisplayRadius} onChange={setOrbitalEntityDisplayRadius} /></div></div>
        </SettingsGroup>
        <SettingsGroup title="恒星系遮罩" description="低倍率星图的恒星系显示">
          <div className="setting-row"><div><strong>固定阈值</strong><small>低于该缩放倍率时，遮罩仅改变间距，不再缩小</small></div><ZoomThresholdControl value={overviewMarkerMinZoom} onChange={setOverviewMarkerMinZoom} /></div>
          <div className="setting-row"><div><strong>开始消失阈值</strong><small>放大至此倍率时，恒星系遮罩开始渐隐</small></div><SteppedMapZoomControl label="恒星系遮罩开始消失阈值" value={overviewFadeStartZoom} minimum={GAME_SETTING_LIMITS.starLayerTransitionZoom.min} maximum={zoomLevelBefore(overviewFadeEndZoom)} onChange={setOverviewFadeStartZoom} /></div>
          <div className="setting-row"><div><strong>完全消失阈值</strong><small>放大至此倍率时，恒星系遮罩完全隐藏</small></div><SteppedMapZoomControl label="恒星系遮罩完全消失阈值" value={overviewFadeEndZoom} minimum={zoomLevelAfter(overviewFadeStartZoom)} maximum={GAME_SETTING_LIMITS.starLayerTransitionZoom.max} onChange={setOverviewFadeEndZoom} /></div>
        </SettingsGroup>
        <SettingsGroup title="恒星系内部视图" description="放大时显示恒星、轨道、行星与卫星">
          <div className="setting-row"><div><strong>开始出现阈值</strong><small>放大至此倍率时，内部星系开始渐显</small></div><SteppedMapZoomControl label="恒星系开始出现阈值" value={systemFadeStartZoom} minimum={GAME_SETTING_LIMITS.starLayerTransitionZoom.min} maximum={zoomLevelBefore(systemFadeEndZoom)} onChange={setSystemFadeStartZoom} /></div>
          <div className="setting-row"><div><strong>完全出现阈值</strong><small>放大至此倍率时，内部星系完全显示</small></div><SteppedMapZoomControl label="恒星系完全出现阈值" value={systemFadeEndZoom} minimum={zoomLevelAfter(systemFadeStartZoom)} maximum={GAME_SETTING_LIMITS.starLayerTransitionZoom.max} onChange={setSystemFadeEndZoom} /></div>
        </SettingsGroup>
        <SettingsGroup title="圆点网格" description="独立控制星图背景圆点的显示倍率和世界间距">
          <div className="setting-row"><div><strong>开始出现阈值</strong><small>放大至此倍率时，圆点网格开始渐显</small></div><SteppedMapZoomControl label="圆点网格开始出现阈值" value={starMapGridFadeStartZoom} minimum={GAME_SETTING_LIMITS.starMapGridFadeZoom.min} maximum={zoomLevelBefore(starMapGridFadeEndZoom)} onChange={setStarMapGridFadeStartZoom} /></div>
          <div className="setting-row"><div><strong>完全出现阈值</strong><small>放大至此倍率时，圆点网格完全显示；与星系阈值独立</small></div><SteppedMapZoomControl label="圆点网格完全出现阈值" value={starMapGridFadeEndZoom} minimum={zoomLevelAfter(starMapGridFadeStartZoom)} maximum={GAME_SETTING_LIMITS.starMapGridFadeZoom.max} onChange={setStarMapGridFadeEndZoom} /></div>
          <div className="setting-row"><div><strong>圆点间距</strong><small>默认 1 AU；固定地图距离，画面间距随缩放变化</small></div><MapGridSpacingControl value={starMapGridSpacingAu} onChange={setStarMapGridSpacingAu} /></div>
        </SettingsGroup>
        <SettingsGroup title="对象图标倍率" description="飞船与空间站图标的缩放边界">
          <div className="setting-row"><div><strong>放大阈值</strong><small>高于该倍率时，图标不再放大</small></div><SteppedMapZoomControl label="对象图标放大阈值" value={objectIconMaxZoom} minimum={objectIconMinZoom} maximum={GAME_SETTING_LIMITS.objectIconZoom.max} onChange={setObjectIconMaxZoom} /></div>
          <div className="setting-row"><div><strong>缩小阈值</strong><small>低于该倍率时，图标不再缩小</small></div><SteppedMapZoomControl label="对象图标缩小阈值" value={objectIconMinZoom} minimum={GAME_SETTING_LIMITS.objectIconZoom.min} maximum={objectIconMaxZoom} onChange={setObjectIconMinZoom} /></div>
        </SettingsGroup>
        <SettingsGroup title="对象聚焦" description="仅影响双击飞船或空间站时的相机倍率">
          <div className="setting-row"><div><strong>双击聚焦倍率</strong><small>星图与左侧总览双击共用；单击选择不会缩放</small></div><SteppedMapZoomControl label="对象双击聚焦倍率" value={objectFocusZoom} minimum={GAME_SETTING_LIMITS.objectFocusZoom.min} maximum={GAME_SETTING_LIMITS.objectFocusZoom.max} onChange={setObjectFocusZoom} /></div>
        </SettingsGroup>
        <SettingsGroup title="AU 长度系数" description="JSON 中的 AU 数值 × 对应系数 = 画面长度">
          <div className="setting-row settings-control-only"><div className="factor-controls"><LengthFactorControl label="恒星单位长度轨道系数" value={starAuLengthFactor} onChange={setStarAuLengthFactor} /><LengthFactorControl label="行星单位长度轨道系数" value={planetAuLengthFactor} onChange={setPlanetAuLengthFactor} /><LengthFactorControl label="卫星单位长度轨道系数" value={moonAuLengthFactor} onChange={setMoonAuLengthFactor} /></div></div>
        </SettingsGroup>
      </>}
      {displayedPage === 'surface' && <SettingsGroup title="地表卡片显示" description="设备与资源点共用三级缩放样式">
        <div className="setting-row"><div><strong>图标阈值</strong><small>缩放至此倍率或更小时，仅显示正方形图标</small></div><SurfaceCardZoomControl label="地表卡片图标阈值" value={surfaceCardCompactMaxZoom} minimum={SURFACE_VIEW.minZoom} maximum={surfaceCardDetailMinZoom - GAME_SETTING_LIMITS.surfaceCardZoom.gap} onChange={setSurfaceCardCompactMaxZoom} /></div>
        <div className="setting-row"><div><strong>详情阈值</strong><small>缩放至此倍率或更大时，显示完整信息</small></div><SurfaceCardZoomControl label="地表卡片详情阈值" value={surfaceCardDetailMinZoom} minimum={surfaceCardCompactMaxZoom + GAME_SETTING_LIMITS.surfaceCardZoom.gap} maximum={SURFACE_VIEW.maxZoom} onChange={setSurfaceCardDetailMinZoom} /></div>
        <div className="setting-row"><div><strong>图标缩小阈值</strong><small>低于该倍率时，设备与资源图标不再缩小</small></div><SurfaceCardZoomControl label="地表图标缩小阈值" value={surfaceIconMinZoom} minimum={SURFACE_VIEW.minZoom} maximum={surfaceCardCompactMaxZoom} onChange={setSurfaceIconMinZoom} /></div>
      </SettingsGroup>}
      {displayedPage === 'shortcuts' && <>
        <SettingsGroup title="移动视角" description="宇宙和地表共用；点击键位后按下新按键，重复键位会与原方向交换">
          {CAMERA_DIRECTIONS.map((direction) => <div className="setting-row" key={direction}><div><strong>{CAMERA_DIRECTION_LABELS[direction]}</strong><small>可使用字母、数字或方向键</small></div><KeyBindingControl label={CAMERA_DIRECTION_LABELS[direction]} code={{ up: cameraKeyUp, left: cameraKeyLeft, down: cameraKeyDown, right: cameraKeyRight }[direction]} onChange={(code) => setCameraKeyBinding(direction, code)} /></div>)}
        </SettingsGroup>
        <SettingsGroup title="移动速度" description="按住 Shift 使用加速速度；两种视图采用相同的屏幕移动速度">
          <div className="setting-row"><div><strong>普通移动速度</strong><small>WASD 每秒移动的屏幕像素</small></div><CameraSpeedControl label="普通移动速度" value={cameraMoveSpeed} min={GAME_SETTING_LIMITS.cameraMoveSpeed.min} max={Math.min(GAME_SETTING_LIMITS.cameraMoveSpeed.max, cameraBoostSpeed)} onChange={setCameraMoveSpeed} /></div>
          <div className="setting-row"><div><strong>加速移动速度</strong><small>按住 Shift 时的屏幕像素/秒</small></div><CameraSpeedControl label="加速移动速度" value={cameraBoostSpeed} min={Math.max(GAME_SETTING_LIMITS.cameraBoostSpeed.min, cameraMoveSpeed)} max={GAME_SETTING_LIMITS.cameraBoostSpeed.max} onChange={setCameraBoostSpeed} /></div>
        </SettingsGroup>
      </>}
      </div>
    </div>
  </>
}

function SettingsGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="settings-group"><div className="settings-group-heading"><strong>{title}</strong><small>{description}</small></div><div className="settings-group-body">{children}</div></section>
}

function KeyBindingControl({ label, code, onChange }: { label: string; code: string; onChange: (code: string) => void }) {
  const [listening, setListening] = useState(false)
  useEffect(() => {
    if (!listening) return
    const capture = (event: KeyboardEvent) => {
      if (event.code === 'Escape') { setListening(false); return }
      if (event.code === 'Tab') { setListening(false); return }
      event.preventDefault()
      event.stopPropagation()
      if (!isCameraKeyCode(event.code)) return
      onChange(event.code)
      setListening(false)
    }
    window.addEventListener('keydown', capture, true)
    return () => window.removeEventListener('keydown', capture, true)
  }, [listening, onChange])
  return <button type="button" className={`keybind-button ${listening ? 'is-listening' : ''}`} aria-label={`${label}快捷键`} aria-pressed={listening} onClick={() => setListening(true)} onBlur={() => setListening(false)}>{listening ? '请按键…' : displayCameraKey(code)}</button>
}

function CameraSpeedControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div className="camera-speed-control"><input aria-label={label} type="range" min={min} max={max} step={50} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><label><input aria-label={`${label}数值`} type="number" min={min} max={max} step={50} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><span>px/s</span></label></div>
}

function RadiusControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.displayRadius
  return <label><span>{label}</span><input aria-label={`${label}默认显示半径`} type="range" min={limits.min} max={limits.max} step={limits.step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><output>{value.toFixed(1)} u</output></label>
}

function ZoomThresholdControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.overviewMarkerMinZoom
  return <div className="zoom-threshold-control"><input aria-label="恒星系遮罩固定阈值" type="range" min={limits.min} max={limits.max} step={limits.step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><output>{Number((value * 100).toFixed(3))}%</output></div>
}

function InventoryScaleControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.inventoryScale
  return <div className="zoom-threshold-control"><input aria-label="物品栏缩放倍率" type="range" min={limits.min} max={limits.max} step={limits.step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><output>{Math.round(value * 100)}%</output></div>
}

function ArrivalToleranceControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.movementArrivalToleranceAu
  return <div className="zoom-threshold-control"><input aria-label="前往任务到达容差" type="range" min={limits.min} max={limits.max} step={limits.step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /><output>{value.toFixed(3)} AU</output></div>
}

function KmToAuControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.kmToAu
  return <label className="km-to-au-control"><input key={value} aria-label="1 km 对应的 AU" type="number" min={limits.min} max={limits.max} step="any" defaultValue={value} onBlur={(event) => {
    const entered = event.currentTarget.valueAsNumber
    const next = Math.min(limits.max, Math.max(limits.min, Number.isFinite(entered) ? entered : value))
    event.currentTarget.value = String(next)
    onChange(next)
  }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /><span>AU/km</span></label>
}

function MapGridSpacingControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const limits = GAME_SETTING_LIMITS.starMapGridSpacingAu
  return <label className="map-grid-spacing-control"><input key={value} aria-label="星图圆点间距" type="number" min={limits.min} max={limits.max} step="any" defaultValue={value} onBlur={(event) => {
    const entered = event.currentTarget.valueAsNumber
    const next = Math.min(limits.max, Math.max(limits.min, Number.isFinite(entered) ? entered : value))
    event.currentTarget.value = String(next)
    onChange(next)
  }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /><span>AU</span></label>
}

function SteppedMapZoomControl({ label, value, minimum, maximum, onChange }: { label: string; value: number; minimum: number; maximum: number; onChange: (value: number) => void }) {
  const levels = SPACE_MAP_ZOOM.levels
  const first = levels.findIndex((level) => level >= minimum)
  const last = levels.reduce((index, level, nextIndex) => level <= maximum ? nextIndex : index, 0)
  const current = levels.reduce((index, level, nextIndex) => Math.abs(level - value) < Math.abs(levels[index] - value) ? nextIndex : index, 0)
  return <div className="zoom-threshold-control"><input aria-label={label} type="range" min={Math.max(0, first)} max={last} step={1} value={current} onChange={(event) => onChange(levels[event.currentTarget.valueAsNumber])} /><output>{Number((value * 100).toFixed(3))}%</output></div>
}

function SurfaceCardZoomControl({ label, value, minimum, maximum, onChange }: { label: string; value: number; minimum: number; maximum: number; onChange: (value: number) => void }) {
  const levels = SURFACE_VIEW.zoomLevels
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
