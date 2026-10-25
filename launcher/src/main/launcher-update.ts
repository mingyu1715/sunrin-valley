import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, mkdir, open, rename, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { assertNoSymlinks, safeTarget } from './files'
import type { Progress } from './pack-types'
import type { LauncherUpdateInfo } from '../shared'

const descriptorUrl = 'https://github.com/mingyu1715/sunrin-valley/releases/latest/download/launcher-update.json'
const repository = 'https://github.com/mingyu1715/sunrin-valley'
const descriptorLimit = 256 * 1024
const archiveLimit = 512 * 1024 * 1024
const checksum = /^[a-f0-9]{64}$/i
type Platform = 'darwin-arm64' | 'win32-x64'
type Asset = LauncherUpdateInfo['asset']
const platforms: Record<Platform, { kind: Asset['kind']; suffix: string }> = {
  'darwin-arm64': { kind: 'dmg', suffix: 'mac-arm64.dmg' },
  'win32-x64': { kind: 'zip', suffix: 'windows-x64-update.zip' }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parts(value: unknown): number[] {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw new Error('잘못된 런처 버전입니다.')
  const result = value.split('.').map(Number)
  if (result.some(part => !Number.isSafeInteger(part))) throw new Error('잘못된 런처 버전입니다.')
  return result
}

function newer(current: string, candidate: string): boolean {
  const a = parts(current), b = parts(candidate)
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return b[i] > a[i]
  return false
}

function httpsUrl(value: unknown, allowQuery = false): URL {
  if (typeof value !== 'string') throw new Error('잘못된 런처 다운로드 주소입니다.')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || (!allowQuery && url.search) || url.port) throw new Error('안전한 HTTPS 주소가 필요합니다.')
  return url
}

function expectedFilename(version: string, platform: Platform): string {
  return `Sunrin-Valley-${version}-${platforms[platform].suffix}`
}

function validateAsset(value: unknown, version: string, platform: Platform): Asset {
  if (!object(value) || value.kind !== platforms[platform].kind || typeof value.sha256 !== 'string' || !checksum.test(value.sha256) || !Number.isSafeInteger(value.size) || (value.size as number) < 1 || (value.size as number) > archiveLimit) throw new Error('런처 업데이트 파일 정보가 올바르지 않습니다.')
  const url = httpsUrl(value.url)
  const expected = `${repository}/releases/download/launcher-${version}/${expectedFilename(version, platform)}`
  if (url.href !== expected) throw new Error('런처 업데이트 파일 주소가 올바르지 않습니다.')
  return { url: url.href, sha256: value.sha256.toLowerCase(), size: value.size as number, kind: platforms[platform].kind }
}

function validateManifest(value: unknown, platformKey: string): LauncherUpdateInfo {
  if (!object(value) || value.formatVersion !== 1 || value.id !== 'sunrin-valley-launcher' || !object(value.assets) || !Array.isArray(value.changes) || value.changes.length > 20 || value.changes.some(change => typeof change !== 'string' || !change.trim() || change.length > 500)) throw new Error('런처 업데이트 정보가 올바르지 않습니다.')
  parts(value.version)
  if (!(platformKey in platforms)) throw new Error('지원하지 않는 런처 운영체제입니다.')
  const version = value.version as string
  const assets = value.assets as Record<string, unknown>
  // Validate both entries so a malformed release cannot pass on one platform.
  const mac = validateAsset(assets['darwin-arm64'], version, 'darwin-arm64')
  const windows = validateAsset(assets['win32-x64'], version, 'win32-x64')
  return { version, changes: value.changes as string[], asset: platformKey === 'darwin-arm64' ? mac : windows }
}

function validateInfo(info: LauncherUpdateInfo): Asset {
  parts(info.version)
  const platform = info.asset.kind === 'dmg' ? 'darwin-arm64' : info.asset.kind === 'zip' ? 'win32-x64' : undefined
  if (!platform) throw new Error('지원하지 않는 런처 파일 형식입니다.')
  return validateAsset(info.asset, info.version, platform)
}

function redirectTarget(location: string, previous: string, descriptor: boolean): string {
  const url = httpsUrl(new URL(location, previous).href, true)
  if (url.hostname === 'github.com') {
    if (url.search || !url.pathname.startsWith('/mingyu1715/sunrin-valley/releases/download/launcher-')) throw new Error('잘못된 GitHub 릴리스 이동 주소입니다.')
    if (descriptor && !url.pathname.endsWith('/launcher-update.json')) throw new Error('잘못된 런처 정보 이동 주소입니다.')
  } else if (url.hostname !== 'release-assets.githubusercontent.com') throw new Error('허용되지 않은 릴리스 다운로드 호스트입니다.')
  return url.href
}

