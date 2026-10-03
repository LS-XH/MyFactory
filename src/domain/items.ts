import itemJson from '../../assets/legacy/item.json'

export type ItemKind = 'chemical' | 'material' | 'product' | 'equipment'
export type ItemState = 'solid' | 'liquid' | 'gas'
type ItemBase = {
  displayName: string
  volume: number
  weight: number
}
export type ItemDefinition = ItemBase & (
  | { kind: 'chemical'; state: ItemState }
  | { kind: 'material'; primaryElementId?: string }
  | { kind: 'product'; productType?: string }
  | { kind: 'equipment'; equipmentType: string }
)

const itemDefinitions = itemJson as Record<string, ItemDefinition>
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
