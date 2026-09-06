import { createServer } from 'node:http'
import { GoogleIdTokenVerifier } from './googleVerifier'
import { createSyncApp } from './syncApp'
import { SqliteSyncRepository } from './syncRepository'

const port = Number(process.env.PORT ?? 3000)
const googleClientId = requiredEnv('GOOGLE_CLIENT_ID')
const databasePath = requiredEnv('SYNC_SQLITE_PATH')
const allowedEmails = requiredEnv('ALLOWED_TEACHER_EMAILS').split(',').map((email) => email.trim()).filter(Boolean)
if (!allowedEmails.length) throw new Error('ALLOWED_TEACHER_EMAILS must contain at least one exact email')

const app = createSyncApp({
  verifier: new GoogleIdTokenVerifier(googleClientId),
  repository: new SqliteSyncRepository(databasePath),
  allowedEmails,
})

createServer((request, response) => {
  const chunks: Buffer[] = []
  let received = 0
  let tooLarge = false
  request.on('data', (chunk: Buffer) => {
    received += chunk.byteLength
    if (received > 256 * 1024) {
      tooLarge = true
      response.writeHead(413, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: 'payload too large' }))
      request.destroy()
      return
    }
    chunks.push(chunk)
  })
  request.on('end', async () => {
    if (tooLarge || response.writableEnded) return
    let body: unknown = {}
    try {
      const raw = Buffer.concat(chunks).toString('utf8')
      body = raw ? JSON.parse(raw) : {}
    } catch {
      response.writeHead(400, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: 'invalid json' }))
      return
    }
    try {
      const result = await app.inject({
        method: request.method ?? 'GET',
        url: request.url ?? '/',
        headers: Object.fromEntries(Object.entries(request.headers).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
        body,
      })
      response.writeHead(result.status, { 'content-type': 'application/json' })
      response.end(JSON.stringify(result.body))
    } catch {
      response.writeHead(500, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: 'sync server error' }))
    }
  })
}).listen(port, () => {
  console.log(`secure sync server listening on ${port}`)
})

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}
