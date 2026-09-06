import { describe, expect, it } from 'vitest'
import { applyObservation, createInitialState } from './domain'
import { applySyncResponse, enqueuePendingObservations, getSyncStatus, syncPendingOperations, type SyncOperation } from './syncQueue'

describe('offline sync queue', () => {
  it('queues observations with stable operation ids and original timestamps', () => {
    const observed = applyObservation(createInitialState(), 'noah', 'correct', '2026-08-09T10:00:00.000Z')
    const queued = enqueuePendingObservations(observed)

    expect(queued.syncQueue).toHaveLength(1)
    expect(queued.syncQueue[0]).toMatchObject({
      id: 'observation:noah-2026-08-09T10:00:00.000Z-correct',
      entityId: 'noah-2026-08-09T10:00:00.000Z-correct',
      createdAt: '2026-08-09T10:00:00.000Z',
      attemptCount: 0,
      status: 'pending',
    })
    expect(enqueuePendingObservations(queued).syncQueue).toHaveLength(1)
  })

  it('marks accepted operations synced while leaving failures and conflicts queued for idempotent retry', async () => {
    const accepted: SyncOperation = operation('accepted')
    const failed: SyncOperation = operation('failed')
    const conflict: SyncOperation = { ...operation('conflict'), status: 'conflict' }
    const state = { ...createInitialState(), syncQueue: [accepted, failed, conflict], pendingSync: 3 }

    const synced = await syncPendingOperations(state, async (operations) => ({
      results: operations.map((item) => item.id === accepted.id
        ? { operationId: item.id, status: 'accepted' }
        : { operationId: item.id, status: 'failed', error: 'temporary' }),
    }))

    expect(synced.syncQueue.map((item) => ({ id: item.id, status: item.status, attemptCount: item.attemptCount }))).toEqual([
      { id: failed.id, status: 'failed', attemptCount: 1 },
      { id: conflict.id, status: 'conflict', attemptCount: 0 },
    ])
    expect(getSyncStatus(synced)).toEqual({ pending: 0, conflict: 1, failed: 1, totalQueued: 2 })
  })

  it('keeps queued operations with attempt evidence when transport throws', async () => {
    const pending = operation('pending')
    const state = { ...createInitialState(), syncQueue: [pending], pendingSync: 1 }

    const synced = await syncPendingOperations(state, async () => { throw new Error('offline') })

    expect(synced.syncQueue).toEqual([{ ...pending, status: 'failed', attemptCount: 1, lastError: 'offline' }])
    expect(getSyncStatus(synced)).toEqual({ pending: 0, conflict: 0, failed: 1, totalQueued: 1 })
  })

  it('applies an earlier response without discarding an operation queued while the request was in flight', () => {
    const earlier = operation('earlier')
    const newer = operation('newer')
    const latestState = { ...createInitialState(), syncQueue: [earlier, newer], pendingSync: 2 }

    const synced = applySyncResponse(latestState, { results: [{ operationId: earlier.id, status: 'accepted' }] })

    expect(synced.syncQueue).toEqual([newer])
    expect(synced.pendingSync).toBe(1)
  })
})

function operation(id: string): SyncOperation {
  return {
    id,
    entity: 'observation',
    entityId: id,
    action: 'create',
    createdAt: '2026-08-09T10:00:00.000Z',
    payload: { id, studentId: 'noah' },
    attemptCount: 0,
    status: 'pending',
  }
}
