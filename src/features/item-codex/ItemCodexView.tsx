import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Search } from 'lucide-react'
import { getAllItemDefinitions, getItemDefinition, itemTypes, type ItemType } from '../../domain/items'
import { getItemFormulaRelations, itemDisplayName, type ItemFormula } from '../../domain/itemCodex'
import { ItemGlyph } from '../../shared/icons/ItemGlyph'
import { useItemInteraction } from '../../shared/icons/ItemInteraction'
import { resolveItemColor } from '../../shared/icons/itemVisualRegistry'
import './itemCodex.css'

const allItems = getAllItemDefinitions()

function useCanvasWidth(mode: 'atlas' | 'recipes') {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(() => setWidth(Math.max(620, element.clientWidth)))
    observer.observe(element)
    setWidth(Math.max(620, element.clientWidth))
    return () => observer.disconnect()
  }, [mode])
  return { ref, width }
}

export function ItemCodexView({ mode, itemId, onBack }: { mode: 'atlas' | 'recipes'; itemId: string | null; onBack: () => void }) {
  const { ref, width } = useCanvasWidth(mode)
  const [selectedItemType, setSelectedItemType] = useState<ItemType | 'all'>('all')
  const [query, setQuery] = useState('')
  const groups = useMemo(() => itemTypes.map((category) => ({
    ...category,
    items: allItems.filter(([id, definition]) => definition.itemType === category.id && (selectedItemType === 'all' || selectedItemType === category.id) && (!query.trim() || `${id} ${definition.displayName}`.toLowerCase().includes(query.trim().toLowerCase())))
  })).filter((group) => selectedItemType === 'all' ? group.items.length > 0 : group.id === selectedItemType), [selectedItemType, query])
  const columns = Math.max(2, Math.floor((width - 48 + 12) / 180))
  const cardWidth = (width - 48 - (columns - 1) * 12) / columns
  let nextY = 25
  const sections = groups.map((group) => {
    const y = nextY
    nextY += 36 + Math.ceil(group.items.length / columns) * 102 + 22
    return { ...group, y }
  })
  const atlasHeight = Math.max(nextY, 260)
  const relations = useMemo(() => itemId ? getItemFormulaRelations(itemId) : null, [itemId])
  const formulaSections = relations ? [
    { title: '合成路线', subtitle: '直接产出该物品的全部配方', formulas: relations.production },
    { title: '用途配方', subtitle: '以该物品为原料的全部配方', formulas: relations.uses },
    { title: '上游原料路线', subtitle: '构成该物品所需的前置配方', formulas: relations.upstream }
  ] : []
  let formulaY = 35
  const formulaLayouts = formulaSections.map((section) => {
    const y = formulaY
    formulaY += 48 + Math.max(1, section.formulas.length) * 112 + 22
    return { ...section, y }
  })

  return <div className="item-codex-view">
    <div className="item-codex-header">
      <div className="item-codex-heading"><button className="item-codex-back" onClick={onBack} aria-label="返回上一视图"><ArrowLeft size={17} /></button><BookOpen size={22} /><div><small>DATABASE / ITEMS</small><h1>{mode === 'atlas' ? '物品图鉴' : `${itemDisplayName(itemId ?? '')} · 配方`}</h1></div></div>
      <span className="item-codex-count">{mode === 'atlas' ? `${allItems.length} ITEMS` : `${(relations?.production.length ?? 0) + (relations?.uses.length ?? 0)} DIRECT FORMULAS`}</span>
    </div>
    {mode === 'atlas' ? <>
      <div className="item-codex-toolbar"><div className="item-codex-filters"><button className={selectedItemType === 'all' ? 'active' : ''} onClick={() => setSelectedItemType('all')}>全部 <small>{allItems.length}</small></button>{itemTypes.map((entry) => <button key={entry.id} className={selectedItemType === entry.id ? 'active' : ''} onClick={() => setSelectedItemType(entry.id)}>{entry.label} <small>{allItems.filter(([, item]) => item.itemType === entry.id).length}</small></button>)}</div><label className="item-codex-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或 ID" aria-label="搜索物品" /></label></div>
      <div className="item-codex-scroll" ref={ref}><svg className="item-codex-svg" width="100%" height={atlasHeight} viewBox={`0 0 ${width} ${atlasHeight}`} role="group" aria-label="按类别排列的物品图鉴">
        {sections.map((group) => <g key={group.id}><text x="24" y={group.y + 14} className="item-codex-section-title">{group.label}</text><text x={width - 24} y={group.y + 14} textAnchor="end" className="item-codex-section-count">{group.items.length} ITEMS</text><line x1="24" x2={width - 24} y1={group.y + 27} y2={group.y + 27} className="item-codex-rule" />
          {group.items.map(([id, definition], index) => {
            const x = 24 + index % columns * (cardWidth + 12)
            const y = group.y + 37 + Math.floor(index / columns) * 102
            const color = resolveItemColor(id, definition)
            return <g key={id}><rect x={x} y={y} width={cardWidth} height="90" rx="3" fill="#10212c" stroke={color} strokeOpacity="0.42" /><foreignObject x={x + 1} y={y + 1} width={cardWidth - 2} height="88"><ItemTile itemId={id} selected={itemId === id} /></foreignObject></g>
          })}
        </g>)}
        {!sections.some((group) => group.items.length) && <text x={width / 2} y="120" textAnchor="middle" className="item-codex-empty">没有匹配的物品</text>}
      </svg></div>
    </> : <div className="item-codex-scroll" ref={ref}><svg className="item-codex-svg" width="100%" height={Math.max(formulaY, 300)} viewBox={`0 0 ${width} ${Math.max(formulaY, 300)}`} role="group" aria-label={`${itemDisplayName(itemId ?? '')}的合成和用途配方`}>
      {formulaLayouts.map((section) => <g key={section.title}><text x="24" y={section.y + 13} className="item-codex-section-title">{section.title}</text><text x={width - 24} y={section.y + 13} textAnchor="end" className="item-codex-section-count">{section.formulas.length} FORMULAS</text><text x="24" y={section.y + 31} className="item-codex-section-note">{section.subtitle}</text>
        {section.formulas.length ? section.formulas.map((formula, index) => <FormulaRow key={formula.id} formula={formula} x={24} y={section.y + 46 + index * 112} width={width - 48} />) : <text x="32" y={section.y + 83} className="item-codex-empty">静态配方中暂无记录</text>}
      </g>)}
    </svg></div>}
  </div>
}

