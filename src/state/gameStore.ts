import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  setZoomLevel: (zoom: number) => void
  tick: () => void
  reset: () => void
}

const initial = { scene: 'system' as SceneId, selectedId: null, selectedKind: null, overlay: null as OverlayId, surfacePlanet: 'aurelia', nodes: defaultNodes, edges: defaultEdges, speed: 1 as 0 | 1 | 2, orbitAnimation: true, zoomLevel: 1 }

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
  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.min(1.2, Math.max(0.85, zoomLevel)) }),
  tick: () => set((state) => ({ nodes: SimulationEngine.step(state.nodes, state.speed) })),
  reset: () => set(initial)
}), { name: 'my-factory-rts-demo', version: 1, partialize: (state) => ({ scene: state.scene, selectedId: state.selectedId, selectedKind: state.selectedKind, overlay: state.overlay, surfacePlanet: state.surfacePlanet, nodes: state.nodes, edges: state.edges, speed: state.speed, orbitAnimation: state.orbitAnimation, zoomLevel: state.zoomLevel }) }))
