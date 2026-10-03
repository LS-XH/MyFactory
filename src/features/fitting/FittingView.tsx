import { useState, type DragEvent } from 'react'
import { ArrowLeft, PackageOpen, Wrench } from 'lucide-react'
import { getEquipmentDefinition } from '../../domain/equipment'
import { getItemDefinition } from '../../domain/items'
import { EquipmentCapability, getOrbitalDisplayInfo, isPlayerControllable, objectRepository, SLOT_GROUPS, SLOT_SIZES, type SlotGroup, type SlotSize } from '../../domain/objects'
import { StorageCapability } from '../../domain/storage'
import { InventoryPane, inventoryDragMime, type InventoryDragPayload } from '../inventory/InventoryView'
import { sortInventoryWithFeedback } from '../inventory/sortInventory'
import { ItemGlyph } from '../../shared/icons/ItemGlyph'
import { useGameStore } from '../../state/gameStore'
import './fitting.css'

const groupLabels: Record<SlotGroup, string> = {
  turretSlots: '炮塔槽位',
  engineSlots: '引擎槽位',
  defenseSlots: '防御槽位',
  utilitySlots: '功能槽位',
  moduleSlots: '模块槽位'
}

type SelectedInventorySlot = { objectId: string; slot: number }

export function FittingView({ objectIds, onClose, onNotify }: { objectIds: string[]; onClose: () => void; onNotify: (message: string) => void }) {
  useGameStore((state) => state.objectRevision)
  const [activeObjectId, setActiveObjectId] = useState(objectIds[0] ?? '')
  const [selectedInventorySlot, setSelectedInventorySlot] = useState<SelectedInventorySlot | null>(null)
  const availableIds = objectIds.filter((id) => {
    const object = objectRepository.get(id)
    return isPlayerControllable(object) && object?.getCapability('equipment') && object?.getCapability('storage')
  })
  const objectId = availableIds.includes(activeObjectId) ? activeObjectId : availableIds[0]
  const object = objectId ? objectRepository.get(objectId) : undefined
  const displayInfo = object ? getOrbitalDisplayInfo(object) : undefined
  const equipment = object?.getCapability<EquipmentCapability>('equipment')
  const storage = object?.getCapability<StorageCapability>('storage')
  const chosenSlot = selectedInventorySlot?.objectId === objectId ? selectedInventorySlot.slot : null
  const chosenStack = storage?.slots.find((stack) => stack.slot === chosenSlot)
  const chosenEquipment = chosenStack && getEquipmentDefinition(chosenStack.itemId)

  const changeEquipment = (group: SlotGroup, size: SlotSize, index: number, inventorySlot: number | null) => {
    if (!objectId) return
    const result = useGameStore.getState().changeEquipment(objectId, group, size, index, inventorySlot)
    if (!result.ok) { onNotify(result.reason ?? '无法更改装备'); return }
    setSelectedInventorySlot(null)
    onNotify(inventorySlot === null ? '装备已卸回物品栏' : '装备已安装，原装备已返回物品栏')
  }

  const selectInventorySlot = (slot: number) => {
    const stack = storage?.slots.find((entry) => entry.slot === slot)
    if (!stack) return
    if (!getEquipmentDefinition(stack.itemId)) { onNotify(getItemDefinition(stack.itemId)?.kind === 'equipment' ? '装备在 item.json、equipment.json 或 equipmentType.json 中的类别配置不一致' : '请选择库存中的装备物品'); return }
    setSelectedInventorySlot((current) => current?.objectId === objectId && current.slot === slot ? null : { objectId: objectId!, slot })
  }

  const dropOnSlot = (event: DragEvent, group: SlotGroup, size: SlotSize, index: number) => {
    event.preventDefault()
    try {
      const payload = JSON.parse(event.dataTransfer.getData(inventoryDragMime)) as InventoryDragPayload
      if (payload.objectId !== objectId || !Number.isSafeInteger(payload.slot) || payload.slot < 0) throw new Error()
      changeEquipment(group, size, index, payload.slot)
    } catch { onNotify('请从左侧物品栏拖动装备') }
  }

  return <div className="fitting-view">
    <div className="inventory-view-header"><button className="inventory-back" onClick={onClose}><ArrowLeft size={16} />返回宇宙视图</button><div><small>ASSET / FITTING</small><h1>对象装配</h1></div><Wrench size={24} /></div>
    {availableIds.length > 1 && <div className="inventory-source-tabs">{availableIds.map((id) => <button key={id} className={id === objectId ? 'active' : ''} onClick={() => setActiveObjectId(id)}>{objectRepository.get(id)?.displayName ?? id}</button>)}</div>}
    {object && equipment && storage ? <div className="fitting-layout">
      <InventoryPane objectId={object.id} selectedSlot={chosenSlot} onSelectSlot={selectInventorySlot} onSort={(id) => { setSelectedInventorySlot(null); sortInventoryWithFeedback(id, onNotify) }} footer="选择或拖动库存装备，再点击右侧匹配的槽位" />
      <section className="fitting-slots-panel">
        <div className="fitting-slots-heading"><div><small>{object.kind === 'station' ? 'STATION / FITTING' : 'SHIP / FITTING'}</small><h2>{object.displayName}</h2><p>{displayInfo?.typeName} · {displayInfo?.modelName}</p></div><Wrench size={22} /></div>
        <div className="fitting-selection-hint">{chosenEquipment ? `已选择：${chosenEquipment.displayName} · ${chosenEquipment.size} · ${chosenEquipment.subtype.displayName}` : '选择库存装备后点击槽位，或将装备拖到槽位'}</div>
        <div className="fitting-groups">{SLOT_GROUPS.map((group) => {
          const slots = SLOT_SIZES.flatMap((size) => equipment.slots[group][size].map((installedId, index) => ({ size, index, installedId })))
          return <section className="fitting-group" key={group}><h3>{groupLabels[group]}<span>{slots.length}</span></h3>
            {slots.length ? <div className="fitting-slot-list">{slots.map(({ size, index, installedId }) => {
              const installed = installedId ? getEquipmentDefinition(installedId) : undefined
              const compatible = chosenEquipment?.slotGroup === group && chosenEquipment.size === size
              return <div className={`fitting-slot${compatible ? ' compatible' : ''}`} key={`${size}-${index}`}>
                <button className="fitting-slot-target" onClick={() => chosenSlot === null ? onNotify('请先从左侧物品栏选择装备') : changeEquipment(group, size, index, chosenSlot)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOnSlot(event, group, size, index)} title={`${groupLabels[group]} ${size} ${index + 1}${installed ? ` · ${installed.displayName}` : ' · 空槽位'}`}>
                  <span className="fitting-slot-icon">{installedId ? <ItemGlyph itemId={installedId} item={getItemDefinition(installedId)} variant="inventory" /> : <PackageOpen size={27} />}</span>
                  <span className="fitting-slot-details"><small>{size} · {String(index + 1).padStart(2, '0')}</small><strong>{installed?.displayName ?? '空槽位'}</strong>{installed && <em>{installed.subtype.displayName}</em>}</span>
                </button>
                {installedId && <button className="fitting-uninstall" onClick={() => changeEquipment(group, size, index, null)}>卸下</button>}
              </div>
            })}</div> : <p className="fitting-empty-group">该型号没有此类槽位</p>}
          </section>
        })}</div>
      </section>
    </div> : <div className="inventory-unavailable">没有可装配的对象</div>}
  </div>
}
