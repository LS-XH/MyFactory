import equipmentTypeDefinitions from '../../../assets/legacy/equipmentType.json'
import itemKindIcons from './itemIconManifest.json'
import itemIconOverrides from './itemIconOverrides.json'
import type { ItemKind } from '../../domain/items'
import iconData from './itemIconData.json'

export const itemKindIconRegistry = itemKindIcons as Readonly<Record<Exclude<ItemKind, 'chemical'>, string>>
export const itemIconRegistry = itemIconOverrides as Readonly<Record<string, string>>

type EquipmentTypeEntry = { subEquipmentType?: Record<string, { icon?: string }> }

/** Equipment subtype Iconify IDs are read through this shared registry. */
export const equipmentTypeIconRegistry: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(equipmentTypeDefinitions as Record<string, EquipmentTypeEntry>)
    .flatMap((parent) => Object.entries(parent.subEquipmentType ?? {}))
    .filter(([, subtype]) => Boolean(subtype.icon))
    .map(([id, subtype]) => [id, subtype.icon!])
)

export function resolveItemIconId(itemId: string, kind: ItemKind, equipmentType?: string): string | undefined {
  if (kind === 'chemical') return undefined
  if (itemIconRegistry[itemId]) return itemIconRegistry[itemId]
  return kind === 'equipment' && equipmentType
    ? equipmentTypeIconRegistry[equipmentType] ?? itemKindIconRegistry.equipment
    : itemKindIconRegistry[kind]
}

export function resolveItemIconData(itemId: string, kind: Exclude<ItemKind, 'chemical'>, equipmentType?: string) {
  const iconId = resolveItemIconId(itemId, kind, equipmentType)!
  return iconData[iconId as keyof typeof iconData] ?? iconData['mdi:cog-outline']
}
