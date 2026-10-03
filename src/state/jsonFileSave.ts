type JsonFileSaveOptions<T> = {
  endpoint: string
  fileName: string
  parse: (value: unknown) => T
  apply: (value: T) => boolean | void
  snapshot: () => T
  debounceMs?: number
}

/** Common browser-side load/save interface for the schema-validated Vite file endpoints. */
export function createJsonFileSave<T>({ endpoint, fileName, parse, apply, snapshot, debounceMs = 500 }: JsonFileSaveOptions<T>) {
  let loadPromise: Promise<void> | undefined
  let loaded = false
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let writeQueue: Promise<void> = Promise.resolve()
  let errorHandler: (message: string) => void = (message) => { console.error(message) }

  const schedule = () => {
    if (!loaded || saveTimer) return
    saveTimer = setTimeout(() => {
      saveTimer = undefined
      writeQueue = writeQueue.catch(() => undefined).then(async () => {
        const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot()) })
        if (!response.ok) throw new Error(`无法写入 ${fileName} (${response.status})`)
      }).catch((error: unknown) => { errorHandler(error instanceof Error ? error.message : `${fileName} 存档失败`) })
    }, debounceMs)
  }

  const load = () => {
    loadPromise ??= (async () => {
      const response = await fetch(endpoint, { cache: 'no-store' })
      if (!response.ok) throw new Error(`无法读取 ${fileName} (${response.status})`)
      const changed = apply(parse(await response.json()))
      loaded = true
      if (changed) schedule()
    })().catch((error: unknown) => { loadPromise = undefined; throw error })
    return loadPromise
  }

  return { load, schedule, onError: (handler: (message: string) => void) => { errorHandler = handler } }
}
