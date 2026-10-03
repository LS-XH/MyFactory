import type { LucideIcon } from 'lucide-react'
import { ICON_SIZES } from '../../config/visualTokens'

export function TopButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void }) {
  return <button className={`top-button${active ? ' active' : ''}`} aria-pressed={active} onClick={onClick}><Icon size={ICON_SIZES.topBar} /><span>{label}</span></button>
}
