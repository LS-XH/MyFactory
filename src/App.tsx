import { useEffect, useState, type CSSProperties } from 'react'
import { Layers3, Map, Settings, Sparkles } from 'lucide-react'
import { APP_TIMING } from './config/visualTokens'
import { getFactory } from './domain/content'
import { findInstallableEquipment, getOrbitalObjects, isPlayerControllable, objectRepository } from './domain/objects'
import { BottomBar } from './features/action-bar/BottomBar'
import { Inspector } from './features/inspection/Inspector'
import { FactoryAssetList, SystemAssetList } from './features/overview/AssetLists'
import { Overlay } from './features/settings/Overlay'
import { SystemView } from './features/space-map/SystemView'
import { SurfaceView } from './features/surface/SurfaceView'
import { PanelTitle } from './shared/ui/PanelTitle'
import { TopButton } from './shared/ui/TopButton'
import { startTargetFrameLoop } from './shared/timing/targetFrameLoop'
import { useGameStore } from './state/gameStore'
import { loadOrbitalFile, onOrbitalSaveError, scheduleOrbitalFileSave } from './state/orbitalFileSave'
import { advanceOrbitalTime } from './state/orbitalClock'

function App() {
  const scene = useGameStore((state) => state.scene)
  const speed = useGameStore((state) => state.speed)
  const overlay = useGameStore((state) => state.overlay)
  const selectedId = useGameStore((state) => state.selectedId)
  const selectedIds = useGameStore((state) => state.selectedIds)
  const orbitFps = useGameStore((state) => state.orbitFps)
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const select = useGameStore((state) => state.select)
  const setScene = useGameStore((state) => state.setScene)
  const setOverlay = useGameStore((state) => state.setOverlay)
  const tick = useGameStore((state) => state.tick)
  const advanceFleet = useGameStore((state) => state.advanceFleet)
  const zoomLevel = useGameStore((state) => state.zoomLevel)
  const [toast, setToast] = useState('系统链路已连接')
  const [orbitalAssetCount, setOrbitalAssetCount] = useState(0)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ objectId: string; requestId: number } | null>(null)
  const handleSelect = (id: string | null, kind?: 'body' | 'station' | 'ship' | 'factory', additive = false, targetPosition?: { x: number; y: number }) => {
    if (pendingAction && id) {
      if (pendingAction === 'warp-to') { setPendingAction(null); notify('跃迁到功能尚未实现'); return }
      if (pendingAction === 'attack' && !objectRepository.get(id)?.getCapability('damageable')) { notify('目标不具备受击能力'); return }
      const accepted = useGameStore.getState().executeObjectAction(pendingAction, id, targetPosition)
      if (!accepted) { notify('目标位置不可用或不在当前恒星系'); return }
      setPendingAction(null); notify(pendingAction === 'attack' ? '攻击命令已下达' : '移动命令已下达'); return
    }
    select(id, kind, additive)
  }
  const runAction = (actionId: string) => {
    if (selectedIds.some((id) => !isPlayerControllable(objectRepository.get(id)))) { notify('该对象不属于玩家，无法操控'); return }
    if (actionId === 'fit-equipment') {
      const store = useGameStore.getState()
      const equipped = selectedIds.flatMap(id => { const item = objectRepository.get(id); const slot = item && findInstallableEquipment(item); return item && slot && store.installEquipment(id, slot.group, slot.size, slot.index, slot.equipmentId) ? [slot.equipmentId] : [] })
      notify(equipped.length ? `已装配 ${equipped.join('、')}` : '没有找到尺寸和类别匹配的空槽装备')
      return
    }
    if (actionId === 'warp-to') { setPendingAction(actionId); notify('请选择跃迁目标对象'); return }
    if (actionId === 'move' || actionId === 'attack' || actionId === 'command-craft') { setPendingAction(actionId); notify(`请选择${actionId === 'attack' ? '攻击' : '前往'}目标`); return }
    useGameStore.getState().executeObjectAction(actionId)
    notify(actionId === 'stop' ? '已停止所选对象' : '对象操作已执行')
  }

  useEffect(() => {
    const timer = window.setInterval(tick, APP_TIMING.simulationTickMs)
    return () => window.clearInterval(timer)
  }, [tick])

  useEffect(() => startTargetFrameLoop(orbitFps, (elapsedMs) => {
    const elapsedSeconds = Math.min(elapsedMs, 250) / 1000
    advanceOrbitalTime(elapsedSeconds, useGameStore.getState().orbitAnimation)
    advanceFleet(elapsedSeconds)
  }), [advanceFleet, orbitFps])

  useEffect(() => {
    let active = true
    onOrbitalSaveError((message) => { if (active) setToast(message) })
    void loadOrbitalFile().then(() => { if (active) { setOrbitalAssetCount(getOrbitalObjects().length); useGameStore.setState((state) => ({ objectRevision: state.objectRevision + 1 })) } }).catch((error: unknown) => { if (active) setToast(error instanceof Error ? error.message : '轨道对象加载失败') })
    const unsubscribe = useGameStore.subscribe((state, previous) => { if (state.orbitalRevision !== previous.orbitalRevision) scheduleOrbitalFileSave() })
    return () => { active = false; unsubscribe() }
  }, [])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), APP_TIMING.toastDurationMs)
  }

  const enterSurface = (id: string) => {
    useGameStore.getState().enterSurface(id)
    notify('已进入奥瑞利亚地表视图')
  }

  const focusOverviewObject = (objectId: string) => {
    setFocusRequest((current) => ({ objectId, requestId: (current?.requestId ?? 0) + 1 }))
  }

  return <div className="app-shell" style={{ '--ui-scale': zoomLevel } as CSSProperties}>
    <header className="topbar">
      <div className="brand-mark"><span className="brand-glyph">HX</span><div><strong>HELIX</strong><small>INDUSTRIAL COMMAND</small></div></div>
      <div className="breadcrumb"><span className="muted">总览</span><span className="slash">/</span><span>{scene === 'system' ? '猎户门 · 07' : '奥瑞利亚 · 地表'}</span>{scene === 'surface' && <><span className="slash">/</span><span className="cyan">生产区 A-03</span></>}</div>
      <div className="top-actions">
        <TopButton icon={Settings} label="设置" onClick={() => setOverlay('settings')} />
        <TopButton icon={Sparkles} label="科技树" onClick={() => setOverlay('tech')} />
        <TopButton icon={Map} label="星图" onClick={() => {
          if (scene === 'surface') {
            setScene('system')
            select(null)
            setOverlay(null)
            notify('已返回猎户门 · 07 星图')
          } else {
            setOverlay('map')
          }
        }} />
      </div>
    </header>

    <aside className="panel left-panel">
      <PanelTitle eyebrow="COMMAND / 01" title="总览" icon={Layers3} />
      <div className="tab-row"><button className="tab active">资产</button><button className="tab">对象</button><button className="tab">生产</button></div>
      <div className="asset-summary"><div><span className="label">可用功率</span><strong>1.24 GW</strong></div><div className="power-ring"><span>86%</span></div></div>
      <div className="section-label">{scene === 'system' ? '轨道资产' : '生产区实体'} <span>{scene === 'system' ? `${1 + orbitalAssetCount}` : `${useGameStore.getState().nodes.length}`}</span></div>
      {scene === 'system' ? <SystemAssetList onSelect={handleSelect} selectedIds={selectedIds} onEnterSurface={enterSurface} onFocusObject={focusOverviewObject} /> : <FactoryAssetList onSelect={handleSelect} selectedIds={selectedIds} />}
      <div className="panel-footer"><span className="status-dot" />同步稳定 <span className="muted">·</span> 24 ms</div>
    </aside>

    <main className="viewport">
      {scene === 'system' ? <SystemView selectedIds={selectedIds} focusRequest={focusRequest} onSelect={handleSelect} onEnterSurface={enterSurface} onNotify={notify} /> : <SurfaceView planet={surfacePlanet} onNotify={notify} />}
      <div className="viewport-hud"><div className="hud-pill"><span className="live-dot" />LIVE / SIMULATION</div><div className="hud-pill coordinates">X 042.18 <span>·</span> Y -118.04 <span>·</span> Z 003</div></div>
    </main>

    <aside className="panel right-panel">
      <Inspector selectedId={selectedId} scene={scene} onClose={() => select(null)} onNotify={notify} onEnterSurface={enterSurface} />
    </aside>

    <BottomBar scene={scene} selectedId={selectedIds.length === 1 ? selectedId : selectedIds.length ? 'multiple' : null} selectedIds={selectedIds} speed={speed} onSpeed={setSpeed} onScene={setScene} onAction={runAction} onAdd={(factoryId) => { useGameStore.getState().addNode(factoryId); notify(`已部署 ${getFactory(factoryId)?.name ?? factoryId}`) }} />
    {overlay && <Overlay id={overlay} onClose={() => setOverlay(null)} onNotify={notify} />}
    {toast && <div className="toast"><span className="status-dot" />{toast}</div>}
  </div>
}

export default App
