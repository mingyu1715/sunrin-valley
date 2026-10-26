import { afterEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import AdmZip from 'adm-zip'
import { installClient, inspectInstall, readReceipt } from '../src/main/installer'
import { gameRoot } from '../src/main/instance'
import { atomicWrite } from '../src/main/files'
import { KOREAN_INPUT_PATH, prepareKoreanInputMetadata } from '../src/main/korean-input'
import type { PackManifest } from '../src/main/pack-types'

// Only replace the publisher-artifact pin for synthetic fixtures. ZIP metadata
// transformation, real file writes, download verification and receipts stay real.
vi.mock('../src/main/korean-input', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/main/korean-input')>()
  return {
    ...actual,
    prepareKoreanInputMetadata: vi.fn(async (path: string) => {
      const prepared = actual.transformKoreanInputMetadata(await readFile(path))
      await atomicWrite(path, prepared)
      return { algorithm: 'sha256' as const, value: createHash('sha256').update(prepared).digest('hex') }
    })
  }
})

const directories: string[] = []
afterEach(async () => {
  vi.clearAllMocks()
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-install-korean-')); directories.push(root)
  const assets = join(root, 'bundle'); await mkdir(assets)
  const baseZip = new AdmZip()
  baseZip.addFile('overrides/configureddefaults/options.txt', Buffer.from('lang:en_us\ngamma:0.5\nresourcePacks:["vanilla"]\n'))
  const base = baseZip.toBuffer(), input = new AdmZip()
  input.addFile('META-INF/mods.toml', Buffer.from('modLoader = "javafml"\nloaderVersion = "[46,)"\nlicense = "LGPL-3.0"\n[[mods]]\nmodId = "koreanpatch"\nversion = "1.9.6+mc1.20.1"\n'))
  input.addFile('client/Keyboard.class', Buffer.from([0xca, 0xfe, 0xba, 0xbe]))
  input.addFile('LICENSE_Korean Patch', Buffer.from('LGPL-3.0'))
  const original = input.toBuffer()
  const koreanFile = { path: KOREAN_INPUT_PATH, url: 'https://example.com/koreanpatch.jar', hash: { algorithm: 'sha256' as const, value: hash(original) } }
  const manifest: PackManifest = {
    formatVersion: 1, id: 'sunrin-valley', version: '0.1.3', minecraft: '1.20.1', forge: '47.4.0',
    base: { url: 'https://example.com/base.zip', sha256: hash(base), filename: 'base.zip', fileId: 1 },
    files: [koreanFile]
  }
  const paths = { manifest: join(assets, 'manifest.json'), prism: join(assets, 'prism.json'), customPack: join(assets, 'Sunrin-Custom.zip'), startup: join(assets, 'sunrin_items.js') }
  await writeFile(paths.manifest, JSON.stringify(manifest)); await writeFile(paths.prism, '{}')
  await writeFile(paths.customPack, 'custom resources'); await writeFile(paths.startup, 'custom items')
  const runtime = { java: join(root, 'java'), prism: join(root, 'prism') }
  await writeFile(runtime.java, 'java'); await writeFile(runtime.prism, 'prism')
  const settings = { dataPath: join(root, 'data'), minecraftPath: join(root, 'vanilla'), memoryMb: 6144, importOptions: false, shareShaders: false }
  const dependencies = {
    fetcher: async (url: any) => new Response(new Uint8Array(String(url).endsWith('base.zip') ? base : original)),
    assertIdle: async () => {}, runtimeInstaller: async () => runtime
  }
  return { settings, paths, dependencies, manifest, koreanFile, original, game: gameRoot(settings.dataPath) }
}

it('records the prepared JAR hash and reports the installation ready', async () => {
  const { settings, paths, dependencies, original, game } = await fixture()
  await installClient(settings, paths, () => {}, dependencies)
  const installed = await readFile(join(game, KOREAN_INPUT_PATH)), receipt = await readReceipt(settings.dataPath)
  expect(installed.equals(original)).toBe(false)
  expect(new AdmZip(installed).readAsText('META-INF/mods.toml')).toContain('displayTest = "IGNORE_ALL_VERSION"')
  expect(receipt?.managed[KOREAN_INPUT_PATH]).toEqual({ algorithm: 'sha256', value: hash(installed) })
  expect(receipt?.managed[KOREAN_INPUT_PATH].value).not.toBe(hash(original))
  expect(JSON.parse(await readFile(paths.manifest, 'utf8')).files[0].hash.value).toBe(hash(original))
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
  expect(prepareKoreanInputMetadata).toHaveBeenCalledExactlyOnceWith(join(game, KOREAN_INPUT_PATH))
})

it('rolls back a preexisting pristine JAR when a later fetch fails after metadata preparation', async () => {
  const { settings, paths, dependencies, manifest, koreanFile, original, game } = await fixture()
  manifest.version = '0.1.2'; manifest.files = []
  await writeFile(paths.manifest, JSON.stringify(manifest))
  await installClient(settings, paths, () => {}, dependencies)
  await mkdir(join(game, 'mods'), { recursive: true })
  await writeFile(join(game, KOREAN_INPUT_PATH), original)
  await writeFile(join(game, 'options.txt'), 'lang:ko_kr\ngamma:0.2\nresourcePacks:["vanilla","file/player.zip"]\n')
  await mkdir(join(game, 'saves/my-world'), { recursive: true })
  await writeFile(join(game, 'saves/my-world/level.dat'), 'existing player world')
  const preserved = ['options.txt', 'saves/my-world/level.dat', '.sunrin/receipt.json']
  const before = await Promise.all(preserved.map(path => readFile(join(game, path))))
  manifest.version = '0.1.3'
  manifest.files = [koreanFile, { path: 'mods/later.jar', url: 'https://example.com/later.jar', hash: { algorithm: 'sha256', value: hash('later download') } }]
  await writeFile(paths.manifest, JSON.stringify(manifest))
  let prepared!: () => void, koreanDownloads = 0, observedPrepared: Buffer | undefined
  const preparationComplete = new Promise<void>(resolve => { prepared = resolve })
  await expect(installClient(settings, paths, message => { if (message.includes('1/2')) prepared() }, {
    ...dependencies,
    fetcher: async (url: any) => {
      if (String(url).endsWith('koreanpatch.jar')) { koreanDownloads++; return new Response(new Uint8Array(original)) }
      if (!String(url).endsWith('later.jar')) return dependencies.fetcher(url)
      await preparationComplete
      observedPrepared = await readFile(join(game, KOREAN_INPUT_PATH))
      return new Response('unavailable after metadata preparation', { status: 503 })
    }
  })).rejects.toThrow('파일 설치 실패')
  expect(koreanDownloads).toBe(0)
  expect(observedPrepared?.equals(original)).toBe(false)
  expect(new AdmZip(observedPrepared!).readAsText('META-INF/mods.toml')).toContain('clientSideOnly = true')
  expect(await readFile(join(game, KOREAN_INPUT_PATH))).toEqual(original)
  expect(await Promise.all(preserved.map(path => readFile(join(game, path))))).toEqual(before)
  expect((await readReceipt(settings.dataPath))?.packVersion).toBe('0.1.2')
  await expect(readFile(join(game, '.sunrin/installing.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(readFile(join(game, '.sunrin/install-transaction/journal.json'))).rejects.toMatchObject({ code: 'ENOENT' })
})
