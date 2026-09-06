import Database from 'better-sqlite3'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { backupSqliteDatabase, restoreSqliteDatabase } from './databaseBackup'
import { runDatabaseBackupCli } from './databaseBackupCli'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => { while (cleanups.length) await cleanups.pop()?.() })

describe('SQLite backup and restore', () => {
  it('creates a consistent backup that can restore the original records', async () => {
    const root = await mkdtemp(join(tmpdir(), 'classroom-backup-'))
    cleanups.push(() => rm(root, { recursive: true, force: true }))
    const source = join(root, 'source.sqlite')
    const backup = join(root, 'backup.sqlite')
    const restored = join(root, 'restored.sqlite')
    seed(source, ['first', 'second'])

    await backupSqliteDatabase(source, backup)
    seed(source, ['changed-after-backup'])
    await restoreSqliteDatabase(backup, restored)

    expect(readValues(restored)).toEqual(['first', 'second'])
  })

  it('refuses to overwrite a database unless replacement is explicit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'classroom-backup-'))
    cleanups.push(() => rm(root, { recursive: true, force: true }))
    const backup = join(root, 'backup.sqlite')
    const target = join(root, 'target.sqlite')
    seed(backup, ['backup'])
    seed(target, ['live'])

    await expect(restoreSqliteDatabase(backup, target)).rejects.toThrow('already exists')
    expect(readValues(target)).toEqual(['live'])

    await restoreSqliteDatabase(backup, target, { replace: true })
    expect(readValues(target)).toEqual(['backup'])
  })

  it('creates a timestamped operational backup from environment paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'classroom-backup-'))
    cleanups.push(() => rm(root, { recursive: true, force: true }))
    const source = join(root, 'live.sqlite')
    const backupDirectory = join(root, 'backups')
    seed(source, ['operational'])

    const result = await runDatabaseBackupCli(['backup'], {
      SYNC_SQLITE_PATH: source,
      SYNC_BACKUP_DIR: backupDirectory,
    }, new Date('2026-09-06T09:15:30.000Z'))

    expect(result).toBe(join(backupDirectory, 'classroom-observatie-20260906T091530Z.sqlite'))
    expect(readValues(result)).toEqual(['operational'])
  })

  it('never overwrites an existing backup destination', async () => {
    const root = await mkdtemp(join(tmpdir(), 'classroom-backup-'))
    cleanups.push(() => rm(root, { recursive: true, force: true }))
    const source = join(root, 'source.sqlite')
    const destination = join(root, 'existing.sqlite')
    seed(source, ['new'])
    seed(destination, ['existing'])

    await expect(backupSqliteDatabase(source, destination)).rejects.toThrow()
    expect(readValues(destination)).toEqual(['existing'])
  })

  it('allows only one concurrent non-replacing restore to claim a target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'classroom-backup-'))
    cleanups.push(() => rm(root, { recursive: true, force: true }))
    const backup = join(root, 'backup.sqlite')
    const target = join(root, 'target.sqlite')
    seed(backup, ['backup'])

    const outcomes = await Promise.allSettled([
      restoreSqliteDatabase(backup, target),
      restoreSqliteDatabase(backup, target),
    ])

    expect(outcomes.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter(({ status }) => status === 'rejected')).toHaveLength(1)
    expect(readValues(target)).toEqual(['backup'])
  })
})

function seed(path: string, values: string[]) {
  const database = new Database(path)
  database.exec('CREATE TABLE IF NOT EXISTS records (value TEXT NOT NULL); DELETE FROM records;')
  const insert = database.prepare('INSERT INTO records(value) VALUES (?)')
  for (const value of values) insert.run(value)
  database.close()
}

function readValues(path: string): string[] {
  const database = new Database(path, { readonly: true })
  const values = database.prepare('SELECT value FROM records ORDER BY rowid').all() as Array<{ value: string }>
  database.close()
  return values.map(({ value }) => value)
}
