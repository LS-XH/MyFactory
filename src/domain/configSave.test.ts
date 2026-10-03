import { describe, expect, it } from 'vitest'
import { DEFAULT_GAME_SETTINGS } from '../config/gameplay'
import { configSaveSchema, createConfigSave, gameSettingsSchema, parseConfigSave } from './configSave'

const configFile = createConfigSave(gameSettingsSchema.parse(DEFAULT_GAME_SETTINGS))

describe('file-backed game settings', () => {
  it('round-trips the default settings', () => {
    expect(configSaveSchema.parse(configFile).settings).toEqual(DEFAULT_GAME_SETTINGS)
    expect(createConfigSave(gameSettingsSchema.parse(DEFAULT_GAME_SETTINGS))).toEqual(configFile)
  })

  it('loads older settings with an icon floor at or below the icon tier', () => {
    const { surfaceIconMinZoom: _oldMissingField, ...oldSettings } = configFile.settings
    const parsed = parseConfigSave({ version: 1, settings: { ...oldSettings, surfaceCardCompactMaxZoom: 0.125 } })
    expect(parsed.settings.surfaceIconMinZoom).toBe(0.125)
  })

  it('fills in the star-layer transition thresholds from older config files', () => {
    const { overviewFadeStartZoom: _overviewStart, overviewFadeEndZoom: _overviewEnd, systemFadeStartZoom: _systemStart, systemFadeEndZoom: _systemEnd, ...oldSettings } = configFile.settings
    const parsed = parseConfigSave({ version: 1, settings: oldSettings })
    expect(parsed.settings.overviewFadeStartZoom).toBe(DEFAULT_GAME_SETTINGS.overviewFadeStartZoom)
    expect(parsed.settings.overviewFadeEndZoom).toBe(DEFAULT_GAME_SETTINGS.overviewFadeEndZoom)
    expect(parsed.settings.systemFadeStartZoom).toBe(DEFAULT_GAME_SETTINGS.systemFadeStartZoom)
    expect(parsed.settings.systemFadeEndZoom).toBe(DEFAULT_GAME_SETTINGS.systemFadeEndZoom)
  })

  it('rejects invalid versions, ranges, and threshold order', () => {
    expect(configSaveSchema.safeParse({ ...configFile, version: 2 }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, orbitFps: 241 } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, objectIconMinZoom: 256 } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, overviewFadeStartZoom: 2 } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, systemFadeEndZoom: 1 } }).success).toBe(false)
  })
})
