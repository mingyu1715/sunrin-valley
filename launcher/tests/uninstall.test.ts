import { afterEach, expect, it } from 'vitest'
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, parse } from 'node:path'
import { removeLauncherState, removeSunrinData, validateLauncherStateRemoval } from '../src/main/uninstall'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
async function fixture() {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'sunrin-uninstall-')); dirs.push(root)
  const appRoot = join(root, 'launcher'), minecraft = join(root, 'minecraft'), data = join(appRoot, 'game')
  await mkdir(data, { recursive: true }); await mkdir(minecraft)
  await writeFile(join(minecraft, 'options.txt'), 'unrelated settings')
  return { root, appRoot, minecraft, data }
}
async function claim(data: string, marker: unknown = { id: 'sunrin-valley', formatVersion: 1 }) {
  await writeFile(join(data, '.sunrin-valley.json'), JSON.stringify(marker))
}

it('removes all owned game, runtime, worlds and dedicated Prism login data, preserving siblings', async () => {
  const { data, appRoot, minecraft } = await fixture()
  await claim(data)
  for (const relative of ['mods/mod.jar', 'runtime/prism.exe', 'prism-data/accounts.json', 'instances/sunrin/.minecraft/saves/world/level.dat']) {
    await mkdir(dirname(join(data, relative)), { recursive: true })
    await writeFile(join(data, relative), 'fixture')
  }
  await writeFile(join(appRoot, 'settings.json'), 'launcher settings')
  await removeSunrinData(data, minecraft, appRoot)
  await expect(lstat(data)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(minecraft, 'options.txt'), 'utf8')).toBe('unrelated settings')
  expect(await readFile(join(appRoot, 'settings.json'), 'utf8')).toBe('launcher settings')
})

it('is idempotent for an absent root and permits removal of an empty root', async () => {
  const { data, appRoot, minecraft } = await fixture()
  await removeSunrinData(data, minecraft, appRoot)
  await removeSunrinData(data, minecraft, appRoot)
  await expect(lstat(data)).rejects.toMatchObject({ code: 'ENOENT' })
})

it.each([undefined, { id: 'another-app', formatVersion: 1 }, { id: 'sunrin-valley', formatVersion: 2 }, null])('refuses nonempty data without valid ownership: %j', async marker => {
  const { data, appRoot, minecraft } = await fixture()
  await writeFile(join(data, 'keep.txt'), 'unrelated')
  if (marker !== undefined) await claim(data, marker)
  await expect(removeSunrinData(data, minecraft, appRoot)).rejects.toThrow()
  expect(await readFile(join(data, 'keep.txt'), 'utf8')).toBe('unrelated')
})

it('rejects malformed ownership without deleting files', async () => {
  const { data, appRoot, minecraft } = await fixture()
  await writeFile(join(data, '.sunrin-valley.json'), '{')
  await expect(removeSunrinData(data, minecraft, appRoot)).rejects.toThrow()
  expect(await readFile(join(data, '.sunrin-valley.json'), 'utf8')).toBe('{')
})

it('refuses home, filesystem root, app root and ancestors before removing anything', async () => {
  const { data, appRoot, minecraft, root } = await fixture()
  await claim(data); await claim(appRoot); await claim(root)
  for (const candidate of [homedir(), parse(root).root, appRoot, root]) {
    await expect(removeSunrinData(candidate, minecraft, appRoot)).rejects.toThrow()
  }
  expect(await readFile(join(minecraft, 'options.txt'), 'utf8')).toBe('unrelated settings')
  expect((await lstat(data)).isDirectory()).toBe(true)
})

it('refuses data equal to, inside, or containing the unrelated Minecraft folder', async () => {
  const { root, minecraft, appRoot } = await fixture()
  const nested = join(minecraft, 'sunrin'); await mkdir(nested); await claim(nested); await claim(minecraft)
  const parent = join(root, 'other'); await mkdir(join(parent, 'minecraft'), { recursive: true }); await claim(parent)
  for (const [candidate, original] of [[minecraft, minecraft], [nested, minecraft], [parent, join(parent, 'minecraft')]]) {
    await expect(removeSunrinData(candidate, original, appRoot)).rejects.toThrow()
    expect((await lstat(candidate)).isDirectory()).toBe(true)
  }
})

