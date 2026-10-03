import { loadOrbitalObjects, serializeOrbitalObjects } from '../domain/objects'
import { orbitalSaveSchema } from '../domain/orbitalSave'
import { useGameStore } from './gameStore'
import { createJsonFileSave } from './jsonFileSave'

const orbitalFile = createJsonFileSave({
  endpoint: '/api/save/orbital-objects',
  fileName: 'save/orbital-objects.json',
  parse: (value) => orbitalSaveSchema.parse(value),
  apply: (save) => loadOrbitalObjects(save, useGameStore.getState().starAuLengthFactor).reassigned,
  snapshot: serializeOrbitalObjects
})

export const onOrbitalSaveError = orbitalFile.onError

export const loadOrbitalFile = orbitalFile.load

export const scheduleOrbitalFileSave = orbitalFile.schedule
