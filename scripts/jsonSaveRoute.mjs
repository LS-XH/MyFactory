import { readFile, writeFile, rename, mkdir, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

function send(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(data))
}

/** Shared, schema-validated, atomic JSON file endpoint for local development saves. */
export function createJsonSaveRoute(savePath, schema) {
  return (request, response) => {
    void (async () => {
      try {
        if (request.method === 'GET') {
          send(response, 200, schema.parse(JSON.parse(await readFile(savePath, 'utf8'))))
          return
        }
        if (request.method === 'PUT') {
          let body = ''
          for await (const chunk of request) body += chunk.toString()
          const saved = schema.parse(JSON.parse(body))
          await mkdir(dirname(savePath), { recursive: true })
          const temporaryPath = `${savePath}.${process.pid}.${randomUUID()}.tmp`
          try {
            await writeFile(temporaryPath, `${JSON.stringify(saved, null, 2)}\n`, 'utf8')
            await rename(temporaryPath, savePath)
          } catch (error) {
            await unlink(temporaryPath).catch(() => undefined)
            throw error
          }
          send(response, 200, { saved: true })
          return
        }
        send(response, 405, { error: '仅支持 GET 和 PUT' })
      } catch (error) {
        send(response, 500, { error: error instanceof Error ? error.message : '存档读写失败' })
      }
    })()
  }
}
