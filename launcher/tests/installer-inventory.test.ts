import { afterEach, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, rmdir, symlink, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const afterPack = createRequire(import.meta.url)('../build/after-pack.cjs')
const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
async function fixture() {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'sunrin-inventory-')); dirs.push(root)
  const payload = join(root, 'win-unpacked'); await mkdir(payload)
  for (const file of ['Sunrin Valley.exe', 'resources/app.asar', 'resources/pack/manifest.json', 'locales/ko.pak']) {
    await mkdir(dirname(join(payload, file)), { recursive: true }); await writeFile(join(payload, file), 'packaged')
  }
  return { root, payload }
}

it('captures the exact shipped inventory and preserves nested game files during inventory-based cleanup', async () => {
  const { payload } = await fixture()
  const inventory = await afterPack.collectInventory(payload)
  expect(inventory.files).toEqual(['Sunrin Valley.exe', 'locales/ko.pak', 'resources/app.asar', 'resources/pack/manifest.json'])
  // Model the install/remove boundary using the actual generated inventory:
  // player data appears only after packaging and must never enter that list.
  for (const file of ['game/saves/world/level.dat', 'resources/custom-game/prism-data/accounts.json', 'resources/pack/my-world/level.dat', 'my-notes.txt']) {
    await mkdir(dirname(join(payload, file)), { recursive: true }); await writeFile(join(payload, file), 'player data')
  }
  for (const file of inventory.files) await unlink(join(payload, file))
  for (const directory of inventory.directories) {
    try { await rmdir(join(payload, directory)) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOTEMPTY') throw error }
  }
  expect(await readFile(join(payload, 'game/saves/world/level.dat'), 'utf8')).toBe('player data')
  expect(await readFile(join(payload, 'resources/custom-game/prism-data/accounts.json'), 'utf8')).toBe('player data')
  expect(await readFile(join(payload, 'resources/pack/my-world/level.dat'), 'utf8')).toBe('player data')
  expect(await readFile(join(payload, 'my-notes.txt'), 'utf8')).toBe('player data')
  await expect(lstat(join(payload, 'resources/app.asar'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it.each(['evil$INSTDIR.txt', 'bad"quote.txt', 'bad\\path.txt', 'bad\nname.txt', 'trailing.', 'CON.txt'])('refuses unsafe Windows/NSIS payload names: %j', async filename => {
  const { payload } = await fixture(); await writeFile(join(payload, filename), 'unsafe')
  await expect(afterPack.collectInventory(payload)).rejects.toThrow()
})

it('refuses linked payload entries and a linked payload root', async () => {
  const { root, payload } = await fixture()
  const external = join(root, 'external'); await mkdir(external); await writeFile(join(external, 'keep'), 'external')
  const alias = join(root, 'alias'); await symlink(payload, alias, 'junction')
  await expect(afterPack.collectInventory(alias)).rejects.toThrow()
  await symlink(external, join(payload, 'linked'), 'junction')
  await expect(afterPack.collectInventory(payload)).rejects.toThrow()
})

it('writes a generated inventory only for Windows packaging into excluded build output', async () => {
  const { root, payload } = await fixture()
  const context = { electronPlatformName: 'darwin', appOutDir: payload, packager: { projectDir: root } }
  await afterPack(context)
  await expect(lstat(join(root, 'out/sunrin-installed-files.nsh'))).rejects.toMatchObject({ code: 'ENOENT' })
  await afterPack({ ...context, electronPlatformName: 'win32' })
  expect((await lstat(join(root, 'out/sunrin-installed-files.nsh'))).isFile()).toBe(true)
})
