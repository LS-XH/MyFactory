import type { EntityKind } from '../../domain/contracts'
import type { SceneId } from '../../state/gameStore'

export type ActionId = 'configure' | 'set-target' | 'attack' | 'move' | 'dock' | 'build-ship' | 'more'

export type ActionContext = {
  scene: SceneId
  actorId?: string
  actorKind?: EntityKind
  targetId?: string
  worldPosition?: { x: number; y: number }
}

export type ActionDefinition = {
  id: ActionId
  label: string
  capability?: string
  isAvailable: (context: ActionContext) => boolean
}

export type ActionHandler = (context: ActionContext) => void | Promise<void>

