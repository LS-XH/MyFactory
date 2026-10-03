import { getItemDefinition } from './items'
import { content, getItem } from './content'
import { surfaceFactories, surfaceFormulas } from './surfaceContent'

export type ItemFormula = {
  id: string
  name: string
  inputs: { itemId: string; count: number }[]
  outputs: { itemId: string; count: number }[]
  venues: string[]
}

const surfaceItemFormulas: ItemFormula[] = Object.entries(surfaceFormulas).map(([id, formula]) => ({
  id,
  name: formula.displayName,
  inputs: Object.entries(formula.input).map(([itemId, value]) => ({ itemId, count: value.count })),
  outputs: Object.entries(formula.output).map(([itemId, value]) => ({ itemId, count: value.count })),
  venues: formula.venue.map((factoryId) => surfaceFactories[factoryId]?.displayName ?? factoryId)
}))

const catalogItemFormulas: ItemFormula[] = (content.recipes as { id: string; name: string; inputs: { item: string; amount: number }[]; outputs: { item: string; amount: number }[] }[]).map((recipe) => ({
  id: recipe.id,
  name: recipe.name,
  inputs: recipe.inputs.map((input) => ({ itemId: input.item, count: input.amount })),
  outputs: recipe.outputs.map((output) => ({ itemId: output.item, count: output.amount })),
  venues: content.factories.filter((factory) => factory.recipe === recipe.id).map((factory) => factory.name)
}))

export const itemFormulas = [...surfaceItemFormulas, ...catalogItemFormulas]

export function getItemFormulaRelations(itemId: string) {
  const production = itemFormulas.filter((formula) => formula.outputs.some((output) => output.itemId === itemId))
  const uses = itemFormulas.filter((formula) => formula.inputs.some((input) => input.itemId === itemId))
  const seen = new Set(production.map((formula) => formula.id))
  const upstream: ItemFormula[] = []
  const queue = production.flatMap((formula) => formula.inputs.map((input) => input.itemId))
  const visitedItems = new Set([itemId])
  for (let index = 0; index < queue.length; index++) {
    const inputId = queue[index]
    if (visitedItems.has(inputId)) continue
    visitedItems.add(inputId)
    for (const formula of itemFormulas) {
      if (!formula.outputs.some((output) => output.itemId === inputId) || seen.has(formula.id)) continue
      seen.add(formula.id)
      upstream.push(formula)
      queue.push(...formula.inputs.map((input) => input.itemId))
    }
  }
  return { production, upstream, uses }
}

export function itemDisplayName(itemId: string) {
  return getItemDefinition(itemId)?.displayName ?? getItem(itemId)?.name ?? itemId
}
