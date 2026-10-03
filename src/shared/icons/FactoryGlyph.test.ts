import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { surfaceFactories } from '../../domain/surfaceContent'
import { FactoryGlyph, factoryDeviceIconRegistry, resolveFactoryDeviceIconId } from './FactoryGlyph'

const expectedIcons: Record<string, string> = {
  WindTurbine: 'wind',
  SolarGenerator: 'solar-panel',
  NuclearPowerStation: 'radiation',
  GeothermalPowerStation: 'flame',
  MiningStation: 'pickaxe',
  Refinery: 'factory',
  ChemicalPlant: 'flask-conical',
  ProcessingStation: 'cog',
  ParticleCollider: 'atom',
  AssemblyStation: 'circuit-board',
  EquipmentManufacturing: 'robot-arm',
  Belt: 'pinhead:three-chevrons-right-above-conveyor-belt',
  Combiner: 'merge',
  Separator: 'split',
  TruckStation: 'truck',
  SpaceElevator: 'cil:elevator'
}

describe('factory device icons', () => {
  it('registers every device in factory.json with the requested icon', () => {
    expect(factoryDeviceIconRegistry).toEqual(expectedIcons)
    expect(Object.keys(factoryDeviceIconRegistry).sort()).toEqual(Object.keys(surfaceFactories).sort())
  })

  it('renders every registered icon from local resources', () => {
    for (const factoryId of Object.keys(surfaceFactories)) {
      const markup = renderToStaticMarkup(createElement(FactoryGlyph, { factoryId, size: 32 }))
      expect(markup, factoryId).toContain('<svg')
      expect(markup, factoryId).toContain('width="32"')
    }
  })

  it('preserves old Demo device IDs', () => {
    expect(resolveFactoryDeviceIconId('ore-mine')).toBe('pickaxe')
    expect(resolveFactoryDeviceIconId('space-elevator')).toBe('cil:elevator')
  })
})
