import { ArrowBigRight, Ban, Crosshair, FastForward, Target, Trash, Wrench, type LucideIcon } from 'lucide-react'

/** Presentation mapping only; object capabilities still determine which actions are available. */
export const objectActionIcons: Readonly<Record<string, LucideIcon>> = {
  attack: Crosshair,
  move: ArrowBigRight,
  'warp-to': FastForward,
  stop: Ban,
  'fit-equipment': Wrench,
  'self-destruct': Trash
}

export function resolveObjectActionIcon(actionId: string): LucideIcon {
  return objectActionIcons[actionId] ?? Target
}
