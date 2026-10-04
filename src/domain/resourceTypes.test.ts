import { describe, expect, it } from 'vitest'
import { getResourceTypeName, resourceTypes } from './resourceTypes'

describe('resource type catalogue', () => {
  it('reads display names from structured resource definitions', () => {
    expect(resourceTypes.OreVein).toMatchObject({ displayName: '矿脉', itemState: ['solid'] })
    expect(getResourceTypeName('OreVein')).toBe('矿脉')
    expect(getResourceTypeName('Geyser')).toBe('间歇泉')
  })

  it('falls back to the original ID for an unknown resource type', () => {
    expect(getResourceTypeName('UnknownType')).toBe('UnknownType')
  })
})
