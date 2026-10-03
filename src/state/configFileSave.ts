import { createConfigSave, gameSettingsSchema, parseConfigSave } from '../domain/configSave'
import { useGameStore } from './gameStore'
import { createJsonFileSave } from './jsonFileSave'

const configFile = createJsonFileSave({
  endpoint: '/api/save/config',
  fileName: 'save/config.json',
  parse: parseConfigSave,
  apply: (save) => { useGameStore.setState(save.settings) },
  snapshot: () => createConfigSave(gameSettingsSchema.parse(useGameStore.getState()))
})

export const loadConfigFile = configFile.load
export const scheduleConfigFileSave = configFile.schedule
export const onConfigSaveError = configFile.onError
