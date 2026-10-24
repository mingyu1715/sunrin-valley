import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import AdmZip from 'adm-zip'
import { bundleFingerprint, installClient, inspectInstall, loadManifest, readReceipt } from '../src/main/installer'
import { gameRoot } from '../src/main/instance'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
const hash = (s: Buffer | string) => createHash('sha256').update(s).digest('hex')
type OverlayEntry = { path: string; text?: string; mode?: number }

function overlayZip(entries: OverlayEntry[]): Buffer {
  const zip = new AdmZip()
  for (const [index, entry] of entries.entries()) {
    const placeholder = `entry-${index}`
    zip.addFile(placeholder, Buffer.from(entry.text ?? 'remote content'))
    const added = zip.getEntry(placeholder)!
    // Set the raw entry name after addFile so malicious names and duplicates remain intact.
    added.entryName = entry.path
    if (entry.mode !== undefined) added.attr = (entry.mode << 16) >>> 0
  }
  return zip.toBuffer()
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-remote-overlay-')); dirs.push(root)
  const assets = join(root, 'bundle'); await mkdir(assets)
  const zip = new AdmZip()
  zip.addFile('overrides/kubejs/server_scripts/upstream.js', Buffer.from('base script'))
  zip.addFile('overrides/configureddefaults/options.txt', Buffer.from('lang:en_us\ngamma:0.5\nresourcePacks:["vanilla"]'))
  const base = zip.toBuffer()
  const manifest = {
    formatVersion: 1, id: 'sunrin-valley', version: '0.1.0', minecraft: '1.20.1', forge: '47.4.0',
    base: { url: 'https://example.com/base.zip', sha256: hash(base), filename: 'base.zip', fileId: 1 },
    files: [{ path: 'mods/example.jar', url: 'https://example.com/mod.jar', hash: { algorithm: 'sha256', value: hash('base mod') }, size: 8 }]
  }
  const paths = {
    manifest: join(assets, 'manifest.json'), prism: join(assets, 'prism.json'),
    customPack: join(assets, 'missing-legacy.zip'), startup: join(assets, 'missing-legacy.js'),
    overlay: join(assets, 'overlay.zip')
  }
  await writeFile(paths.manifest, JSON.stringify(manifest)); await writeFile(paths.prism, '{}')
  await writeFile(paths.overlay, overlayZip([
    { path: 'resourcepacks/Sunrin-Custom.zip', text: 'first custom pack' },
    { path: 'kubejs/startup_scripts/new-items.js', text: 'first own script' },
    { path: 'kubejs/server_scripts/towns/quests.js', text: 'first own quest' },
    { path: 'kubejs/client_scripts/ui.js', text: 'own client script' },
    { path: 'kubejs/assets/sunrin/lang/ko_kr.json', text: '{"sunrin":"마을"}' },
    { path: 'kubejs/data/sunrin/recipes/one.json', text: '{}' }
  ]))
  const java = join(root, 'java'), prism = join(root, 'prism')
  await writeFile(java, 'java'); await writeFile(prism, 'prism')
  const settings = { dataPath: join(root, 'data'), memoryMb: 6144, minecraftPath: join(root, 'vanilla'), importOptions: false, shareShaders: false }
  const dependencies = {
    fetcher: async (url: any) => new Response(new Uint8Array(String(url).endsWith('base.zip') ? base : Buffer.from('base mod'))),
    runtimeInstaller: async () => ({ java, prism }), assertIdle: async () => {}
  }
  return { root, paths, manifest, settings, dependencies, game: gameRoot(settings.dataPath) }
}

async function snapshot(root: string, prefix = ''): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) Object.assign(files, await snapshot(root, relative))
    else files[relative] = (await readFile(join(root, relative))).toString('base64')
  }
  return files
}

