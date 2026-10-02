import { EntityIcon } from '../../../shared/icons/EntityIcon'

export function OrbitalEntityGlyph({ kind, definitionId, ownerFactionId, radius }: { kind: 'station' | 'ship'; definitionId?: string; ownerFactionId?: string; radius: number }) {
  return <g transform={`translate(${-radius} ${-radius})`}>
    <EntityIcon kind={kind} definitionId={definitionId} ownerFactionId={ownerFactionId} className="entity-glyph" size={radius * 2} />
  </g>
}
