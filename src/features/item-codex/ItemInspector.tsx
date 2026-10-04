import { BookOpen, X } from 'lucide-react'
import { getItem } from '../../domain/content'
import { getEquipmentDefinition } from '../../domain/equipment'
import { getItemDefinition, getItemStateName, getItemTypeName } from '../../domain/items'
import { getItemFormulaRelations } from '../../domain/itemCodex'
import { ItemGlyph } from '../../shared/icons/ItemGlyph'
import { resolveItemColor } from '../../shared/icons/itemVisualRegistry'
import './itemCodex.css'

export function ItemInspector({ itemId, onClose, onOpenRecipes }: { itemId: string; onClose: () => void; onOpenRecipes: (itemId: string) => void }) {
  const definition = getItemDefinition(itemId)
  const catalogItem = getItem(itemId)
  const equipment = getEquipmentDefinition(itemId)
  const relations = getItemFormulaRelations(itemId)
  const name = definition?.displayName ?? catalogItem?.name ?? itemId
  const itemType = definition?.itemType ?? catalogItem?.itemType
  const itemState = definition?.itemState ?? catalogItem?.itemState
  const facts = [
    ['物品 ID', itemId],
    ['分类', itemType ? getItemTypeName(itemType) ?? itemType : '未知'],
    ...(itemState ? [['物态', getItemStateName(itemState) ?? itemState]] : []),
    ...(definition?.itemType === 'material' && definition.primaryElementId ? [['主要元素', definition.primaryElementId]] : []),
    ...(definition?.itemType === 'product' && definition.productType ? [['产品类别', definition.productType]] : []),
    ...(definition?.itemType === 'equipment' ? [['装备类型 ID', definition.equipmentType ?? '—']] : []),
    ...(equipment ? [['装备类别', `${equipment.subtype.parentName} / ${equipment.subtype.displayName}`], ['装备尺寸', equipment.size]] : [])
  ]
  return <>
    <div className="inspector-head"><div><small>ITEM DATABASE / 04</small><h2>{name}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭物品详情"><X size={17} /></button></div>
    <div className="inspector-content"><div className="object-identity"><span className="item-inspector-icon" style={{ color: resolveItemColor(itemId, definition ?? catalogItem) }}><ItemGlyph itemId={itemId} variant="inventory" /></span><div><strong>{name}</strong><small>{itemId}</small></div></div>
      <div className="metric-grid"><div className="metric"><span>单件质量</span><strong>{definition ? `${definition.weight.toLocaleString('zh-CN', { maximumFractionDigits: 9 })} kg` : '—'}</strong></div><div className="metric"><span>单件体积</span><strong>{definition ? `${definition.volume.toLocaleString('zh-CN', { maximumFractionDigits: 9 })} m³` : '—'}</strong></div><div className="metric"><span>合成配方</span><strong>{relations.production.length}</strong></div><div className="metric"><span>用途配方</span><strong>{relations.uses.length}</strong></div></div>
      <div className="info-list">{facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <button className="item-inspector-action" onClick={() => onOpenRecipes(itemId)}><BookOpen size={13} /> 查看全部合成路线与用途配方</button>
    </div>
  </>
}
