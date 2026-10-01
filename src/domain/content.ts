import { z } from 'zod'
import catalog from '../../assets/catalog.json'
import type { ContentRepository } from './contracts'

const itemSchema = z.object({ id: z.string(), name: z.string(), symbol: z.string(), kind: z.string(), state: z.string(), color: z.string() })
const factorySchema = z.object({ id: z.string(), name: z.string(), type: z.string(), color: z.string(), status: z.string(), power: z.number().optional(), recipe: z.string().optional(), inputs: z.array(z.string()).optional(), outputs: z.array(z.string()).optional(), rate: z.number().optional(), capacity: z.number().optional() })
const catalogSchema = z.object({ schemaVersion: z.number(), starSystem: z.object({ id: z.string(), name: z.string(), subtitle: z.string(), star: z.object({ name: z.string(), class: z.string(), temperature: z.string() }), bodies: z.array(z.any()), entities: z.array(z.any()) }), factoryTypes: z.array(z.object({ id: z.string(), label: z.string(), icon: z.string(), color: z.string() })), factories: z.array(factorySchema), items: z.array(itemSchema), recipes: z.array(z.any()) })

export type Catalog = z.infer<typeof catalogSchema>
export type FactoryDefinition = Catalog['factories'][number]
export type ItemDefinition = Catalog['items'][number]
export type BodyDefinition = Catalog['starSystem']['bodies'][number]

export type FactoryNodeState = {
  id: string
  factoryId: string
  x: number
  y: number
  buffer: number
  progress: number
  status: 'online' | 'blocked' | 'idle'
}

export type FactoryEdgeState = { id: string; source: string; target: string; itemId: string; flow: number }

export const content = catalogSchema.parse(catalog)

export const contentRepository: ContentRepository = {
  getFactory: (id) => content.factories.find((factory) => factory.id === id),
  getAllFactories: () => content.factories
}

export function getFactory(factoryId: string) {
  return content.factories.find((factory) => factory.id === factoryId)
}

export function getItem(itemId: string) {
  return content.items.find((item) => item.id === itemId)
}

export function getRecipe(recipeId: string) {
  return content.recipes.find((recipe) => recipe.id === recipeId) as { id: string; name: string; duration: number; inputs: { item: string; amount: number }[]; outputs: { item: string; amount: number }[] } | undefined
}

// ContentRepository boundary: additional JSON files can be discovered without changing UI code.
export const contentModules = import.meta.glob('../../assets/**/*.json', { eager: true, import: 'default' })
export const legacyContentModules = contentModules

export const defaultNodes: FactoryNodeState[] = [
  { id: 'node-mine', factoryId: 'ore-mine', x: 90, y: 170, buffer: 0, progress: 0.36, status: 'online' },
  { id: 'node-refinery', factoryId: 'refinery', x: 410, y: 170, buffer: 2, progress: 0.68, status: 'online' },
  { id: 'node-storage', factoryId: 'storage', x: 750, y: 170, buffer: 41, progress: 0, status: 'online' }
]

export const defaultEdges: FactoryEdgeState[] = [
  { id: 'edge-mine-refinery', source: 'node-mine', target: 'node-refinery', itemId: 'ferrite-ore', flow: 0.92 },
  { id: 'edge-refinery-storage', source: 'node-refinery', target: 'node-storage', itemId: 'iron-ingot', flow: 0.66 }
]
