import { Icon } from '@iconify/react/offline'
import { Atom, CircuitBoard, Cog, Factory, Flame, FlaskConical, Merge, Pickaxe, Radiation, Split, Truck, Wind, type LucideIcon } from 'lucide-react'
import factoryIconData from './factoryIconData.json'
import factoryIconManifest from './factoryIconManifest.json'
import { RobotArmIcon, SolarPanelIcon } from './factoryLucideExtras'
import { resolveFactoryIcon } from './iconRegistry'

const lucideFactoryIcons: Readonly<Record<string, LucideIcon>> = {
  wind: Wind,
  'solar-panel': SolarPanelIcon,
  radiation: Radiation,
  flame: Flame,
  pickaxe: Pickaxe,
  factory: Factory,
  'flask-conical': FlaskConical,
  cog: Cog,
  atom: Atom,
  'circuit-board': CircuitBoard,
  'robot-arm': RobotArmIcon,
  merge: Merge,
  split: Split,
  truck: Truck
}

/** Old Demo IDs still resolve to the same device glyphs without altering saved nodes. */
const legacyFactoryIds: Readonly<Record<string, keyof typeof factoryIconManifest>> = {
  'wind-turbine': 'WindTurbine',
  'ore-mine': 'MiningStation',
  refinery: 'Refinery',
  'belt-mk1': 'Belt',
  'space-elevator': 'SpaceElevator'
}

export const factoryDeviceIconRegistry: Readonly<Record<string, string>> = factoryIconManifest

export function resolveFactoryDeviceIconId(factoryId: string): string | undefined {
  return factoryDeviceIconRegistry[legacyFactoryIds[factoryId] ?? factoryId]
}

type FactoryGlyphProps = {
  factoryId: string
  size?: number
  className?: string
  fallbackCategoryIcon?: string
}

/** Shared device icon for surface cards, build palette, overview and inspection. */
export function FactoryGlyph({ factoryId, size = 24, className, fallbackCategoryIcon }: FactoryGlyphProps) {
  const iconId = resolveFactoryDeviceIconId(factoryId)
  const offlineIcon = iconId ? factoryIconData[iconId as keyof typeof factoryIconData] : undefined
  if (offlineIcon) return <Icon icon={offlineIcon} width={size} height={size} className={className} aria-hidden="true" />
  const DeviceIcon = iconId ? lucideFactoryIcons[iconId] : undefined
  const FallbackIcon = DeviceIcon ?? resolveFactoryIcon(fallbackCategoryIcon)
  return <FallbackIcon size={size} className={className} aria-hidden="true" />
}
