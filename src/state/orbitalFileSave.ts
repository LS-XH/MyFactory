import { loadOrbitalObjects, serializeOrbitalObjects } from '../domain/objects'

const endpoint = '/api/save/orbital-objects'
let loadPromise: Promise<void> | undefined
let loaded = false
let saveTimer: ReturnType<typeof setTimeout> | undefined
let writeQueue: Promise<void> = Promise.resolve()
let errorHandler: (message: string) => void = (message) => { console.error(message) }

export function onOrbitalSaveError(handler: (message: string) => void) { errorHandler = handler }

export function loadOrbitalFile() {
  loadPromise ??= (async () => {
    const response = await fetch(endpoint, { cache: 'no-store' })
    if (!response.ok) throw new Error(`无法读取 save/orbital-objects.json (${response.status})`)
    loadOrbitalObjects(await response.json())
    loaded = true
  })()
  return loadPromise
}

export function scheduleOrbitalFileSave() {
  if (!loaded || saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = undefined
    writeQueue = writeQueue.catch(() => undefined).then(async () => {
      const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serializeOrbitalObjects()) })
      if (!response.ok) throw new Error(`无法写入 save/orbital-objects.json (${response.status})`)
    }).catch((error: unknown) => { errorHandler(error instanceof Error ? error.message : '轨道对象存档失败') })
  }, 500)
}
