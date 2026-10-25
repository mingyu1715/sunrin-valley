import { createHash } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { assertNoSymlinks, atomicWrite, downloadVerified, matchesHash, safeTarget } from './files'
import { loadManifest, validateOverlay } from './installer'
import type { BundlePaths } from './pack-types'
import type { ServerStatus } from '../shared'

export interface UpdateSource { formatVersion: 1; channelUrl: string | null; launcherDownloadUrl: string | null; operatingUrl?: string }
interface Asset { url: string; sha256: string }
interface Channel {
  formatVersion: 1; id: 'sunrin-valley'; version: string; minLauncherVersion: string
  bundle: { manifest: Asset; prism: Asset; overlay: Asset }
  changes?: string[]
}
interface Operation { formatVersion: 1; id: 'sunrin-valley-operations'; activeVersion: string; release: Channel; status: Omit<ServerStatus, 'activeVersion'>; updatedAt: string }
interface CachePointer { formatVersion: 1; channelUrl: string; release: string; channel: Channel }
interface Resolution { paths: BundlePaths; message?: string; updateRequired?: { minLauncherVersion: string; downloadUrl: string }; serverStatus?: ServerStatus; changes?: string[]; blocked?: string }
const descriptorLimit = 1024 * 1024
const assetNames = ['manifest', 'prism', 'overlay'] as const
const filenames = { manifest: 'manifest.json', prism: 'prism-runtime.json', overlay: 'overlay.zip' }
const sha256 = /^[a-f0-9]{64}$/i
const object = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value)

function version(value: unknown): number[] {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw new Error('잘못된 버전입니다.')
  const parts = value.split('.').map(Number)
  if (parts.some(part => !Number.isSafeInteger(part))) throw new Error('잘못된 버전입니다.')
  return parts
}
function isOlder(current: string, minimum: string): boolean {
  const a = version(current), b = version(minimum)
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] < b[index]
  return false
}
function https(value: unknown): string {
  if (typeof value !== 'string') throw new Error('잘못된 다운로드 주소입니다.')
  const url = new URL(value)
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error('안전한 HTTPS 주소가 필요합니다.')
  return url.href
}
function source(value: unknown): UpdateSource {
  if (!object(value) || value.formatVersion !== 1 || !(value.channelUrl === null || typeof value.channelUrl === 'string') || !(value.launcherDownloadUrl === null || typeof value.launcherDownloadUrl === 'string')) throw new Error('업데이트 설정이 올바르지 않습니다.')
  if (value.channelUrl !== null || value.operatingUrl !== undefined) https(value.launcherDownloadUrl)
  if (value.channelUrl !== null) https(value.channelUrl)
  if (value.operatingUrl !== undefined) https(value.operatingUrl)
  return value as UpdateSource
}
function channel(value: unknown): Channel {
  if (!object(value) || value.formatVersion !== 1 || value.id !== 'sunrin-valley' || !object(value.bundle)) throw new Error('업데이트 정보가 올바르지 않습니다.')
  version(value.version); version(value.minLauncherVersion)
  const bundle = {} as Channel['bundle']
  for (const name of assetNames) {
    const asset = value.bundle[name]
    if (!object(asset) || typeof asset.sha256 !== 'string' || !sha256.test(asset.sha256)) throw new Error('업데이트 파일 검증 정보가 올바르지 않습니다.')
    bundle[name] = { url: https(asset.url), sha256: asset.sha256.toLowerCase() }
  }
  if (value.changes !== undefined && (!Array.isArray(value.changes) || value.changes.length > 20 || value.changes.some(item => typeof item !== 'string' || !item.trim() || item.length > 500))) throw new Error('변경 내역이 올바르지 않습니다.')
  return { formatVersion: 1, id: 'sunrin-valley', version: value.version, minLauncherVersion: value.minLauncherVersion, bundle, ...(value.changes ? { changes: value.changes } : {}) }
}
function operation(value: unknown): Operation {
  if (!object(value) || value.formatVersion !== 1 || value.id !== 'sunrin-valley-operations' || !object(value.status)) throw new Error('서버 운영 정보가 올바르지 않습니다.')
  version(value.activeVersion)
  const release = channel(value.release), status = value.status
  if (release.version !== value.activeVersion || !['unconfigured', 'online', 'scheduled', 'maintenance', 'failed', 'unknown'].includes(status.state) || typeof status.message !== 'string' || status.message.length > 500) throw new Error('서버 운영 버전 또는 상태가 올바르지 않습니다.')
  if (status.targetVersion !== undefined) version(status.targetVersion)
  for (const date of [value.updatedAt, status.startsAt].filter(item => item !== undefined)) if (typeof date !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(date) || !Number.isFinite(Date.parse(date))) throw new Error('점검 시각에는 시간대가 필요합니다.')
  if (typeof value.updatedAt !== 'string') throw new Error('운영 정보 갱신 시각이 없습니다.')
  return { formatVersion: 1, id: 'sunrin-valley-operations', activeVersion: value.activeVersion, release, status: { state: status.state, message: status.message, ...(status.targetVersion ? { targetVersion: status.targetVersion } : {}), ...(status.startsAt ? { startsAt: status.startsAt } : {}) }, updatedAt: value.updatedAt }
}
function releaseId(value: Channel): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}
function bundlePaths(bundled: BundlePaths, directory: string): BundlePaths {
  return { ...bundled, manifest: join(directory, filenames.manifest), prism: join(directory, filenames.prism), overlay: join(directory, filenames.overlay) }
}

