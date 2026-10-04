import itemJson from '../../assets/legacy/item.json'
import itemStateJson from '../../assets/legacy/itemState.json'
import itemTypeJson from '../../assets/legacy/itemType.json'

export type ItemType = keyof typeof itemTypeJson
export type ItemState = Lowercase<keyof typeof itemStateJson & string>

export type ItemDefinition = {
  displayName: string
  itemType: ItemType
  itemState?: ItemState
  volume: number
  weight: number
  primaryElementId?: string
  productType?: string
  equipmentType?: string
}

export const itemTypes: ReadonlyArray<{ id: ItemType; label: string }> = Object.entries(itemTypeJson).map(([id, label]) => ({ id: id as ItemType, label }))
const itemStateNames = new Map(Object.entries(itemStateJson).map(([id, label]) => [id.toLowerCase(), label]))

export function getItemTypeName(itemType: string): string | undefined {
  return itemTypeJson[itemType as ItemType]
}

export function getItemStateName(itemState: string): string | undefined {
  return itemStateNames.get(itemState.toLowerCase())
}

const itemDefinitions = itemJson as unknown as Record<string, ItemDefinition>
for (const [itemId, item] of Object.entries(itemDefinitions)) {
  if (!getItemTypeName(item.itemType)) throw new Error(`物品 ${itemId} 引用了未定义的 itemType：${item.itemType}`)
  if (item.itemState && !getItemStateName(item.itemState)) throw new Error(`物品 ${itemId} 引用了未定义的 itemState：${item.itemState}`)
}
const itemOrder = new Map(Object.keys(itemDefinitions).map((itemId, index) => [itemId, index]))

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return itemDefinitions[itemId]
}

export function getAllItemDefinitions(): [string, ItemDefinition][] {
  return Object.entries(itemDefinitions)
}

/** Preserve the order in which item IDs appear in item.json. */
export function getItemOrder(itemId: string): number {
  return itemOrder.get(itemId) ?? Number.MAX_SAFE_INTEGER
}
