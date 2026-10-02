import type { JSX, SVGProps } from 'react'
import shipDefinitions from '../../../assets/legacy/ship.json'
import shipTypeDefinitions from '../../../assets/legacy/shipType.json'
import { shipTypeIconArtwork, type ShipIconArtwork } from './shipTypeIconArtwork'

type ShipIconProps = SVGProps<SVGSVGElement>
type ShipIconComponent = (props: ShipIconProps) => JSX.Element

const fallbackArtwork: ShipIconArtwork = shipTypeIconArtwork.Shuttle

function createShipIcon(artwork: ShipIconArtwork): ShipIconComponent {
  return function ShipIcon(props: ShipIconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
        <path
          d={artwork.hull}
          style={{ fill: 'currentColor', fillOpacity: 0.38, stroke: 'currentColor', strokeWidth: 1.25, strokeLinejoin: 'round', strokeLinecap: 'round' }}
        />
      </svg>
    )
  }
}

// shipType.json is a two-level taxonomy. Property names inside a leaf are not ship types.
const shipTypeIds = [...new Set(
  Object.entries(shipTypeDefinitions).flatMap(([family, variants]) => [family, ...Object.keys(variants)])
)]

/** New content types can be detected before a bespoke silhouette is drawn. */
export const unconfiguredShipIconTypes = shipTypeIds.filter((id) => !(id in shipTypeIconArtwork))

/** Overview and star map consume exactly the same artwork and color source. */
export const shipTypeIconRegistry: Readonly<Record<string, ShipIconComponent>> = Object.fromEntries(
  shipTypeIds.map((id) => [
    id,
    createShipIcon(shipTypeIconArtwork[id as keyof typeof shipTypeIconArtwork] ?? fallbackArtwork)
  ])
)

const fallbackIcon = createShipIcon(fallbackArtwork)
const shipDefinitionsById = shipDefinitions as Record<string, { shipType?: string }>

export function resolveShipType(definitionId?: string): string | undefined {
  return definitionId ? shipDefinitionsById[definitionId]?.shipType : undefined
}

export function resolveShipTypeIcon(shipType?: string): ShipIconComponent {
  return (shipType && shipTypeIconRegistry[shipType]) || fallbackIcon
}