async function fetchHttps(url: string, fetcher: typeof fetch): Promise<Response> {
  let current = https(url)
  const signal = AbortSignal.timeout(8000)
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetcher(current, { signal, redirect: 'manual', headers: { 'User-Agent': 'SunrinValley' } })
    if (response.url) https(response.url)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location) throw new Error('다운로드 이동 주소가 없습니다.')
      current = https(new URL(location, current).href)
      continue
    }
    if (!response.ok || !response.body) throw new Error('업데이트 서버에 연결하지 못했습니다.')
    return response
  }
  throw new Error('다운로드 이동 횟수를 초과했습니다.')
}
async function descriptorBytes(response: Response): Promise<Buffer> {
  if (Number(response.headers.get('content-length') ?? 0) > descriptorLimit) { await response.body?.cancel(); throw new Error('업데이트 정보가 너무 큽니다.') }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of response.body as any) {
    const bytes = Buffer.from(chunk); size += bytes.length
    if (size > descriptorLimit) throw new Error('업데이트 정보가 너무 큽니다.')
    chunks.push(bytes)
  }
  return Buffer.concat(chunks)
}
function validatePrism(value: unknown): void {
  if (!object(value) || value.formatVersion !== 1 || !object(value.platforms)) throw new Error('Prism 배포 정보가 올바르지 않습니다.')
  version(value.version)
  for (const platform of ['darwin-arm64', 'win32-x64']) {
    const distribution = value.platforms[platform]
    if (!object(distribution) || typeof distribution.sha256 !== 'string' || !sha256.test(distribution.sha256) || typeof distribution.filename !== 'string' || distribution.filename.includes('/') || typeof distribution.executable !== 'string') throw new Error('Prism 파일 검증 정보가 올바르지 않습니다.')
    https(distribution.url)
    safeTarget('/archive', distribution.filename); safeTarget('/runtime', distribution.executable)
  }
}
async function verifyBundle(root: string, paths: BundlePaths, value: Channel): Promise<void> {
  for (const name of assetNames) {
    const path = paths[name]!
    await assertNoSymlinks(root, path)
    if (!await matchesHash(path, { algorithm: 'sha256', value: value.bundle[name].sha256 })) throw new Error('업데이트 파일 검증에 실패했습니다.')
  }
  const manifest = await loadManifest(paths.manifest)
  if (manifest.id !== 'sunrin-valley' || manifest.version !== value.version) throw new Error('업데이트 모드팩 버전이 일치하지 않습니다.')
  validatePrism(JSON.parse(await readFile(paths.prism, 'utf8')))
  validateOverlay(await readFile(paths.overlay!))
}

