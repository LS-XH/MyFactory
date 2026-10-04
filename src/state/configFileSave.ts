import { createConfigSave, gameSettingsSchema, parseConfigSave } from '../domain/configSave'
import { useGameStore } from './gameStore'
import { createJsonFileSave } from './jsonFileSave'

let missingKmToAu = false
let missingStarMapGridSpacingAu = false
let missingStarMapGridFadeThresholds = false
const configFile = createJsonFileSave({
  endpoint: '/api/save/config',
  fileName: 'save/config.json',
  parse: (value) => {
    const settings = value && typeof value === 'object' ? (value as { settings?: unknown }).settings : undefined
    missingKmToAu = Boolean(settings && typeof settings === 'object' && !('kmToAu' in settings))
    missingStarMapGridSpacingAu = Boolean(settings && typeof settings === 'object' && !('starMapGridSpacingAu' in settings))
    missingStarMapGridFadeThresholds = Boolean(settings && typeof settings === 'object' && (!('starMapGridFadeStartZoom' in settings) || !('starMapGridFadeEndZoom' in settings)))
    return parseConfigSave(value)
  },
  apply: (save) => { useGameStore.setState(save.settings); return missingKmToAu || missingStarMapGridSpacingAu || missingStarMapGridFadeThresholds },
  snapshot: () => createConfigSave(gameSettingsSchema.parse(useGameStore.getState()))
})

export const loadConfigFile = configFile.load
export const scheduleConfigFileSave = configFile.schedule
export const onConfigSaveError = configFile.onError
