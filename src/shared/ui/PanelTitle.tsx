import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { ICON_SIZES } from '../../config/visualTokens'

export function PanelTitle({ eyebrow, title, icon: Icon }: { eyebrow: string; title: string; icon: LucideIcon }) {
  return <div className="panel-title"><Icon size={ICON_SIZES.panelTitle} /><div><small>{eyebrow}</small><h2>{title}</h2></div><button className="icon-button"><MoreHorizontal size={ICON_SIZES.topBar} /></button></div>
}