it('installs and updates arbitrary remote scripts and packs without bundled content, preserving player files', async () => {
  const { paths, settings, dependencies, game } = await fixture()
  await installClient(settings, paths, () => {}, dependencies)
  expect(await readFile(join(game, 'resourcepacks/Sunrin-Custom.zip'), 'utf8')).toBe('first custom pack')
  expect(await readFile(join(game, 'kubejs/startup_scripts/new-items.js'), 'utf8')).toBe('first own script')
  expect(await readFile(join(game, 'kubejs/server_scripts/towns/quests.js'), 'utf8')).toBe('first own quest')
  expect(await readFile(join(game, 'kubejs/client_scripts/ui.js'), 'utf8')).toBe('own client script')
  expect(await readFile(join(game, 'kubejs/assets/sunrin/lang/ko_kr.json'), 'utf8')).toContain('마을')
  expect(await readFile(join(game, 'kubejs/data/sunrin/recipes/one.json'), 'utf8')).toBe('{}')
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
  expect((await readReceipt(settings.dataPath))?.managed['kubejs/server_scripts/towns/quests.js']).toEqual({ algorithm: 'sha256', value: hash('first own quest') })
  await mkdir(join(game, 'saves/my-world'), { recursive: true })
  await writeFile(join(game, 'saves/my-world/level.dat'), 'player world')
  await writeFile(join(game, 'options.txt'), 'gamma:0.2\nlang:ko_kr\n')
  await writeFile(join(game, 'kubejs/server_scripts/player.js'), 'player script')
  await writeFile(join(game, 'resourcepacks/player.zip'), 'player pack')
  await writeFile(paths.overlay, overlayZip([
    { path: 'kubejs/server_scripts/a-new-folder/new-recipe.js', text: 'second own script' },
    { path: 'resourcepacks/Replacement.zip', text: 'second own pack' }
  ]))
  expect((await inspectInstall(settings, paths)).phase).toBe('update')
  await installClient(settings, paths, () => {}, dependencies)
  for (const relative of ['kubejs/startup_scripts/new-items.js', 'kubejs/server_scripts/towns/quests.js', 'resourcepacks/Sunrin-Custom.zip']) {
    await expect(readFile(join(game, relative))).rejects.toMatchObject({ code: 'ENOENT' })
  }
  expect(await readFile(join(game, 'kubejs/server_scripts/a-new-folder/new-recipe.js'), 'utf8')).toBe('second own script')
  expect(await readFile(join(game, 'resourcepacks/Replacement.zip'), 'utf8')).toBe('second own pack')
  expect(await readFile(join(game, 'kubejs/server_scripts/player.js'), 'utf8')).toBe('player script')
  expect(await readFile(join(game, 'kubejs/server_scripts/upstream.js'), 'utf8')).toBe('base script')
  expect(await readFile(join(game, 'resourcepacks/player.zip'), 'utf8')).toBe('player pack')
  expect(await readFile(join(game, 'saves/my-world/level.dat'), 'utf8')).toBe('player world')
  const options = await readFile(join(game, 'options.txt'), 'utf8')
  expect(options).toContain('gamma:0.2\nlang:ko_kr\n')
  expect(options).toContain('resourcePacks:["vanilla","file/Replacement.zip"]')
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
})

it('fingerprints remote content independently of missing or changed legacy files', async () => {
  const { paths } = await fixture()
  const first = await bundleFingerprint(paths)
  await writeFile(paths.customPack, 'irrelevant old pack'); await writeFile(paths.startup, 'irrelevant old script')
  expect(await bundleFingerprint(paths)).toBe(first)
  await writeFile(paths.overlay, overlayZip([{ path: 'resourcepacks/Next.zip', text: 'new' }]))
  expect(await bundleFingerprint(paths)).not.toBe(first)
})

it('keeps case-renamed replacements on Windows/macOS and removes distinct old names on case-sensitive disks', async () => {
  const { paths, settings, dependencies, game } = await fixture()
  await writeFile(paths.overlay, overlayZip([{ path: 'kubejs/server_scripts/recipe.js', text: 'first' }, { path: 'resourcepacks/Pack.zip', text: 'first pack' }]))
  await installClient(settings, paths, () => {}, dependencies)
  await writeFile(paths.overlay, overlayZip([{ path: 'kubejs/server_scripts/Recipe.js', text: 'replacement' }, { path: 'resourcepacks/pack.zip', text: 'replacement pack' }]))
  await installClient(settings, paths, () => {}, dependencies)
  expect(await readFile(join(game, 'kubejs/server_scripts/Recipe.js'), 'utf8')).toBe('replacement')
  expect(await readFile(join(game, 'resourcepacks/pack.zip'), 'utf8')).toBe('replacement pack')
  expect((await readdir(join(game, 'kubejs/server_scripts'))).filter(name => name.toLowerCase() === 'recipe.js')).toHaveLength(1)
  expect((await readdir(join(game, 'resourcepacks'))).filter(name => name.toLowerCase() === 'pack.zip')).toHaveLength(1)
  expect((await inspectInstall(settings, paths)).phase).toBe('ready')
})

