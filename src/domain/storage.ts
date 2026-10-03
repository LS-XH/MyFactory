import type { ObjectAction, ObjectCapability } from './objects'
import { getItemDefinition, getItemOrder } from './items'

export type InventoryStack = { slot: number; itemId: string; quantity: number }
export type StorageMoveResult = { ok: true } | { ok: false; reason: string }

function stackVolume(stack: InventoryStack) { return (getItemDefinition(stack.itemId)?.volume ?? 0) * stack.quantity }
function stackWeight(stack: InventoryStack) { return (getItemDefinition(stack.itemId)?.weight ?? 0) * stack.quantity }

export class StorageCapability implements ObjectCapability {
  readonly id = 'storage' as const
  slots: InventoryStack[]

  constructor(readonly maxVolume: number, slots: InventoryStack[] = []) {
    if (!Number.isFinite(maxVolume) || maxVolume < 0) throw new Error('储存容量必须是非负有限数')
    this.slots = slots.map((stack) => ({ ...stack }))
    const occupied = new Set<number>()
    for (const stack of this.slots) {
      if (!Number.isSafeInteger(stack.slot) || stack.slot < 0 || !Number.isSafeInteger(stack.quantity) || stack.quantity <= 0 || !getItemDefinition(stack.itemId) || occupied.has(stack.slot)) {
        throw new Error(`无效的物品栏槽位或物品：${stack.itemId}`)
      }
      occupied.add(stack.slot)
    }
    if (this.usedVolume > maxVolume) throw new Error('物品栏中的物品超过储存容量')
    this.sortSlots()
  }

  get usedVolume() { return this.slots.reduce((sum, stack) => sum + stackVolume(stack), 0) }
  get usedWeight() { return this.slots.reduce((sum, stack) => sum + stackWeight(stack), 0) }
  getActions(): ObjectAction[] { return [{ id: 'open-inventory', label: '打开物品栏' }, { id: 'transfer-items', label: '转移物品', target: true, targetCapability: 'storage' }] }
  firstFreeSlot() { let slot = 0; while (this.slots.some((stack) => stack.slot === slot)) slot++; return slot }
  count(itemId: string) { return this.slots.filter((stack) => stack.itemId === itemId).reduce((sum, stack) => sum + stack.quantity, 0) }

  add(itemId: string, quantity: number): boolean {
    const item = getItemDefinition(itemId)
    if (!item || !Number.isSafeInteger(quantity) || quantity <= 0 || this.usedVolume + item.volume * quantity > this.maxVolume) return false
    const existing = this.slots.find((stack) => stack.itemId === itemId)
    if (existing) existing.quantity += quantity
    else this.slots.push({ slot: this.firstFreeSlot(), itemId, quantity })
    this.sortSlots()
    return true
  }

  take(itemId: string, quantity: number): boolean {
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || this.count(itemId) < quantity) return false
    let remaining = quantity
    for (const stack of this.slots.filter((entry) => entry.itemId === itemId)) {
      const taken = Math.min(stack.quantity, remaining)
      stack.quantity -= taken
      remaining -= taken
      if (remaining === 0) break
    }
    this.slots = this.slots.filter((stack) => stack.quantity > 0)
    return true
  }

  sortSlots() { this.slots.sort((a, b) => a.slot - b.slot) }

  /** Merge identical item IDs, then pack stacks in item.json order from slot zero. */
  sortAndStack(): boolean {
    const quantities = new Map<string, number>()
    for (const stack of this.slots) quantities.set(stack.itemId, (quantities.get(stack.itemId) ?? 0) + stack.quantity)
    const sorted = [...quantities].sort(([left], [right]) => getItemOrder(left) - getItemOrder(right))
      .map(([itemId, quantity], slot) => ({ slot, itemId, quantity }))
    const changed = sorted.length !== this.slots.length || sorted.some((stack, index) => {
      const previous = this.slots[index]
      return stack.slot !== previous.slot || stack.itemId !== previous.itemId || stack.quantity !== previous.quantity
    })
    if (changed) this.slots = sorted
    return changed
  }
}

/** Move a whole stack. Same-inventory drops merge or swap; cross-inventory drops respect both volume limits. */
export function moveInventoryStack(source: StorageCapability, sourceSlot: number, target: StorageCapability, targetSlot: number): StorageMoveResult {
  if (!Number.isSafeInteger(sourceSlot) || sourceSlot < 0 || !Number.isSafeInteger(targetSlot) || targetSlot < 0) return { ok: false, reason: '物品栏槽位无效' }
  const moving = source.slots.find((stack) => stack.slot === sourceSlot)
  if (!moving) return { ok: false, reason: '来源槽位没有物品' }
  if (source === target && sourceSlot === targetSlot) return { ok: true }
  const displaced = target.slots.find((stack) => stack.slot === targetSlot)

  if (source === target) {
    if (displaced?.itemId === moving.itemId) {
      displaced.quantity += moving.quantity
      source.slots = source.slots.filter((stack) => stack !== moving)
    } else {
      moving.slot = targetSlot
      if (displaced) displaced.slot = sourceSlot
    }
    source.sortSlots()
    return { ok: true }
  }

  const movingVolume = stackVolume(moving)
  const displacedVolume = displaced?.itemId === moving.itemId ? 0 : displaced ? stackVolume(displaced) : 0
  const sourceAfter = source.usedVolume - movingVolume + displacedVolume
  const targetAfter = target.usedVolume + movingVolume - displacedVolume
  if (sourceAfter > source.maxVolume || targetAfter > target.maxVolume) return { ok: false, reason: '转移后将超过储存体积上限' }

  source.slots = source.slots.filter((stack) => stack !== moving)
  if (displaced?.itemId === moving.itemId) displaced.quantity += moving.quantity
  else {
    if (displaced) {
      target.slots = target.slots.filter((stack) => stack !== displaced)
      source.slots.push({ ...displaced, slot: sourceSlot })
    }
    target.slots.push({ ...moving, slot: targetSlot })
  }
  source.sortSlots()
  target.sortSlots()
  return { ok: true }
}
