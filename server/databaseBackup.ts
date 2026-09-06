import Database from 'better-sqlite3'
import { link, mkdir, rename, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

export async function backupSqliteDatabase(sourcePath: string, destinationPath: string): Promise<void> {
  await assertHealthyDatabase(sourcePath)
  await mkdir(dirname(destinationPath), { recursive: true })
  const temporaryPath = `${destinationPath}.tmp-${randomUUID()}`
  const source = new Database(sourcePath, { readonly: true, fileMustExist: true })
  try {
    await source.backup(temporaryPath)
    await assertHealthyDatabase(temporaryPath)
    await link(temporaryPath, destinationPath)
    await rm(temporaryPath)
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw error
  } finally {
    source.close()
  }
}

export async function restoreSqliteDatabase(sourceBackupPath: string, targetPath: string, options: { replace?: boolean } = {}): Promise<void> {
  await assertHealthyDatabase(sourceBackupPath)
  await mkdir(dirname(targetPath), { recursive: true })
  const temporaryPath = `${targetPath}.restore-${randomUUID()}`
  const source = new Database(sourceBackupPath, { readonly: true, fileMustExist: true })
  try {
    await source.backup(temporaryPath)
    await assertHealthyDatabase(temporaryPath)
    if (options.replace) {
      await rename(temporaryPath, targetPath)
    } else {
      await link(temporaryPath, targetPath)
      await rm(temporaryPath)
    }
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw error
  } finally {
    source.close()
  }
}

async function assertHealthyDatabase(path: string): Promise<void> {
  const database = new Database(path, { readonly: true, fileMustExist: true })
  try {
    const result = database.pragma('quick_check') as Array<{ quick_check: string }>
    if (result.length !== 1 || result[0]?.quick_check !== 'ok') throw new Error(`SQLite integrity check failed for ${path}`)
  } finally {
    database.close()
  }
}
