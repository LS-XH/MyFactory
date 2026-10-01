export type SpaceSelectionKind = 'body' | 'station' | 'ship'

export type WorldPoint = { x: number; y: number }

export type OrbitalEntityDefinition = {
  id: string
  kind: 'station' | 'ship'
  name: string
  starId: string
  position: WorldPoint
  orbit: number
  faction: string
}

export type SystemViewProps = {
  selectedId: string | null
  orbitAnimation: boolean
  orbitFps: number
  onSelect: (id: string | null, kind?: SpaceSelectionKind) => void
  onEnterSurface: (id: string) => void
}

