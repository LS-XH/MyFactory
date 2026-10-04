import { ArrowBigRight, ArrowLeftRight, Ban, Crosshair, Eye, FastForward, MoveHorizontal, Orbit, Package, Target, Trash, Wrench, type LucideIcon } from 'lucide-react'

/** Presentation mapping only; object capabilities still determine which actions are available. */
export const objectActionIcons: Readonly<Record<string, LucideIcon>> = {
  attack: Crosshair,
  move: ArrowBigRight,
  orbit: Orbit,
  'keep-distance': MoveHorizontal,
  face: Eye,
  'warp-to': FastForward,
  stop: Ban,
  'fit-equipment': Wrench,
  'self-destruct': Trash,
  'open-inventory': Package,
  'transfer-items': ArrowLeftRight
}

export function resolveObjectActionIcon(actionId: string): LucideIcon {
  return objectActionIcons[actionId] ?? Target
}
