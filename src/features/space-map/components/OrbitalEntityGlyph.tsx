import { Radio, Rocket } from 'lucide-react'

export function OrbitalEntityGlyph({ kind, radius }: { kind: 'station' | 'ship'; radius: number }) {
  const geometry = { className: 'entity-glyph', x: -radius, y: -radius, width: radius * 2, height: radius * 2, strokeWidth: 1.6 }
  return kind === 'station' ? <Radio {...geometry} /> : <Rocket {...geometry} />
}

