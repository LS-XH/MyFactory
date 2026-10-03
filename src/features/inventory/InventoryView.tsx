import { useState, type CSSProperties, type DragEvent } from 'react'
import { ArrowLeft, ArrowLeftRight, Boxes, ListFilter, Package } from 'lucide-react'
import { getItemDefinition } from '../../domain/items'
import { getEquipmentDefinition } from '../../domain/equipment'
import { isPlayerControllable, objectRepository } from '../../domain/objects'
import { StorageCapability, type InventoryStack } from '../../domain/storage'
import { useGameStore } from '../../state/gameStore'
import { ItemGlyph } from '../../shared/icons/ItemGlyph'
import { sortInventoryWithFeedback } from './sortInventory'
import './inventory.css'

type InventoryViewProps = {
  sourceIds: string[]
  targetId?: string
  onClose: () => void
  onNotify: (message: string) => void
}

export type InventoryDragPayload = { objectId: string; slot: number }
export const inventoryDragMime = 'application/x-myfactory-inventory-stack'

function ItemSlot({ stack, objectId, slot, onDrop, onSelect, selected }: { stack?: InventoryStack; objectId: string; slot: number; onDrop?: (event: DragEvent, objectId: string, slot: number) => void; onSelect?: (slot: number) => void; selected?: boolean }) {
  const item = stack && getItemDefinition(stack.itemId)
  const label = item?.displayName ?? stack?.itemId
  const equipment = stack && item?.kind === 'equipment' ? getEquipmentDefinition(stack.itemId) : undefined
  const subtype = equipment?.subtype
  const itemTitle = stack ? `${label} ×${stack.quantity}${subtype ? ` · ${subtype.parentName} / ${subtype.displayName}` : ''} · ${item!.volume * stack.quantity} m³ · ${item!.weight * stack.quantity} kg` : `空槽位 ${slot + 1}`
  return <div className={`inventory-slot ${stack ? 'occupied' : ''}${selected ? ' selected' : ''}`} title={itemTitle} onDragOver={onDrop ? (event) => event.preventDefault() : undefined} onDrop={onDrop ? (event) => onDrop(event, objectId, slot) : undefined} onClick={stack && onSelect ? () => onSelect(slot) : undefined} onKeyDown={stack && onSelect ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(slot) } } : undefined} role={stack && onSelect ? 'button' : undefined} tabIndex={stack && onSelect ? 0 : undefined}>
    {stack ? <div className="inventory-stack" draggable onDragStart={(event) => { const payload: InventoryDragPayload = { objectId, slot }; event.dataTransfer.setData(inventoryDragMime, JSON.stringify(payload)); event.dataTransfer.effectAllowed = 'move' }}>
      <span className="inventory-item-visual"><ItemGlyph itemId={stack.itemId} item={item} variant="inventory" stopPropagation={false} /></span>
      {equipment && <span className="inventory-item-size">{equipment.size}</span>}
      <span className="inventory-item-count">×{stack.quantity}</span>
    </div> : <span className="inventory-empty-slot">{String(slot + 1).padStart(2, '0')}</span>}
  </div>
}

