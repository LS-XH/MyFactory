import { describe, expect, it } from 'vitest'
import shipDefinitions from '../../../assets/legacy/ship.json'
import shipTypeDefinitions from '../../../assets/legacy/shipType.json'
import { DamageableCapability, GameObject, MovementCapability } from '../../domain/objects'
import { MOVEMENT_WORLD_UNIT_SCALE } from '../fleet/movement/kinematics'
import { buildShipInspectorData, meterFraction } from './shipInspectorModel'

describe('ship inspector readings', () => {
  it('combines static model data with runtime movement and damage capabilities', () => {
    const ship = new GameObject('test-ship', 'ship', 'Imicus', '侦察 01', {
      ...shipDefinitions.Imicus,
      faction: 'Terran'
    })
    const movement = new MovementCapability(30)
    movement.speed = 15 * MOVEMENT_WORLD_UNIT_SCALE
    movement.headingDegrees = -90
    ship.addCapability(movement)
    ship.addCapability(new DamageableCapability(750, 1200, 500))

    const data = buildShipInspectorData(ship as typeof ship & { kind: 'ship' })

    const configuredTypeName = Object.values(shipTypeDefinitions)
      .flatMap((family) => Object.entries(family))
      .find(([id]) => id === shipDefinitions.Imicus.shipType)?.[1].displayName

    expect(data).toMatchObject({
      typeName: configuredTypeName,
      modelName: '伊米卡斯级',
      modelId: 'Imicus',
      manufacturerName: '人类联邦',
      speed: { current: 15, maximum: 30 },
      headingDegrees: 270,
      shield: { current: 750, maximum: 1000 },
      armor: { current: 1200, maximum: 1500 },
      structure: { current: 500, maximum: 2000 }
    })
    expect(meterFraction(data.speed)).toBe(0.5)
    expect(meterFraction(data.shield)).toBe(0.75)
    expect(meterFraction(data.armor)).toBe(0.8)
    expect(meterFraction(data.structure)).toBe(0.25)
  })

  it('keeps missing or out-of-range data from producing a misleading bar', () => {
    expect(meterFraction({ current: null, maximum: 100 })).toBe(0)
    expect(meterFraction({ current: 20, maximum: 0 })).toBe(0)
    expect(meterFraction({ current: 150, maximum: 100 })).toBe(1)
  })
})
