import { Icon } from '@iconify/react/offline'
import type { CSSProperties } from 'react'
import { getItem } from '../../domain/content'
import { getItemDefinition } from '../../domain/items'
import { resolveItemIconData } from './itemIconRegistry'
import { resolveItemColor } from './itemVisualRegistry'
import { useItemInteraction } from './ItemInteraction'
import './itemGlyph.css'

type ItemVisualData = {
  itemType: string
  itemState?: string
  equipmentType?: string
  primaryElementId?: string
}

export type ItemGlyphVariant = 'inline' | 'inventory' | 'chip' | 'codex'

type ItemGlyphProps = {
  itemId: string
  item?: ItemVisualData
  variant?: ItemGlyphVariant
  className?: string
  interactive?: boolean
  stopPropagation?: boolean
}

function ChemicalFormula({ formula }: { formula: string }) {
  return <span className="chemical-formula">{formula.split(/(\d+)/).filter(Boolean).map((part, index) =>
    /^\d+$/.test(part) ? <sub key={index}>{part}</sub> : <span key={index}>{part}</span>
  )}</span>
}

/** Shared UI entry point for chemical formulas and Iconify-backed item types. */
export function ItemGlyph({ itemId, item, variant = 'inline', className = '', interactive = true, stopPropagation = true }: ItemGlyphProps) {
  const interaction = useItemInteraction()
  const definition = item ?? getItemDefinition(itemId) ?? getItem(itemId)
  const stateClass = definition?.itemType === 'chemical' ? ` chemical chemical-${(definition.itemState ?? 'solid').toLowerCase()}` : ''
  const canInteract = interactive && !!interaction && !!definition
  const classes = `item-glyph item-glyph--${variant}${stateClass}${canInteract ? ' item-glyph--interactive nodrag' : ''}${className ? ` ${className}` : ''}`
  const formulaLength = itemId.replace(/\d/g, '').length + (itemId.match(/\d/g)?.length ?? 0) * 0.7
  const formulaSize = definition?.itemType === 'chemical' && (variant === 'inventory' || variant === 'codex')
    ? Math.min(variant === 'inventory' ? 20 : 14, (variant === 'inventory' ? 46 : 40) / (Math.max(2, formulaLength) * 0.62))
    : undefined
  const style = {
    '--item-color': resolveItemColor(itemId, definition),
    ...(formulaSize ? { '--formula-font-size': `${formulaSize}px` } : {})
  } as CSSProperties

  const interactionProps = canInteract ? {
    'data-item-id': itemId,
    role: 'button' as const,
    tabIndex: 0,
    title: `${getItemDefinition(itemId)?.displayName ?? getItem(itemId)?.name ?? itemId} · 单击查看详情，双击查看配方`,
    'aria-label': `${getItemDefinition(itemId)?.displayName ?? getItem(itemId)?.name ?? itemId}，单击查看详情，双击查看配方`,
    onClick: (event: React.MouseEvent) => { if (stopPropagation) event.stopPropagation(); interaction?.selectItem(itemId) },
    onDoubleClick: (event: React.MouseEvent) => { if (stopPropagation) event.stopPropagation(); interaction?.openItemRecipes(itemId) },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      if (event.shiftKey) interaction?.openItemRecipes(itemId)
      else interaction?.selectItem(itemId)
    }
  } : {}

  if (!definition) return <span className={classes} style={style}>?</span>
  if (definition.itemType === 'chemical') return <span className={classes} style={style} {...interactionProps}><ChemicalFormula formula={itemId} /></span>
  return <span className={classes} style={style} {...interactionProps}><Icon icon={resolveItemIconData(itemId, definition.itemType, definition.equipmentType)} aria-hidden="true" /></span>
}
