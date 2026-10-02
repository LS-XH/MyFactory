export type SpaceSelectionKind = 'body' | 'station' | 'ship'

export type WorldPoint = { x: number; y: number }

export type SystemViewProps = {
  selectedIds: string[]
  focusRequest: { objectId: string; requestId: number } | null
  onSelect: (id: string | null, kind?: SpaceSelectionKind, additive?: boolean, targetPosition?: WorldPoint) => void
  onEnterSurface: (id: string) => void
  onNotify: (message: string) => void
}
