export function CornerFrame({ x = 0, y = 0, half, corner }: { x?: number; y?: number; half: number; corner: number }) {
  const left = x - half
  const right = x + half
  const top = y - half
  const bottom = y + half
  return <path className="celestial-frame" vectorEffect="non-scaling-stroke" d={`M${left + corner} ${top}H${left}V${top + corner} M${right - corner} ${top}H${right}V${top + corner} M${left} ${bottom - corner}V${bottom}H${left + corner} M${right} ${bottom - corner}V${bottom}H${right - corner}`} />
}