const badOverlays: [string, OverlayEntry[]][] = [
  ['player options', [{ path: 'options.txt' }]],
  ['player worlds', [{ path: 'saves/world/level.dat' }]],
  ['accounts', [{ path: 'accounts.json' }]],
  ['other directories', [{ path: 'config/client.toml' }]],
  ['other KubeJS directories', [{ path: 'kubejs/config/client.json' }]],
  ['nested resource packs', [{ path: 'resourcepacks/nested/pack.zip' }]],
  ['non-ZIP resource packs', [{ path: 'resourcepacks/readme.txt' }]],
  ['parent traversal', [{ path: 'kubejs/server_scripts/../../../options.txt' }]],
  ['absolute paths', [{ path: '/kubejs/server_scripts/evil.js' }]],
  ['Windows separators', [{ path: 'kubejs/server_scripts/..\\evil.js' }]],
  ['duplicates', [{ path: 'kubejs/server_scripts/a.js' }, { path: 'kubejs/server_scripts/a.js' }]],
  ['case collisions', [{ path: 'kubejs/server_scripts/a.js' }, { path: 'kubejs/server_scripts/A.js' }]],
  ['directory case collisions', [{ path: 'kubejs/server_scripts/Town/a.js' }, { path: 'kubejs/server_scripts/town/b.js' }]],
  ['file and directory conflicts', [{ path: 'kubejs/server_scripts/a' }, { path: 'kubejs/server_scripts/a/b.js' }]],
  ['symlinks', [{ path: 'kubejs/server_scripts/link.js', text: '../../../options.txt', mode: 0o120777 }]],
  ['nonregular files', [{ path: 'kubejs/server_scripts/pipe.js', mode: 0o010644 }]]
]

it.each(badOverlays)('rejects overlay %s before changing the installed game', async (_name, entries) => {
  const { paths, settings, dependencies, game } = await fixture()
  await installClient(settings, paths, () => {}, dependencies)
  const before = await snapshot(game)
  await writeFile(paths.overlay, overlayZip(entries))
  await expect(installClient(settings, paths, () => {}, dependencies)).rejects.toThrow()
  expect(await snapshot(game)).toEqual(before)
})

it('keeps the installed game unchanged when a remote ZIP is corrupt', async () => {
  const { paths, settings, dependencies, game } = await fixture()
  await installClient(settings, paths, () => {}, dependencies)
  const before = await snapshot(game)
  await writeFile(paths.overlay, 'invalid zip')
  await expect(installClient(settings, paths, () => {}, dependencies)).rejects.toThrow()
  expect(await snapshot(game)).toEqual(before)
})

it('checks for a running game before installing remote content', async () => {
  const { paths, settings, dependencies, root } = await fixture()
  await expect(installClient(settings, paths, () => {}, { ...dependencies, assertIdle: async () => { throw new Error('game running') } })).rejects.toThrow('game running')
  await expect(readFile(join(root, 'data/.sunrin-valley.json'))).rejects.toMatchObject({ code: 'ENOENT' })
})

const badManifests: [string, (manifest: any) => void][] = [
  ['missing identity', m => { delete m.id }],
  ['another pack identity', m => { m.id = 'another-pack' }],
  ['missing version', m => { delete m.version }],
  ['non-semver version', m => { m.version = 'latest' }],
  ['wrong Minecraft', m => { m.minecraft = '1.21.1' }],
  ['wrong Forge', m => { m.forge = '48.0.0' }],
  ['missing base', m => { delete m.base }],
  ['insecure base URL', m => { m.base.url = 'http://example.com/base.zip' }],
  ['base credentials', m => { m.base.url = 'https://user:pass@example.com/base.zip' }],
  ['invalid base hash', m => { m.base.sha256 = 'bad' }],
  ['base directory traversal', m => { m.base.filename = '../base.zip' }],
  ['nested base filename', m => { m.base.filename = 'nested/base.zip' }],
  ['case-colliding paths', m => { m.files.push({ ...m.files[0], path: 'mods/EXAMPLE.jar' }) }],
  ['invalid file hash', m => { m.files[0].hash.value = 'broken' }],
  ['invalid file algorithm', m => { m.files[0].hash.algorithm = 'md5' }],
  ['file credentials', m => { m.files[0].url = 'https://user@example.com/mod.jar' }],
  ['insecure file URL', m => { m.files[0].url = 'http://example.com/mod.jar' }],
  ['negative size', m => { m.files[0].size = -1 }],
  ['noninteger size', m => { m.files[0].size = 1.5 }],
  ['nonnumber size', m => { m.files[0].size = '8' }],
  ['nonfile paths', m => { m.files[0].path = 'mods/' }],
  ['disallowed managed path', m => { m.files[0].path = 'kubejs/server_scripts/a.js' }]
]

it.each(badManifests)('rejects a manifest with %s before installation', async (_name, change) => {
  const { paths, manifest } = await fixture()
  change(manifest)
  await writeFile(paths.manifest, JSON.stringify(manifest))
  await expect(loadManifest(paths.manifest)).rejects.toThrow()
})

it('accepts the repository manifest and all supported file hash algorithms', async () => {
  expect((await loadManifest(join(import.meta.dirname, '../../client-pack/manifest.json'))).id).toBe('sunrin-valley')
  const { paths, manifest } = await fixture()
  for (const [algorithm, length] of [['sha1', 40], ['sha256', 64], ['sha512', 128]] as const) {
    manifest.files[0].hash = { algorithm, value: 'A'.repeat(length) }
    await writeFile(paths.manifest, JSON.stringify(manifest))
    expect((await loadManifest(paths.manifest)).files[0].hash.algorithm).toBe(algorithm)
  }
})
