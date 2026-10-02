import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import shipDefinitions from '../../../assets/legacy/ship.json'
import shipTypeDefinitions from '../../../assets/legacy/shipType.json'
import { DamageableCapability, GameObject, MovementCapability, objectRepository } from '../../domain/objects'
import { shipTypeIconArtwork } from '../../shared/icons/shipTypeIconArtwork'
import { MOVEMENT_WORLD_UNIT_SCALE } from '../fleet/movement/kinematics'
import { Inspector } from './Inspector'

const testId = 'inspector-ship-icon-test'

afterEach(() => objectRepository.remove(testId))

describe('space object inspector', () => {
  it('uses the selected ship model icon instead of a fixed rocket', () => {
    objectRepository.add(new GameObject(testId, 'ship', 'Imicus', '伊米卡斯级', {
      ...shipDefinitions.Imicus,
      starId: 'Solar',
      orbit: 1
    }))

    const markup = renderToStaticMarkup(createElement(Inspector, {
      selectedId: testId,
      scene: 'system',
      onClose: () => undefined,
      onNotify: () => undefined,
      onEnterSurface: () => undefined
    }))

    const configuredArtwork = shipTypeIconArtwork[shipDefinitions.Imicus.shipType as keyof typeof shipTypeIconArtwork]
    expect(markup).toContain(`d="${configuredArtwork.hull}"`)
  })

  it('renders the ship classification, live gauges and compass direction', () => {
    const ship = new GameObject(testId, 'ship', 'Imicus', '侦察 01', {
      ...shipDefinitions.Imicus,
      faction: 'Terran',
      starId: 'Solar',
      orbit: 1
    })
    const movement = new MovementCapability(30)
    movement.speed = 15 * MOVEMENT_WORLD_UNIT_SCALE
    movement.headingDegrees = 90
    ship.addCapability(movement)
    ship.addCapability(new DamageableCapability(750, 1200, 500))
    objectRepository.add(ship)

    const markup = renderToStaticMarkup(createElement(Inspector, {
      selectedId: testId,
      scene: 'system',
      onClose: () => undefined,
      onNotify: () => undefined,
      onEnterSurface: () => undefined
    }))

    expect(markup).toContain('人类联邦')
    expect(markup).toContain('伊米卡斯级')
    const configuredTypeName = Object.values(shipTypeDefinitions)
      .flatMap((family) => Object.entries(family))
      .find(([id]) => id === shipDefinitions.Imicus.shipType)?.[1].displayName
    expect(markup).toContain(configuredTypeName)
    expect(markup).toContain('rotate(90 48 48)')
    expect(markup.match(/role="progressbar"/g)).toHaveLength(4)
    expect(markup).toContain('aria-label="速度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"')
    expect(markup).toContain('aria-label="护盾 HP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="75"')
    expect(markup).toContain('aria-label="船体 HP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="80"')
    expect(markup).toContain('aria-label="结构 HP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="25"')
  })
})
