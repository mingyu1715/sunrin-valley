import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import AdmZip from 'adm-zip'
import * as installer from '../src/main/installer'
import { gameRoot, instanceRoot } from '../src/main/instance'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))) })
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
const zip = (files: Record<string, string>) => {
  const archive = new AdmZip()
  for (const [path, text] of Object.entries(files)) archive.addFile(path, Buffer.from(text))
  return archive.toBuffer()
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-transaction-')); dirs.push(root)
  const assets = join(root, 'bundle'); await mkdir(assets)
  const base = zip({
    'overrides/configureddefaults/options.txt': 'lang:en_us\ngamma:0.5\nresourcePacks:["vanilla"]\n',
    'overrides/config/player.toml': 'volume=1',
    'overrides/config/resourcepackoverrides.json': JSON.stringify({ schema_version: 2, pack_overrides: { '1': ['file/Old.zip'] }, default_packs: ['vanilla'] })
  })
  const paths = { manifest: join(assets, 'manifest.json'), prism: join(assets, 'prism.json'), customPack: '', startup: '', overlay: join(assets, 'overlay.zip') }
  const manifest = {
    formatVersion: 1, id: 'sunrin-valley', version: '0.1.0', minecraft: '1.20.1', forge: '47.4.0',
    base: { url: 'https://example.com/base.zip', filename: 'base.zip', fileId: 1, sha256: hash(base) },
    files: ['first', 'second'].map(name => ({ path: `mods/${name}.jar`, url: `https://example.com/${name}.jar`, hash: { algorithm: 'sha256', value: hash(`old ${name}`) } }))
  }
  await writeFile(paths.manifest, JSON.stringify(manifest)); await writeFile(paths.prism, '{}')
  await writeFile(paths.overlay, zip({ 'kubejs/server_scripts/old.js': 'old script', 'resourcepacks/Old.zip': 'old pack' }))
  const runtime = { java: join(root, 'java'), prism: join(root, 'prism') }
  await writeFile(runtime.java, 'java'); await writeFile(runtime.prism, 'prism')
  const settings = { dataPath: join(root, 'data'), minecraftPath: join(root, 'vanilla'), memoryMb: 6144, importOptions: false, shareShaders: false }
  const dependencies = {
    fetcher: async (url: any) => new Response(new Uint8Array(String(url).endsWith('base.zip') ? base : Buffer.from(`old ${String(url).includes('first') ? 'first' : 'second'}`))),
    assertIdle: async () => {}, runtimeInstaller: async () => runtime
  }
  await installer.installClient(settings, paths, () => {}, dependencies)
  const game = gameRoot(settings.dataPath)
  return { root, settings, paths, dependencies, manifest, base, game, runtime }
}

async function contents(game: string) {
  const paths = ['mods/first.jar', 'mods/second.jar', 'options.txt', 'configureddefaults/options.txt', 'config/resourcepackoverrides.json', '.sunrin/options-initialized.json', '.sunrin/receipt.json']
  return Object.fromEntries(await Promise.all(paths.map(async path => [path, await readFile(join(game, path), 'utf8')])))
}

