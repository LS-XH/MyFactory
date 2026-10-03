import { describe, expect, it, vi } from 'vitest'
import { createFrameRateMeter } from './frameRateMeter'

describe('frame rate meter', () => {
  it('reports completed frames per elapsed second', () => {
    const meter = createFrameRateMeter(1000)
    meter.recordFrame(0)
    for (const now of [250, 500, 750, 1000]) meter.recordFrame(now)
    expect(meter.getSnapshot()).toBe(4)

    for (const now of [1250, 1500, 1750, 2000]) meter.recordFrame(now)
    expect(meter.getSnapshot()).toBe(4)
  })

  it('resets after a loop restart or hidden tab and notifies subscribers', () => {
    const meter = createFrameRateMeter(1000)
    const listener = vi.fn()
    const unsubscribe = meter.subscribe(listener)
    meter.recordFrame(0)
    meter.recordFrame(1000)
    expect(meter.getSnapshot()).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)

    meter.reset()
    expect(meter.getSnapshot()).toBe(0)
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    meter.recordFrame(2000)
    meter.recordFrame(3000)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
