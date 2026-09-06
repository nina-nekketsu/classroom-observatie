import { describe, expect, it } from 'vitest'
import { resolveRuntimeConfig } from './runtimeConfig'

describe('runtime config contract', () => {
  it('defaults to the public fictitious local prototype with auth and network disabled', () => {
    const config = resolveRuntimeConfig({})

    expect(config).toEqual({
      mode: 'public-prototype',
      syncEnabled: false,
      authEnabled: false,
      syncEndpoint: null,
      googleClientId: null,
    })
  })

  it('requires endpoint and Google client id before enabling secure sync mode', () => {
    expect(resolveRuntimeConfig({ VITE_RUNTIME_MODE: 'secure-sync' })).toMatchObject({
      mode: 'public-prototype',
      syncEnabled: false,
      authEnabled: false,
    })

    expect(resolveRuntimeConfig({
      VITE_RUNTIME_MODE: 'secure-sync',
      VITE_SYNC_ENDPOINT: '/api/sync',
      VITE_GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
    })).toMatchObject({
      mode: 'secure-sync',
      syncEnabled: true,
      authEnabled: true,
      syncEndpoint: '/api/sync',
      googleClientId: 'client-id.apps.googleusercontent.com',
    })
  })

  it('refuses absolute and protocol-relative endpoints so bearer tokens stay same-origin', () => {
    for (const endpoint of ['http://example.test/api/sync', 'https://example.test/api/sync', '//example.test/api/sync']) {
      expect(resolveRuntimeConfig({
        VITE_RUNTIME_MODE: 'secure-sync',
        VITE_SYNC_ENDPOINT: endpoint,
        VITE_GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
      })).toMatchObject({ mode: 'public-prototype', syncEnabled: false, authEnabled: false, syncEndpoint: null })
    }
  })
})
