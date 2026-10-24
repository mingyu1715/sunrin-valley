import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import AdmZip from 'adm-zip'
import { installClient, inspectInstall } from '../src/main/installer'
import { gameRoot } from '../src/main/instance'
const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
const hash = (s: Buffer | string) => createHash('sha256').update(s).digest('hex')

it('installs the real overlay, detects damage and repairs while preserving player files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-full-')); dirs.push(root)
  const data = join(root, 'data'), assets = join(root, 'bundle'); await mkdir(assets)
  const zip = new AdmZip(); zip.addFile('overrides/kubejs/server_scripts/base.js', Buffer.from('original base'))
  zip.addFile('overrides/configureddefaults/options.txt', Buffer.from('lang:en_us\ngamma:0.5\nresourcePacks:["vanilla"]'))
  zip.addFile('overrides/config/user-config.toml', Buffer.from('volume=1'))
  const base = zip.toBuffer(), mod = Buffer.from('the mod jar')
  const manifest = { formatVersion: 1, id: 'sunrin-valley', version: '0.1.0', minecraft: '1.20.1', forge: '47.4.0', base: { url: 'https://edge.forgecdn.net/base.zip', sha256: hash(base), filename: 'base.zip', fileId: 1 }, files: [{ path: 'mods/test.jar', url: 'https://cdn.modrinth.com/test.jar', hash: { algorithm: 'sha256', value: hash(mod) } }] }
  const paths = { manifest: join(assets, 'manifest.json'), prism: join(assets, 'prism.json'), customPack: join(assets, 'Sunrin-Custom.zip'), startup: join(assets, 'sunrin_items.js') }
  await writeFile(paths.manifest, JSON.stringify(manifest)); await writeFile(paths.prism, '{}')
  await writeFile(paths.customPack, 'custom pack'); await writeFile(paths.startup, 'custom items')
  const java = join(root, 'java'), prism = join(root, 'prism'); await writeFile(java, 'java'); await writeFile(prism, 'prism')
  const settings = { dataPath: data, memoryMb: 6144, minecraftPath: join(root, 'vanilla'), importOptions: false, shareShaders: false }
  const dependencies = { fetcher: async (url: any) => new Response(new Uint8Array(String(url).endsWith('base.zip') ? base : mod)), runtimeInstaller: async () => ({ java, prism }), assertIdle: async () => {} }
  expect((await inspectInstall(settings, paths)).phase).toBe('not-installed')
  await installClient(settings, paths, () => {}, dependencies)
  const game = gameRoot(data)
  expect(await readFile(join(game, 'kubejs/server_scripts/base.js'), 'utf8')).toBe('original base')
  expect(await readFile(join(game, 'kubejs/startup_scripts/sunrin_items.js'), 'utf8')).toBe('custom items')
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
  await writeFile(join(game, 'config/user-config.toml'), 'volume=0.2')
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
  await mkdir(join(game, 'saves/my-world'), { recursive: true })
  await writeFile(join(game, 'saves/my-world/level.dat'), 'player world')
  await writeFile(join(game, 'options.txt'), 'lang:ko_kr\ngamma:0.2\n')
  await writeFile(join(game, 'mods/test.jar'), 'broken jar')
  expect((await inspectInstall(settings, paths)).phase).toBe('repair')
  await installClient(settings, paths, () => {}, dependencies)
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
  expect(await readFile(join(game, 'mods/test.jar'), 'utf8')).toBe('the mod jar')
  expect(await readFile(join(game, 'saves/my-world/level.dat'), 'utf8')).toBe('player world')
  expect(await readFile(join(game, 'options.txt'), 'utf8')).toContain('gamma:0.2')
  expect(await readFile(join(game, 'config/user-config.toml'), 'utf8')).toBe('volume=0.2')
  await writeFile(paths.startup, 'updated items')
  expect((await inspectInstall(settings, paths)).phase).toBe('update')
  // A release can replace a managed mod without removing player-added files.
  await writeFile(join(game, 'mods/player-extra.jar'), 'player addition')
  manifest.version = '0.1.1'; manifest.files[0].path = 'mods/replacement.jar'
  await writeFile(paths.manifest, JSON.stringify(manifest))
  await installClient(settings, paths, () => {}, dependencies)
  await expect(readFile(join(game, 'mods/test.jar'))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(game, 'mods/replacement.jar'), 'utf8')).toBe('the mod jar')
  expect(await readFile(join(game, 'mods/player-extra.jar'), 'utf8')).toBe('player addition')
  expect(await readFile(join(game, 'saves/my-world/level.dat'), 'utf8')).toBe('player world')
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
})