async function fetchRelease(url: string, fetcher: typeof fetch, descriptor: boolean): Promise<Response> {
  let next = url
  const signal = AbortSignal.timeout(descriptor ? 8000 : 180_000)
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetcher(next, { signal, redirect: 'manual', headers: { 'User-Agent': 'SunrinValleyLauncher' } })
    if (response.url && response.url !== next) redirectTarget(response.url, next, descriptor)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location) throw new Error('릴리스 이동 주소가 없습니다.')
      next = redirectTarget(location, next, descriptor)
      continue
    }
    return response
  }
  throw new Error('릴리스 이동 횟수를 초과했습니다.')
}

export async function checkLauncherUpdate(currentVersion: string, platformKey: string, options: { fetcher?: typeof fetch; includeCurrent?: boolean } = {}): Promise<LauncherUpdateInfo | undefined> {
  parts(currentVersion)
  if (!(platformKey in platforms)) throw new Error('지원하지 않는 런처 운영체제입니다.')
  const response = await fetchRelease(descriptorUrl, options.fetcher ?? fetch, true)
  if (response.status === 404) return undefined
  if (!response.ok || !response.body) throw new Error('런처 업데이트 정보를 읽지 못했습니다.')
  const statedSize = response.headers.get('content-length')
  if (statedSize !== null && (!/^\d+$/.test(statedSize) || Number(statedSize) > descriptorLimit)) throw new Error('런처 업데이트 정보가 너무 큽니다.')
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    const bytes = Buffer.from(chunk)
    size += bytes.length
    if (size > descriptorLimit) throw new Error('런처 업데이트 정보가 너무 큽니다.')
    chunks.push(bytes)
  }
  const info = validateManifest(JSON.parse(Buffer.concat(chunks).toString('utf8')), platformKey)
  return newer(currentVersion, info.version) || (options.includeCurrent === true && currentVersion === info.version) ? info : undefined
}

async function verifiedCache(path: string, asset: Asset): Promise<boolean> {
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.size !== asset.size) return false
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(path)) hash.update(chunk)
    return hash.digest('hex') === asset.sha256
  } catch (error: any) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

export async function downloadLauncherUpdate(info: LauncherUpdateInfo, root: string, progress: Progress, options: { fetcher?: typeof fetch } = {}): Promise<string> {
  const asset = validateInfo(info)
  root = resolve(root)
  const directory = safeTarget(root, 'launcher-updates/downloads')
  const filename = new URL(asset.url).pathname.split('/').at(-1)!
  const target = safeTarget(directory, filename)
  await assertNoSymlinks(root, target)
  await mkdir(directory, { recursive: true })
  await assertNoSymlinks(root, target)
  if (await verifiedCache(target, asset)) { progress('런처 업데이트 파일 확인 완료', 100); return target }

  const temporary = safeTarget(directory, `${filename}.${randomUUID()}.part`)
  let file: Awaited<ReturnType<typeof open>> | undefined
  try {
    const response = await fetchRelease(asset.url, options.fetcher ?? fetch, false)
    if (!response.ok || !response.body) throw new Error('런처 업데이트 파일을 다운로드하지 못했습니다.')
    const statedSize = response.headers.get('content-length')
    if (statedSize !== null && (!/^\d+$/.test(statedSize) || Number(statedSize) !== asset.size)) throw new Error('런처 업데이트 파일 크기가 일치하지 않습니다.')
    await assertNoSymlinks(root, temporary)
    file = await open(temporary, 'wx')
    const digest = createHash('sha256')
    let done = 0
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      const bytes = Buffer.from(chunk)
      done += bytes.length
      if (done > asset.size || done > archiveLimit) throw new Error('런처 업데이트 파일이 지정된 크기를 초과했습니다.')
      digest.update(bytes)
      let offset = 0
      while (offset < bytes.length) offset += (await file.write(bytes, offset, bytes.length - offset)).bytesWritten
      progress('런처 업데이트 다운로드 중', done / asset.size * 100)
    }
    if (done !== asset.size || digest.digest('hex') !== asset.sha256) throw new Error('런처 업데이트 파일 검증에 실패했습니다.')
    await file.close(); file = undefined
    await assertNoSymlinks(root, target)
    await rename(temporary, target)
    progress('런처 업데이트 파일 확인 완료', 100)
    return target
  } finally {
    await file?.close()
    await rm(temporary, { force: true })
  }
}
