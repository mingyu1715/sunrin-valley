import { afterEach, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, truncate, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')
const { buildLauncherUpdate } = require('../../build-scripts/build-launcher-update.cjs')
const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

async function fixture() {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'sunrin-release-')); roots.push(root)
  const directory = join(root, 'release', '1.1.1')
  const unpacked = join(directory, 'win-unpacked')
  await mkdir(join(unpacked, 'resources'), { recursive: true })
  await writeFile(join(unpacked, 'Sunrin Valley.exe'), 'launcher')
  await writeFile(join(unpacked, 'resources', 'app.asar'), 'app')
  await writeFile(join(unpacked, 'resources', 'launcher-files.json'), JSON.stringify({
    formatVersion: 1, files: ['Sunrin Valley.exe', 'resources/app.asar', 'resources/launcher-files.json']
  }))
  await writeFile(join(directory, 'Sunrin-Valley-1.1.1-mac-arm64.dmg'), 'dmg bytes')
  await writeFile(join(directory, 'Sunrin-Valley-Setup-1.1.1-x64.exe'), 'setup bytes')
  const changelog = join(root, 'CHANGELOG.md')
  await writeFile(changelog, '# Changelog\n\n## 1.1.1 — 2026-10-25\n- New update popup\n- Faster toast\n\n## 1.1.0 — 2026-10-24\n- Older change\n')
  return { root, directory, unpacked, changelog }
}

it('builds a ZIP with exactly inventoried launcher files and a matching manifest', async () => {
  const { directory, unpacked, changelog } = await fixture()
  await mkdir(join(unpacked, 'game'), { recursive: true })
  await writeFile(join(unpacked, 'game', 'world.dat'), 'player world')
  await buildLauncherUpdate({ version: '1.1.1', directory, changelog })
  const zipPath = join(directory, 'Sunrin-Valley-1.1.1-windows-x64-update.zip')
  const zip = new AdmZip(zipPath)
  expect(zip.getEntries().map((entry: { entryName: string }) => entry.entryName).sort()).toEqual([
    'Sunrin Valley.exe', 'appFiles.json', 'resources/app.asar', 'resources/launcher-files.json'
  ])
  expect(JSON.parse(zip.readAsText('appFiles.json'))).toEqual({
    formatVersion: 1, files: ['Sunrin Valley.exe', 'resources/app.asar', 'resources/launcher-files.json']
  })
  expect(zip.readAsText('Sunrin Valley.exe')).toBe('launcher')
  const manifest = JSON.parse(await readFile(join(directory, 'launcher-update.json'), 'utf8'))
  expect(manifest).toMatchObject({
    formatVersion: 1, id: 'sunrin-valley-launcher', version: '1.1.1',
    changes: ['New update popup', 'Faster toast'],
    assets: {
      'darwin-arm64': { kind: 'dmg', size: 9, url: 'https://github.com/mingyu1715/sunrin-valley/releases/download/launcher-1.1.1/Sunrin-Valley-1.1.1-mac-arm64.dmg' },
      'win32-x64': { kind: 'zip', url: 'https://github.com/mingyu1715/sunrin-valley/releases/download/launcher-1.1.1/Sunrin-Valley-1.1.1-windows-x64-update.zip' }
    }
  })
  expect(manifest.assets['darwin-arm64'].sha256).toMatch(/^[a-f0-9]{64}$/)
  expect(manifest.assets['win32-x64'].sha256).toMatch(/^[a-f0-9]{64}$/)
  const sums = await readFile(join(directory, 'SHA256SUMS.txt'), 'utf8')
  expect(sums).toContain('Sunrin-Valley-1.1.1-mac-arm64.dmg')
  expect(sums).toContain('Sunrin-Valley-Setup-1.1.1-x64.exe')
  expect(sums).toContain('Sunrin-Valley-1.1.1-windows-x64-update.zip')
  expect(sums).toContain('launcher-update.json')
})

it.each([
  ['traversal', ['../escape', 'Sunrin Valley.exe', 'resources/app.asar', 'resources/launcher-files.json']],
  ['case collision', ['Sunrin Valley.exe', 'resources/app.asar', 'resources/APP.ASAR', 'resources/launcher-files.json']],
  ['directory case collision', ['Sunrin Valley.exe', 'Resources/app.asar', 'resources/launcher-files.json']],
  ['missing file', ['Sunrin Valley.exe', 'resources/app.asar', 'resources/launcher-files.json', 'missing.txt']],
  ['omitted inventory', ['Sunrin Valley.exe', 'resources/app.asar']]
])('rejects %s in the managed inventory', async (_reason, files) => {
  const { directory, unpacked, changelog } = await fixture()
  await writeFile(join(unpacked, 'resources/launcher-files.json'), JSON.stringify({ formatVersion: 1, files }))
  await expect(buildLauncherUpdate({ version: '1.1.1', directory, changelog })).rejects.toThrow()
})

it('rejects a managed symlink and leaves no update ZIP', async () => {
  const { directory, unpacked, changelog } = await fixture()
  await rm(join(unpacked, 'resources/app.asar'))
  await symlink(join(unpacked, 'Sunrin Valley.exe'), join(unpacked, 'resources/app.asar'))
  await expect(buildLauncherUpdate({ version: '1.1.1', directory, changelog })).rejects.toThrow(/link|regular/i)
  await expect(lstat(join(directory, 'Sunrin-Valley-1.1.1-windows-x64-update.zip'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('rejects a payload manifest entry that collides with the ZIP control file', async () => {
  const { directory, unpacked, changelog } = await fixture()
  await writeFile(join(unpacked, 'appFiles.json'), 'malicious')
  await writeFile(join(unpacked, 'resources/launcher-files.json'), JSON.stringify({
    formatVersion: 1, files: ['Sunrin Valley.exe', 'appFiles.json', 'resources/app.asar', 'resources/launcher-files.json']
  }))
  await expect(buildLauncherUpdate({ version: '1.1.1', directory, changelog })).rejects.toThrow(/collision|reserved/i)
})

it('rejects more than 1 GiB of expanded managed files before reading them', async () => {
  const { directory, unpacked, changelog } = await fixture()
  await truncate(join(unpacked, 'resources/app.asar'), 1024 * 1024 * 1024)
  await expect(buildLauncherUpdate({ version: '1.1.1', directory, changelog })).rejects.toThrow(/1 GiB/i)
})

it('requires the matching DMG and current-version changelog section', async () => {
  const { directory, changelog } = await fixture()
  await rm(join(directory, 'Sunrin-Valley-1.1.1-mac-arm64.dmg'))
  await expect(buildLauncherUpdate({ version: '1.1.1', directory, changelog })).rejects.toThrow(/dmg/i)
  await writeFile(join(directory, 'Sunrin-Valley-1.1.1-mac-arm64.dmg'), 'dmg bytes')
  await writeFile(changelog, '## 1.1.0 — 2026-10-24\n- Old only\n')
  await expect(buildLauncherUpdate({ version: '1.1.1', directory, changelog })).rejects.toThrow(/changelog/i)
})
