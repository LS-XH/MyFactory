import equipmentJson from '../../assets/legacy/equipment.json'
import equipmentTypeJson from '../../assets/legacy/equipmentType.json'
import { getItemDefinition } from './items'
import type { SlotGroup, SlotSize } from './objects'

export type EquipmentDefinition = {
  displayName: string
  equipmentType: string
  size: SlotSize
  attactDamage?: number
  grants?: string[]
}

type EquipmentTypeDefinition = {
  displayName: string
  slotGroup: SlotGroup
  subEquipmentType: Record<string, { displayName: string; icon?: string; attribute?: Record<string, unknown> }>
}

const equipmentDefinitions = equipmentJson as Record<string, EquipmentDefinition>
const equipmentTypes = equipmentTypeJson as Record<string, EquipmentTypeDefinition>

export function getEquipmentType(equipmentTypeId: string) {
  for (const [parentId, parent] of Object.entries(equipmentTypes)) {
    const subtype = parent.subEquipmentType?.[equipmentTypeId]
    if (subtype) return { id: equipmentTypeId, parentId, parentName: parent.displayName, displayName: subtype.displayName, icon: subtype.icon, attribute: subtype.attribute, slotGroup: parent.slotGroup }
  }
  return undefined
}

export function getEquipmentDefinition(itemId: string) {
  const item = getItemDefinition(itemId)
  const equipment = equipmentDefinitions[itemId]
  if (item?.itemType !== 'equipment' || !equipment || equipment.equipmentType !== item.equipmentType) return undefined
  const equipmentType = getEquipmentType(equipment.equipmentType)
  return equipmentType?.slotGroup ? { ...equipment, subtype: equipmentType, slotGroup: equipmentType.slotGroup } : undefined
}
