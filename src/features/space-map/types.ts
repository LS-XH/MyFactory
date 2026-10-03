export type SpaceSelectionKind = 'body' | 'station' | 'ship'

export type WorldPoint = { x: number; y: number }
export type PendingTargetAction = { id: string; actorIds: string[]; task: boolean }
export type FocusedTask = { objectId: string; taskId: string; requestId: number }

export type SystemViewProps = {
  selectedIds: string[]
  targetingAction: PendingTargetAction | null
  focusedTask: FocusedTask | null
  focusRequest: { objectId: string; requestId: number } | null
  onSelect: (id: string | null, kind?: SpaceSelectionKind, additive?: boolean, targetPosition?: WorldPoint, targetStarId?: string, appendTask?: boolean) => void
  onFocusTask: (objectId: string, taskId: string) => void
  onEnterSurface: (id: string) => void
  onNotify: (message: string) => void
  onOpenInventory: (sourceIds: string[], targetId?: string) => void
  onVisibleObjectIdsChange: (ids: string[]) => void
}
