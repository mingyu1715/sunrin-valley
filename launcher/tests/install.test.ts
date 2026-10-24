import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import AdmZip from 'adm-zip'
import { safeTarget, downloadVerified, extractZip, claimDataDirectory } from '../src/main/files'
import { configureOptions, writePrismInstance } from '../src/main/instance'

const temporary: string[] = []
async function temp() { const path = await mkdtemp(join(tmpdir(), 'sunrin-test-')); temporary.push(path); return path }
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

describe('safe managed files', () => {
  it('refuses to claim a nonempty folder belonging to the player', async () => {
    const root = await temp()
    await writeFile(join(root, 'important.txt'), 'keep me')
    await expect(claimDataDirectory(root)).rejects.toThrow()
    expect(await readFile(join(root, 'important.txt'), 'utf8')).toBe('keep me')
    const owned = join(root, 'new-install')
    await claimDataDirectory(owned)
    await writeFile(join(owned, 'saved-config.txt'), 'previous installation')
    await claimDataDirectory(owned)
    expect(await readFile(join(owned, 'saved-config.txt'), 'utf8')).toBe('previous installation')
  })
  it('rejects traversal and Windows paths before touching the filesystem', () => {
    for (const path of ['../outside', '/absolute', 'C:/outside', 'mods\\..\\outside', 'mods/../../outside', 'mods/a:evil.jar']) {
      expect(() => safeTarget('/instance', path), path).toThrow()
    }
    expect(safeTarget('/instance', 'mods/example.jar')).toBe(join(resolve('/instance'), 'mods/example.jar'))
  })

  it('does not replace a good file with a damaged download', async () => {
    const root = await temp(), target = join(root, 'a.jar')
    await writeFile(target, 'previous')
    const hash = { algorithm: 'sha256' as const, value: createHash('sha256').update('expected').digest('hex') }
    await expect(downloadVerified('https://example.test/a.jar', target, hash, {
      fetcher: async () => new Response('damaged'), retries: 0
    })).rejects.toThrow(/hash/i)
    expect(await readFile(target, 'utf8')).toBe('previous')
  })

  it('reuses a verified file without downloading it again', async () => {
    const root = await temp(), target = join(root, 'a.jar')
    await writeFile(target, 'expected')
    const hash = { algorithm: 'sha1' as const, value: createHash('sha1').update('expected').digest('hex') }
    await downloadVerified('https://example.test/a.jar', target, hash, { fetcher: async () => { throw Error('unnecessary network') } })
    expect(await readFile(target, 'utf8')).toBe('expected')
  })

  it('extracts only overrides without copying the archive manifest', async () => {
    const root = await temp(), archive = join(root, 'pack.zip'), output = join(root, 'game')
    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from('{}'))
    zip.addFile('overrides/kubejs/startup_scripts/base.js', Buffer.from('base'))
    zip.writeZip(archive)
    const paths = await extractZip(archive, output, 'overrides/')
    expect(paths).toEqual(['kubejs/startup_scripts/base.js'])
    expect(await readFile(join(output, paths[0]), 'utf8')).toBe('base')
  })
})

describe('isolated Korean instance', () => {
  it('imports options once, preserves preferences and enables the custom pack last', async () => {
    const root = await temp(), game = join(root, 'instance'), original = join(root, 'original')
    await mkdir(original)
    await mkdir(join(game, 'resourcepacks'), { recursive: true })
    await writeFile(join(game, 'resourcepacks/Sunrin-Custom.zip'), 'installed custom pack')
    await writeFile(join(original, 'options.txt'), 'lang:en_us\ngamma:0.7\nresourcePacks:["vanilla","file/base.zip"]\n')
    await configureOptions(game, original, true)
    let options = await readFile(join(game, 'options.txt'), 'utf8')
    expect(options).toContain('lang:ko_kr')
    expect(options).toContain('gamma:0.7')
    expect(options).toContain('resourcePacks:["vanilla","file/base.zip","file/Sunrin-Custom.zip"]')
    await writeFile(join(game, 'options.txt'), options.replace('gamma:0.7', 'gamma:0.2'))
    await writeFile(join(original, 'options.txt'), 'gamma:1.0')
    await configureOptions(game, original, true)
    options = await readFile(join(game, 'options.txt'), 'utf8')
    expect(options).toContain('gamma:0.2')
    expect(await readFile(join(original, 'options.txt'), 'utf8')).toBe('gamma:1.0')
  })

  it('enables the installed Sunlit Valley pack above the custom pack when options are not imported', async () => {
    const root = await temp(), game = join(root, 'instance')
    await mkdir(join(game, 'configureddefaults'), { recursive: true })
    await mkdir(join(game, 'resourcepacks'), { recursive: true })
    await writeFile(join(game, 'resourcepacks/sunlit_overrides.zip'), 'installed Sunlit Valley pack')
    await writeFile(join(game, 'resourcepacks/Sunrin-Custom.zip'), 'installed custom pack')
    await writeFile(join(game, 'configureddefaults/options.txt'), 'lang:en_us\nresourcePacks:["vanilla","file/sunlit_overrides.zip"]\n')
    await configureOptions(game, join(root, 'missing'), false)
    expect(await readFile(join(game, 'options.txt'), 'utf8')).toContain('resourcePacks:["vanilla","file/Sunrin-Custom.zip","file/sunlit_overrides.zip"]')
    expect(await readFile(join(game, 'configureddefaults/options.txt'), 'utf8')).toContain('lang:ko_kr')
  })

  it('merges required base packs into imported options and corrects the upstream filename', async () => {
    const root = await temp(), game = join(root, 'instance'), original = join(root, 'original')
    await mkdir(join(game, 'configureddefaults'), { recursive: true }); await mkdir(original)
    await mkdir(join(game, 'resourcepacks'), { recursive: true })
    await writeFile(join(game, 'resourcepacks/CreateSophBackpacks.zip'), 'installed compatibility pack')
    await writeFile(join(game, 'configureddefaults/options.txt'), 'resourcePacks:["file/CreateSophisticatedBackpacks.zip"]\n')
    await writeFile(join(original, 'options.txt'), 'resourcePacks:["vanilla","file/user.zip"]\ngamma:0.3\n')
    await configureOptions(game, original, true)
    const options = await readFile(join(game, 'options.txt'), 'utf8')
    expect(options).toContain('file/CreateSophBackpacks.zip')
    expect(options).not.toContain('file/CreateSophisticatedBackpacks.zip')
    expect(options).toContain('file/user.zip')
    expect(options).toContain('gamma:0.3')
  })

  it('creates a Forge instance using a dedicated Prism root and pinned Java', async () => {
    const root = await temp()
    await writePrismInstance(root, '1.20.1', '47.4.0', '/runtime/java17/bin/java', 6144)
    const instance = join(root, 'instances/SunrinValley')
    const pack = JSON.parse(await readFile(join(instance, 'mmc-pack.json'), 'utf8'))
    expect(pack.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ uid: 'net.minecraft', version: '1.20.1' }),
      expect.objectContaining({ uid: 'net.minecraftforge', version: '47.4.0' })
    ]))
    const config = await readFile(join(instance, 'instance.cfg'), 'utf8')
    expect(config).toContain('MaxMemAlloc=6144')
    expect(config).toContain('JavaPath=/runtime/java17/bin/java')
    expect(config).toContain('OverrideJavaLocation=true')
  })
})
