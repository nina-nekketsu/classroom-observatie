import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { lstat, readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import type { createSyncApp } from './syncApp'

type SyncApp = ReturnType<typeof createSyncApp>

const appPrefix = '/classroom-observatie/'
const maxPayloadBytes = 256 * 1024
const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

export function createPrivateServer({ app, distRoot }: { app: SyncApp, distRoot: string }) {
  const resolvedRoot = resolve(distRoot)
  return createServer(async (request, response) => {
    setSecurityHeaders(response)
    try {
      if ((request.url ?? '').split('?')[0] === '/api/sync') {
        await handleSyncRequest(app, request, response)
        return
      }
      await handleStaticRequest(resolvedRoot, request, response)
    } catch {
      if (!response.writableEnded) sendJson(response, 500, { error: 'private server error' })
    }
  })
}

async function handleStaticRequest(distRoot: string, request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'method not allowed' })
    return
  }
  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  } catch {
    sendJson(response, 400, { error: 'invalid path' })
    return
  }
  if (!pathname.startsWith(appPrefix)) {
    sendJson(response, 404, { error: 'not found' })
    return
  }
  const relativePath = pathname === appPrefix ? 'index.html' : pathname.slice(appPrefix.length)
  const filePath = resolve(distRoot, relativePath)
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
    sendJson(response, 404, { error: 'not found' })
    return
  }
  try {
    const metadata = await lstat(filePath)
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('not a regular bundle file')
    const content = await readFile(filePath)
    response.writeHead(200, {
      'content-type': contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': relativePath === 'index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    })
    response.end(request.method === 'HEAD' ? undefined : content)
  } catch {
    sendJson(response, 404, { error: 'not found' })
  }
}

async function handleSyncRequest(app: SyncApp, request: IncomingMessage, response: ServerResponse) {
  const chunks: Buffer[] = []
  let received = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    received += buffer.byteLength
    if (received > maxPayloadBytes) {
      sendJson(response, 413, { error: 'payload too large' })
      return
    }
    chunks.push(buffer)
  }
  let body: unknown = {}
  try {
    const raw = Buffer.concat(chunks).toString('utf8')
    body = raw ? JSON.parse(raw) : {}
  } catch {
    sendJson(response, 400, { error: 'invalid json' })
    return
  }
  const result = await app.inject({
    method: request.method ?? 'GET',
    url: '/api/sync',
    headers: Object.fromEntries(Object.entries(request.headers).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
    body,
  })
  sendJson(response, result.status, result.body)
}

function setSecurityHeaders(response: ServerResponse) {
  response.setHeader('content-security-policy', "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; frame-src https://accounts.google.com/gsi/; connect-src 'self' https://accounts.google.com/gsi/; img-src 'self' data: https://*.googleusercontent.com; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
  response.setHeader('referrer-policy', 'no-referrer')
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('x-frame-options', 'DENY')
}

function sendJson(response: ServerResponse, status: number, body: Record<string, unknown>) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}
