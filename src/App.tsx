import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { BookOpen, Layers3, Map, Settings, Sparkles } from 'lucide-react'
import { APP_TIMING } from './config/visualTokens'
import { findCelestialObject } from './domain/spaceMap'
import { isPlayerControllable, objectRepository } from './domain/objects'
import { BottomBar } from './features/action-bar/BottomBar'
import { Inspector } from './features/inspection/Inspector'
import { OverviewPanel } from './features/overview/OverviewPanel'
import type { OverviewEntry } from './features/overview/overviewModel'
import { Overlay } from './features/settings/Overlay'
import { SystemView } from './features/space-map/SystemView'
import type { FocusedTask, PendingTargetAction } from './features/space-map/types'
import { SurfaceView } from './features/surface/SurfaceView'
import { InventoryView } from './features/inventory/InventoryView'
import { FittingView } from './features/fitting/FittingView'
import { ItemCodexView } from './features/item-codex/ItemCodexView'
import { ItemInspector } from './features/item-codex/ItemInspector'
import { ItemInteractionProvider } from './shared/icons/ItemInteraction'
import { PanelTitle } from './shared/ui/PanelTitle'
import { TopButton } from './shared/ui/TopButton'
import { FrameRateIndicator } from './shared/ui/FrameRateIndicator'
import { startTargetFrameLoop } from './shared/timing/targetFrameLoop'
import { gameFrameRateMeter } from './shared/timing/frameRateMeter'
import { useGameStore } from './state/gameStore'
import { loadOrbitalFile, onOrbitalSaveError, scheduleOrbitalFileSave } from './state/orbitalFileSave'
import { loadConfigFile, onConfigSaveError, scheduleConfigFileSave } from './state/configFileSave'
import { gameSettingKeys } from './domain/configSave'
import { itemDisplayName } from './domain/itemCodex'
import { advanceOrbitalTime } from './state/orbitalClock'

