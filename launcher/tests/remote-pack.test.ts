import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import AdmZip from 'adm-zip'
import { resolveRemotePack, type UpdateSource } from '../src/main/remote-pack'
import type { BundlePaths } from '../src/main/pack-types'

const directories: string[] = []
const channelUrl = 'https://raw.githubusercontent.com/sunrin-valley/pack/main/channel.json'
const downloadUrl = 'https://github.com/sunrin-valley/pack/releases/latest'
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'sunrin-remote-')); directories.push(directory)
  const root = join(directory, 'userData'), assets = join(directory, 'bundle')
  await mkdir(root); await mkdir(assets)
  await writeFile(join(root, 'settings.json'), '{"memoryMb":6144}')
  const bundled: BundlePaths = { manifest: join(assets, 'manifest.json'), prism: join(assets, 'prism.json'), customPack: join(assets, 'custom.zip'), startup: join(assets, 'startup.js') }
  for (const path of Object.values(bundled)) await writeFile(path, 'bundled fallback')
  const sourcePath = join(assets, 'update-source.json')
  const source: UpdateSource = { formatVersion: 1, channelUrl, launcherDownloadUrl: downloadUrl }
  await writeFile(sourcePath, JSON.stringify(source))
  const manifest = { formatVersion: 1, id: 'sunrin-valley', version: '0.2.0', minecraft: '1.20.1', forge: '47.4.0', base: { url: 'https://edge.forgecdn.net/base.zip', filename: 'base.zip', sha256: 'a'.repeat(64), fileId: 1 }, files: [{ path: 'mods/test.jar', url: 'https://cdn.modrinth.com/test.jar', hash: { algorithm: 'sha256', value: 'b'.repeat(64) } }] }
  const distribution = { url: 'https://github.com/PrismLauncher/PrismLauncher/releases/download/11.1.1/prism.zip', sha256: 'c'.repeat(64), filename: 'prism.zip', executable: 'prismlauncher.exe' }
  const prism = { formatVersion: 1, version: '11.1.1', platforms: { 'win32-x64': distribution, 'darwin-arm64': { ...distribution, executable: 'Prism Launcher.app/Contents/MacOS/prismlauncher' } } }
  const zip = new AdmZip(); zip.addFile('kubejs/startup_scripts/items.js', Buffer.from('new item'))
  const overlay = zip.toBuffer()
  const channel = { formatVersion: 1, id: 'sunrin-valley', version: '0.2.0', minLauncherVersion: '0.1.1', bundle: {
    manifest: { url: 'https://github.com/sunrin-valley/pack/releases/download/0.2.0/manifest.json', sha256: '' },
    prism: { url: 'https://github.com/sunrin-valley/pack/releases/download/0.2.0/prism.json', sha256: '' },
    overlay: { url: 'https://github.com/sunrin-valley/pack/releases/download/0.2.0/overlay.zip', sha256: hash(overlay) }
  } }
  const payloads = new Map<string, Buffer>()
  function refresh() {
    const manifestBytes = Buffer.from(JSON.stringify(manifest)), prismBytes = Buffer.from(JSON.stringify(prism))
    channel.bundle.manifest.sha256 = hash(manifestBytes); channel.bundle.prism.sha256 = hash(prismBytes)
    payloads.set(channel.bundle.manifest.url, manifestBytes); payloads.set(channel.bundle.prism.url, prismBytes); payloads.set(channel.bundle.overlay.url, overlay)
  }
  refresh()
  const fetcher: typeof fetch = async input => {
    const url = String(input)
    if (url === channelUrl) return new Response(JSON.stringify(channel))
    const payload = payloads.get(url)
    return payload ? new Response(new Uint8Array(payload)) : new Response('', { status: 404 })
  }
  return { root, bundled, sourcePath, source, manifest, prism, overlay, channel, refresh, fetcher }
}
const offline: typeof fetch = async () => { throw new Error('offline') }

it.each(['forbidden', 'case collision'] as const)('keeps the installable cache when a new overlay has a %s', async kind => {
  const f = await fixture()
  const first = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  const pointer = await readFile(join(f.root, 'updates/current.json'), 'utf8')
  f.channel.version = f.manifest.version = '0.2.1'; f.refresh()
  const zip = new AdmZip()
  if (kind === 'forbidden') zip.addFile('config/client.toml', Buffer.from('invalid target'))
  else { zip.addFile('kubejs/server_scripts/items.js', Buffer.from('a')); zip.addFile('kubejs/server_scripts/Items.js', Buffer.from('b')) }
  const bytes = zip.toBuffer(); f.channel.bundle.overlay.sha256 = hash(bytes)
  const fetcher: typeof fetch = async input => String(input) === f.channel.bundle.overlay.url ? new Response(new Uint8Array(bytes)) : f.fetcher(input)
  expect((await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher })).paths).toEqual(first.paths)
  expect(await readFile(join(f.root, 'updates/current.json'), 'utf8')).toBe(pointer)
  expect((await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: offline })).paths).toEqual(first.paths)
})

