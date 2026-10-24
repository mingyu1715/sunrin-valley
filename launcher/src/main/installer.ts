import type { Settings } from '../shared'
import type { BundlePaths, Progress, PackManifest, InstallReceipt, RuntimePaths } from './pack-types'
import type { FileHash } from './files'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import AdmZip from 'adm-zip'
import { assertNoSymlinks, atomicWrite, claimDataDirectory, downloadVerified, exists, extractZip, hashFile, matchesHash, safeTarget } from './files'
import { configureOptions, gameRoot, shareShaderFiles, writePrismInstance } from './instance'
import { ensureRuntimes } from './runtime'
import { assertInstallIdle } from './processes'

const receiptPath = (data: string) => join(gameRoot(data), '.sunrin', 'receipt.json')
const pendingPath = (data: string) => join(gameRoot(data), '.sunrin', 'installing.json')

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const hashLengths = { sha1: 40, sha256: 64, sha512: 128 } as const

function validHttps(value: unknown): boolean {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password
  } catch { return false }
}

function validHash(value: unknown): value is FileHash {
  if (!isRecord(value) || typeof value.algorithm !== 'string' || !Object.hasOwn(hashLengths, value.algorithm) || typeof value.value !== 'string') return false
  return new RegExp(`^[a-f0-9]{${hashLengths[value.algorithm as FileHash['algorithm']]}}$`, 'i').test(value.value)
}

function validateRelativePath(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.split('/').some(part => !part || /[<>:"|?*\x00-\x1f\x7f]/.test(part) || /[ .]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error('안전하지 않은 관리 파일 경로입니다.')
  }
  safeTarget('/instance', value)
}

function pathRegistry() {
  const explicit = new Set<string>()
  const nodes = new Map<string, { name: string; directory: boolean }>()
  return (relative: string, directory = false) => {
    const parts = relative.split('/')
    for (let i = 0; i < parts.length; i++) {
      const name = parts.slice(0, i + 1).join('/'), key = name.normalize('NFC').toLowerCase()
      const isDirectory = i < parts.length - 1 || directory
      const previous = nodes.get(key)
      if (previous && (previous.name !== name || previous.directory !== isDirectory)) throw new Error(`충돌하는 관리 파일 경로: ${relative}`)
      if (i === parts.length - 1) {
        if (explicit.has(key)) throw new Error(`중복 관리 파일 경로: ${relative}`)
        explicit.add(key)
      }
      nodes.set(key, { name, directory: isDirectory })
    }
  }
}

export function validateManifest(value: unknown): PackManifest {
  if (!isRecord(value) || value.formatVersion !== 1 || value.id !== 'sunrin-valley' || typeof value.version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value.version) || value.minecraft !== '1.20.1' || typeof value.forge !== 'string' || !/^47\.\d+\.\d+$/.test(value.forge) || !Array.isArray(value.files)) {
    throw new Error('지원하지 않는 설치 manifest입니다.')
  }
  const base = value.base
  if (!isRecord(base) || !validHttps(base.url) || !validHash({ algorithm: 'sha256', value: base.sha256 }) || !Number.isSafeInteger(base.fileId) || (base.fileId as number) < 1) throw new Error('원본 모드팩 정보가 올바르지 않습니다.')
  validateRelativePath(base.filename)
  if (base.filename.includes('/')) throw new Error('원본 모드팩 이름에는 폴더를 지정할 수 없습니다.')
  const register = pathRegistry()
  for (const file of value.files) {
    if (!isRecord(file)) throw new Error('관리 파일 정보가 올바르지 않습니다.')
    validateRelativePath(file.path)
    if (!/^(mods|resourcepacks|shaderpacks)\//.test(file.path) || !validHttps(file.url) || !validHash(file.hash) || (file.size !== undefined && (!Number.isSafeInteger(file.size) || (file.size as number) < 0))) throw new Error(`잘못된 관리 파일: ${file.path}`)
    register(file.path)
  }
  return value as unknown as PackManifest
}

export async function loadManifest(path: string): Promise<PackManifest> {
  return validateManifest(JSON.parse(await readFile(path, 'utf8')))
}

export async function bundleFingerprint(paths: BundlePaths): Promise<string> {
  const digest = createHash('sha256')
  const content = paths.overlay === undefined ? [paths.customPack, paths.startup] : [paths.overlay]
  for (const path of [paths.manifest, paths.prism, ...content]) digest.update(await readFile(path))
  return digest.digest('hex')
}

export async function readReceipt(data: string): Promise<InstallReceipt | undefined> {
  if (!await exists(receiptPath(data))) return undefined
  try { return JSON.parse(await readFile(receiptPath(data), 'utf8')) }
  catch { return undefined }
}

export async function inspectInstall(settings: Settings, paths: BundlePaths): Promise<{phase: 'not-installed' | 'repair' | 'update' | 'ready'; installedVersion?: string; message: string}> {
  try { await assertNoSymlinks(settings.dataPath, gameRoot(settings.dataPath)) }
  catch { return { phase: 'repair', message: '설치 경로에 연결 폴더가 있습니다. 원래 폴더로 복원해 주세요.' } }
  const receipt = await readReceipt(settings.dataPath)
  if (await exists(pendingPath(settings.dataPath))) return { phase: 'repair', message: '이전 설치가 중단되었습니다. 복구를 눌러 이어서 설치하세요.' }
  if (!receipt) return { phase: 'not-installed', message: '우리 마을로 떠날 준비를 해볼까요?' }
  const version = { installedVersion: receipt.packVersion }
  if (receipt.fingerprint !== await bundleFingerprint(paths)) return { phase: 'update', ...version, message: '새 선린밸리 구성이 준비되었습니다.' }
  if (!receipt.runtime || !await exists(receipt.runtime.java) || !await exists(receipt.runtime.prism)) return { phase: 'repair', ...version, message: '실행 환경 복구가 필요합니다.' }
  try {
    for (const [relative, hash] of Object.entries(receipt.managed)) {
      const file = safeTarget(gameRoot(settings.dataPath), relative)
      await assertNoSymlinks(gameRoot(settings.dataPath), file)
      if (relative.startsWith('config/') && await exists(file)) continue
      if (!await matchesHash(file, hash)) return { phase: 'repair', ...version, message: `파일 복구가 필요합니다: ${relative}` }
    }
  } catch { return { phase: 'repair', ...version, message: '설치 파일을 검사하지 못했습니다. 복구를 실행해 주세요.' } }
  return { phase: 'ready', ...version, message: '오늘도 선린밸리에서 만나요.' }
}

async function listFiles(root: string, prefix = ''): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...await listFiles(root, relative))
    else if (entry.isFile()) files.push(relative)
  }
  return files
}

