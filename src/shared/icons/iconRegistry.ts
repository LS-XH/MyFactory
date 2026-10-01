import { Factory, GitBranch, Orbit, Pickaxe, Rocket, Zap, type LucideIcon } from 'lucide-react'

export const factoryIconRegistry: Readonly<Record<string, LucideIcon>> = {
  zap: Zap,
  pickaxe: Pickaxe,
  factory: Factory,
  route: GitBranch,
  rocket: Rocket,
  orbit: Orbit
}

export function resolveFactoryIcon(iconId?: string): LucideIcon {
  return factoryIconRegistry[iconId ?? 'factory'] ?? Factory
}

