import { loadOrbitalObjects, serializeOrbitalObjects } from '../domain/objects'
import { parseOrbitalSave } from '../domain/orbitalSave'
import { useGameStore } from './gameStore'
import { createJsonFileSave } from './jsonFileSave'

let migratedLegacySave = false
const orbitalFile = createJsonFileSave({
  endpoint: '/api/save/orbital-objects',
  fileName: 'save/orbital-objects.json',
  parse: (value) => {
    migratedLegacySave = Boolean(value && typeof value === 'object' && (value as { schemaVersion?: unknown }).schemaVersion === 1)
    return parseOrbitalSave(value)
  },
  apply: (save) => loadOrbitalObjects(save, useGameStore.getState().starAuLengthFactor).reassigned || migratedLegacySave,
  snapshot: serializeOrbitalObjects
})

export const onOrbitalSaveError = orbitalFile.onError

export const loadOrbitalFile = orbitalFile.load

export const scheduleOrbitalFileSave = orbitalFile.schedule