export function validateOverlay(bytes: Buffer) {
  const entries = new AdmZip(bytes).getEntries()
  const register = pathRegistry()
  const scriptDirectory = /^kubejs\/(startup_scripts|server_scripts|client_scripts|assets|data)(\/.*)?$/
  // Validate the complete archive before extracting or touching the installed game.
  for (const entry of entries) {
    const relative = entry.isDirectory ? entry.entryName.slice(0, -1) : entry.entryName
    validateRelativePath(relative)
    const type = (entry.attr >>> 16) & 0xf000
    if (type !== 0 && type !== (entry.isDirectory ? 0x4000 : 0x8000)) throw new Error(`ZIP 일반 파일과 폴더만 허용됩니다: ${relative}`)
    const allowed = entry.isDirectory
      ? relative === 'resourcepacks' || relative === 'kubejs' || scriptDirectory.test(relative)
      : /^resourcepacks\/[^/]+\.zip$/.test(relative) || /^kubejs\/(startup_scripts|server_scripts|client_scripts|assets|data)\/.+/.test(relative)
    if (!allowed) throw new Error(`원격 구성에서 허용하지 않는 파일: ${relative}`)
    register(relative, entry.isDirectory)
    if (!entry.isDirectory) entry.getData()
  }
  return entries
}

