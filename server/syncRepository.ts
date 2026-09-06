import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'

export type PersistedOperation = {
  operationId: string
  ownerEmail: string
  contentHash: string
  payloadJson: string
  createdAt: string
}

export type StoreResult = 'accepted' | 'duplicate' | 'conflict'

export interface SyncRepository {
  store(operation: PersistedOperation): StoreResult
}

export function canonicalHash(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export class InMemorySyncRepository implements SyncRepository {
  private readonly operations = new Map<string, PersistedOperation>()

  store(operation: PersistedOperation): StoreResult {
    const existing = this.operations.get(`${operation.ownerEmail}:${operation.operationId}`)
    if (!existing) {
      this.operations.set(`${operation.ownerEmail}:${operation.operationId}`, operation)
      return 'accepted'
    }
    return existing.contentHash === operation.contentHash ? 'duplicate' : 'conflict'
  }
}

export class SqliteSyncRepository implements SyncRepository {
  private readonly database: Database.Database

  constructor(path: string) {
    this.database = new Database(path)
    this.database.exec(`
      create table if not exists sync_operations (
        owner_email text not null,
        operation_id text not null,
        content_hash text not null,
        payload_json text not null,
        created_at text not null,
        primary key (owner_email, operation_id)
      )
    `)
  }

  store(operation: PersistedOperation): StoreResult {
    const inserted = this.database.prepare('insert or ignore into sync_operations (owner_email, operation_id, content_hash, payload_json, created_at) values (?, ?, ?, ?, ?)').run(operation.ownerEmail, operation.operationId, operation.contentHash, operation.payloadJson, operation.createdAt)
    if (inserted.changes === 1) return 'accepted'
    const existing = this.database.prepare('select content_hash from sync_operations where owner_email = ? and operation_id = ?').get(operation.ownerEmail, operation.operationId) as { content_hash: string } | undefined
    return existing?.content_hash === operation.contentHash ? 'duplicate' : 'conflict'
  }
}
