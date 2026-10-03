import { describe, expect, it } from 'vitest'
import { getDefaultPlanet, getResourcePoints } from './spaceMap'
import { gridToCanvas, itemCountFromTonnes, surfaceFormulas, tonnesForItemCount, toSurfaceGrid } from './surfaceContent'
import { stepSurfaceProduction, type SurfaceSimulationState } from './surfaceSimulation'

const defaultPlanet = getDefaultPlanet()
const surfaceId = `${defaultPlanet.starId}/${defaultPlanet.planetId}`
const deposit = getResourcePoints(defaultPlanet.starId, defaultPlanet.planetId)[0]

describe('surface coordinate and production rules', () => {
  it('projects source kilometres onto integer cells with an upward Y axis', () => {
    expect(toSurfaceGrid({ x: 12.6, y: 4.4 })).toEqual({ x: 13, y: 4 })
    expect(gridToCanvas({ x: 13, y: 4 }, 32)).toEqual({ x: 416, y: -128 })
  })

  it('converts tonnes to whole items using item weight in kilograms', () => {
    expect(itemCountFromTonnes(1, 'Fe')).toBe(17)
    expect(tonnesForItemCount(1, 'Fe')).toBeCloseTo(0.056)
  })

  it('mines one whole item and deducts exactly its mass from the deposit', () => {
    const state: SurfaceSimulationState = {
      nodes: [{ id: 'mine', factoryId: 'MiningStation', surfaceId, x: 1, y: 1, buffer: 0, progress: 0, status: 'idle' }],
      edges: [{ id: 'deposit-mine', source: deposit.id, target: 'mine', itemId: deposit.item, flow: 1 }],
      resourceReserves: {}
    }
    expect(stepSurfaceProduction(state, 0)).toBe(state)
    let current = state
    for (let tick = 0; tick < 10; tick++) current = stepSurfaceProduction(current, 1)
    expect(current.nodes[0].inventory?.[deposit.item]).toBe(1)
    expect(current.resourceReserves[deposit.id]).toBeCloseTo(deposit.reserves - tonnesForItemCount(1, deposit.item))
    expect(state.resourceReserves).toEqual({})
  })

  it('runs a formula only after its required item counts are present', () => {
    let state: SurfaceSimulationState = {
      nodes: [{ id: 'refinery', factoryId: surfaceFormulas.MagnetiteOrePurification.venue[0], surfaceId, x: 2, y: 2, buffer: 1, progress: 0, status: 'idle', recipeId: 'MagnetiteOrePurification', inventory: { Magnetite: 1 } }],
      edges: [], resourceReserves: {}
    }
    for (let tick = 0; tick < 10; tick++) state = stepSurfaceProduction(state, 1)
    expect(state.nodes[0].inventory).toEqual({ Magnetite: 0, Fe3O4: 1 })
    state = stepSurfaceProduction(state, 1)
    expect(state.nodes[0].status).toBe('blocked')
  })

  it('transfers only items supported by the currently selected output and input ports', () => {
    const state: SurfaceSimulationState = {
      nodes: [
        { id: 'source', factoryId: 'ChemicalPlant', surfaceId, x: 0, y: 0, buffer: 2, progress: 0, status: 'idle', recipeId: 'SulfurCombustion', inventory: { SO2: 1, HNO3: 1 } },
        { id: 'target', factoryId: 'ChemicalPlant', surfaceId, x: 1, y: 0, buffer: 0, progress: 0, status: 'idle', recipeId: 'SulfuricAcidOverall', inventory: {} }
      ],
      edges: [
        { id: 'valid', source: 'source', target: 'target', itemId: 'SO2', flow: 10 },
        { id: 'stale', source: 'source', target: 'target', itemId: 'HNO3', flow: 10 }
      ],
      resourceReserves: {}
    }
    const next = stepSurfaceProduction(state, 1)
    expect(next.nodes[0].inventory).toEqual({ SO2: 0, HNO3: 1 })
    expect(next.nodes[1].inventory).toEqual({ SO2: 1 })
  })
})
