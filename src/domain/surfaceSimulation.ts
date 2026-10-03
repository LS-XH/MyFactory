import { SURFACE_PRODUCTION } from '../config/gameplay'
import { getFactory, getFactoryPortItems, type FactoryEdgeState, type FactoryNodeState } from './content'
import { getResourcePoints } from './spaceMap'
import { formulasForFactory, surfaceFactories, surfaceFormulas, tonnesForItemCount } from './surfaceContent'

export type SurfaceSimulationState = { nodes: FactoryNodeState[]; edges: FactoryEdgeState[]; resourceReserves: Record<string, number> }

/** Advances one fixed game tick. The JSON mass remains in tonnes until a miner produces whole items. */
export function stepSurfaceProduction(state: SurfaceSimulationState, speed: 0 | 1 | 2): SurfaceSimulationState {
  if (speed === 0) return state
  const nodes = state.nodes.map((node) => ({ ...node, inventory: { ...node.inventory } }))
  const edges = state.edges.map((edge) => ({ ...edge }))
  const resourceReserves = { ...state.resourceReserves }
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const resourceById = new Map<string, ReturnType<typeof getResourcePoints>[number]>()
  for (const surfaceId of new Set(nodes.map((node) => node.surfaceId).filter((id): id is string => Boolean(id)))) {
    const [starId, ...planetPath] = surfaceId.split('/')
    for (const resource of getResourcePoints(starId, planetPath.join('/'))) resourceById.set(resource.id, resource)
  }
  const minedItemByNodeId = new Map<string, string>()
  for (const edge of edges) {
    if (resourceById.get(edge.source)?.item === edge.itemId && !minedItemByNodeId.has(edge.target)) minedItemByNodeId.set(edge.target, edge.itemId)
  }
  const delta = SURFACE_PRODUCTION.tickSeconds * speed

  for (const node of nodes) {
    if (!node.surfaceId || !surfaceFactories[node.factoryId]) continue
    if (node.factoryId === 'MiningStation') {
      const depositEdge = edges.find((edge) => edge.target === node.id && resourceById.get(edge.source)?.item === edge.itemId)
      const deposit = depositEdge && resourceById.get(depositEdge.source)
      if (!deposit) { node.status = 'idle'; continue }
      const remaining = resourceReserves[deposit.id] ?? deposit.reserves
      const mass = tonnesForItemCount(1, deposit.item)
      if (mass <= 0 || remaining + 1e-9 < mass) { node.status = 'blocked'; continue }
      node.progress += delta / SURFACE_PRODUCTION.miningSecondsPerItem
      if (node.progress >= 1 - 1e-9) {
        const count = Math.min(Math.floor(node.progress + 1e-9), Math.floor((remaining + 1e-9) / mass))
        node.inventory![deposit.item] = (node.inventory![deposit.item] ?? 0) + count
        resourceReserves[deposit.id] = Math.max(0, remaining - count * mass)
        node.progress = Math.max(0, node.progress - count)
      }
      node.status = 'online'
    } else {
      const recipeId = node.recipeId ?? formulasForFactory(node.factoryId)[0]?.[0]
      const formula = recipeId && surfaceFormulas[recipeId]
      if (!formula || !formula.venue.includes(node.factoryId)) { node.status = 'idle'; continue }
      const ready = Object.entries(formula.input).every(([item, amount]) => (node.inventory?.[item] ?? 0) >= amount.count)
      if (!ready) { node.status = 'blocked'; continue }
      node.progress += delta / SURFACE_PRODUCTION.formulaSecondsPerCycle
      if (node.progress >= 1 - 1e-9) {
        for (const [item, amount] of Object.entries(formula.input)) node.inventory![item] -= amount.count
        for (const [item, amount] of Object.entries(formula.output)) node.inventory![item] = (node.inventory![item] ?? 0) + amount.count
        node.progress = Math.max(0, node.progress - 1)
      }
      node.status = 'online'
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    if (!source || !target || !source.surfaceId || source.surfaceId !== target.surfaceId) continue
    const sourceFactory = getFactory(source.factoryId)
    const targetFactory = getFactory(target.factoryId)
    if (!sourceFactory || !targetFactory || targetFactory.id === 'MiningStation'
      || !getFactoryPortItems(sourceFactory, source, minedItemByNodeId.get(source.id)).outputs.includes(edge.itemId)
      || !getFactoryPortItems(targetFactory, target).inputs.includes(edge.itemId)) continue
    edge.transferProgress = (edge.transferProgress ?? 0) + Math.max(0, edge.flow) * delta
    const count = Math.min(Math.floor(edge.transferProgress + 1e-9), source.inventory?.[edge.itemId] ?? 0)
    if (count > 0) {
      source.inventory![edge.itemId] -= count
      target.inventory![edge.itemId] = (target.inventory![edge.itemId] ?? 0) + count
      edge.transferProgress = Math.max(0, edge.transferProgress - count)
    }
    // A stalled connection cannot accumulate an unlimited burst of transfer credits.
    edge.transferProgress = Math.min(edge.transferProgress, 1)
  }
  for (const node of nodes) if (node.surfaceId) node.buffer = Object.values(node.inventory ?? {}).reduce((total, count) => total + count, 0)
  return { nodes, edges, resourceReserves }
}
