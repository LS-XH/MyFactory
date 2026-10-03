import { z } from 'zod'
import catalog from '../../assets/catalog.json'
import type { ContentRepository } from './contracts'
import { getItemDefinition } from './items'
import { formulasForFactory, surfaceFactories, surfaceFormulas } from './surfaceContent'

const itemSchema = z.object({ id: z.string(), name: z.string(), kind: z.enum(['chemical', 'material', 'product', 'equipment']), state: z.enum(['solid', 'liquid', 'gas']).optional(), equipmentType: z.string().optional() })
const factorySchema = z.object({ id: z.string(), name: z.string(), type: z.string(), color: z.string(), status: z.string(), power: z.number().optional(), recipe: z.string().optional(), inputs: z.array(z.string()).optional(), outputs: z.array(z.string()).optional(), rate: z.number().optional(), capacity: z.number().optional() })
const catalogSchema = z.object({ schemaVersion: z.number(), starSystem: z.object({ id: z.string(), name: z.string(), subtitle: z.string(), star: z.object({ name: z.string(), class: z.string(), temperature: z.string() }), bodies: z.array(z.any()) }), factoryTypes: z.array(z.object({ id: z.string(), label: z.string(), icon: z.string() })), factories: z.array(factorySchema), items: z.array(itemSchema), recipes: z.array(z.any()) })

export type Catalog = z.infer<typeof catalogSchema>
export type FactoryDefinition = Catalog['factories'][number]
export type ItemDefinition = Catalog['items'][number]
export type BodyDefinition = Catalog['starSystem']['bodies'][number]

export type FactoryNodeState = {
  id: string
  factoryId: string
  surfaceId?: string
  x: number
  y: number
  buffer: number
  progress: number
  status: 'online' | 'blocked' | 'idle'
  inventory?: Record<string, number>
  recipeId?: string
}

export type FactoryEdgeState = { id: string; source: string; target: string; itemId: string; flow: number; transferProgress?: number }

const surfaceTypeToCategory: Record<string, string> = { Electric: 'power', Miner: 'mining', Production: 'production', Synthesis: 'production', Logistics: 'logistics', Transportation: 'transport', Megastructure: 'megascale' }
const surfaceColors: Record<string, string> = { power: '#f7c85b', mining: '#e58b5c', production: '#53d5c4', logistics: '#6da9ff', transport: '#b18cff', megascale: '#ff7a9a' }

export const surfaceFactoryDefinitions: FactoryDefinition[] = Object.entries(surfaceFactories).map(([id, factory]) => {
  const category = surfaceTypeToCategory[factory.factoryType] ?? 'production'
  const formulas = formulasForFactory(id).map(([, formula]) => formula)
  return {
    id, name: factory.displayName, type: category, color: surfaceColors[category], status: '可用',
    inputs: [...new Set(formulas.flatMap((formula) => Object.keys(formula.input)))],
    outputs: [...new Set(formulas.flatMap((formula) => Object.keys(formula.output)))],
    recipe: formulasForFactory(id)[0]?.[0]
  }
})

export const content = catalogSchema.parse(catalog)

export const contentRepository: ContentRepository = {
  getFactory: (id) => getFactory(id),
  getAllFactories: () => [...content.factories, ...surfaceFactoryDefinitions]
}

export function getFactory(factoryId: string) {
  return content.factories.find((factory) => factory.id === factoryId) ?? surfaceFactoryDefinitions.find((factory) => factory.id === factoryId)
}

export function getItem(itemId: string) {
  const legacy = getItemDefinition(itemId)
  return content.items.find((item) => item.id === itemId) ?? (legacy ? { id: itemId, name: legacy.displayName, kind: legacy.kind, state: 'state' in legacy ? legacy.state : undefined, equipmentType: 'equipmentType' in legacy ? legacy.equipmentType : undefined, primaryElementId: 'primaryElementId' in legacy ? legacy.primaryElementId : undefined } : undefined)
}

export function getRecipe(recipeId: string) {
  const example = content.recipes.find((recipe) => recipe.id === recipeId) as { id: string; name: string; duration: number; inputs: { item: string; amount: number }[]; outputs: { item: string; amount: number }[] } | undefined
  if (example) return example
  const formula = surfaceFormulas[recipeId]
  return formula ? { id: recipeId, name: formula.displayName, duration: 0, inputs: Object.entries(formula.input).map(([item, value]) => ({ item, amount: value.count })), outputs: Object.entries(formula.output).map(([item, value]) => ({ item, amount: value.count })) } : undefined
}

/** Ports use the selected recipe, not the union of every recipe supported by a factory. */
export function getFactoryPortItems(factory: FactoryDefinition, node: FactoryNodeState, minedItemId?: string) {
  if (factory.id === 'MiningStation') {
    const items = minedItemId ? [minedItemId] : []
    return { inputs: items, outputs: items }
  }
  const recipe = getRecipe(node.recipeId ?? factory.recipe ?? '')
  return recipe
    ? { inputs: [...new Set(recipe.inputs.map((input) => input.item))], outputs: [...new Set(recipe.outputs.map((output) => output.item))] }
    : { inputs: [...new Set(factory.inputs ?? [])], outputs: [...new Set(factory.outputs ?? [])] }
}

export const defaultNodes: FactoryNodeState[] = [
  { id: 'node-mine', factoryId: 'ore-mine', x: 90, y: 170, buffer: 0, progress: 0.36, status: 'online' },
  { id: 'node-refinery', factoryId: 'refinery', x: 410, y: 170, buffer: 2, progress: 0.68, status: 'online' },
  { id: 'node-storage', factoryId: 'storage', x: 750, y: 170, buffer: 41, progress: 0, status: 'online' }
]

export const defaultEdges: FactoryEdgeState[] = [
  { id: 'edge-mine-refinery', source: 'node-mine', target: 'node-refinery', itemId: 'ferrite-ore', flow: 0.92 },
  { id: 'edge-refinery-storage', source: 'node-refinery', target: 'node-storage', itemId: 'iron-ingot', flow: 0.66 }
]