export function InventoryPane({ objectId, onDrop, onSelectSlot, onSort, selectedSlot, footer }: { objectId: string; onDrop?: (event: DragEvent, objectId: string, slot: number) => void; onSelectSlot?: (slot: number) => void; onSort?: (objectId: string) => void; selectedSlot?: number | null; footer?: string }) {
  const inventoryScale = useGameStore((state) => state.inventoryScale)
  const object = objectRepository.get(objectId)
  const storage = object?.getCapability<StorageCapability>('storage')
  if (!object || !storage) return <section className="inventory-pane"><p>物品栏不可用</p></section>
  const stacks = new Map(storage.slots.map((stack) => [stack.slot, stack]))
  const slotCount = Math.max(12, ...storage.slots.map((stack) => stack.slot + 7))
  return <section className="inventory-pane" style={{ '--inventory-slot-scale': inventoryScale, '--inventory-slot-inverse': `${100 / inventoryScale}%` } as CSSProperties}>
    <div className="inventory-pane-heading"><div><small>{object.kind === 'station' ? 'STATION / STORAGE' : 'SHIP / STORAGE'}</small><h2>{object.displayName}</h2></div><div className="inventory-pane-tools">{onSort && <button type="button" className="inventory-sort-button" onClick={() => onSort(objectId)} title="合并相同物品，并按 item.json 顺序排列"><ListFilter size={14} />一键排序</button>}<Package size={22} /></div></div>
    <div className="inventory-capacity"><div><span>已用体积</span><strong>{storage.usedVolume.toLocaleString()} / {storage.maxVolume.toLocaleString()} m³</strong></div><div className="inventory-capacity-track"><span style={{ width: `${storage.maxVolume ? storage.usedVolume / storage.maxVolume * 100 : 0}%` }} /></div><small>总重量 {storage.usedWeight.toLocaleString()} kg · {storage.slots.length} 个已占用格子</small></div>
    <div className="inventory-grid" onDragOver={onDrop ? (event) => event.preventDefault() : undefined} onDrop={onDrop ? (event) => onDrop(event, objectId, storage.firstFreeSlot()) : undefined}>{Array.from({ length: slotCount }, (_, slot) => <ItemSlot key={slot} objectId={objectId} slot={slot} stack={stacks.get(slot)} onDrop={onDrop} onSelect={onSelectSlot} selected={selectedSlot === slot} />)}</div>
    <div className="inventory-pane-footer">{footer ?? '拖动物品到空格可移动；拖到同类物品可堆叠'}</div>
  </section>
}

export function InventoryView({ sourceIds, targetId, onClose, onNotify }: InventoryViewProps) {
  useGameStore((state) => state.objectRevision)
  const [activeSourceId, setActiveSourceId] = useState(sourceIds[0] ?? '')
  const availableSources = sourceIds.filter((id) => { const object = objectRepository.get(id); return isPlayerControllable(object) && object?.getCapability('storage') })
  const sourceId = availableSources.includes(activeSourceId) ? activeSourceId : availableSources[0]
  const target = targetId && targetId !== sourceId && isPlayerControllable(objectRepository.get(targetId)) && objectRepository.get(targetId)?.getCapability('storage') ? targetId : undefined

  const drop = (event: DragEvent, objectId: string, slot: number) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      const payload = JSON.parse(event.dataTransfer.getData(inventoryDragMime)) as InventoryDragPayload
      if (!payload || !Number.isSafeInteger(payload.slot) || ![sourceId, target].includes(payload.objectId)) return
      const result = useGameStore.getState().moveInventoryItem(payload.objectId, payload.slot, objectId, slot)
      onNotify(result.ok ? payload.objectId === objectId ? '物品格子已更新' : '物品已转移' : result.reason ?? '无法转移物品')
    } catch { onNotify('无法识别拖动的物品') }
  }

  return <div className="inventory-view">
    <div className="inventory-view-header"><button className="inventory-back" onClick={onClose}><ArrowLeft size={16} />返回宇宙视图</button><div><small>ASSET / INVENTORY</small><h1>{target ? '转移物品' : '物品栏'}</h1></div><Boxes size={24} /></div>
    {availableSources.length > 1 && <div className="inventory-source-tabs">{availableSources.map((id) => <button key={id} className={id === sourceId ? 'active' : ''} onClick={() => setActiveSourceId(id)}>{objectRepository.get(id)?.displayName ?? id}</button>)}</div>}
    {sourceId ? <div className={`inventory-panes ${target ? 'dual' : ''}`}><InventoryPane objectId={sourceId} onDrop={drop} onSort={(id) => sortInventoryWithFeedback(id, onNotify)} />{target && <><div className="inventory-transfer-arrow"><ArrowLeftRight size={20} /></div><InventoryPane objectId={target} onDrop={drop} onSort={(id) => sortInventoryWithFeedback(id, onNotify)} /></>}</div> : <div className="inventory-unavailable">没有可用的物品栏</div>}
  </div>
}
