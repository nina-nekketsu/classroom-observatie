import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { backupSqliteDatabase, restoreSqliteDatabase } from './databaseBackup'

type Environment = Record<string, string | undefined>

export async function runDatabaseBackupCli(args: string[], env: Environment = process.env, now = new Date()): Promise<string> {
  const command = args[0]
  const databasePath = required(env, 'SYNC_SQLITE_PATH')
  if (command === 'backup') {
    const backupDirectory = required(env, 'SYNC_BACKUP_DIR')
    const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    const destination = join(backupDirectory, `classroom-observatie-${timestamp}.sqlite`)
    await backupSqliteDatabase(databasePath, destination)
    return destination
  }
  if (command === 'restore') {
    const source = args[1]
    if (!source) throw new Error('restore requires a backup path')
    await restoreSqliteDatabase(source, databasePath, { replace: args.includes('--replace') })
    return databasePath
  }
  throw new Error('usage: backup | restore <backup-path> [--replace]')
}

function required(env: Environment, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  runDatabaseBackupCli(process.argv.slice(2)).then((path) => {
    console.log(path)
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
