import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AU_LENGTH_FACTOR, DEFAULT_DISPLAY_RADIUS, GAME_SETTING_LIMITS } from '../config/gameplay'
import { content, defaultEdges, defaultNodes, FactoryEdgeState, FactoryNodeState } from '../domain/content'
import { SimulationEngine } from '../domain/simulation'

export type SceneId = 'system' | 'surface'
export type OverlayId = 'settings' | 'tech' | 'map' | null

type GameState = {
  scene: SceneId
  selectedId: string | null
  selectedKind: 'body' | 'factory' | 'station' | 'ship' | null
  overlay: OverlayId
  surfacePlanet: string
  nodes: FactoryNodeState[]
  edges: FactoryEdgeState[]
  speed: 0 | 1 | 2
  orbitAnimation: boolean
  orbitFps: number
  starDisplayRadius: number
  planetDisplayRadius: number
  moonDisplayRadius: number
  orbitalEntityDisplayRadius: number
  overviewMarkerMinZoom: number
  starAuLengthFactor: number
  planetAuLengthFactor: number
  moonAuLengthFactor: number
  zoomLevel: number
  setScene: (scene: SceneId) => void
  select: (id: string | null, kind?: GameState['selectedKind']) => void
  setOverlay: (overlay: OverlayId) => void
  enterSurface: (planetId: string) => void
  addNode: (factoryId: string, x?: number, y?: number) => void
  moveNode: (id: string, x: number, y: number) => void
  addEdge: (edge: FactoryEdgeState) => void
  removeNode: (id: string) => void
  setSpeed: (speed: 0 | 1 | 2) => void
  toggleOrbitAnimation: () => void
  setOrbitFps: (fps: number) => void
  setStarDisplayRadius: (radius: number) => void
  setPlanetDisplayRadius: (radius: number) => void
  setMoonDisplayRadius: (radius: number) => void
  setOrbitalEntityDisplayRadius: (radius: number) => void
  setOverviewMarkerMinZoom: (zoom: number) => void
  setStarAuLengthFactor: (factor: number) => void
  setPlanetAuLengthFactor: (factor: number) => void
  setMoonAuLengthFactor: (factor: number) => void
  setZoomLevel: (zoom: number) => void
  tick: () => void
  reset: () => void
}

type PersistedGameState = Pick<GameState,
  'scene' | 'selectedId' | 'selectedKind' | 'overlay' | 'surfacePlanet' |
  'nodes' | 'edges' | 'speed' | 'orbitAnimation' | 'orbitFps' |
  'starDisplayRadius' | 'planetDisplayRadius' | 'moonDisplayRadius' | 'orbitalEntityDisplayRadius' | 'overviewMarkerMinZoom' |
  'starAuLengthFactor' | 'planetAuLengthFactor' | 'moonAuLengthFactor' | 'zoomLevel'
>

const initial = { scene: 'system' as SceneId, selectedId: null, selectedKind: null, overlay: null as OverlayId, surfacePlanet: 'aurelia', nodes: defaultNodes, edges: defaultEdges, speed: 1 as 0 | 1 | 2, orbitAnimation: true, orbitFps: GAME_SETTING_LIMITS.orbitFps.default, starDisplayRadius: DEFAULT_DISPLAY_RADIUS.star, planetDisplayRadius: DEFAULT_DISPLAY_RADIUS.planet, moonDisplayRadius: DEFAULT_DISPLAY_RADIUS.moon, orbitalEntityDisplayRadius: DEFAULT_DISPLAY_RADIUS.orbitalEntity, overviewMarkerMinZoom: GAME_SETTING_LIMITS.overviewMarkerMinZoom.default, starAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.star, planetAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.planet, moonAuLengthFactor: DEFAULT_AU_LENGTH_FACTOR.moon, zoomLevel: 1 }

function clampDisplayRadius(radius: number, fallback: number) {
  return Math.min(GAME_SETTING_LIMITS.displayRadius.max, Math.max(GAME_SETTING_LIMITS.displayRadius.min, Number.isFinite(radius) ? radius : fallback))
}

function clampOverviewMarkerMinZoom(zoom: number) {
  return Math.min(GAME_SETTING_LIMITS.overviewMarkerMinZoom.max, Math.max(GAME_SETTING_LIMITS.overviewMarkerMinZoom.min, Number.isFinite(zoom) ? zoom : initial.overviewMarkerMinZoom))
}

function clampAuLengthFactor(factor: number, fallback: number) {
  return Math.min(GAME_SETTING_LIMITS.auLengthFactor.max, Math.max(GAME_SETTING_LIMITS.auLengthFactor.min, Number.isFinite(factor) ? factor : fallback))
}

