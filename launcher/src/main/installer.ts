import type { Settings } from '../shared'
import type { BundlePaths, Progress, PackManifest, InstallReceipt, RuntimePaths } from './pack-types'
import type { FileHash } from './files'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { assertNoSymlinks, atomicWrite, claimDataDirectory, downloadVerified, exists, extractZip, hashFile, matchesHash, safeTarget } from './files'
import { configureOptions, gameRoot, shareShaderFiles, writePrismInstance } from './instance'
import { ensureRuntimes } from './runtime'
import { assertInstallIdle } from './processes'

const receiptPath = (data: string) => join(gameRoot(data), '.sunrin', 'receipt.json')
const pendingPath = (data: string) => join(gameRoot(data), '.sunrin', 'installing.json')

export async function loadManifest(path: string): Promise<PackManifest> {
  const manifest: PackManifest = JSON.parse(await readFile(path, 'utf8'))
  if (manifest.formatVersion !== 1 || manifest.minecraft !== '1.20.1' || !/^47\.\d+\.\d+$/.test(manifest.forge) || !Array.isArray(manifest.files)) throw new Error('지원하지 않는 설치 manifest입니다.')
  const seen = new Set<string>()
  for (const file of manifest.files) {
    safeTarget('/instance', file.path)
    if (!/^(mods|resourcepacks|shaderpacks)\//.test(file.path) || seen.has(file.path) || new URL(file.url).protocol !== 'https:') throw new Error(`잘못된 관리 파일: ${file.path}`)
    seen.add(file.path)
  }
  return manifest
}

export async function bundleFingerprint(paths: BundlePaths): Promise<string> {
  const digest = createHash('sha256')
  for (const path of [paths.manifest, paths.prism, paths.customPack, paths.startup]) digest.update(await readFile(path))
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
  for (const [source, relative] of [
    [paths.customPack, 'resourcepacks/Sunrin-Custom.zip'],
    [paths.startup, 'kubejs/startup_scripts/sunrin_items.js']
  ]) {
    const hash: FileHash = { algorithm: 'sha256', value: await hashFile(source) }
    await backupChanged(relative, hash)
    await atomicWrite(safeTarget(game, relative), await readFile(source))
    managed[relative] = hash
  }
  await configureOptions(game, settings.minecraftPath, settings.importOptions)
  if (managed['configureddefaults/options.txt']) managed['configureddefaults/options.txt'] = { algorithm: 'sha256', value: await hashFile(join(game, 'configureddefaults/options.txt')) }
  if (settings.shareShaders) for (const warning of await shareShaderFiles(settings.minecraftPath, game)) progress(warning, 82)
  const runtime = await (dependencies.runtimeInstaller ?? ensureRuntimes)(settings.dataPath, paths.prism, progress)
  await writePrismInstance(join(settings.dataPath, 'prism-data'), manifest.minecraft, manifest.forge, runtime.java, settings.memoryMb)
  // Remove only files which the previous receipt owned and this release no longer owns.
  for (const [relative, hash] of Object.entries(previous?.managed ?? {})) {
    if (managed[relative] || !/^(mods|resourcepacks|shaderpacks|kubejs)\//.test(relative)) continue
    const target = safeTarget(game, relative)
    if (await exists(target)) { await assertNoSymlinks(settings.dataPath, target); await backupChanged(relative, hash); await rm(target) }
  }
  const receipt: InstallReceipt = { formatVersion: 1, packVersion: manifest.version, fingerprint: await bundleFingerprint(paths), managed, runtime }
  await atomicWrite(receiptPath(settings.dataPath), JSON.stringify(receipt, null, 2))
  await rm(pendingPath(settings.dataPath))
  progress('설치 완료. 게임 시작을 누르면 필요한 로그인을 안내합니다.', 100)
}
