import planetTypeDefinitions from '../../assets/legacy/planetType.json'

export type PlanetTypeId = keyof typeof planetTypeDefinitions

/** Light, distinct hues remain legible against the dark map and panel backgrounds. */
export const PLANET_TYPE_COLORS: Readonly<Record<PlanetTypeId, string>> = {
  TerrestrialPlanet: '#b9dda9',
  LavalPlanet: '#ffab87',
  OceanlPlanet: '#82ccf5',
  LifelessPlanet: '#c9c4c7',
  MetalPlanet: '#c6d9e4',
  DiamondPlanet: '#e3f5ff',
  IcePlanet: '#b1e9ee',
  FrozenPlanet: '#b8c9f6',
  GasPlanet: '#dfc3f1',
  SilicatePlanet: '#e5c9ac',
  GrasslandPlanet: '#a9e48a',
  SakuraSea: '#f8bed8',
  Stonehenge: '#d4cfbf',
  ScorchedPlanet: '#f4bb94',
  AncientCity: '#f2dda7',
  GodTumulus: '#d3c5fa'
}

export function resolvePlanetTypeColor(planetType?: string, fallback = '#f2a65a'): string {
  return planetType && planetType in PLANET_TYPE_COLORS
    ? PLANET_TYPE_COLORS[planetType as PlanetTypeId]
    : fallback
}
