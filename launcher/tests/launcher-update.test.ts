import { afterEach, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, symlink, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkLauncherUpdate, downloadLauncherUpdate } from '../src/main/launcher-update'

const descriptorUrl = 'https://github.com/mingyu1715/sunrin-valley/releases/latest/download/launcher-update.json'
const version = '1.1.1'
const url = `https://github.com/mingyu1715/sunrin-valley/releases/download/launcher-${version}/Sunrin-Valley-${version}-mac-arm64.dmg`
const hash = (data: string) => createHash('sha256').update(data).digest('hex')
const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
const manifest = (assetUrl = url) => ({
  formatVersion: 1, id: 'sunrin-valley-launcher', version, changes: ['A useful change'],
  assets: {
    'darwin-arm64': { url: assetUrl, sha256: hash('archive'), size: 7, kind: 'dmg' as const },
    'win32-x64': { url: `https://github.com/mingyu1715/sunrin-valley/releases/download/launcher-${version}/Sunrin-Valley-${version}-windows-x64-update.zip`, sha256: hash('windows'), size: 7, kind: 'zip' as const }
  }
})
const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 })

it('selects a newer release asset for the requested platform', async () => {
  const fetcher = (async (input: string | URL | Request) => {
    expect(String(input)).toBe(descriptorUrl)
    return json(manifest())
  }) as typeof fetch
  await expect(checkLauncherUpdate('1.1.0', 'darwin-arm64', { fetcher })).resolves.toEqual({
    version, changes: ['A useful change'], asset: manifest().assets['darwin-arm64']
  })
  await expect(checkLauncherUpdate('1.1.0', 'win32-x64', { fetcher })).resolves.toEqual({
    version, changes: ['A useful change'], asset: manifest().assets['win32-x64']
  })
})

it('returns no update on 404 or a non-newer version', async () => {
  await expect(checkLauncherUpdate('1.1.0', 'darwin-arm64', { fetcher: (async () => new Response(null, { status: 404 })) as typeof fetch })).resolves.toBeUndefined()
  await expect(checkLauncherUpdate('1.1.1', 'darwin-arm64', { fetcher: (async () => json(manifest())) as typeof fetch })).resolves.toBeUndefined()
  await expect(checkLauncherUpdate('2.0.0', 'darwin-arm64', { fetcher: (async () => json(manifest())) as typeof fetch })).resolves.toBeUndefined()
})

it('returns current release changes only when explicitly requested', async () => {
  const fetcher = (async () => json(manifest())) as typeof fetch
  await expect(checkLauncherUpdate('1.1.1', 'darwin-arm64', { fetcher })).resolves.toBeUndefined()
  await expect(checkLauncherUpdate('1.1.1', 'darwin-arm64', { fetcher, includeCurrent: true })).resolves.toMatchObject({
    version: '1.1.1', changes: ['A useful change']
  })
  await expect(checkLauncherUpdate('1.1.2', 'darwin-arm64', { fetcher, includeCurrent: true })).resolves.toBeUndefined()
})

it.each([
  ['outside repository', 'https://evil.example/releases/download/launcher-1.1.1/Sunrin-Valley-1.1.1-mac-arm64.dmg'],
  ['different release', 'https://github.com/mingyu1715/sunrin-valley/releases/download/launcher-1.1.0/Sunrin-Valley-1.1.1-mac-arm64.dmg'],
  ['different filename', 'https://github.com/mingyu1715/sunrin-valley/releases/download/launcher-1.1.1/other.dmg'],
  ['query', `${url}?token=123`],
  ['HTTP', url.replace('https:', 'http:')]
])('rejects a %s asset URL', async (_name, assetUrl) => {
  await expect(checkLauncherUpdate('1.1.0', 'darwin-arm64', { fetcher: (async () => json(manifest(assetUrl))) as typeof fetch })).rejects.toThrow()
})

it('rejects malformed metadata and oversized descriptors', async () => {
  const bad = { ...manifest(), assets: { ...manifest().assets, 'darwin-arm64': { ...manifest().assets['darwin-arm64'], size: 512 * 1024 * 1024 + 1 } } }
  await expect(checkLauncherUpdate('1.1.0', 'darwin-arm64', { fetcher: (async () => json(bad)) as typeof fetch })).rejects.toThrow()
  await expect(checkLauncherUpdate('1.1.0', 'darwin-arm64', { fetcher: (async () => new Response('x'.repeat(256 * 1024 + 1))) as typeof fetch })).rejects.toThrow()
  await expect(checkLauncherUpdate('1.1.0', 'darwin-arm64', { fetcher: (async () => json(manifest())) as typeof fetch })).resolves.toBeDefined()
})

it('downloads a verified archive, reports byte progress, and reuses it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'launcher-update-')); dirs.push(root)
  let requests = 0
  const fetcher = (async () => { requests++; return new Response('archive') }) as typeof fetch
  const info = { version, changes: [], asset: manifest().assets['darwin-arm64'] }
  const progress: Array<number | null> = []
  const path = await downloadLauncherUpdate(info, root, (_message, percent) => progress.push(percent), { fetcher })
  expect(await readFile(path, 'utf8')).toBe('archive')
  expect(progress.at(-1)).toBe(100)
  expect(await downloadLauncherUpdate(info, root, () => {}, { fetcher })).toBe(path)
  expect(requests).toBe(1)
})

it('rejects truncated and oversized streams while preserving the prior file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'launcher-update-')); dirs.push(root)
  const info = { version, changes: [], asset: manifest().assets['darwin-arm64'] }
  const target = await downloadLauncherUpdate(info, root, () => {}, { fetcher: (async () => new Response('archive')) as typeof fetch })
  await writeFile(target, 'prior')
  for (const body of ['short', 'archive-too-long']) {
    await expect(downloadLauncherUpdate(info, root, () => {}, { fetcher: (async () => new Response(body)) as typeof fetch })).rejects.toThrow()
    expect(await readFile(target, 'utf8')).toBe('prior')
  }
  expect((await readdir(join(root, 'launcher-updates', 'downloads'))).every(name => !name.endsWith('.part'))).toBe(true)
})

it('refuses symlinked download directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'launcher-update-')); dirs.push(root)
  const outside = await mkdtemp(join(tmpdir(), 'launcher-outside-')); dirs.push(outside)
  await mkdir(join(root, 'launcher-updates'))
  await symlink(outside, join(root, 'launcher-updates', 'downloads'))
  const info = { version, changes: [], asset: manifest().assets['darwin-arm64'] }
  await expect(downloadLauncherUpdate(info, root, () => {}, { fetcher: (async () => new Response('archive')) as typeof fetch })).rejects.toThrow()
  expect(await readdir(outside)).toEqual([])
})
