import { z } from 'zod'
import factoriesJson from '../../assets/legacy/factory.json'
import factoryTypesJson from '../../assets/legacy/factoryType.json'
import formulasJson from '../../assets/legacy/formula.json'
import { getItemDefinition } from './items'

const factorySchema = z.record(z.object({ displayName: z.string(), factoryType: z.string() }))
const formulaSchema = z.record(z.object({
  displayName: z.string(),
  input: z.record(z.object({ count: z.number().positive() })),
  output: z.record(z.object({ count: z.number().positive() })),
  venue: z.array(z.string())
}))

export const surfaceFactories = factorySchema.parse(factoriesJson)
export const surfaceFactoryTypes = z.record(z.string()).parse(factoryTypesJson)
export const surfaceFormulas = formulaSchema.parse(formulasJson)

/** One surface grid cell represents one kilometre. SVG/React Flow Y grows downwards. */
export function toSurfaceGrid(position: { x: number; y: number }) {
  return { x: Math.round(position.x), y: Math.round(position.y) }
}

export function gridToCanvas(position: { x: number; y: number }, pixelsPerCell: number) {
  const grid = toSurfaceGrid(position)
  return { x: grid.x * pixelsPerCell, y: -grid.y * pixelsPerCell }
}

export function canvasToGrid(position: { x: number; y: number }, pixelsPerCell: number) {
  return { x: Math.round(position.x / pixelsPerCell), y: Math.round(-position.y / pixelsPerCell) }
}

/** Reserves are tonnes; item weights are kilograms per item. */
export function itemCountFromTonnes(tonnes: number, itemId: string) {
  const weight = getItemDefinition(itemId)?.weight
  if (!weight || weight <= 0 || !Number.isFinite(tonnes)) return 0
  return Math.max(0, Math.floor(tonnes * 1000 / weight))
}

export function tonnesForItemCount(count: number, itemId: string) {
  const weight = getItemDefinition(itemId)?.weight
  if (!weight || weight <= 0 || !Number.isFinite(count)) return 0
  return Math.max(0, count) * weight / 1000
}

export function formulasForFactory(factoryId: string) {
  return Object.entries(surfaceFormulas).filter(([, formula]) => formula.venue.includes(factoryId))
}
