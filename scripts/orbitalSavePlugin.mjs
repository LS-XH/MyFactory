import { fileURLToPath } from 'node:url'
import { orbitalSaveSchema } from '../src/domain/orbitalSave.ts'
import { configSaveSchema } from '../src/domain/configSave.ts'
import { createJsonSaveRoute } from './jsonSaveRoute.mjs'

const orbitalSave = createJsonSaveRoute(fileURLToPath(new URL('../save/orbital-objects.json', import.meta.url)), orbitalSaveSchema)
const configSave = createJsonSaveRoute(fileURLToPath(new URL('../save/config.json', import.meta.url)), configSaveSchema)

export default function orbitalSavePlugin() {
  const middleware = (server) => {
    server.middlewares.use('/api/save/orbital-objects', orbitalSave)
    server.middlewares.use('/api/save/config', configSave)
  }
  return { name: 'orbital-save-file', configureServer: middleware, configurePreviewServer: middleware }
}
