import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import * as nodeFs from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import AdmZip from 'adm-zip'
import type { LauncherUpdateInfo } from '../shared'

// Electron's ASAR wrapper treats app.asar as a virtual directory, including missing copy targets.
// Bundle staging must preserve the real archive bytes without changing the parent app's ASAR mode.
const { access, chmod, copyFile, cp, lstat, mkdir, readFile, readdir, readlink, realpath, rename, rm, writeFile } = process.versions.electron
  ? (require('original-fs') as typeof import('node:fs')).promises : nodeFs
const runFile = promisify(execFile)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_EXPANDED = 1024 ** 3
const BUNDLE_ID = 'kr.sunrinvalley.launcher'
type Command = (file: string, args: string[]) => Promise<string>
export interface PreparedLauncherUpdate {
  id: string
  transactionPath: string
  helperExecutable: string
  helperArgs: string[]
  helperEnv: NodeJS.ProcessEnv
}
interface PrepareOptions {
  assetPath: string; info: LauncherUpdateInfo; root: string; appPath: string; executablePath: string; currentVersion: string
  /** OS boundary injection for staging tests; production uses the current host. */
  protectedDataPath?: string
  platform?: NodeJS.Platform
  command?: Command
}
interface Transaction {
  formatVersion: 1; id: string; nonce: string; platform: 'darwin' | 'win32'; version: string; currentVersion: string
  root: string; transactionPath: string; appPath: string; executablePath: string; candidate: string; backup: string
  protectedDataPath?: string; assetPath: string; assetSha256: string; assetSize: number; oldFiles?: string[]; newFiles?: string[]
}
function inside(parent: string, child: string) { const rel = relative(parent, child); return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel)) }
async function unlinked(path: string) {
  const absolute = resolve(path); let cursor = absolute
  for (;;) {
    try { if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`Linked update path: ${cursor}`) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    const parent = dirname(cursor); if (parent === cursor) break; cursor = parent
  }
}
// Resolve aliases even when the final game directory has not been created yet.
async function canonicalExistingPrefix(value: string, links = 0): Promise<string> {
  if (links > 40) throw new Error('Too many protected data path links')
  const absolute = resolve(value)
  try { return await realpath(absolute) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  try {
    if ((await lstat(absolute)).isSymbolicLink()) return canonicalExistingPrefix(resolve(dirname(absolute), await readlink(absolute)), links + 1)
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const parent = dirname(absolute)
  return parent === absolute ? absolute : join(await canonicalExistingPrefix(parent, links), basename(absolute))
}
async function protectMacData(appPath: string, protectedDataPath: string) {
  if (!protectedDataPath) throw new Error('게임 데이터 경로를 확인해 주세요. (invalid protected data path)')
  const [app, data] = await Promise.all([canonicalExistingPrefix(appPath), canonicalExistingPrefix(protectedDataPath)])
  if (inside(app.toLowerCase(), data.toLowerCase()) || inside(data.toLowerCase(), app.toLowerCase())) throw new Error('게임 데이터가 앱 폴더와 겹쳐 자동 업데이트할 수 없습니다. 게임 데이터 경로를 앱 밖으로 옮겨 주세요. (protected data overlaps application)')
}
function fileName(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 240 || value.includes('\\') || isAbsolute(value) || value.split('/').some(part => !part || part === '.' || part === '..' || /[\x00-\x1f<>:"|?*]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error('Unsafe update inventory path')
  return value
}
function inventory(input: unknown): string[] {
  const value = input as { formatVersion?: unknown; files?: unknown }
  if (!value || value.formatVersion !== 1 || !Array.isArray(value.files) || !value.files.length || value.files.length > 50000) throw new Error('Invalid update inventory')
  const files = value.files.map(fileName), seen = new Set<string>()
  for (const file of files) { const key = file.toLowerCase(); if (seen.has(key)) throw new Error('Update inventory case collision'); seen.add(key) }
  for (const file of files) { const parts = file.toLowerCase().split('/'); parts.pop(); while (parts.length) { if (seen.has(parts.join('/'))) throw new Error('Update inventory file/directory collision'); parts.pop() } }
  return files
}
async function verifyAsset(path: string, info: LauncherUpdateInfo) {
  await unlinked(path)
  const stat = await lstat(path)
  if (!stat.isFile() || stat.size !== info.asset.size) throw new Error('Update payload size mismatch')
  const hash = createHash('sha256'); for await (const chunk of createReadStream(path)) hash.update(chunk)
  if (hash.digest('hex') !== info.asset.sha256.toLowerCase()) throw new Error('Update payload SHA256 hash mismatch')
}
async function readSmall(path: string) { await unlinked(path); if ((await lstat(path)).size > 8 * 1024 * 1024) throw new Error('Update inventory too large'); return JSON.parse(await readFile(path, 'utf8')) as unknown }
async function validateBundle(bundle: string, version: string, command: Command) {
  await unlinked(bundle)
  const plist = join(bundle, 'Contents/Info.plist')
  const [id, actualVersion, executable] = await Promise.all(['CFBundleIdentifier', 'CFBundleShortVersionString', 'CFBundleExecutable'].map(key => command('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist])))
  if (id.trim() !== BUNDLE_ID || actualVersion.trim() !== version || !executable.trim() || /[/\\]/.test(executable.trim())) throw new Error('Launcher bundle identity/version mismatch')
  const binary = join(bundle, 'Contents/MacOS', executable.trim())
  await unlinked(binary)
  if (!(await command('/usr/bin/lipo', ['-archs', binary])).trim().split(/\s+/).includes('arm64')) throw new Error('Launcher update is not arm64')
  await command('/usr/bin/codesign', ['--verify', '--deep', '--strict', bundle])
  async function visit(path: string): Promise<void> {
    const st = await lstat(path)
    if (st.isSymbolicLink()) { if (!inside(bundle, await realpath(path))) throw new Error('External bundle link'); return }
    if (st.isDirectory()) { for (const name of await readdir(path)) await visit(join(path, name)) }
    else if (!st.isFile()) throw new Error('Nonregular bundle entry')
  }
  await visit(bundle)
  return binary
}
async function stageWindows(options: PrepareOptions, tx: Transaction) {
  const oldFiles = inventory(await readSmall(join(tx.appPath, 'resources/launcher-files.json')))
  if (!oldFiles.includes('resources/launcher-files.json')) throw new Error('Installed managed inventory does not list itself')
  if (!oldFiles.some(file => file.toLowerCase() === relative(tx.appPath, tx.executablePath).split(sep).join('/').toLowerCase())) throw new Error('Current executable missing from managed inventory')
  const zip = new AdmZip(options.assetPath), entries = zip.getEntries()
  const metadata = entries.filter(entry => entry.entryName === 'appFiles.json')
  if (metadata.length !== 1 || metadata[0].isDirectory || metadata[0].header.size > 8 * 1024 * 1024) throw new Error('Missing update inventory')
  const newFiles = inventory(JSON.parse(metadata[0].getData().toString('utf8')))
  if (!newFiles.includes(relative(tx.appPath, tx.executablePath).split(sep).join('/'))) throw new Error('New executable missing from inventory')
  const expected = new Set(newFiles), seen = new Set<string>(), allEntries = new Set<string>(); let expanded = 0
  for (const entry of entries) {
    const mode = (entry.attr >>> 16) & 0xf000
    const entryKey = entry.entryName.replace(/\/$/, '').toLowerCase()
    if (allEntries.has(entryKey)) throw new Error('ZIP entry case collision'); allEntries.add(entryKey)
    if (entry.isDirectory) { const dir = fileName(entry.entryName.replace(/\/$/, '')); if (mode && mode !== 0x4000) throw new Error('Linked ZIP directory'); if (!newFiles.some(file => file.startsWith(`${dir}/`))) throw new Error('Unexpected inventory directory'); continue }
    const file = fileName(entry.entryName), key = file.toLowerCase()
    if (seen.has(key)) throw new Error('ZIP case collision'); seen.add(key)
    if (mode && mode !== 0x8000) throw new Error('Linked/nonregular ZIP entry')
    expanded += entry.header.size
    if (expanded > MAX_EXPANDED || !Number.isSafeInteger(expanded)) throw new Error('Update ZIP exceeds expanded size limit')
    if (file !== 'appFiles.json' && !expected.has(file)) throw new Error('ZIP does not match update inventory')
  }
  if (seen.size !== newFiles.length + 1 || newFiles.includes('appFiles.json') || newFiles.some(file => !seen.has(file.toLowerCase()))) throw new Error('ZIP does not match update inventory')
  const oldKeys = new Set(oldFiles.map(file => file.toLowerCase()))
  if (newFiles.some(file => !oldKeys.has(file.toLowerCase()))) throw new Error('새 실행 환경 파일이 추가되어 설치 프로그램이 필요합니다. (unmanaged native path)')
  for (const file of [...oldFiles, ...newFiles]) {
    const target = join(tx.appPath, file); await unlinked(target)
    try { const stat = await lstat(target); if (!stat.isFile()) throw new Error('Managed path is not a regular file'); if (!oldKeys.has(file.toLowerCase())) throw new Error('Update would overwrite an unmanaged file') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  await mkdir(tx.candidate)
  for (const file of newFiles) { const entry = zip.getEntry(file)!; const bytes = entry.getData(); if (bytes.length !== entry.header.size || bytes.length > MAX_EXPANDED) throw new Error('Expanded file too large'); const dest = join(tx.candidate, file); await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, bytes, { flag: 'wx' }) }
  // Future updates must use exactly the same managed set, regardless of payload metadata contents.
  if (!newFiles.includes('resources/launcher-files.json')) throw new Error('New managed inventory is missing')
  const stagedInventory = inventory(await readSmall(join(tx.candidate, 'resources/launcher-files.json')))
  if (JSON.stringify([...stagedInventory].sort()) !== JSON.stringify([...newFiles].sort())) throw new Error('Payload managed inventories disagree')
  tx.oldFiles = oldFiles; tx.newFiles = newFiles
}
export async function prepareLauncherUpdate(options: PrepareOptions): Promise<PreparedLauncherUpdate> {
  const platform = options.platform ?? process.platform
  if (platform !== 'darwin' && platform !== 'win32') throw new Error('Launcher updates are supported only on macOS and Windows')
  if ((platform === 'darwin' ? 'dmg' : 'zip') !== options.info.asset.kind) throw new Error('Wrong launcher update payload type')
  const appPath = resolve(options.appPath), root = resolve(options.root), executablePath = resolve(options.executablePath)
  if (inside(appPath, root) || inside(root, appPath) || !inside(appPath, executablePath) || executablePath === appPath) throw new Error('Update user data must be outside the application tree; invalid executable path')
  const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
  const next = options.info.version.split('.').map(Number), current = options.currentVersion.split('.').map(Number)
  const difference = next.findIndex((part, index) => part !== current[index])
  if (!stable.test(options.info.version) || !stable.test(options.currentVersion) || [...next, ...current].some(part => !Number.isSafeInteger(part)) || difference < 0 || next[difference] <= current[difference]) throw new Error('Update version must be newer than installed version')
  if (platform === 'darwin' && options.protectedDataPath !== undefined) await protectMacData(appPath, options.protectedDataPath)
  const assetPath = resolve(options.assetPath)
  if (dirname(assetPath) !== join(root, 'launcher-updates/downloads')) throw new Error('Update asset must be inside its dedicated downloads directory')
  await Promise.all([unlinked(appPath), unlinked(root), unlinked(executablePath)]); await verifyAsset(options.assetPath, options.info)
  const id = randomUUID(), transactionPath = join(root, 'launcher-updates/transactions', id)
  await unlinked(transactionPath); await mkdir(transactionPath, { recursive: true, mode: 0o700 })
  const tx: Transaction = { formatVersion: 1, platform, id, nonce: id, version: options.info.version, currentVersion: options.currentVersion, assetPath, assetSha256: options.info.asset.sha256.toLowerCase(), assetSize: options.info.asset.size, ...(platform === 'darwin' && options.protectedDataPath !== undefined ? { protectedDataPath: resolve(options.protectedDataPath) } : {}), root, transactionPath, appPath, executablePath, candidate: platform === 'darwin' ? join(dirname(appPath), `.sunrin-update-${id}.app`) : join(transactionPath, 'candidate'), backup: platform === 'darwin' ? join(dirname(appPath), `.sunrin-backup-${id}.app`) : join(transactionPath, 'backup') }
  const command = options.command ?? (async (file, args) => String((await runFile(file, args, { maxBuffer: 4 * 1024 * 1024 })).stdout))
  let stagedMac = false
  try {
    if (platform === 'darwin') {
      if (!appPath.endsWith('.app') || /\/(AppTranslocation|Volumes)\//.test(appPath)) throw new Error('Move the launcher to a writable Applications folder before updating')
      const oldBinary = await validateBundle(appPath, options.currentVersion, command)
      if (oldBinary !== executablePath) throw new Error('Installed executable path does not match bundle')
      await access(dirname(appPath), 2)
      const mount = join(transactionPath, 'mount'); await mkdir(mount)
      let mounted = false
      try {
        await command('/usr/bin/hdiutil', ['attach', '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount, options.assetPath]); mounted = true
        const apps = (await readdir(mount)).filter(name => name.endsWith('.app'))
        if (apps.length !== 1) throw new Error('Expected one launcher app in DMG')
        const source = join(mount, apps[0]); await validateBundle(source, tx.version, command)
        // Claim only this fresh UUID path before copying so partial copies are removed on error.
        await mkdir(tx.candidate); stagedMac = true
        await cp(source, tx.candidate, { recursive: true, dereference: false, verbatimSymlinks: true, force: true })
        const newBinary = await validateBundle(tx.candidate, tx.version, command)
        if (relative(tx.candidate, newBinary) !== relative(appPath, executablePath)) throw new Error('Update executable layout changed')
      } finally { if (mounted) await command('/usr/bin/hdiutil', ['detach', mount]) }
    } else await stageWindows(options, tx)
    const helperName = platform === 'darwin' ? 'launcher-update-helper.cjs' : 'launcher-update-helper.ps1'
    const resources = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
    const helperSource = resources ? join(resources, helperName) : resolve('build', helperName)
    await unlinked(helperSource)
    const helperPath = join(transactionPath, helperName); await copyFile(helperSource, helperPath); await chmod(helperPath, 0o600)
    const transactionFile = join(transactionPath, 'transaction.json'); await writeFile(transactionFile, JSON.stringify(tx), { flag: 'wx', mode: 0o600 })
    return { id, transactionPath, helperExecutable: platform === 'darwin' ? executablePath : join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), helperArgs: platform === 'darwin' ? [helperPath, transactionFile] : ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperPath, '-TransactionFile', transactionFile], helperEnv: platform === 'darwin' ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : { ...process.env } }
  } catch (error) {
    if (stagedMac) await rm(tx.candidate, { recursive: true, force: true })
    await rm(transactionPath, { recursive: true, force: true }); throw error
  }
}
export function launchLauncherUpdate(prepared: PreparedLauncherUpdate, parentPid: number, options: { readyTimeoutMs?: number } = {}): Promise<void> {
  if (!Number.isSafeInteger(parentPid) || parentPid <= 1 || !UUID.test(prepared.id)) return Promise.reject(new Error('Invalid launcher update parent/transaction'))
  const timeout = options.readyTimeoutMs ?? 30000
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 30000) return Promise.reject(new Error('Invalid helper readiness timeout'))
  return new Promise((resolveLaunch, reject) => {
    const args = [...prepared.helperArgs, ...(prepared.helperArgs.includes('-File') ? ['-ParentPid', String(parentPid)] : [String(parentPid)])]
    const child = spawn(prepared.helperExecutable, args, { detached: true, stdio: 'ignore', env: prepared.helperEnv, windowsHide: true })
    let settled = false
    let poll: ReturnType<typeof setTimeout> | undefined
    const finish = (error?: Error) => {
      if (settled) return; settled = true
      clearTimeout(deadline); if (poll) clearTimeout(poll)
      if (error) { child.kill(); reject(error) } else { child.unref(); resolveLaunch() }
    }
    const deadline = setTimeout(() => finish(new Error('Launcher update helper readiness timed out')), timeout)
    child.once('error', error => finish(error))
    child.once('exit', (code, signal) => finish(new Error(`Launcher update helper exited before ready (${code ?? signal})`)))
    const checkReady = async () => {
      if (settled) return
      try {
        const readyPath = join(prepared.transactionPath, 'helper-ready.json'); await unlinked(readyPath)
        if ((await lstat(readyPath)).size > 4096) throw new Error('Invalid helper readiness marker')
        const ready = JSON.parse(await readFile(readyPath, 'utf8')) as { id?: unknown; parentPid?: unknown; helperPid?: unknown }
        if (ready.id === prepared.id && ready.parentPid === parentPid && ready.helperPid === child.pid && child.exitCode === null && child.signalCode === null) { finish(); return }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) { finish(error instanceof Error ? error : new Error(String(error))); return }
      }
      if (!settled) poll = setTimeout(() => { void checkReady() }, Math.min(100, timeout))
    }
    child.once('spawn', () => { void checkReady() })
  })
}
export async function acknowledgeLauncherUpdate(root: string, version: string, executablePath: string, args: string[]): Promise<void> {
  const index = args.indexOf('--launcher-update-token'); if (index === -1) return
  const id = args[index + 1]; if (!id || !UUID.test(id) || args.lastIndexOf('--launcher-update-token') !== index) throw new Error('Invalid launcher update token')
  const transactionPath = join(resolve(root), 'launcher-updates/transactions', id); await unlinked(transactionPath)
  const tx = await readSmall(join(transactionPath, 'transaction.json')) as Transaction
  if (tx.formatVersion !== 1 || (tx.platform !== 'darwin' && tx.platform !== 'win32') || !inside(tx.appPath, tx.executablePath) || inside(tx.appPath, tx.root) || tx.id !== id || tx.nonce !== id || tx.transactionPath !== transactionPath || tx.root !== resolve(root)) throw new Error('Invalid update transaction nonce/path')
  if (tx.version !== version) throw new Error('Launcher update health version mismatch')
  if (tx.executablePath !== resolve(executablePath)) throw new Error('Launcher update health executable mismatch')
  await unlinked(executablePath)
  const health = join(transactionPath, 'healthy.json'), pending = join(transactionPath, `health-${randomUUID()}.tmp`)
  await writeFile(pending, JSON.stringify({ nonce: id, version, executablePath: resolve(executablePath), pid: process.pid }), { flag: 'wx', mode: 0o600 }); await rename(pending, health)
}
