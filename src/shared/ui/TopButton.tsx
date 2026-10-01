import type { LucideIcon } from 'lucide-react'
import { ICON_SIZES } from '../../config/visualTokens'

export function TopButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return <button className="top-button" onClick={onClick}><Icon size={ICON_SIZES.topBar} /><span>{label}</span></button>
}