it('refuses relative and empty data paths', async () => {
  const { minecraft, appRoot } = await fixture()
  for (const candidate of ['', 'relative/game']) await expect(removeSunrinData(candidate, minecraft, appRoot)).rejects.toThrow()
})

it('refuses a linked data root and linked intermediate directories', async () => {
  const { root, data, appRoot, minecraft } = await fixture(); await claim(data)
  const linkedRoot = join(root, 'linked-game'), linkedParent = join(root, 'linked-launcher')
  await symlink(data, linkedRoot, 'junction'); await symlink(appRoot, linkedParent, 'junction')
  for (const candidate of [linkedRoot, join(linkedParent, 'game')]) await expect(removeSunrinData(candidate, minecraft, appRoot)).rejects.toThrow()
  expect((await lstat(data)).isDirectory()).toBe(true)
})

it('refuses a linked ownership marker without following it', async () => {
  const { root, data, appRoot, minecraft } = await fixture()
  const marker = join(root, 'external-marker'); await writeFile(marker, '{"id":"sunrin-valley","formatVersion":1}')
  await symlink(marker, join(data, '.sunrin-valley.json'))
  await expect(removeSunrinData(data, minecraft, appRoot)).rejects.toThrow()
  expect((await lstat(join(data, '.sunrin-valley.json'))).isSymbolicLink()).toBe(true)
})

it('unlinks internal shared folders without traversing or deleting their external targets', async () => {
  const { root, data, appRoot, minecraft } = await fixture(); await claim(data)
  const shared = join(root, 'shared-shaders'); await mkdir(shared); await writeFile(join(shared, 'keep.zip'), 'shared')
  await symlink(shared, join(data, 'shaderpacks'), 'junction')
  await removeSunrinData(data, minecraft, appRoot)
  await expect(lstat(data)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(shared, 'keep.zip'), 'utf8')).toBe('shared')
})

it('refuses a data path that is a file', async () => {
  const { root, appRoot, minecraft } = await fixture()
  const file = join(root, 'file'); await writeFile(file, 'keep')
  await expect(removeSunrinData(file, minecraft, appRoot)).rejects.toThrow()
  expect(await readFile(file, 'utf8')).toBe('keep')
})

async function claimLauncher(root: string, marker: unknown = { id: 'sunrin-valley-launcher', formatVersion: 1 }) {
  await writeFile(join(root, '.sunrin-launcher.json'), JSON.stringify(marker))
}

it('preflights without mutation and removes marked launcher state including Electron caches', async () => {
  const { appRoot, minecraft } = await fixture(); await claimLauncher(appRoot)
  for (const relative of ['settings.json', 'logs/launcher.log', 'updates/manifest.json', 'Cache/Cache_Data/index', 'GPUCache/data_0', 'Local Storage/leveldb/CURRENT']) {
    await mkdir(dirname(join(appRoot, relative)), { recursive: true })
    await writeFile(join(appRoot, relative), 'owned state')
  }
  await validateLauncherStateRemoval(appRoot, minecraft)
  expect(await readFile(join(appRoot, 'Cache/Cache_Data/index'), 'utf8')).toBe('owned state')
  await removeLauncherState(appRoot, minecraft)
  await expect(lstat(appRoot)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(minecraft, 'options.txt'), 'utf8')).toBe('unrelated settings')
  await validateLauncherStateRemoval(appRoot, minecraft)
  await removeLauncherState(appRoot, minecraft)
})

it.each([undefined, null, { id: 'sunrin-valley', formatVersion: 1 }, { id: 'sunrin-valley-launcher', formatVersion: 2 }])('refuses launcher-state deletion without dedicated ownership: %j', async marker => {
  const { appRoot, minecraft } = await fixture()
  await writeFile(join(appRoot, 'settings.json'), 'keep')
  if (marker !== undefined) await claimLauncher(appRoot, marker)
  await expect(validateLauncherStateRemoval(appRoot, minecraft)).rejects.toThrow()
  await expect(removeLauncherState(appRoot, minecraft)).rejects.toThrow()
  expect(await readFile(join(appRoot, 'settings.json'), 'utf8')).toBe('keep')
})

