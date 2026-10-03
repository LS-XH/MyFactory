import { describe, expect, it } from 'vitest'
import { getAllItemDefinitions } from './items'
import { content } from './content'
import { getItemFormulaRelations, itemDisplayName, itemFormulas } from './itemCodex'
import { surfaceFormulas } from './surfaceContent'

describe('item codex data', () => {
  it('indexes the live item and formula JSON without losing entries', () => {
    expect(getAllItemDefinitions().length).toBeGreaterThan(100)
    expect(itemFormulas).toHaveLength(Object.keys(surfaceFormulas).length + content.recipes.length)
    expect(itemDisplayName('ferrite-ore')).toBe('赤铁矿')
    expect(getItemFormulaRelations('ferrite-ore').uses.map((formula) => formula.id)).toContain('refine-ferrite')
  })

  it('shows every direct synthesis and use, with unique upstream recipes', () => {
    const relations = getItemFormulaRelations('Fe3O4')
    expect(relations.production.map((formula) => formula.id)).toContain('MagnetiteOrePurification')
    expect(relations.uses.map((formula) => formula.id)).toContain('MagnetiteCarbonMonoxideReduction')
    expect(new Set(relations.upstream.map((formula) => formula.id)).size).toBe(relations.upstream.length)
    expect(relations.upstream.every((formula) => !relations.production.includes(formula))).toBe(true)
  })
})
