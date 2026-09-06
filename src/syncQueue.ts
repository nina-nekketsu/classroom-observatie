import type { AppState, Observation } from './domain'

export type SyncOperationStatus = 'pending' | 'failed' | 'conflict'

export type SyncOperation = {
  id: string
  entity: 'observation'
  entityId: string
  action: 'create'
  createdAt: string
  payload: Observation | Record<string, unknown>
  attemptCount: number
  status: SyncOperationStatus
  lastError?: string
}

export type SyncResult = {
  operationId: string
  status: 'accepted' | 'duplicate' | 'conflict' | 'failed'
  error?: string
}

export type SyncResponse = {
  results: SyncResult[]
}

export type SyncTransport = (operations: SyncOperation[]) => Promise<SyncResponse>

export function operationFromObservation(observation: Observation): SyncOperation {
  return {
    id: `observation:${observation.id}`,
    entity: 'observation',
    entityId: observation.id,
    action: 'create',
    createdAt: observation.createdAt,
    payload: observation,
    attemptCount: 0,
    status: 'pending',
  }
}

export function enqueuePendingObservations<T extends AppState>(state: T): T {
  const existing = new Set((state.syncQueue ?? []).map((item) => item.id))
  const additions = state.observations
    .filter((observation) => !observation.synced)
    .map(operationFromObservation)
    .filter((operation) => !existing.has(operation.id))
  if (!additions.length) return state
  return { ...state, syncQueue: [...(state.syncQueue ?? []), ...additions], pendingSync: state.pendingSync + additions.length }
}

export async function syncPendingOperations<T extends AppState>(state: T, transport: SyncTransport): Promise<T> {
  const candidates = (state.syncQueue ?? []).filter((operation) => operation.status === 'pending' || operation.status === 'failed')
  if (!candidates.length) return state

  let response: SyncResponse
  try {
    response = await transport(candidates)
  } catch (error) {
    return applySyncFailure(state, candidates.map((operation) => operation.id), error)
  }
  return applySyncResponse(state, response)
}

export function applySyncFailure<T extends AppState>(state: T, attemptedOperationIds: string[], error: unknown): T {
  const message = error instanceof Error ? error.message : 'sync transport failed'
  const candidateIds = new Set(attemptedOperationIds)
  const nextQueue = (state.syncQueue ?? []).map((operation) => candidateIds.has(operation.id) ? {
    ...operation,
    status: 'failed' as const,
    attemptCount: operation.attemptCount + 1,
    lastError: message,
  } : operation)
  return { ...state, syncQueue: nextQueue, pendingSync: nextQueue.length }
}

export function applySyncResponse<T extends AppState>(state: T, response: SyncResponse): T {
  const byId = new Map(response.results.map((result) => [result.operationId, result]))
  const acceptedIds = new Set<string>()
  const nextQueue = (state.syncQueue ?? []).flatMap((operation): SyncOperation[] => {
    const result = byId.get(operation.id)
    if (!result) return [operation]
    if (result.status === 'accepted' || result.status === 'duplicate') {
      acceptedIds.add(operation.entityId)
      return []
    }
    return [{
      ...operation,
      attemptCount: operation.attemptCount + 1,
      status: result.status === 'conflict' ? 'conflict' : 'failed',
      ...(result.error ? { lastError: result.error } : {}),
    }]
  })
  const observations = state.observations.map((observation) => acceptedIds.has(observation.id) ? { ...observation, synced: true } : observation)

  return { ...state, observations, syncQueue: nextQueue, pendingSync: nextQueue.length }
}

export function getSyncStatus(state: Pick<AppState, 'syncQueue'>) {
  const queue = state.syncQueue ?? []
  const pending = queue.filter((operation) => operation.status === 'pending').length
  const conflict = queue.filter((operation) => operation.status === 'conflict').length
  const failed = queue.filter((operation) => operation.status === 'failed').length
  return { pending, conflict, failed, totalQueued: queue.length }
}