it('uses the packaged bundle without creating an update cache when no channel is configured', async () => {
  const f = await fixture(); f.source.channelUrl = null
  await writeFile(f.sourcePath, JSON.stringify(f.source))
  expect(await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: offline })).toEqual({ paths: f.bundled })
  expect(await readdir(f.root)).toEqual(['settings.json'])
})

it('verifies a remote release and publishes it without touching the existing user data', async () => {
  const f = await fixture()
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  expect(result.message).toBeUndefined(); expect(result.updateRequired).toBeUndefined()
  expect(result.paths.manifest).not.toBe(f.bundled.manifest)
  expect(result.paths.customPack).toBe(f.bundled.customPack); expect(result.paths.startup).toBe(f.bundled.startup)
  expect(JSON.parse(await readFile(result.paths.manifest, 'utf8')).version).toBe('0.2.0')
  expect(JSON.parse(await readFile(result.paths.prism, 'utf8')).version).toBe('11.1.1')
  expect(await readFile(result.paths.overlay!)).toEqual(f.overlay)
  expect(await readFile(join(f.root, 'settings.json'), 'utf8')).toBe('{"memoryMb":6144}')
  expect((await readdir(f.root)).sort()).toEqual(['settings.json', 'updates'])
  expect(JSON.parse(await readFile(join(f.root, 'updates/current.json'), 'utf8'))).toBeTruthy()
})

it('reuses a verified unchanged release without redownloading assets', async () => {
  const f = await fixture()
  const first = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  const fetcher: typeof fetch = async input => {
    if (String(input) !== channelUrl) throw new Error('assets must be reused')
    return f.fetcher(input)
  }
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher })
  expect(result.paths).toEqual(first.paths); expect(result.message).toBeUndefined()
})

it('uses only the last fully verified release offline and rejects a corrupted cached asset', async () => {
  const f = await fixture()
  const first = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  const cached = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: offline })
  expect(cached.paths).toEqual(first.paths); expect(cached.message).toBeTruthy()
  await writeFile(first.paths.overlay!, 'damaged')
  expect((await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: offline })).paths).toEqual(f.bundled)
})

it.each(['http', 'hash'] as const)('preserves the old current release after a new release has a %s failure', async failure => {
  const f = await fixture()
  const first = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  const pointer = await readFile(join(f.root, 'updates/current.json'), 'utf8')
  f.manifest.version = f.channel.version = '0.2.1'; f.refresh()
  const fetcher: typeof fetch = async input => String(input) === f.channel.bundle.overlay.url
    ? failure === 'http' ? new Response('', { status: 503 }) : new Response('wrong archive')
    : f.fetcher(input)
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher })
  expect(result.paths).toEqual(first.paths); expect(result.message).toBeTruthy()
  expect(await readFile(join(f.root, 'updates/current.json'), 'utf8')).toBe(pointer)
})

it.each([
  ['wrong pack id', (f: Awaited<ReturnType<typeof fixture>>) => { f.channel.id = 'another-pack' }],
  ['unsafe version', (f: Awaited<ReturnType<typeof fixture>>) => { f.channel.version = '../escape' }],
  ['invalid minimum version', (f: Awaited<ReturnType<typeof fixture>>) => { f.channel.minLauncherVersion = '0.1' }],
  ['insecure asset URL', (f: Awaited<ReturnType<typeof fixture>>) => { f.channel.bundle.overlay.url = 'http://example.com/overlay.zip' }],
  ['asset credentials', (f: Awaited<ReturnType<typeof fixture>>) => { f.channel.bundle.overlay.url = 'https://user:password@example.com/overlay.zip' }],
  ['invalid hash', (f: Awaited<ReturnType<typeof fixture>>) => { f.channel.bundle.overlay.sha256 = 'a'.repeat(63) }],
  ['mismatched pack version', (f: Awaited<ReturnType<typeof fixture>>) => { f.manifest.version = '0.2.1'; f.refresh() }],
  ['manifest traversal', (f: Awaited<ReturnType<typeof fixture>>) => { f.manifest.files[0].path = 'mods/../../escape.jar'; f.refresh() }],
  ['invalid Prism format', (f: Awaited<ReturnType<typeof fixture>>) => { f.prism.formatVersion = 2; f.refresh() }],
  ['Prism executable traversal', (f: Awaited<ReturnType<typeof fixture>>) => { f.prism.platforms['win32-x64'].executable = '../escape.exe'; f.refresh() }],
  ['Prism archive traversal', (f: Awaited<ReturnType<typeof fixture>>) => { f.prism.platforms['win32-x64'].filename = '../escape.zip'; f.refresh() }],
  ['insecure Prism URL', (f: Awaited<ReturnType<typeof fixture>>) => { f.prism.platforms['win32-x64'].url = 'http://example.com/prism.zip'; f.refresh() }]
])('falls back to the packaged bundle for %s', async (_name, mutate) => {
  const f = await fixture(); mutate(f)
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  expect(result.paths).toEqual(f.bundled); expect(result.message).toBeTruthy()
  await expect(readFile(join(f.root, 'updates/current.json'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it.each(['http://example.com/channel.json', 'https://user:pass@example.com/channel.json'])('rejects unsafe configured channel %s before fetching', async url => {
  const f = await fixture(); f.source.channelUrl = url
  await writeFile(f.sourcePath, JSON.stringify(f.source))
  let requested = false
  const fetcher: typeof fetch = async () => { requested = true; return new Response('{}') }
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher })
  expect(result.paths).toEqual(f.bundled); expect(requested).toBe(false)
})

it.each([false, true])('rejects a descriptor larger than 1 MiB (content length provided: %s)', async useHeader => {
  const f = await fixture()
  const fetcher: typeof fetch = async () => new Response(' '.repeat(1024 * 1024 + 1), useHeader ? { headers: { 'content-length': String(1024 * 1024 + 1) } } : undefined)
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher })
  expect(result.paths).toEqual(f.bundled); expect(result.message).toBeTruthy()
})

it('rejects insecure redirects before fetching their destinations', async () => {
  const f = await fixture(); const requests: string[] = []
  const fetcher: typeof fetch = async input => { requests.push(String(input)); return new Response(null, { status: 302, headers: { location: 'http://example.com/channel.json' } }) }
  expect((await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher })).paths).toEqual(f.bundled)
  expect(requests).toEqual([channelUrl])
})

