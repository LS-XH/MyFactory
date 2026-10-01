import { describe, expect, it } from 'vitest'
import { defaultNodes } from './content'
import { SimulationEngine } from './simulation'

describe('SimulationEngine', () => {
  it('advances an online mining node and leaves pause deterministic', () => {
    const before = defaultNodes[0]
    const paused = SimulationEngine.step([before], 0)[0]
    const running = SimulationEngine.step([before], 1)[0]
    expect(paused).toEqual(before)
    expect(running.buffer).toBeGreaterThan(before.buffer)
    expect(running.status).toBe('online')
  })

  it('marks a refinery blocked when it has no input material', () => {
    const refinery = defaultNodes[1]
    const result = SimulationEngine.step([{ ...refinery, buffer: 0 }], 1)[0]
    expect(result.status).toBe('blocked')
  })
})