function ItemTile({ itemId, selected }: { itemId: string; selected: boolean }) {
  const interaction = useItemInteraction()
  const definition = getItemDefinition(itemId)!
  return <div className={`item-codex-tile${selected ? ' selected' : ''}`} role="button" tabIndex={0} onClick={() => interaction?.selectItem(itemId)} onDoubleClick={() => interaction?.openItemRecipes(itemId)} onKeyDown={(event) => { if (event.key === 'Enter') interaction?.selectItem(itemId) }}>
    <ItemGlyph itemId={itemId} variant="inventory" /><div><strong>{definition.displayName}</strong><small>{itemId}</small></div>
  </div>
}

function FormulaRow({ formula, x, y, width }: { formula: ItemFormula; x: number; y: number; width: number }) {
  const inputWidth = Math.max(170, width * 0.35)
  const outputX = x + width - inputWidth - 12
  return <g><rect x={x} y={y} width={width} height="102" rx="3" fill="#10212c" stroke="#294554" /><text x={x + 14} y={y + 20} className="item-formula-name">{formula.name}</text><text x={x + width - 14} y={y + 20} textAnchor="end" className="item-codex-section-count">{formula.venues.join(' / ')}</text><path d={`M ${x + inputWidth + 28} ${y + 68} H ${outputX - 26} m -7 -5 l 7 5 l -7 5`} className="item-formula-arrow" />
    <foreignObject x={x + 12} y={y + 32} width={inputWidth} height="65"><div className="item-formula-items">{formula.inputs.map((entry) => <FormulaItem key={entry.itemId} {...entry} />)}</div></foreignObject>
    <foreignObject x={outputX} y={y + 32} width={inputWidth} height="65"><div className="item-formula-items">{formula.outputs.map((entry) => <FormulaItem key={entry.itemId} {...entry} />)}</div></foreignObject>
  </g>
}

function FormulaItem({ itemId, count }: { itemId: string; count: number }) {
  return <div className="item-formula-item"><ItemGlyph itemId={itemId} variant="chip" /><span>{itemDisplayName(itemId)}<small>×{count}</small></span></div>
}
