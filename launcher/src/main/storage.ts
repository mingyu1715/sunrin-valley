import fs from 'node:fs/promises'
import { dirname, join, parse, resolve, sep } from 'node:path'
import AdmZip from 'adm-zip'
import type { StorageInfo } from '../shared'
import type { BundlePaths } from './pack-types'
import { hashFile, safeTarget } from './files'
import { gameRoot } from './instance'
import { loadManifest } from './installer'

const MiB = 1024 ** 2, GiB = 1024 ** 3
// No network metadata is fetched here. Unknown lengths receive explicit budgets,
// and the final reserve covers filesystem overhead and vendor size changes.
const budgets = { file: 64 * MiB, baseArchive: GiB, baseExpanded: 2 * GiB, javaArchive: 128 * MiB, javaExpanded: 512 * MiB, prismArchive: 256 * MiB, prismExpanded: 768 * MiB, engine: 2 * GiB, reserve: 2 * GiB }
const length = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fallback
const under = (root: string, path: string) => path === root || path.startsWith(root + sep)

async function checkedDataPath(path: string): Promise<string> {
  let data = resolve(path)
  // These two system-owned macOS aliases are ordinary paths exposed by the OS.
  // Only accept their exact canonical destinations; custom aliases stay blocked.
  if (process.platform === 'darwin') {
    for (const [alias, target] of [['/var', '/private/var'], ['/tmp', '/private/tmp']]) {
      if (under(alias, data) && await fs.realpath(alias) === target) {
        data = target + data.slice(alias.length)
      }
    }
  }
  let current = parse(data).root
  for (const part of data.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part)
    let info
    try { info = await fs.lstat(current) }
    catch (error: any) { if (error.code === 'ENOENT') break; throw error }
    if (info.isSymbolicLink()) throw new Error('연결 폴더 대신 별도의 설치 폴더를 선택해 주세요.')
    if (!info.isDirectory()) throw new Error('설치 경로가 폴더가 아닙니다.')
  }
  return data
}

async function scan(root: string): Promise<Map<string, number>> {
  const files = new Map<string, number>()
  let rootInfo
  try { rootInfo = await fs.lstat(root) }
  catch (error: any) { if (error.code === 'ENOENT') return files; throw error }
  if (rootInfo.isSymbolicLink()) throw new Error('연결 폴더 대신 별도의 설치 폴더를 선택해 주세요.')
  if (!rootInfo.isDirectory()) throw new Error('설치 경로가 폴더가 아닙니다.')
  async function walk(path: string): Promise<void> {
    for (const name of await fs.readdir(path)) {
      const target = join(path, name), info = await fs.lstat(target)
      if (info.isSymbolicLink()) continue
      if (info.isDirectory()) await walk(target)
      else if (info.isFile()) files.set(target, info.size)
    }
  }
  await walk(root)
  return files
}
function treeBytes(files: Map<string, number>, root: string): number {
  let bytes = 0
  for (const [path, size] of files) if (under(root, path)) bytes += size
  return bytes
}
async function freeSpace(path: string): Promise<number | null> {
  let current = path
  while (true) {
    try {
      // BigInt avoids overflow before conversion on large disks. bavail excludes
      // blocks reserved by the OS and is the space available to this user.
      const volume = await fs.statfs(current, { bigint: true })
      const bytes = Number(volume.bavail * volume.bsize)
      return Number.isFinite(bytes) && bytes >= 0 ? bytes : null
    } catch (error: any) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') return null
      const parent = dirname(current)
      if (parent === current) return null
      current = parent
    }
  }
}
function expandedZip(path: string, prefix = ''): number | undefined {
  try {
    let bytes = 0
    for (const entry of new AdmZip(path).getEntries()) {
      if (entry.isDirectory || !entry.entryName.startsWith(prefix)) continue
      if (!Number.isSafeInteger(entry.header.size) || entry.header.size < 0) return undefined
      bytes += entry.header.size
      if (!Number.isSafeInteger(bytes)) return undefined
    }
    return bytes
  } catch { return undefined }
}

/** Read-only upper estimate of extra free space required at peak installation.
 * installedBytes counts regular file lengths, never link targets. Scan errors
 * reject rather than displaying a misleading known-zero installation size.
 */
