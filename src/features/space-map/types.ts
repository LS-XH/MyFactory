export type SpaceSelectionKind = 'body' | 'station' | 'ship'

export type WorldPoint = { x: number; y: number }
export type PendingTargetAction = { id: string; actorIds: string[]; task: boolean; stage: 'target' | 'distance'; targetId?: string; targetPosition?: WorldPoint; targetStarId?: string; appendTask?: boolean }
export type FocusedTask = { objectId: string; taskId: string; requestId: number }

export type SystemViewProps = {
  selectedIds: string[]
  targetingAction: PendingTargetAction | null
  focusedTask: FocusedTask | null
  focusRequest: { objectId: string; requestId: number } | null
  onSelect: (id: string | null, kind?: SpaceSelectionKind, additive?: boolean, targetPosition?: WorldPoint, targetStarId?: string, appendTask?: boolean) => void
  onBeginTargetAction: (actionId: string, actorIds: string[], appendTask: boolean) => void
  onBeginDistanceAction: (actionId: string, actorIds: string[], targetId?: string, targetPosition?: WorldPoint, targetStarId?: string, appendTask?: boolean) => void
  onConfirmDistanceAction: (distanceKm: number, offsetKm: WorldPoint, appendTask: boolean) => void
  onFocusTask: (objectId: string, taskId: string) => void
  onEnterSurface: (id: string) => void
  onNotify: (message: string) => void
  onOpenInventory: (sourceIds: string[], targetId?: string) => void
  onVisibleObjectIdsChange: (ids: string[]) => void
}
