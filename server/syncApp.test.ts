import { describe, expect, it } from 'vitest'
import { createSyncApp, type InjectRequest, type TokenVerifier } from './syncApp'
import { InMemorySyncRepository } from './syncRepository'

describe('POST /api/sync auth and idempotency foundation', () => {
  it('rejects requests without a bearer token', async () => {
    const app = createSyncApp({ verifier: allows('teacher@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })

    const response = await app.inject(syncRequest({ token: null }))

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ error: 'missing bearer token' })
  })

  it('rejects invalid Google ID tokens', async () => {
    const app = createSyncApp({ verifier: rejects(), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })

    const response = await app.inject(syncRequest({ token: 'bad-token' }))

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ error: 'invalid Google ID token' })
  })

  it('rejects verified emails outside the exact allowlist', async () => {
    const app = createSyncApp({ verifier: allows('other@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })

    const response = await app.inject(syncRequest({ token: 'valid-token' }))

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({ error: 'email not allowed' })
  })

  it('rejects semantically inconsistent observation identities and unknown actions', async () => {
    const app = createSyncApp({ verifier: allows('teacher@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })
    const valid = operation({ operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', studentId: 'noah' })
    const inconsistent = { ...valid, entityId: 'other-id' }
    const unknownAction = { ...valid, id: 'observation:sara-2026-08-09T10:00:00.000Z-correct', entityId: 'observation-2', payload: { ...valid.payload, id: 'observation-2', actionId: 'invented-action' } }
    const nonDerivedId = { ...valid, id: 'observation:not-derived-from-fields', entityId: 'not-derived-from-fields', payload: { ...valid.payload, id: 'not-derived-from-fields' } }

    expect((await app.inject(batchSyncRequest({ operations: [inconsistent] }))).status).toBe(400)
    expect((await app.inject(batchSyncRequest({ operations: [unknownAction] }))).status).toBe(400)
    expect((await app.inject(batchSyncRequest({ operations: [nonDerivedId] }))).status).toBe(400)
  })

  it('accepts a valid sync operation for an allowed teacher', async () => {
    const app = createSyncApp({ verifier: allows('teacher@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })

    const response = await app.inject(syncRequest({ token: 'valid-token', operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct' }))

    expect(response.status).toBe(200)
    expect(response.body.results).toEqual([{ operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', status: 'accepted' }])
  })

  it('treats an identical duplicate retry as already accepted', async () => {
    const app = createSyncApp({ verifier: allows('teacher@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })
    await app.inject(syncRequest({ token: 'valid-token', operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct' }))

    const response = await app.inject(syncRequest({ token: 'valid-token', operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct' }))

    expect(response.status).toBe(200)
    expect(response.body.results).toEqual([{ operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', status: 'duplicate' }])
  })

  it('treats retry metadata changes as the same immutable operation', async () => {
    const app = createSyncApp({ verifier: allows('teacher@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })
    const original = operation({ operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', studentId: 'noah' })
    await app.inject(batchSyncRequest({ token: 'valid-token', operations: [original] }))

    const response = await app.inject({
      method: 'POST', url: '/api/sync', headers: { authorization: 'Bearer valid-token' },
      body: { operations: [{ ...original, status: 'failed', attemptCount: 2, lastError: 'offline' }] },
    })

    expect(response.status).toBe(200)
    expect(response.body.results).toEqual([{ operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', status: 'duplicate' }])
  })

  it('normalizes verified and allowlisted emails case-insensitively', async () => {
    const app = createSyncApp({ verifier: allows('Teacher@Example.Test'), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })

    const response = await app.inject(syncRequest({ token: 'valid-token', operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct' }))

    expect(response.status).toBe(200)
    expect(response.body.results).toEqual([{ operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', status: 'accepted' }])
  })

  it('leaves conflicting content under the same operation id unresolved without discarding partial results', async () => {
    const app = createSyncApp({ verifier: allows('teacher@example.test'), repository: new InMemorySyncRepository(), allowedEmails: ['teacher@example.test'] })
    await app.inject(syncRequest({ token: 'valid-token', operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', studentId: 'noah' }))

    const response = await app.inject(batchSyncRequest({ token: 'valid-token', operations: [
      operation({ operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', studentId: 'noah', classId: 'changed-class' }),
      operation({ operationId: 'observation:sara-2026-08-09T10:00:00.000Z-correct', studentId: 'sara' }),
    ] }))

    expect(response.status).toBe(200)
    expect(response.body.results).toEqual([
      { operationId: 'observation:noah-2026-08-09T10:00:00.000Z-correct', status: 'conflict' },
      { operationId: 'observation:sara-2026-08-09T10:00:00.000Z-correct', status: 'accepted' },
    ])
  })
})

function syncRequest({ token = 'valid-token', operationId = 'observation:noah-2026-08-09T10:00:00.000Z-correct', studentId = 'noah' }: { token?: string | null, operationId?: string, studentId?: string }) {
  return batchSyncRequest({ token, operations: [operation({ operationId, studentId })] })
}

function batchSyncRequest({ token = 'valid-token', operations }: { token?: string | null, operations: ReturnType<typeof operation>[] }): InjectRequest {
  return {
    method: 'POST' as const,
    url: '/api/sync',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: { operations },
  }
}

function operation({ operationId, studentId, classId }: { operationId: string, studentId: string, classId?: string }) {
  const entityId = operationId.replace(/^observation:/, '')
  return {
    id: operationId,
    entity: 'observation' as const,
    entityId,
    action: 'create' as const,
    createdAt: '2026-08-09T10:00:00.000Z',
    payload: { id: entityId, studentId, ...(classId ? { classId } : {}), actionId: 'correct', points: 1, createdAt: '2026-08-09T10:00:00.000Z', synced: false },
    attemptCount: 0,
    status: 'pending' as const,
  }
}

function allows(email: string): TokenVerifier {
  return { verify: async () => ({ email }) }
}

function rejects(): TokenVerifier {
  return { verify: async () => null }
}
