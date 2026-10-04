import equipmentTypeDefinitions from '../../../assets/legacy/equipmentType.json'
import itemTypeIcons from './itemIconManifest.json'
import itemIconOverrides from './itemIconOverrides.json'
import iconData from './itemIconData.json'

export const itemTypeIconRegistry = itemTypeIcons as Readonly<Record<string, string>>
export const itemIconRegistry = itemIconOverrides as Readonly<Record<string, string>>
const fallbackIconId = 'mdi:cog-outline'

type EquipmentTypeEntry = { subEquipmentType?: Record<string, { icon?: string }> }

/** Equipment subtype Iconify IDs are read through this shared registry. */
export const equipmentTypeIconRegistry: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(equipmentTypeDefinitions as Record<string, EquipmentTypeEntry>)
    .flatMap((parent) => Object.entries(parent.subEquipmentType ?? {}))
    .filter(([, subtype]) => Boolean(subtype.icon))
    .map(([id, subtype]) => [id, subtype.icon!])
)

export function resolveItemIconId(itemId: string, itemType: string, equipmentType?: string): string | undefined {
  if (itemType === 'chemical') return undefined
  if (itemIconRegistry[itemId]) return itemIconRegistry[itemId]
  return itemType === 'equipment' && equipmentType
    ? equipmentTypeIconRegistry[equipmentType] ?? itemTypeIconRegistry[itemType] ?? fallbackIconId
    : itemTypeIconRegistry[itemType] ?? fallbackIconId
}

export function resolveItemIconData(itemId: string, itemType: string, equipmentType?: string) {
  const iconId = resolveItemIconId(itemId, itemType, equipmentType) ?? fallbackIconId
  return iconData[iconId as keyof typeof iconData] ?? iconData[fallbackIconId]
}