export async function getStorageInfo(dataPath: string, paths: BundlePaths): Promise<StorageInfo> {
  const data = await checkedDataPath(dataPath), files = await scan(data), installedBytes = treeBytes(files, data)
  const manifest = await loadManifest(paths.manifest)
  const prism = JSON.parse(await fs.readFile(paths.prism, 'utf8'))
  const distribution = prism.platforms?.[`${process.platform}-${process.arch}`]
  if (!distribution || typeof distribution.filename !== 'string' || typeof distribution.executable !== 'string' || typeof prism.version !== 'string') throw new Error('이 컴퓨터용 Prism 배포 정보를 찾지 못했습니다.')
  const cache = join(data, 'cache'), game = gameRoot(data)
  async function verified(path: string, algorithm: 'sha1' | 'sha256' | 'sha512', value: string): Promise<boolean> {
    if (!files.has(path)) return false
    return await hashFile(path, algorithm) === value.toLowerCase()
  }
  const basePath = safeTarget(cache, manifest.base.filename)
  const cachedBase = await verified(basePath, 'sha256', manifest.base.sha256)
  const baseSize = cachedBase ? files.get(basePath)! : length((manifest.base as typeof manifest.base & { size?: number }).size, budgets.baseArchive)
  const baseExpanded = cachedBase ? expandedZip(basePath, 'overrides/') ?? budgets.baseExpanded : budgets.baseExpanded
  let downloadBytes = cachedBase ? 0 : baseSize
  let cacheGrowth = cachedBase ? 0 : baseSize
  let managedGrowth = 0
  for (const file of manifest.files) {
    const target = safeTarget(game, file.path)
    if (await verified(target, file.hash.algorithm, file.hash.value)) continue
    const size = length(file.size, budgets.file)
    downloadBytes += size
    // Retain old files for rollback; do not subtract them from peak usage.
    managedGrowth += size
  }
  const prismPath = safeTarget(cache, distribution.filename)
  const cachedPrism = await verified(prismPath, 'sha256', distribution.sha256)
  const prismSize = cachedPrism ? files.get(prismPath)! : length(distribution.size, budgets.prismArchive)
  const prismExpanded = cachedPrism ? expandedZip(prismPath) ?? budgets.prismExpanded : budgets.prismExpanded
  // ensureRuntimes deliberately forces Prism extraction on each install. Its
  // installed binary does not remove the need for a verified archive/staging.
  if (!cachedPrism) { downloadBytes += prismSize; cacheGrowth += prismSize }
  const prismHome = safeTarget(join(data, 'runtime'), `Prism-${prism.version}`)
  const prismGrowth = Math.max(0, prismExpanded - treeBytes(files, prismHome))

  let javaReady = false
  const javaHome = join(data, 'runtime/java17'), javaReceipt = join(javaHome, 'runtime.json')
  if (files.has(javaReceipt)) {
    try {
      const receipt = JSON.parse(await fs.readFile(javaReceipt, 'utf8'))
      const executable = safeTarget(javaHome, receipt.executable)
      javaReady = (files.get(executable) ?? 0) > 0 && /^[a-f0-9]{64}$/i.test(receipt.sha256)
    } catch { /* Incomplete receipts receive the full runtime budget. */ }
  }
  const javaExpanded = javaReady ? 0 : budgets.javaExpanded
  if (!javaReady) { downloadBytes += budgets.javaArchive; cacheGrowth += budgets.javaArchive }

  // Prism owns these downloads; its own metadata is unavailable offline. Keep
  // a 2 GiB budget for Minecraft, Forge, libraries, native files and assets.
  const engineExisting = ['libraries', 'assets', 'meta'].reduce((sum, name) => sum + treeBytes(files, join(data, 'prism-data', name)), 0)
  const engineGrowth = Math.max(0, budgets.engine - engineExisting)
  downloadBytes += engineGrowth

  let customBytes: number
  if (paths.overlay) {
    customBytes = expandedZip(paths.overlay) ?? budgets.baseExpanded
  } else {
    customBytes = (await fs.stat(paths.customPack)).size + (await fs.stat(paths.startup)).size
  }
  // Base overrides are retained both in cache and in the game. Updates may also
  // hold overlay extraction, runtime staging, a journal and user-file backups.
  const baseGrowth = Math.max(0, baseExpanded - treeBytes(files, join(cache, 'overrides', manifest.base.sha256))) + baseExpanded
  const finalGrowth = cacheGrowth + managedGrowth + baseGrowth + customBytes + javaExpanded + prismGrowth + engineGrowth
  const staging = baseExpanded + (paths.overlay ? customBytes : 0) + javaExpanded + prismExpanded
  const backupBytes = treeBytes(files, game) * 2
  const peak = finalGrowth + staging + backupBytes
  const requiredBytes = Math.ceil(peak + budgets.reserve + peak * 0.25)
  const freeBytes = await freeSpace(data)
  return { installedBytes, freeBytes, requiredBytes, downloadBytes, estimatedInstalledBytes: installedBytes + finalGrowth, sufficient: freeBytes === null ? null : freeBytes >= requiredBytes }
}
