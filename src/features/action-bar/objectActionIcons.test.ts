import { ArrowBigRight, Ban, Crosshair, FastForward, Target, Trash, Wrench } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { resolveObjectActionIcon } from './objectActionIcons'

describe('object action icons', () => {
  it('maps the six orbital commands to their requested Lucide icons', () => {
    expect(resolveObjectActionIcon('attack')).toBe(Crosshair)
    expect(resolveObjectActionIcon('move')).toBe(ArrowBigRight)
    expect(resolveObjectActionIcon('warp-to')).toBe(FastForward)
    expect(resolveObjectActionIcon('stop')).toBe(Ban)
    expect(resolveObjectActionIcon('fit-equipment')).toBe(Wrench)
    expect(resolveObjectActionIcon('self-destruct')).toBe(Trash)
  })

  it('keeps a fallback for other capability actions', () => {
    expect(resolveObjectActionIcon('command-craft')).toBe(Target)
  })
})