export const useGameStore = create<GameState>()(persist((set) => ({
  ...initial,
  setScene: (scene) => set({ scene, selectedId: null, selectedKind: null }),
  select: (selectedId, selectedKind = null) => set({ selectedId, selectedKind }),
  setOverlay: (overlay) => set({ overlay }),
  enterSurface: (surfacePlanet) => set({ scene: 'surface', surfacePlanet, selectedId: null, selectedKind: null }),
  addNode: (factoryId, x = 560, y = 360) => set((state) => ({ nodes: [...state.nodes, { id: `node-${factoryId}-${Date.now()}`, factoryId, x, y, buffer: 0, progress: 0, status: 'idle' }] })),
  moveNode: (id, x, y) => set((state) => ({ nodes: state.nodes.map((node) => node.id === id ? { ...node, x, y } : node) })),
  addEdge: (edge) => set((state) => ({ edges: state.edges.some((existing) => existing.id === edge.id) ? state.edges : [...state.edges, edge] })),
  removeNode: (id) => set((state) => ({ nodes: state.nodes.filter((node) => node.id !== id), edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id), selectedId: state.selectedId === id ? null : state.selectedId })),
  setSpeed: (speed) => set({ speed }),
  toggleOrbitAnimation: () => set((state) => ({ orbitAnimation: !state.orbitAnimation })),
  setOrbitFps: (fps) => set({ orbitFps: Math.round(Math.min(GAME_SETTING_LIMITS.orbitFps.max, Math.max(GAME_SETTING_LIMITS.orbitFps.min, Number.isFinite(fps) ? fps : GAME_SETTING_LIMITS.orbitFps.default))) }),
  setStarDisplayRadius: (radius) => set({ starDisplayRadius: clampDisplayRadius(radius, initial.starDisplayRadius) }),
  setPlanetDisplayRadius: (radius) => set({ planetDisplayRadius: clampDisplayRadius(radius, initial.planetDisplayRadius) }),
  setMoonDisplayRadius: (radius) => set({ moonDisplayRadius: clampDisplayRadius(radius, initial.moonDisplayRadius) }),
  setOrbitalEntityDisplayRadius: (radius) => set({ orbitalEntityDisplayRadius: clampDisplayRadius(radius, initial.orbitalEntityDisplayRadius) }),
  setOverviewMarkerMinZoom: (zoom) => set({ overviewMarkerMinZoom: clampOverviewMarkerMinZoom(zoom) }),
  setStarAuLengthFactor: (factor) => set({ starAuLengthFactor: clampAuLengthFactor(factor, initial.starAuLengthFactor) }),
  setPlanetAuLengthFactor: (factor) => set({ planetAuLengthFactor: clampAuLengthFactor(factor, initial.planetAuLengthFactor) }),
  setMoonAuLengthFactor: (factor) => set({ moonAuLengthFactor: clampAuLengthFactor(factor, initial.moonAuLengthFactor) }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.min(1.2, Math.max(0.85, zoomLevel)) }),
  tick: () => set((state) => ({ nodes: SimulationEngine.step(state.nodes, state.speed) })),
  reset: () => set(initial)
}), {
  name: 'my-factory-rts-demo',
  version: 5,
  migrate: (persistedState, version): PersistedGameState => {
    const state = persistedState as PersistedGameState
    const migrated = version < 2
      ? { ...state, starAuLengthFactor: initial.starAuLengthFactor, planetAuLengthFactor: initial.planetAuLengthFactor, moonAuLengthFactor: initial.moonAuLengthFactor }
      : state
    return {
      ...migrated,
      starDisplayRadius: clampDisplayRadius(migrated.starDisplayRadius, initial.starDisplayRadius),
      planetDisplayRadius: clampDisplayRadius(migrated.planetDisplayRadius, initial.planetDisplayRadius),
      moonDisplayRadius: clampDisplayRadius(migrated.moonDisplayRadius, initial.moonDisplayRadius),
      orbitalEntityDisplayRadius: clampDisplayRadius(migrated.orbitalEntityDisplayRadius, initial.orbitalEntityDisplayRadius),
      overviewMarkerMinZoom: clampOverviewMarkerMinZoom(migrated.overviewMarkerMinZoom)
    }
  },
  partialize: (state): PersistedGameState => ({ scene: state.scene, selectedId: state.selectedId, selectedKind: state.selectedKind, overlay: state.overlay, surfacePlanet: state.surfacePlanet, nodes: state.nodes, edges: state.edges, speed: state.speed, orbitAnimation: state.orbitAnimation, orbitFps: state.orbitFps, starDisplayRadius: state.starDisplayRadius, planetDisplayRadius: state.planetDisplayRadius, moonDisplayRadius: state.moonDisplayRadius, orbitalEntityDisplayRadius: state.orbitalEntityDisplayRadius, overviewMarkerMinZoom: state.overviewMarkerMinZoom, starAuLengthFactor: state.starAuLengthFactor, planetAuLengthFactor: state.planetAuLengthFactor, moonAuLengthFactor: state.moonAuLengthFactor, zoomLevel: state.zoomLevel })
}))
