import { resolve } from 'node:path'
import { GoogleIdTokenVerifier } from './googleVerifier'
import { createPrivateServer } from './privateServer'
import { createSyncApp } from './syncApp'
import { SqliteSyncRepository } from './syncRepository'

const port = Number(process.env.PORT ?? 3000)
const googleClientId = requiredEnv('GOOGLE_CLIENT_ID')
const databasePath = requiredEnv('SYNC_SQLITE_PATH')
const allowedEmails = requiredEnv('ALLOWED_TEACHER_EMAILS').split(',').map((email) => email.trim()).filter(Boolean)
const distRoot = resolve(process.env.STATIC_DIST_PATH?.trim() || 'dist')
if (!allowedEmails.length) throw new Error('ALLOWED_TEACHER_EMAILS must contain at least one exact email')

const app = createSyncApp({
  verifier: new GoogleIdTokenVerifier(googleClientId),
  repository: new SqliteSyncRepository(databasePath),
  allowedEmails,
})

createPrivateServer({ app, distRoot }).listen(port, '127.0.0.1', () => {
  console.log(`private classroom server listening on 127.0.0.1:${port}`)
})

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}