it('remembers a newer minimum launcher patch offline while preserving the usable cache', async () => {
  const f = await fixture()
  const first = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  const pointer = await readFile(join(f.root, 'updates/current.json'), 'utf8')
  f.channel.minLauncherVersion = '0.1.2'
  const blocked = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  expect(blocked.paths).toEqual(first.paths)
  expect(blocked.updateRequired).toEqual({ minLauncherVersion: '0.1.2', downloadUrl })
  expect(await readFile(join(f.root, 'updates/current.json'), 'utf8')).toBe(pointer)
  const cached = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: offline })
  expect(cached.updateRequired).toEqual({ minLauncherVersion: '0.1.2', downloadUrl })
  const upgraded = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.2', { fetcher: offline })
  expect(upgraded.updateRequired).toBeUndefined(); expect(upgraded.paths).toEqual(first.paths)
})

it('clears an older update requirement after a fully verified compatible channel is published', async () => {
  const f = await fixture(); f.channel.minLauncherVersion = '0.1.2'
  expect((await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })).updateRequired).toBeTruthy()
  f.channel.minLauncherVersion = '0.1.1'
  expect((await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })).updateRequired).toBeUndefined()
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: offline })
  expect(result.updateRequired).toBeUndefined(); expect(result.paths.overlay).toBeTruthy()
})

it('does not follow a cache pointer outside the update directory', async () => {
  const f = await fixture()
  await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  const path = join(f.root, 'updates/current.json'), pointer = JSON.parse(await readFile(path, 'utf8'))
  pointer.release = '../../bundle'; await writeFile(path, JSON.stringify(pointer))
  expect((await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: offline })).paths).toEqual(f.bundled)
})

it('preserves a verified release and pointer when a newer channel is malformed', async () => {
  const f = await fixture()
  const first = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: f.fetcher })
  const pointer = await readFile(join(f.root, 'updates/current.json'), 'utf8')
  const fetcher: typeof fetch = async () => new Response('{broken JSON')
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher })
  expect(result.paths).toEqual(first.paths)
  expect(await readFile(join(f.root, 'updates/current.json'), 'utf8')).toBe(pointer)
})

it('blocks an older launcher from a verified cache even without the separate update marker', async () => {
  const f = await fixture(); f.channel.minLauncherVersion = '0.1.2'
  const first = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.2', { fetcher: f.fetcher })
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher: offline })
  expect(result.paths).toEqual(first.paths)
  expect(result.updateRequired).toEqual({ minLauncherVersion: '0.1.2', downloadUrl })
})

it('follows HTTPS release asset redirects while preserving the verified content', async () => {
  const f = await fixture(), destination = 'https://release-assets.githubusercontent.com/prism.json'
  const prismBytes = JSON.stringify(f.prism)
  const fetcher: typeof fetch = async input => {
    if (String(input) === f.channel.bundle.prism.url) return new Response(null, { status: 302, headers: { location: destination } })
    if (String(input) === destination) return new Response(prismBytes)
    return f.fetcher(input)
  }
  const result = await resolveRemotePack(f.root, f.bundled, f.sourcePath, '0.1.1', { fetcher })
  expect(result.paths.overlay).toBeTruthy(); expect(result.message).toBeUndefined()
  expect(await readFile(result.paths.prism, 'utf8')).toBe(prismBytes)
})
