import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createPrivateServer } from './privateServer'
import { createSyncApp, type TokenVerifier } from './syncApp'
import { InMemorySyncRepository } from './syncRepository'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => { while (cleanups.length) await cleanups.pop()?.() })

describe('private same-origin server', () => {
  it('serves the built app and assets while preserving the authenticated sync API', async () => {
    const distRoot = await mkdtemp(join(tmpdir(), 'classroom-private-server-'))
    await mkdir(join(distRoot, 'assets'))
    await writeFile(join(distRoot, 'index.html'), '<!doctype html><main>private classroom app</main>')
    await writeFile(join(distRoot, 'assets', 'app.js'), 'console.log("private")')
    const app = createSyncApp({ verifier: allows('nina@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['nina@example.test'] })
    const server = createPrivateServer({ app, distRoot })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('server did not bind')
    const base = `http://127.0.0.1:${address.port}`
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
      await rm(distRoot, { recursive: true, force: true })
    })

    const page = await fetch(`${base}/classroom-observatie/`)
    expect(page.status).toBe(200)
    expect(page.headers.get('content-type')).toContain('text/html')
    expect(await page.text()).toContain('private classroom app')

    const asset = await fetch(`${base}/classroom-observatie/assets/app.js`)
    expect(asset.status).toBe(200)
    expect(asset.headers.get('content-type')).toContain('javascript')

    const unauthenticated = await fetch(`${base}/api/sync`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operations: [] }) })
    expect(unauthenticated.status).toBe(401)
  })

  it('does not expose files outside the production bundle', async () => {
    const distRoot = await mkdtemp(join(tmpdir(), 'classroom-private-server-'))
    await writeFile(join(distRoot, 'index.html'), '<main>private</main>')
    const app = createSyncApp({ verifier: allows('nina@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['nina@example.test'] })
    const server = createPrivateServer({ app, distRoot })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('server did not bind')
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
      await rm(distRoot, { recursive: true, force: true })
    })

    const response = await fetch(`http://127.0.0.1:${address.port}/classroom-observatie/%2e%2e/%2e%2e/etc/passwd`)
    expect(response.status).toBe(404)
  })
})

function allows(email: string): TokenVerifier {
  return { verify: async () => ({ email }) }
}