it('refuses an unmarked empty launcher root instead of inferring ownership', async () => {
  const { root, minecraft } = await fixture()
  const empty = join(root, 'empty'); await mkdir(empty)
  await expect(removeLauncherState(empty, minecraft)).rejects.toThrow()
  expect((await lstat(empty)).isDirectory()).toBe(true)
})

it('refuses launcher roots at home, filesystem root or their ancestors', async () => {
  const { root, minecraft } = await fixture()
  for (const appRoot of [homedir(), dirname(homedir()), parse(root).root, '', 'relative']) {
    await expect(validateLauncherStateRemoval(appRoot, minecraft)).rejects.toThrow()
    await expect(removeLauncherState(appRoot, minecraft)).rejects.toThrow()
  }
  expect(await readFile(join(minecraft, 'options.txt'), 'utf8')).toBe('unrelated settings')
})

it('rejects Minecraft nested in any launcher-state directory before deleting any files', async () => {
  const { appRoot } = await fixture(); await claimLauncher(appRoot)
  await writeFile(join(appRoot, 'settings.json'), 'keep settings')
  for (const folder of ['logs', 'updates', 'Cache', 'custom-location']) {
    const minecraft = join(appRoot, folder, 'minecraft'); await mkdir(minecraft, { recursive: true })
    await writeFile(join(minecraft, 'level.dat'), 'keep world')
    await expect(validateLauncherStateRemoval(appRoot, minecraft)).rejects.toThrow()
    await expect(removeLauncherState(appRoot, minecraft)).rejects.toThrow()
    expect(await readFile(join(minecraft, 'level.dat'), 'utf8')).toBe('keep world')
    expect(await readFile(join(appRoot, 'settings.json'), 'utf8')).toBe('keep settings')
  }
  await expect(removeLauncherState(appRoot, appRoot)).rejects.toThrow()
})

it('refuses launcher state nested inside existing Minecraft and canonical aliases of protected Minecraft', async () => {
  const { root, minecraft, appRoot } = await fixture(); await claimLauncher(appRoot)
  const inside = join(minecraft, 'launcher'); await mkdir(inside); await claimLauncher(inside)
  await expect(removeLauncherState(inside, minecraft)).rejects.toThrow()
  const nested = join(appRoot, 'custom-minecraft'); await mkdir(nested)
  const alias = join(root, 'minecraft-alias'); await symlink(nested, alias, 'junction')
  await expect(validateLauncherStateRemoval(appRoot, alias)).rejects.toThrow()
  await expect(removeLauncherState(appRoot, alias)).rejects.toThrow()
  expect((await lstat(nested)).isDirectory()).toBe(true)
})

it('refuses linked launcher roots, intermediate folders and ownership markers', async () => {
  const { root, appRoot, minecraft } = await fixture(); await claimLauncher(appRoot)
  const alias = join(root, 'launcher-alias'); await symlink(appRoot, alias, 'junction')
  const parentAlias = join(root, 'parent-alias'); await symlink(root, parentAlias, 'junction')
  for (const candidate of [alias, join(parentAlias, 'launcher')]) {
    await expect(validateLauncherStateRemoval(candidate, minecraft)).rejects.toThrow()
    await expect(removeLauncherState(candidate, minecraft)).rejects.toThrow()
  }
  const marker = join(appRoot, '.sunrin-launcher.json'); await rm(marker)
  const outsideMarker = join(root, 'launcher-marker'); await writeFile(outsideMarker, '{"id":"sunrin-valley-launcher","formatVersion":1}')
  await symlink(outsideMarker, marker)
  await expect(removeLauncherState(appRoot, minecraft)).rejects.toThrow()
  expect((await lstat(marker)).isSymbolicLink()).toBe(true)
})

it('removes linked Electron cache entries without changing external folders', async () => {
  const { root, appRoot, minecraft } = await fixture(); await claimLauncher(appRoot)
  const external = join(root, 'external-cache'); await mkdir(external); await writeFile(join(external, 'keep'), 'shared')
  await symlink(external, join(appRoot, 'Cache'), 'junction')
  await removeLauncherState(appRoot, minecraft)
  await expect(lstat(appRoot)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(external, 'keep'), 'utf8')).toBe('shared')
})
