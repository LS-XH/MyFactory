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

  it('migrates older files without camera shortcuts or speeds', () => {
    const { cameraKeyUp: _up, cameraKeyLeft: _left, cameraKeyDown: _down, cameraKeyRight: _right, cameraMoveSpeed: _move, cameraBoostSpeed: _boost, ...oldSettings } = configFile.settings
    const parsed = parseConfigSave({ version: 1, settings: oldSettings })
    expect(parsed.settings.cameraKeyUp).toBe('KeyW')
    expect(parsed.settings.cameraKeyRight).toBe('KeyD')
    expect(parsed.settings.cameraMoveSpeed).toBe(DEFAULT_GAME_SETTINGS.cameraMoveSpeed)
    expect(parsed.settings.cameraBoostSpeed).toBe(DEFAULT_GAME_SETTINGS.cameraBoostSpeed)
  })

  it('gives older config files a one-AU map dot interval', () => {
    const { starMapGridSpacingAu: _grid, ...oldSettings } = configFile.settings
    expect(parseConfigSave({ version: 1, settings: oldSettings }).settings.starMapGridSpacingAu).toBe(1)
  })

  it('defaults older files to 800% object focus and validates selectable zoom levels', () => {
    const { objectFocusZoom: _oldMissingField, ...oldSettings } = configFile.settings
    expect(parseConfigSave({ version: 1, settings: oldSettings }).settings.objectFocusZoom).toBe(8)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, objectFocusZoom: 16 } }).success).toBe(true)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, objectFocusZoom: 11 } }).success).toBe(false)
  })

  it('migrates a former dot-grid threshold without changing its visible interval', () => {
    const { starMapGridFadeStartZoom: _start, starMapGridFadeEndZoom: _end, ...oldSettings } = configFile.settings
    const migrated = parseConfigSave({ version: 1, settings: { ...oldSettings, starMapGridAppearZoom: 32 } })
    expect(migrated.settings.starMapGridFadeStartZoom).toBe(16)
    expect(migrated.settings.starMapGridFadeEndZoom).toBe(32)
    expect(parseConfigSave({ version: 1, settings: oldSettings }).settings.starMapGridFadeStartZoom).toBe(DEFAULT_GAME_SETTINGS.starMapGridFadeStartZoom)
    expect(parseConfigSave({ version: 1, settings: oldSettings }).settings.starMapGridFadeEndZoom).toBe(DEFAULT_GAME_SETTINGS.starMapGridFadeEndZoom)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, starMapGridFadeStartZoom: 0 } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, starMapGridFadeStartZoom: 4, starMapGridFadeEndZoom: 2 } }).success).toBe(false)
  })

  it('defaults older files to normal motion and validates the reduced-motion switch', () => {
    const { reduceMotion: _motion, ...oldSettings } = configFile.settings
    expect(parseConfigSave({ version: 1, settings: oldSettings }).settings.reduceMotion).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, reduceMotion: true } }).success).toBe(true)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, reduceMotion: 'yes' } }).success).toBe(false)
  })

  it('rejects invalid versions, ranges, and threshold order', () => {
    expect(configSaveSchema.safeParse({ ...configFile, version: 2 }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, orbitFps: 241 } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, objectIconMinZoom: 256 } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, overviewFadeStartZoom: 2 } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, systemFadeEndZoom: 1 } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, cameraKeyUp: 'KeyS' } }).success).toBe(false)
    expect(configSaveSchema.safeParse({ ...configFile, settings: { ...configFile.settings, cameraBoostSpeed: 100 } }).success).toBe(false)
  })
})
