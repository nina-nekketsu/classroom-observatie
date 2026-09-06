import type { RuntimeConfig } from './runtimeConfig'
import type { SyncOperation, SyncResponse, SyncTransport } from './syncQueue'

export type TokenProvider = (() => Promise<string | null>) & { invalidate?: () => void }
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>

export function createSyncTransport(config: RuntimeConfig, getGoogleIdToken: TokenProvider, fetcher: Fetcher = fetch): SyncTransport {
  return async (operations: SyncOperation[]): Promise<SyncResponse> => {
    const sameOriginEndpoint = Boolean(config.syncEndpoint?.startsWith('/') && !config.syncEndpoint.startsWith('//'))
    if (!config.syncEnabled || !config.authEnabled || !sameOriginEndpoint || !config.syncEndpoint) {
      return { results: operations.map((operation) => ({ operationId: operation.id, status: 'failed', error: 'sync disabled' })) }
    }

    const token = await getGoogleIdToken()
    if (!token) {
      return { results: operations.map((operation) => ({ operationId: operation.id, status: 'failed', error: 'missing Google ID token' })) }
    }

    const response = await fetcher(config.syncEndpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ operations }),
    })

    if (response.status === 401 || response.status === 403) getGoogleIdToken.invalidate?.()
    if (!response.ok) {
      return { results: operations.map((operation) => ({ operationId: operation.id, status: 'failed', error: `sync failed: ${response.status}` })) }
    }

    return await response.json() as SyncResponse
  }
}
