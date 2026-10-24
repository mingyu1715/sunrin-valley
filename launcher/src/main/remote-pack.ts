import { createHash } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { assertNoSymlinks, atomicWrite, downloadVerified, matchesHash, safeTarget } from './files'
import { loadManifest, validateOverlay } from './installer'
import type { BundlePaths } from './pack-types'

export interface UpdateSource { formatVersion: 1; channelUrl: string | null; launcherDownloadUrl: string | null }
interface Asset { url: string; sha256: string }
interface Channel {
  formatVersion: 1; id: 'sunrin-valley'; version: string; minLauncherVersion: string
  bundle: { manifest: Asset; prism: Asset; overlay: Asset }
}
interface CachePointer { formatVersion: 1; channelUrl: string; release: string; channel: Channel }
interface Resolution { paths: BundlePaths; message?: string; updateRequired?: { minLauncherVersion: string; downloadUrl: string } }
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
  if (value.channelUrl !== null) { https(value.channelUrl); https(value.launcherDownloadUrl) }
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
  return { formatVersion: 1, id: 'sunrin-valley', version: value.version, minLauncherVersion: value.minLauncherVersion, bundle }
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
  if (!configured.channelUrl) return { paths: bundled }
  root = resolve(root)
  const updates = join(root, 'updates'), pointerPath = join(updates, 'current.json'), requiredPath = join(updates, 'required.json')
  let cached: { paths: BundlePaths; channel: Channel } | undefined
  let required: string | undefined
  try {
    await assertNoSymlinks(root, pointerPath)
    const pointer: CachePointer = JSON.parse(await readFile(pointerPath, 'utf8'))
    const value = channel(pointer.channel)
    if (pointer.formatVersion !== 1 || pointer.channelUrl !== configured.channelUrl || typeof pointer.release !== 'string' || !sha256.test(pointer.release) || pointer.release !== releaseId(value)) throw new Error('잘못된 캐시입니다.')
    const paths = bundlePaths(bundled, join(updates, 'releases', pointer.release))
    await verifyBundle(root, paths, value)
    cached = { paths, channel: value }
    if (isOlder(launcherVersion, value.minLauncherVersion)) required = value.minLauncherVersion
  } catch { /* Only a complete, reverified cache can be used offline. */ }
  try {
    await assertNoSymlinks(root, requiredPath)
    const marker = JSON.parse(await readFile(requiredPath, 'utf8'))
    if (marker.formatVersion === 1 && marker.channelUrl === configured.channelUrl && isOlder(launcherVersion, marker.minLauncherVersion) && (!required || isOlder(required, marker.minLauncherVersion))) required = marker.minLauncherVersion
  } catch { /* A missing or damaged marker provides no update instruction. */ }
  const fallback = (message: string): Resolution => ({ paths: cached?.paths ?? bundled, message, ...(required ? { updateRequired: { minLauncherVersion: required, downloadUrl: configured.launcherDownloadUrl! } } : {}) })
  try {
    const fetcher = options.fetcher ?? fetch
    const value = channel(JSON.parse((await descriptorBytes(await fetchHttps(configured.channelUrl, fetcher))).toString('utf8')))
    if (isOlder(launcherVersion, value.minLauncherVersion)) {
      required = value.minLauncherVersion
      await assertNoSymlinks(root, requiredPath)
      await atomicWrite(requiredPath, JSON.stringify({ formatVersion: 1, channelUrl: configured.channelUrl, minLauncherVersion: required }))
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
    await atomicWrite(pointerPath, JSON.stringify({ formatVersion: 1, channelUrl: configured.channelUrl, release, channel: value } satisfies CachePointer))
    await assertNoSymlinks(root, requiredPath)
    await rm(requiredPath, { force: true })
    return { paths }
  } catch {
    return fallback(cached ? '업데이트를 확인하지 못해 마지막으로 검증한 구성을 사용합니다.' : '업데이트를 확인하지 못해 기본 구성을 사용합니다.')
  }
}
