import { afterEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import AdmZip from 'adm-zip'
import { installClient, inspectInstall, readReceipt } from '../src/main/installer'
import { gameRoot, instanceRoot } from '../src/main/instance'
import type { PackManifest } from '../src/main/pack-types'

interface ReceiptFailure {
  receipt: string
  retired: string
  replacement: string
  observedRetirement?: boolean
}
let receiptFailure: ReceiptFailure | undefined

// Inject only the final receipt-publication failure. Downloads, ownership,
// backups and transaction rollback use the real installer and filesystem.
vi.mock('../src/main/files', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/main/files')>()
  return {
    ...actual,
    atomicWrite: vi.fn(async (path: string, bytes: Parameters<typeof actual.atomicWrite>[1]) => {
      if (receiptFailure?.receipt === path) {
        const failure = receiptFailure
        receiptFailure = undefined
        failure.observedRetirement = !await actual.exists(failure.retired) && await actual.exists(failure.replacement)
        throw new Error('simulated receipt publication failure after StageBox retirement')
      }
      return actual.atomicWrite(path, bytes)
    })
  }
})

const directories: string[] = []
afterEach(async () => {
  receiptFailure = undefined
  vi.clearAllMocks()
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
const oldPath = 'mods/StageBox-Mod-1.3.0-Forge-1.20.1.jar'
const replacementPath = 'mods/StageBox-Mod-1.1.2-Forge-1.20.1.jar'
const oldJar = Buffer.from('synthetic StageBox 1.3.0 publisher artifact')
const replacementJar = Buffer.from('synthetic StageBox 1.1.2 publisher artifact')
const otherJar = Buffer.from('another already installed mod')

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-stagebox-update-')); directories.push(root)
  const bundle = join(root, 'bundle'); await mkdir(bundle)
  const baseZip = new AdmZip()
  baseZip.addFile('overrides/configureddefaults/options.txt', Buffer.from('lang:en_us\ngamma:0.5\nresourcePacks:["vanilla"]\n'))
  baseZip.addFile('overrides/config/player-settings.toml', Buffer.from('volume=1\n'))
  const base = baseZip.toBuffer()
  const file = (path: string, name: string, bytes: Buffer) => ({ path, url: `https://example.com/${name}`, hash: { algorithm: 'sha256' as const, value: hash(bytes) }, size: bytes.length })
  const otherFile = file('mods/unchanged.jar', 'unchanged.jar', otherJar)
  const manifest: PackManifest = {
    formatVersion: 1, id: 'sunrin-valley', version: '0.1.3', minecraft: '1.20.1', forge: '47.4.0',
    base: { url: 'https://example.com/base.zip', sha256: hash(base), filename: 'base.zip', fileId: 1 },
    files: [file(oldPath, 'stagebox-old.jar', oldJar), otherFile]
  }
  const paths = { manifest: join(bundle, 'manifest.json'), prism: join(bundle, 'prism.json'), customPack: join(bundle, 'Sunrin-Custom.zip'), startup: join(bundle, 'sunrin_items.js') }
  await writeFile(paths.manifest, JSON.stringify(manifest)); await writeFile(paths.prism, '{}')
  await writeFile(paths.customPack, 'unchanged custom resources'); await writeFile(paths.startup, 'unchanged custom items')
  const runtime = { java: join(root, 'java'), prism: join(root, 'prism') }
  await writeFile(runtime.java, 'java'); await writeFile(runtime.prism, 'prism')
  const settings = { dataPath: join(root, 'data'), minecraftPath: join(root, 'vanilla'), memoryMb: 8192, importOptions: false, shareShaders: false }
  const payloads = new Map([['base.zip', base], ['stagebox-old.jar', oldJar], ['stagebox-new.jar', replacementJar], ['unchanged.jar', otherJar]])
  const fetcher = vi.fn(async (url: any) => {
    const bytes = payloads.get(new URL(String(url)).pathname.slice(1))
    if (!bytes) throw new Error(`Unexpected fixture download: ${url}`)
    return new Response(new Uint8Array(bytes))
  })
  const dependencies = { fetcher, assertIdle: async () => {}, runtimeInstaller: async () => runtime }
  await installClient(settings, paths, () => {}, dependencies)
  const game = gameRoot(settings.dataPath)
  const options = join(game, 'options.txt')
  await writeFile(options, (await readFile(options, 'utf8')).replace('gamma:0.5', 'gamma:0.25'))
  const sentinels = new Map([
    [join(game, 'config/player-settings.toml'), Buffer.from('volume=0.2\n')],
    [join(game, 'saves/existing-world/level.dat'), Buffer.from('existing world bytes')],
    [join(game, 'saves/existing-world/playerdata/fake-uuid.dat'), Buffer.from('existing player bytes')],
    [join(game, 'mods/player-extra.jar'), Buffer.from('player installed extra mod')],
    [join(settings.dataPath, 'prism-data/accounts.json'), Buffer.from('{"accounts":[{"fixture":"fake account only"}]}\n')],
    [join(root, 'profile/settings.json'), Buffer.from(JSON.stringify(settings) + '\n')]
  ])
  for (const [path, bytes] of sentinels) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes) }
  for (const path of [options, join(game, 'mods/unchanged.jar'), join(instanceRoot(settings.dataPath), 'mmc-pack.json'), join(instanceRoot(settings.dataPath), 'instance.cfg')]) sentinels.set(path, await readFile(path))
  const preserved = async () => { for (const [path, bytes] of sentinels) expect(await readFile(path)).toEqual(bytes) }
  const update = async () => {
    manifest.version = '0.1.4'
    manifest.files = [file(replacementPath, 'stagebox-new.jar', replacementJar), otherFile]
    await writeFile(paths.manifest, JSON.stringify(manifest))
    fetcher.mockClear()
  }
  return { settings, paths, dependencies, manifest, game, preserved, update, fetcher }
}

