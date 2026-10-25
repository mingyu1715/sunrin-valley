import { cp, lstat, mkdir, readFile, readdir, realpath, rm } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { assertNoSymlinks, atomicWrite, exists, safeTarget } from './files'
import { gameRoot, instanceRoot } from './instance'

interface Entry { path: string; original: 'file' | 'absent'; backup?: string }
interface Journal { formatVersion: 1; state: 'active' | 'committed'; entries: Entry[] }
const transactionRoot = (data: string) => join(gameRoot(data), '.sunrin', 'install-transaction')
const slashRelative = (root: string, target: string) => relative(root, target).split('\\').join('/')

function targetPath(data: string, path: string): string {
  const target = safeTarget(data, path), game = gameRoot(data), instance = instanceRoot(data)
  if (!(target.startsWith(game + sep) || target === join(instance, 'instance.cfg') || target === join(instance, 'mmc-pack.json')) || target === transactionRoot(data) || target.startsWith(transactionRoot(data) + sep)) {
    throw new Error('설치 복구 기록의 경로가 올바르지 않습니다.')
  }
  return target
}

async function readJournal(data: string): Promise<Journal> {
  const root = transactionRoot(data)
  await assertNoSymlinks(data, join(root, 'journal.json'))
  const value = JSON.parse(await readFile(join(root, 'journal.json'), 'utf8'))
  if (value?.formatVersion !== 1 || !['active', 'committed'].includes(value.state) || !Array.isArray(value.entries)) throw new Error('설치 복구 기록이 올바르지 않습니다.')
  const paths = new Set<string>()
  for (const entry of value.entries) {
    if (typeof entry?.path !== 'string' || !['file', 'absent'].includes(entry.original) || (entry.original === 'file' && (typeof entry.backup !== 'string' || !/^originals\/\d+$/.test(entry.backup)))) throw new Error('설치 복구 파일 기록이 올바르지 않습니다.')
    targetPath(data, entry.path)
    if (paths.has(entry.path)) throw new Error('설치 복구 기록에 중복 경로가 있습니다.')
    paths.add(entry.path)
  }
  return value
}

export async function hasInstallTransaction(data: string): Promise<boolean> {
  if (!await exists(transactionRoot(data))) return false
  try { return (await readJournal(data)).state !== 'committed' }
  catch { return true }
}

/** The caller must have successfully checked assertInstallIdle before recovery. */
export async function recoverInstallTransaction(data: string): Promise<void> {
  const root = transactionRoot(data)
  await assertNoSymlinks(data, root)
  if (!await exists(root)) return
  if (!await exists(join(root, 'journal.json'))) {
    // A crash before the first journal rename cannot have changed game files.
    // Any originals indicate a damaged later journal, which must be retained.
    const entries = await readdir(root, { withFileTypes: true })
    if (!entries.every(entry => entry.isFile() && /^journal\.json\.[0-9a-f-]+\.tmp$/.test(entry.name))) throw new Error('설치 복구 기록이 없어 원본 백업을 보존했습니다.')
    await rm(root, { recursive: true, force: true })
    return
  }
  const journal = await readJournal(data)
  if (journal.state === 'active') {
    // Keep every original until all restores finish, so an interrupted rollback is retryable.
    for (const entry of [...journal.entries].reverse()) {
      const target = targetPath(data, entry.path)
      await assertNoSymlinks(data, dirname(target))
      if (entry.original === 'absent') {
        // Newly shared shaders can be symlinks. Only unlink this exact path.
        await rm(target, { force: true })
      } else {
        await assertNoSymlinks(data, target)
        const backup = safeTarget(root, entry.backup!)
        await assertNoSymlinks(data, backup)
        await atomicWrite(target, await readFile(backup))
      }
    }
  }
  await rm(root, { recursive: true, force: true })
}

/** A small write-ahead journal; only paths actually about to change are copied. */
export class InstallTransaction {
  private readonly journal: Journal = { formatVersion: 1, state: 'active', entries: [] }
  private queue: Promise<void> = Promise.resolve()
  private readonly captured = new Set<string>()
  private readonly aliases = new Map<string, Set<string>>()
  private constructor(private readonly data: string) {}

  static async begin(data: string): Promise<InstallTransaction> {
    const transaction = new InstallTransaction(data), root = transactionRoot(data)
    await assertNoSymlinks(data, root)
    await mkdir(dirname(root), { recursive: true })
    await mkdir(root)
    await transaction.persist()
    return transaction
  }

  private async persist(): Promise<void> {
    await atomicWrite(join(transactionRoot(this.data), 'journal.json'), JSON.stringify(this.journal))
  }

  private remember(path: string): void {
    this.captured.add(path)
    const key = path.normalize('NFC').toLowerCase()
    const aliases = this.aliases.get(key) ?? new Set<string>()
    aliases.add(path)
    this.aliases.set(key, aliases)
  }

  snapshot(target: string): Promise<void> {
    const capture = this.queue.then(async () => {
      let path = slashRelative(this.data, target)
      targetPath(this.data, path)
      if (this.captured.has(path)) return
      await assertNoSymlinks(this.data, target)
      let entry: Entry
      if (await exists(target)) {
        const info = await lstat(target)
        if (!info.isFile()) throw new Error(`관리 파일이 일반 파일이 아닙니다: ${path}`)
        const canonical = await realpath(target)
        for (const previous of this.aliases.get(path.normalize('NFC').toLowerCase()) ?? []) {
          const previousTarget = safeTarget(this.data, previous)
          if (await exists(previousTarget) && await realpath(previousTarget) === canonical) {
            // The first snapshot remains authoritative even if it recorded absence.
            // Distinct case-sensitive names (including hard links) remain separate.
            this.remember(path)
            return
          }
        }
        const names = await readdir(dirname(target))
        const actual = names.find(name => name === target.slice(dirname(target).length + 1))
          ?? names.find(name => name.normalize('NFC').toLowerCase() === target.slice(dirname(target).length + 1).normalize('NFC').toLowerCase())
        if (actual) path = slashRelative(this.data, join(dirname(target), actual))
        entry = { path, original: 'file', backup: `originals/${this.journal.entries.length}` }
        const backup = safeTarget(transactionRoot(this.data), entry.backup!)
        await mkdir(dirname(backup), { recursive: true })
        await cp(target, backup)
      } else entry = { path, original: 'absent' }
      this.journal.entries.push(entry)
      // No caller may mutate until both original bytes and the journal are saved.
      await this.persist()
      this.remember(path)
      this.remember(slashRelative(this.data, target))
    })
    this.queue = capture.catch(() => {})
    return capture
  }

  async rollback(): Promise<void> {
    await this.queue
    await recoverInstallTransaction(this.data)
  }

  async commit(): Promise<void> {
    await this.queue
    this.journal.state = 'committed'
    await this.persist()
    // A cleanup failure must never roll an already committed installation back.
    await rm(transactionRoot(this.data), { recursive: true, force: true }).catch(() => {})
  }
}