async function prepareOverlay(archive: string, data: string): Promise<{ root: string; files: string[] }> {
  const entries = validateOverlay(await readFile(archive))
  const cache = join(data, 'cache')
  await assertNoSymlinks(data, cache)
  await mkdir(cache, { recursive: true })
  const root = await mkdtemp(join(cache, 'overlay-'))
  try {
    const files: string[] = []
    for (const entry of entries) {
      if (entry.isDirectory) continue
      await atomicWrite(safeTarget(root, entry.entryName), entry.getData())
      files.push(entry.entryName)
    }
    return { root, files }
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
}

export async function installClient(settings: Settings, paths: BundlePaths, progress: Progress, dependencies: {
  fetcher?: typeof fetch
  runtimeInstaller?: (data: string, manifest: string, progress: Progress) => Promise<RuntimePaths>
  assertIdle?: (data: string) => Promise<void>
} = {}): Promise<void> {
  const manifest = await loadManifest(paths.manifest)
  const game = gameRoot(settings.dataPath), cache = join(settings.dataPath, 'cache')
  await (dependencies.assertIdle ?? assertInstallIdle)(settings.dataPath)
  await claimDataDirectory(settings.dataPath)
  await assertNoSymlinks(settings.dataPath, game)
  const overlay = paths.overlay === undefined ? undefined : await prepareOverlay(paths.overlay, settings.dataPath)
  try {
    for (const relative of overlay?.files ?? []) await assertNoSymlinks(settings.dataPath, safeTarget(game, relative))
    await mkdir(game, { recursive: true })
    await assertNoSymlinks(game, pendingPath(settings.dataPath))
    await atomicWrite(pendingPath(settings.dataPath), JSON.stringify({ version: manifest.version, startedAt: new Date().toISOString() }))
    const previous = await readReceipt(settings.dataPath)
    const backup = join(game, '.sunrin', 'backups', new Date().toISOString().replaceAll(':', '-'))
    async function backupChanged(relative: string, expected: FileHash) {
      const target = safeTarget(game, relative)
      await assertNoSymlinks(settings.dataPath, target)
      if (await exists(target) && !await matchesHash(target, expected)) {
        const save = safeTarget(backup, relative)
        await mkdir(dirname(save), { recursive: true }); await cp(target, save)
      }
    }
    progress('원본 모드팩 파일 확인 중', 0)
    const archive = safeTarget(cache, manifest.base.filename)
    await assertNoSymlinks(settings.dataPath, archive)
    await downloadVerified(manifest.base.url, archive, { algorithm: 'sha256', value: manifest.base.sha256 }, { fetcher: dependencies.fetcher })
    const overrides = join(cache, 'overrides', manifest.base.sha256)
    await assertNoSymlinks(settings.dataPath, overrides)
    // Always re-extract the verified archive; a cache marker is not a content check.
    await rm(overrides, { force: true, recursive: true })
    await extractZip(archive, overrides, 'overrides/')
    const managed: Record<string, FileHash> = {}
    for (const relative of await listFiles(overrides)) {
      if (relative === 'options.txt' || /^(saves|screenshots|logs)\//.test(relative)) continue
      const source = safeTarget(overrides, relative), target = safeTarget(game, relative)
      const hash: FileHash = { algorithm: 'sha256', value: await hashFile(source) }
      if (relative.startsWith('config/') && await exists(target)) {
        const baseline = previous?.managed[relative]
        if (!baseline || !await matchesHash(target, baseline)) {
          managed[relative] = baseline ?? hash
          continue
        }
      }
      await backupChanged(relative, hash)
      await mkdir(dirname(target), { recursive: true }); await cp(source, target)
      managed[relative] = hash
    }
    let completed = 0, cursor = 0
    const failures: string[] = []
    await Promise.all(Array.from({ length: Math.min(6, manifest.files.length) }, async () => {
      while (cursor < manifest.files.length) {
        const file = manifest.files[cursor++]
        try {
          await backupChanged(file.path, file.hash)
          await downloadVerified(file.url, safeTarget(game, file.path), file.hash, { fetcher: dependencies.fetcher })
          managed[file.path] = file.hash
          completed++
          progress(`모드팩 파일 확인·설치 · ${completed}/${manifest.files.length}`, 5 + completed / manifest.files.length * 75)
        } catch (error: any) { failures.push(`${file.path}: ${error.message}`) }
      }
    }))
    if (failures.length) throw new Error(`${failures.length}개 파일 설치 실패. 복구로 다시 시도할 수 있습니다.\n${failures.slice(0, 4).join('\n')}`)
    const customFiles = overlay
      ? overlay.files.map(relative => [safeTarget(overlay.root, relative), relative])
      : [[paths.customPack, 'resourcepacks/Sunrin-Custom.zip'], [paths.startup, 'kubejs/startup_scripts/sunrin_items.js']]
    for (const [source, relative] of customFiles) {
      const hash: FileHash = { algorithm: 'sha256', value: await hashFile(source) }
      await backupChanged(relative, hash)
      await atomicWrite(safeTarget(game, relative), await readFile(source))
      managed[relative] = hash
    }
    await configureOptions(game, settings.minecraftPath, settings.importOptions, Object.keys(managed))
    if (managed['configureddefaults/options.txt']) managed['configureddefaults/options.txt'] = { algorithm: 'sha256', value: await hashFile(join(game, 'configureddefaults/options.txt')) }
    if (settings.shareShaders) for (const warning of await shareShaderFiles(settings.minecraftPath, game)) progress(warning, 82)
    const runtime = await (dependencies.runtimeInstaller ?? ensureRuntimes)(settings.dataPath, paths.prism, progress)
    await writePrismInstance(join(settings.dataPath, 'prism-data'), manifest.minecraft, manifest.forge, runtime.java, settings.memoryMb)
    // Remove only files which the previous receipt owned and this release no longer owns.
    const replacements = new Map(Object.keys(managed).map(relative => [relative.normalize('NFC').toLowerCase(), relative]))
    for (const [relative, hash] of Object.entries(previous?.managed ?? {})) {
      if (managed[relative] || !/^(mods|resourcepacks|shaderpacks|kubejs)\//.test(relative)) continue
      const target = safeTarget(game, relative)
      if (await exists(target)) {
        await assertNoSymlinks(settings.dataPath, target)
        const replacement = replacements.get(relative.normalize('NFC').toLowerCase())
        if (replacement) {
          const current = await stat(target), next = await stat(safeTarget(game, replacement))
          // The old spelling can refer to the freshly installed file on case-insensitive disks.
          if (current.dev === next.dev && current.ino === next.ino) continue
        }
        await backupChanged(relative, hash); await rm(target)
      }
    }
    const receipt: InstallReceipt = { formatVersion: 1, packVersion: manifest.version, fingerprint: await bundleFingerprint(paths), managed, runtime }
    await atomicWrite(receiptPath(settings.dataPath), JSON.stringify(receipt, null, 2))
    await rm(pendingPath(settings.dataPath))
    progress('설치 완료. 게임 시작을 누르면 필요한 로그인을 안내합니다.', 100)
  } finally {
    if (overlay) await rm(overlay.root, { recursive: true, force: true })
  }
}