it('restores the previous mods, player options and receipt when a later download fails', async () => {
  const { settings, paths, dependencies, manifest, base, game } = await fixture()
  await writeFile(join(game, 'options.txt'), 'lang:en_us\ngamma:0.2\nresourcePacks:["vanilla","file/player.zip"]\n')
  const before = await contents(game)
  manifest.version = '0.1.1'
  for (const [index, file] of manifest.files.entries()) file.hash.value = hash(`new ${index ? 'second' : 'first'}`)
  await writeFile(paths.manifest, JSON.stringify(manifest))
  let firstWritten!: () => void
  const firstComplete = new Promise<void>(resolve => { firstWritten = resolve })
  await expect(installer.installClient(settings, paths, message => { if (message.includes('1/2')) firstWritten() }, {
    ...dependencies,
    fetcher: async (url: any) => {
      if (String(url).endsWith('base.zip')) return new Response(new Uint8Array(base))
      if (String(url).includes('first')) return new Response('new first')
      await firstComplete
      return new Response('unavailable', { status: 503 })
    }
  })).rejects.toThrow('파일 설치 실패')
  expect(await contents(game)).toEqual(before)
  await expect(readFile(join(game, '.sunrin/installing.json'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('restores deleted scripts and removes newly created scripts if final metadata preparation fails', async () => {
  const { settings, paths, dependencies, game, runtime } = await fixture()
  const receipt = await readFile(join(game, '.sunrin/receipt.json'), 'utf8')
  const prismConfig = await readFile(join(instanceRoot(settings.dataPath), 'instance.cfg'), 'utf8')
  await writeFile(paths.overlay, zip({ 'kubejs/server_scripts/new.js': 'new script', 'resourcepacks/New.zip': 'new pack' }))
  await expect(installer.installClient({ ...settings, memoryMb: 8192 }, paths, () => {}, {
    ...dependencies, runtimeInstaller: async () => { await rm(paths.prism); return runtime }
  })).rejects.toThrow()
  expect(await readFile(join(game, 'kubejs/server_scripts/old.js'), 'utf8')).toBe('old script')
  await expect(readFile(join(game, 'kubejs/server_scripts/new.js'))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(game, 'resourcepacks/Old.zip'), 'utf8')).toBe('old pack')
  await expect(readFile(join(game, 'resourcepacks/New.zip'))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(game, '.sunrin/receipt.json'), 'utf8')).toBe(receipt)
  expect(await readFile(join(instanceRoot(settings.dataPath), 'instance.cfg'), 'utf8')).toBe(prismConfig)
})

it('restores configured options and prior pending metadata after a runtime failure', async () => {
  const { settings, paths, dependencies, game } = await fixture()
  await writeFile(join(game, '.sunrin/installing.json'), 'previous pending state')
  const before = await contents(game)
  await writeFile(paths.overlay, zip({ 'kubejs/server_scripts/old.js': 'new script', 'resourcepacks/New.zip': 'new pack' }))
  await expect(installer.installClient(settings, paths, () => {}, {
    ...dependencies, runtimeInstaller: async () => { throw new Error('runtime unavailable') }
  })).rejects.toThrow('runtime unavailable')
  expect(await contents(game)).toEqual(before)
  expect(await readFile(join(game, '.sunrin/installing.json'), 'utf8')).toBe('previous pending state')
  expect(await readFile(join(game, 'kubejs/server_scripts/old.js'), 'utf8')).toBe('old script')
})

it('restores the original spelling and bytes after a failed case-only rename', async () => {
  const { settings, paths, dependencies, game, runtime } = await fixture()
  await writeFile(paths.overlay, zip({ 'kubejs/server_scripts/Old.js': 'replacement script', 'resourcepacks/old.zip': 'replacement pack' }))
  await expect(installer.installClient(settings, paths, () => {}, {
    ...dependencies, runtimeInstaller: async () => { await rm(paths.prism); return runtime }
  })).rejects.toThrow()
  expect(await readdir(join(game, 'kubejs/server_scripts'))).toEqual(['old.js'])
  expect(await readdir(join(game, 'resourcepacks'))).toEqual(['Old.zip'])
  expect(await readFile(join(game, 'kubejs/server_scripts/old.js'), 'utf8')).toBe('old script')
  expect(await readFile(join(game, 'resourcepacks/Old.zip'), 'utf8')).toBe('old pack')
})

it.each([
  ['case-only', 'New.zip', 'new.zip'],
  ['Unicode normalization', 'Caf\u00e9.zip', 'Cafe\u0301.zip']
])('rolls back newly introduced %s aliases from different install sources', async (_label, manifestName, overlayName) => {
  const { settings, paths, dependencies, manifest, base, game } = await fixture()
  const before = await contents(game)
  manifest.version = '0.1.1'
  manifest.files[0].hash.value = hash('new first')
  manifest.files.push({ path: `resourcepacks/${manifestName}`, url: 'https://example.com/new.zip', hash: { algorithm: 'sha256', value: hash('manifest pack') } })
  await writeFile(paths.manifest, JSON.stringify(manifest))
  await writeFile(paths.overlay, zip({ [`resourcepacks/${overlayName}`]: 'overlay pack' }))
  await expect(installer.installClient(settings, paths, () => {}, {
    ...dependencies,
    fetcher: async (url: any) => new Response(String(url).endsWith('base.zip') ? new Uint8Array(base) : String(url).endsWith('first.jar') ? 'new first' : 'manifest pack'),
    runtimeInstaller: async () => { throw new Error('runtime unavailable') }
  })).rejects.toThrow('runtime unavailable')
  expect(await contents(game)).toEqual(before)
  for (const name of [manifestName, overlayName]) await expect(readFile(join(game, 'resourcepacks', name))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readdir(join(game, 'resourcepacks'))).toEqual(['Old.zip'])
  expect(await readdir(join(game, '.sunrin'))).not.toContain('install-transaction')
  await installer.recoverInstallTransaction(settings.dataPath)
  expect((await installer.inspectInstall(settings, paths)).phase).toBe('update')
})

it('commits new content while preserving modified player configs, worlds and extra files', async () => {
  const { settings, paths, dependencies, game } = await fixture()
  await writeFile(join(game, 'config/player.toml'), 'volume=0.2')
  await mkdir(join(game, 'saves/world'), { recursive: true })
  await writeFile(join(game, 'saves/world/level.dat'), 'player world')
  await writeFile(join(game, 'mods/player.jar'), 'extra mod')
  await writeFile(paths.overlay, zip({ 'kubejs/server_scripts/new.js': 'new script', 'resourcepacks/New.zip': 'new pack' }))
  await installer.installClient(settings, paths, () => {}, dependencies)
  expect(await readFile(join(game, 'config/player.toml'), 'utf8')).toBe('volume=0.2')
  expect(await readFile(join(game, 'saves/world/level.dat'), 'utf8')).toBe('player world')
  expect(await readFile(join(game, 'mods/player.jar'), 'utf8')).toBe('extra mod')
  expect(await readFile(join(game, 'kubejs/server_scripts/new.js'), 'utf8')).toBe('new script')
  await expect(readFile(join(game, 'kubejs/server_scripts/old.js'))).rejects.toMatchObject({ code: 'ENOENT' })
  expect((await installer.inspectInstall(settings, paths)).phase).toBe('ready')
  expect(await readdir(join(game, '.sunrin'))).not.toContain('install-transaction')
})

async function interruptedUpdate(data: string, game: string) {
  const directory = join(game, '.sunrin/install-transaction')
  await mkdir(join(directory, 'originals'), { recursive: true })
  await writeFile(join(directory, 'originals/0'), await readFile(join(game, 'mods/first.jar')))
  await writeFile(join(directory, 'journal.json'), JSON.stringify({
    formatVersion: 1, state: 'active', entries: [
      { path: relative(data, join(game, 'mods/first.jar')).split('\\').join('/'), original: 'file', backup: 'originals/0' },
      { path: relative(data, join(game, 'mods/created.jar')).split('\\').join('/'), original: 'absent' }
    ]
  }))
  await writeFile(join(game, 'mods/first.jar'), 'interrupted replacement')
  await writeFile(join(game, 'mods/created.jar'), 'interrupted addition')
  return directory
}

it('reports an interrupted journal as repair without modifying it, then recovers before a new update', async () => {
  const { settings, paths, dependencies, game } = await fixture()
  await interruptedUpdate(settings.dataPath, game)
  expect((await installer.inspectInstall(settings, paths)).phase).toBe('repair')
  expect(await readFile(join(game, 'mods/first.jar'), 'utf8')).toBe('interrupted replacement')
  await expect(installer.installClient(settings, paths, () => {}, {
    ...dependencies, runtimeInstaller: async () => { throw new Error('new update failed') }
  })).rejects.toThrow('new update failed')
  expect(await readFile(join(game, 'mods/first.jar'), 'utf8')).toBe('old first')
  await expect(readFile(join(game, 'mods/created.jar'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('reports an uncommitted journal as repair even when every managed file still matches', async () => {
  const { settings, paths, game } = await fixture()
  const directory = await interruptedUpdate(settings.dataPath, game)
  await writeFile(join(game, 'mods/first.jar'), 'old first'); await rm(join(game, 'mods/created.jar'))
  expect((await installer.inspectInstall(settings, paths)).phase).toBe('repair')
  expect(JSON.parse(await readFile(join(directory, 'journal.json'), 'utf8')).state).toBe('active')
})

it('does not recover or install while the game is busy', async () => {
  const { settings, paths, dependencies, game } = await fixture()
  const directory = await interruptedUpdate(settings.dataPath, game)
  const journal = await readFile(join(directory, 'journal.json'), 'utf8')
  await expect(installer.installClient(settings, paths, () => {}, {
    ...dependencies, assertIdle: async () => { throw new Error('game running') }
  })).rejects.toThrow('game running')
  expect(await readFile(join(directory, 'journal.json'), 'utf8')).toBe(journal)
  expect(await readFile(join(game, 'mods/first.jar'), 'utf8')).toBe('interrupted replacement')
})

it('retains the journal and backups if recovery is obstructed, then permits a later retry', async () => {
  const { settings, game } = await fixture()
  const directory = await interruptedUpdate(settings.dataPath, game)
  await rm(join(game, 'mods/first.jar')); await mkdir(join(game, 'mods/first.jar'))
  await expect(installer.recoverInstallTransaction(settings.dataPath)).rejects.toThrow()
  expect(await readFile(join(directory, 'originals/0'), 'utf8')).toBe('old first')
  expect(JSON.parse(await readFile(join(directory, 'journal.json'), 'utf8')).state).toBe('active')
  await rm(join(game, 'mods/first.jar'), { recursive: true })
  await installer.recoverInstallTransaction(settings.dataPath)
  expect(await readFile(join(game, 'mods/first.jar'), 'utf8')).toBe('old first')
  await expect(readFile(join(directory, 'journal.json'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('recovers a crash during transaction preparation before a journal or mutation was written', async () => {
  const { settings, paths, dependencies, game } = await fixture()
  await mkdir(join(game, '.sunrin/install-transaction'))
  await installer.installClient(settings, paths, () => {}, dependencies)
  expect((await installer.inspectInstall(settings, paths)).phase).toBe('ready')
})
