import { useEffect, useState, type CSSProperties } from 'react'
import { Layers3, Map, Settings, Sparkles } from 'lucide-react'
import { APP_TIMING } from './config/visualTokens'
import { getFactory } from './domain/content'
import { BottomBar } from './features/action-bar/BottomBar'
import { Inspector } from './features/inspection/Inspector'
import { FactoryAssetList, SystemAssetList } from './features/overview/AssetLists'
import { Overlay } from './features/settings/Overlay'
import { SystemView } from './features/space-map/SystemView'
import { SurfaceView } from './features/surface/SurfaceView'
import { PanelTitle } from './shared/ui/PanelTitle'
import { TopButton } from './shared/ui/TopButton'
import { useGameStore } from './state/gameStore'

function App() {
  const scene = useGameStore((state) => state.scene)
  const speed = useGameStore((state) => state.speed)
  const overlay = useGameStore((state) => state.overlay)
  const selectedId = useGameStore((state) => state.selectedId)
  const orbitAnimation = useGameStore((state) => state.orbitAnimation)
  const orbitFps = useGameStore((state) => state.orbitFps)
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const select = useGameStore((state) => state.select)
  const setScene = useGameStore((state) => state.setScene)
  const setOverlay = useGameStore((state) => state.setOverlay)
  const tick = useGameStore((state) => state.tick)
  const zoomLevel = useGameStore((state) => state.zoomLevel)
  const [toast, setToast] = useState('系统链路已连接')

  useEffect(() => {
    const timer = window.setInterval(tick, APP_TIMING.simulationTickMs)
    return () => window.clearInterval(timer)
  }, [tick])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), APP_TIMING.toastDurationMs)
  }

  const enterSurface = (id: string) => {
    useGameStore.getState().enterSurface(id)
    notify('已进入奥瑞利亚地表视图')
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
      <div className="section-label">{scene === 'system' ? '轨道资产' : '生产区实体'} <span>{scene === 'system' ? '03' : `${useGameStore.getState().nodes.length}`}</span></div>
      {scene === 'system' ? <SystemAssetList onSelect={select} selectedId={selectedId} onEnterSurface={enterSurface} /> : <FactoryAssetList onSelect={select} selectedId={selectedId} />}
      <div className="panel-footer"><span className="status-dot" />同步稳定 <span className="muted">·</span> 24 ms</div>
    </aside>

    <main className="viewport">
      {scene === 'system' ? <SystemView selectedId={selectedId} orbitAnimation={orbitAnimation} orbitFps={orbitFps} onSelect={select} onEnterSurface={enterSurface} /> : <SurfaceView planet={surfacePlanet} onNotify={notify} />}
      <div className="viewport-hud"><div className="hud-pill"><span className="live-dot" />LIVE / SIMULATION</div><div className="hud-pill coordinates">X 042.18 <span>·</span> Y -118.04 <span>·</span> Z 003</div></div>
    </main>

    <aside className="panel right-panel">
      <Inspector selectedId={selectedId} scene={scene} onClose={() => select(null)} onNotify={notify} onEnterSurface={enterSurface} />
    </aside>

    <BottomBar scene={scene} selectedId={selectedId} speed={speed} onSpeed={setSpeed} onScene={setScene} onAdd={(factoryId) => { useGameStore.getState().addNode(factoryId); notify(`已部署 ${getFactory(factoryId)?.name ?? factoryId}`) }} />
    {overlay && <Overlay id={overlay} onClose={() => setOverlay(null)} onNotify={notify} />}
    {toast && <div className="toast"><span className="status-dot" />{toast}</div>}
  </div>
}

export default App

