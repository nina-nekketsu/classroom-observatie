import { describe, expect, it, vi } from 'vitest'
import { createSyncTransport } from './syncTransport'
import type { RuntimeConfig } from './runtimeConfig'
import type { SyncOperation } from './syncQueue'

describe('sync transport', () => {
  it('does not attempt network or auth in public prototype mode', async () => {
    const fetchSpy = vi.fn()
    const tokenProvider = vi.fn()
    const transport = createSyncTransport(publicConfig(), tokenProvider, fetchSpy)

    const response = await transport([operation('one')])

    expect(response).toEqual({ results: [{ operationId: 'one', status: 'failed', error: 'sync disabled' }] })
    expect(tokenProvider).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('posts sync operations with only a Bearer Google ID token in secure mode', async () => {
    const fetchSpy = vi.fn(async (_input: string, _init: RequestInit) => new Response(JSON.stringify({ results: [{ operationId: 'one', status: 'accepted' }] }), { status: 200 }))
    const transport = createSyncTransport({
      mode: 'secure-sync',
      syncEnabled: true,
      authEnabled: true,
      syncEndpoint: '/api/sync',
      googleClientId: 'client-id.apps.googleusercontent.com',
    }, async () => 'google-id-token', fetchSpy)

    const response = await transport([operation('one')])

    expect(response.results[0]).toEqual({ operationId: 'one', status: 'accepted' })
    expect(fetchSpy).toHaveBeenCalledWith('/api/sync', expect.objectContaining({
      method: 'POST',
      headers: { authorization: 'Bearer google-id-token', 'content-type': 'application/json' },
    }))
    const [, requestInit] = fetchSpy.mock.calls[0]
    expect(JSON.parse(String(requestInit.body))).toEqual({ operations: [operation('one')] })
  })

  it('invalidates a cached Google token after an authorization failure', async () => {
    const tokenProvider = Object.assign(vi.fn(async () => 'expired-token'), { invalidate: vi.fn() })
    const fetchSpy = vi.fn(async () => new Response('', { status: 401 }))
    const transport = createSyncTransport({ mode: 'secure-sync', syncEnabled: true, authEnabled: true, syncEndpoint: '/api/sync', googleClientId: 'client-id.apps.googleusercontent.com' }, tokenProvider, fetchSpy)

    await transport([operation('one')])

    expect(tokenProvider.invalidate).toHaveBeenCalledTimes(1)
  })

  it('refuses to send credentials to a non-relative endpoint even when passed a handcrafted config', async () => {
    const fetchSpy = vi.fn()
    const tokenProvider = vi.fn(async () => 'google-id-token')
    const transport = createSyncTransport({ mode: 'secure-sync', syncEnabled: true, authEnabled: true, syncEndpoint: 'https://evil.example/api/sync', googleClientId: 'client-id.apps.googleusercontent.com' }, tokenProvider, fetchSpy)

    await transport([operation('one')])

    expect(tokenProvider).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

function publicConfig(): RuntimeConfig {
  return { mode: 'public-prototype', syncEnabled: false, authEnabled: false, syncEndpoint: null, googleClientId: null }
}

function operation(id: string): SyncOperation {
  return {
    id,
    entity: 'observation',
    entityId: id,
    action: 'create',
    createdAt: '2026-08-09T10:00:00.000Z',
    payload: { id },
    attemptCount: 0,
    status: 'pending',
  }
}