it('replaces only managed StageBox and preserves player data, accounts and Forge 47.4.0', async () => {
  const fixtureData = await fixture(), { settings, paths, dependencies, game, preserved, update, fetcher } = fixtureData
  await update()
  expect((await inspectInstall(settings, paths)).phase).toBe('update')
  await installClient(settings, paths, () => {}, dependencies)
  await expect(readFile(join(game, oldPath))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(game, replacementPath))).toEqual(replacementJar)
  expect((await readReceipt(settings.dataPath))?.managed[replacementPath]).toEqual({ algorithm: 'sha256', value: hash(replacementJar) })
  expect((await readReceipt(settings.dataPath))?.managed[oldPath]).toBeUndefined()
  expect((await readReceipt(settings.dataPath))?.packVersion).toBe('0.1.4')
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
  expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual(['https://example.com/stagebox-new.jar'])
  await preserved()
})

it('backs up a modified old StageBox outside the active mods directory before replacement', async () => {
  const { settings, paths, dependencies, game, preserved, update } = await fixture()
  const modified = Buffer.from('player modified StageBox 1.3.0 bytes')
  await writeFile(join(game, oldPath), modified)
  await update()
  await installClient(settings, paths, () => {}, dependencies)
  await expect(readFile(join(game, oldPath))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(game, replacementPath))).toEqual(replacementJar)
  const backups = join(game, '.sunrin/backups')
  const matching: Buffer[] = []
  for (const name of await readdir(backups)) {
    try { matching.push(await readFile(join(backups, name, oldPath))) }
    catch (error: any) { if (error.code !== 'ENOENT') throw error }
  }
  expect(matching).toEqual([modified])
  expect((await readdir(join(game, 'mods'))).sort()).toEqual([replacementPath.slice('mods/'.length), 'player-extra.jar', 'unchanged.jar'].sort())
  await preserved()
})

it('restores the old StageBox and receipt if publishing the new receipt fails after retirement', async () => {
  const { settings, paths, dependencies, game, preserved, update } = await fixture()
  const receipt = join(game, '.sunrin/receipt.json'), previousReceipt = await readFile(receipt)
  const failure: ReceiptFailure = { receipt, retired: join(game, oldPath), replacement: join(game, replacementPath) }
  await update(); receiptFailure = failure
  await expect(installClient(settings, paths, () => {}, dependencies)).rejects.toThrow('simulated receipt publication failure after StageBox retirement')
  expect(failure.observedRetirement).toBe(true)
  expect(await readFile(join(game, oldPath))).toEqual(oldJar)
  await expect(readFile(join(game, replacementPath))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(receipt)).toEqual(previousReceipt)
  expect((await readReceipt(settings.dataPath))?.packVersion).toBe('0.1.3')
  await expect(readFile(join(game, '.sunrin/installing.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(readFile(join(game, '.sunrin/install-transaction/journal.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  await preserved()
})