/** Resolves release assets only. Installation and game files are never changed here. */
export async function resolveRemotePack(root: string, bundled: BundlePaths, sourcePath: string, launcherVersion: string, options: { fetcher?: typeof fetch } = {}): Promise<Resolution> {
  let configured: UpdateSource
  try { configured = source(JSON.parse(await readFile(sourcePath, 'utf8'))); version(launcherVersion) }
  catch { return { paths: bundled, message: '업데이트 설정을 읽지 못해 기본 구성을 사용합니다.' } }
  const metadataUrl = configured.operatingUrl ?? configured.channelUrl
  if (!metadataUrl) return { paths: bundled }
  root = resolve(root)
  const updates = join(root, 'updates'), pointerPath = join(updates, 'current.json'), requiredPath = join(updates, 'required.json'), operationPath = join(updates, 'operation.json')
  let cached: { paths: BundlePaths; channel: Channel } | undefined
  let required: string | undefined
  let currentOperation: Operation | undefined
  const sameSource = (url: unknown) => url === metadataUrl || !!configured.operatingUrl && url === configured.channelUrl
  try {
    await assertNoSymlinks(root, pointerPath)
    const pointer: CachePointer = JSON.parse(await readFile(pointerPath, 'utf8'))
    const value = channel(pointer.channel)
    if (pointer.formatVersion !== 1 || !sameSource(pointer.channelUrl) || typeof pointer.release !== 'string' || !sha256.test(pointer.release) || pointer.release !== releaseId(value)) throw new Error('잘못된 캐시입니다.')
    const paths = bundlePaths(bundled, join(updates, 'releases', pointer.release))
    await verifyBundle(root, paths, value)
    cached = { paths, channel: value }
    if (isOlder(launcherVersion, value.minLauncherVersion)) required = value.minLauncherVersion
  } catch { /* Only a complete, reverified cache can be used offline. */ }
  try {
    await assertNoSymlinks(root, requiredPath)
    const marker = JSON.parse(await readFile(requiredPath, 'utf8'))
    if (marker.formatVersion === 1 && sameSource(marker.channelUrl) && isOlder(launcherVersion, marker.minLauncherVersion) && (!required || isOlder(required, marker.minLauncherVersion))) required = marker.minLauncherVersion
  } catch { /* A missing or damaged marker provides no update instruction. */ }
  if (configured.operatingUrl) try {
    await assertNoSymlinks(root, operationPath)
    const marker = JSON.parse(await readFile(operationPath, 'utf8'))
    if (marker.url === metadataUrl) currentOperation = operation(marker.snapshot)
  } catch { /* Last known operation is used only after validation. */ }
  const operationalInfo = () => currentOperation ? { serverStatus: { ...currentOperation.status, activeVersion: currentOperation.activeVersion }, changes: currentOperation.release.changes } : {}
  const fallback = (message: string): Resolution => {
    if (currentOperation && isOlder(launcherVersion, currentOperation.release.minLauncherVersion)) required = currentOperation.release.minLauncherVersion
    const expected = currentOperation?.release
    const blocked = expected && (!cached || expected.version !== cached.channel.version || assetNames.some(name => expected.bundle[name].sha256 !== cached!.channel.bundle[name].sha256))
    return { paths: cached?.paths ?? bundled, message, ...operationalInfo(), ...(blocked ? { blocked: `운영 버전 ${expected.version} 파일을 확인하지 못했습니다. 기존 파일은 보존했으며 다시 시도해 주세요.` } : {}), ...(required ? { updateRequired: { minLauncherVersion: required, downloadUrl: configured.launcherDownloadUrl! } } : {}) }
  }
  try {
    const fetcher = options.fetcher ?? fetch
    const requestUrl = new URL(metadataUrl)
    if (configured.operatingUrl) requestUrl.searchParams.set('_sunrin', String(Date.now()))
    const metadata = JSON.parse((await descriptorBytes(await fetchHttps(requestUrl.href, fetcher))).toString('utf8'))
    let value: Channel
    if (configured.operatingUrl) {
      currentOperation = operation(metadata); value = currentOperation.release
      await assertNoSymlinks(root, operationPath)
      await atomicWrite(operationPath, JSON.stringify({ url: metadataUrl, snapshot: currentOperation }))
    } else value = channel(metadata)
    if (isOlder(launcherVersion, value.minLauncherVersion)) {
      required = value.minLauncherVersion
      await assertNoSymlinks(root, requiredPath)
      await atomicWrite(requiredPath, JSON.stringify({ formatVersion: 1, channelUrl: metadataUrl, minLauncherVersion: required }))
      return fallback('새 모드팩을 사용하려면 런처 업데이트가 필요합니다.')
    }
    const release = releaseId(value), directory = join(updates, 'releases', release), paths = bundlePaths(bundled, directory)
    await assertNoSymlinks(root, directory)
    await mkdir(directory, { recursive: true })
    for (const name of assetNames) {
      const asset = value.bundle[name], target = paths[name]!
      await assertNoSymlinks(root, target)
      const secureFetcher: typeof fetch = async input => {
        const response = await fetchHttps(String(input), fetcher)
        return name === 'overlay' ? response : new Response(new Uint8Array(await descriptorBytes(response)))
      }
      await downloadVerified(asset.url, target, { algorithm: 'sha256', value: asset.sha256 }, { fetcher: secureFetcher, retries: 0 })
    }
    await verifyBundle(root, paths, value)
    await assertNoSymlinks(root, pointerPath)
    await atomicWrite(pointerPath, JSON.stringify({ formatVersion: 1, channelUrl: metadataUrl, release, channel: value } satisfies CachePointer))
    await assertNoSymlinks(root, requiredPath)
    await rm(requiredPath, { force: true })
    return { paths, ...operationalInfo(), ...(value.changes ? { changes: value.changes } : {}) }
  } catch {
    return fallback(cached ? '업데이트를 확인하지 못해 마지막으로 검증한 구성을 사용합니다.' : '업데이트를 확인하지 못해 기본 구성을 사용합니다.')
  }
}