function App() {
  const scene = useGameStore((state) => state.scene)
  const speed = useGameStore((state) => state.speed)
  const overlay = useGameStore((state) => state.overlay)
  const selectedId = useGameStore((state) => state.selectedId)
  const selectedIds = useGameStore((state) => state.selectedIds)
  const orbitFps = useGameStore((state) => state.orbitFps)
  const surfacePlanet = useGameStore((state) => state.surfacePlanet)
  const [draggingFactoryId, setDraggingFactoryId] = useState<string | null>(null)
  const surfaceName = useMemo(() => findCelestialObject(surfacePlanet)?.displayName ?? surfacePlanet, [surfacePlanet])
  const setSpeed = useGameStore((state) => state.setSpeed)
  const select = useGameStore((state) => state.select)
  const setScene = useGameStore((state) => state.setScene)
  const setOverlay = useGameStore((state) => state.setOverlay)
  const tick = useGameStore((state) => state.tick)
  const advanceFleet = useGameStore((state) => state.advanceFleet)
  const zoomLevel = useGameStore((state) => state.zoomLevel)
  const [toast, setToast] = useState('系统链路已连接')
  const [visibleSpaceIds, setVisibleSpaceIds] = useState<string[]>([])
  const [visibleSurfaceIds, setVisibleSurfaceIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<PendingTargetAction | null>(null)
  const [focusedTask, setFocusedTask] = useState<FocusedTask | null>(null)
  const [inventoryView, setInventoryView] = useState<{ sourceIds: string[]; targetId?: string } | null>(null)
  const [fittingView, setFittingView] = useState<string[] | null>(null)
  const [itemView, setItemView] = useState<'atlas' | 'recipes' | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [recipeItemId, setRecipeItemId] = useState<string | null>(null)
  const [recipeBackView, setRecipeBackView] = useState<'atlas' | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ objectId: string; requestId: number } | null>(null)
  const openItemRecipes = (itemId: string) => {
    setSelectedItemId(itemId)
    setRecipeItemId(itemId)
    if (itemView !== 'recipes') setRecipeBackView(itemView === 'atlas' ? 'atlas' : null)
    setItemView('recipes')
  }
  useEffect(() => { if (selectedId) setSelectedItemId(null) }, [selectedId])
  const handleSelect = (id: string | null, kind?: 'body' | 'station' | 'ship' | 'factory', additive = false, targetPosition?: { x: number; y: number }, targetStarId?: string, appendTask = false) => {
    setFocusedTask(null)
    if (pendingAction) {
      const actionId = pendingAction.id
      if (!id && (actionId !== 'move' || !targetPosition)) { setPendingAction(null); notify('已取消目标选择'); return }
      if (actionId === 'warp-to') { setPendingAction(null); notify('跃迁到功能尚未实现'); return }
      if (actionId === 'transfer-items' && id) { openInventory(pendingAction.actorIds, id); return }
      if (actionId === 'attack' && !objectRepository.get(id ?? '')?.getCapability('damageable')) { notify('目标不具备受击能力'); return }
      const accepted = useGameStore.getState().executeObjectAction(actionId, id ?? undefined, targetPosition, pendingAction.actorIds, targetStarId, pendingAction.task && appendTask)
      if (!accepted) { notify('目标位置不可用'); return }
      setPendingAction(null); notify(actionId === 'attack' ? '攻击命令已下达' : '移动命令已下达'); return
    }
    select(id, kind, additive)
  }
  const focusTask = (objectId: string, taskId: string) => {
    const object = objectRepository.get(objectId)
    if (object?.kind !== 'ship' && object?.kind !== 'station') return
    setPendingAction(null)
    setSelectedItemId(null)
    select(objectId, object.kind)
    setFocusedTask((current) => ({ objectId, taskId, requestId: (current?.requestId ?? 0) + 1 }))
  }
  const beginTargetAction = (actionId: string) => setPendingAction({
    id: actionId,
    actorIds: [...selectedIds],
    task: objectRepository.actionsFor(selectedIds).some((action) => action.id === actionId && action.kind === 'task')
  })
  const runAction = (actionId: string) => {
    if (pendingAction?.id === actionId) { setPendingAction(null); notify('已取消目标选择'); return }
    if (selectedIds.some((id) => !isPlayerControllable(objectRepository.get(id)))) { notify('该对象不属于玩家，无法操控'); return }
    if (pendingAction) setPendingAction(null)
    if (actionId === 'open-inventory') { openInventory(selectedIds); return }
    if (actionId === 'transfer-items') { beginTargetAction(actionId); setInventoryView(null); setFittingView(null); notify('请选择拥有物品栏的目标对象'); return }
    if (actionId === 'fit-equipment') {
      const availableIds = selectedIds.filter((id) => { const object = objectRepository.get(id); return object?.getCapability('equipment') && object?.getCapability('storage') })
      if (!availableIds.length) { notify('所选对象没有可用的装配槽位或物品栏'); return }
      setPendingAction(null)
      setInventoryView(null)
      setFittingView(availableIds)
      return
    }
    if (actionId === 'warp-to') { setFittingView(null); setInventoryView(null); beginTargetAction(actionId); notify('请选择跃迁目标对象'); return }
    if (actionId === 'move' || actionId === 'attack' || actionId === 'command-craft') { setFittingView(null); setInventoryView(null); beginTargetAction(actionId); notify(actionId === 'move' ? '请选择目标对象或星图中的位置' : actionId === 'attack' ? '请选择攻击目标' : '请选择舰载机命令目标'); return }
    useGameStore.getState().executeObjectAction(actionId)
    notify(actionId === 'stop' ? '已停止所选对象' : '对象操作已执行')
  }

  useEffect(() => {
    if (!pendingAction) return
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setPendingAction(null)
      notify('已取消目标选择')
    }
    window.addEventListener('keydown', cancelOnEscape)
    return () => window.removeEventListener('keydown', cancelOnEscape)
  }, [pendingAction])

  useEffect(() => {
    if (pendingAction && pendingAction.actorIds.some((id) => !selectedIds.includes(id))) setPendingAction(null)
  }, [pendingAction, selectedIds])

  useEffect(() => {
    if (focusedTask && selectedId !== focusedTask.objectId) setFocusedTask(null)
  }, [focusedTask, selectedId])

  useEffect(() => {
    const timer = window.setInterval(tick, APP_TIMING.simulationTickMs)
    return () => window.clearInterval(timer)
  }, [tick])

  useEffect(() => {
    gameFrameRateMeter.reset()
    const stop = startTargetFrameLoop(orbitFps, (elapsedMs) => {
      gameFrameRateMeter.recordFrame(performance.now())
      const elapsedSeconds = Math.min(elapsedMs, 250) / 1000
      advanceOrbitalTime(elapsedSeconds, useGameStore.getState().orbitAnimation)
      advanceFleet(elapsedSeconds)
    })
    return () => { stop(); gameFrameRateMeter.reset() }
  }, [advanceFleet, orbitFps])

  useEffect(() => {
    let active = true
    onOrbitalSaveError((message) => { if (active) setToast(message) })
    onConfigSaveError((message) => { if (active) setToast(message) })
    void (async () => {
      try { await loadConfigFile() } catch (error) { if (active) setToast(error instanceof Error ? error.message : '设置文件加载失败') }
      try { await loadOrbitalFile(); if (active) useGameStore.setState((state) => ({ objectRevision: state.objectRevision + 1 })) }
      catch (error) { if (active) setToast(error instanceof Error ? error.message : '轨道对象加载失败') }
    })()
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (gameSettingKeys.some((key) => state[key] !== previous[key])) scheduleConfigFileSave()
      if (state.orbitalRevision !== previous.orbitalRevision) scheduleOrbitalFileSave()
    })
    return () => { active = false; unsubscribe() }
  }, [])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), APP_TIMING.toastDurationMs)
  }

  const openInventory = (sourceIds: string[], targetId?: string) => {
    const validSources = sourceIds.filter((id) => { const object = objectRepository.get(id); return isPlayerControllable(object) && object?.getCapability('storage') })
    if (!validSources.length) { notify('所选对象没有可用的物品栏'); return }
    if (targetId) {
      const target = objectRepository.get(targetId)
      if (validSources.includes(targetId) || !isPlayerControllable(target) || !target?.getCapability('storage')) { notify('请选择另一个属于玩家且拥有物品栏的对象'); return }
    }
    setPendingAction(null)
    setItemView(null)
    setFittingView(null)
    setInventoryView({ sourceIds: validSources, targetId })
  }

  const enterSurface = (id: string) => {
    setPendingAction(null)
    setItemView(null)
    setInventoryView(null)
    setFittingView(null)
    useGameStore.getState().enterSurface(id)
    notify(`已进入${findCelestialObject(id)?.displayName ?? id}地表视图`)
  }

  const focusOverviewObject = (objectId: string) => {
    setFocusRequest((current) => ({ objectId, requestId: (current?.requestId ?? 0) + 1 }))
  }

  const updateVisibleSpaceIds = useCallback((ids: string[]) => setVisibleSpaceIds((current) => current.length === ids.length && current.every((id, index) => id === ids[index]) ? current : ids), [])
  const updateVisibleSurfaceIds = useCallback((ids: string[]) => setVisibleSurfaceIds((current) => current.length === ids.length && current.every((id, index) => id === ids[index]) ? current : ids), [])
  const selectOverviewEntry = (entry: OverviewEntry, additive: boolean, appendTask: boolean) => handleSelect(entry.id, entry.selectionKind, additive, undefined, undefined, appendTask)

  return <ItemInteractionProvider value={{ selectedItemId, selectItem: setSelectedItemId, openItemRecipes }}><div className="app-shell" style={{ '--ui-scale': zoomLevel } as CSSProperties}>
    <header className="topbar">
      <div className="brand-mark"><span className="brand-glyph">HX</span><div><strong>HELIX</strong><small>INDUSTRIAL COMMAND</small></div></div>
      <div className="breadcrumb"><span className="muted">总览</span><span className="slash">/</span><span>{itemView ? '物品图鉴' : scene === 'system' ? '猎户门 · 07' : `${surfaceName} · 地表`}</span>{itemView === 'recipes' ? <><span className="slash">/</span><span className="cyan">{itemDisplayName(recipeItemId ?? '')} · 配方</span></> : !itemView && scene === 'surface' ? <><span className="slash">/</span><span className="cyan">生产区</span></> : null}</div>
      <div className="top-actions">
        <FrameRateIndicator />
        <TopButton icon={Settings} label="设置" onClick={() => setOverlay('settings')} />
        <TopButton icon={Sparkles} label="科技树" onClick={() => setOverlay('tech')} />
        <TopButton icon={Map} label="星图" onClick={() => {
          setItemView(null)
          if (scene === 'surface') {
            setScene('system')
            select(null)
            setOverlay(null)
            notify('已返回猎户门 · 07 星图')
          } else {
            setOverlay('map')
          }
        }} />
        <TopButton icon={BookOpen} label="物品图鉴" active={!!itemView} onClick={() => { setPendingAction(null); setOverlay(null); setItemView('atlas') }} />
      </div>
    </header>

    <aside className="panel left-panel">
      <PanelTitle eyebrow="COMMAND / 01" title="总览" icon={Layers3} />
      <OverviewPanel scene={scene} selectedIds={selectedIds} visibleSpaceIds={visibleSpaceIds} visibleSurfaceIds={visibleSurfaceIds} onSelect={selectOverviewEntry} onEnterSurface={enterSurface} onFocusObject={focusOverviewObject} />
    </aside>

    <main className="viewport">
      {itemView ? <ItemCodexView mode={itemView} itemId={itemView === 'recipes' ? recipeItemId : selectedItemId} onBack={() => setItemView(itemView === 'recipes' ? recipeBackView : null)} /> : fittingView ? <FittingView objectIds={fittingView} onClose={() => setFittingView(null)} onNotify={notify} /> : inventoryView ? <InventoryView sourceIds={inventoryView.sourceIds} targetId={inventoryView.targetId} onClose={() => setInventoryView(null)} onNotify={notify} /> : scene === 'system' ? <SystemView selectedIds={selectedIds} targetingAction={pendingAction} focusedTask={focusedTask} focusRequest={focusRequest} onSelect={handleSelect} onFocusTask={focusTask} onEnterSurface={enterSurface} onNotify={notify} onOpenInventory={openInventory} onVisibleObjectIdsChange={updateVisibleSpaceIds} /> : <SurfaceView planet={surfacePlanet} focusRequest={focusRequest} onNotify={notify} draggingFactoryId={draggingFactoryId} onVisibleObjectIdsChange={updateVisibleSurfaceIds} />}
    </main>

    <aside className="panel right-panel">
      {selectedItemId ? <ItemInspector itemId={selectedItemId} onClose={() => setSelectedItemId(null)} onOpenRecipes={openItemRecipes} /> : <Inspector selectedId={selectedId} focusedTask={focusedTask} scene={scene} onClose={() => { setFocusedTask(null); select(null) }} onNotify={notify} onEnterSurface={enterSurface} />}
    </aside>

    <BottomBar scene={scene} selectedId={selectedIds.length === 1 ? selectedId : selectedIds.length ? 'multiple' : null} selectedIds={selectedIds} pendingActionId={pendingAction?.id ?? null} speed={speed} onSpeed={setSpeed} onScene={(nextScene) => { setPendingAction(null); setItemView(null); setScene(nextScene) }} onAction={runAction} onBuildDragStart={setDraggingFactoryId} onBuildDragEnd={() => setDraggingFactoryId(null)} />
    {overlay && <Overlay id={overlay} onClose={() => setOverlay(null)} onNotify={notify} />}
    {toast && <div className="toast"><span className="status-dot" />{toast}</div>}
  </div></ItemInteractionProvider>
}

export default App
