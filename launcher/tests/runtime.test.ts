import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import AdmZip from 'adm-zip'
import { claimDataDirectory, assertNoSymlinks } from '../src/main/files'
import { ensurePrism } from '../src/main/runtime'
import { commandUsesData } from '../src/main/processes'
import { symlink } from 'node:fs/promises'
const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
it('detects an existing Prism or Java process for this data root after the launcher restarts', () => {
  expect(commandUsesData('"C:\\Sunrin Valley\\runtime\\Prism-11.1.1\\prismlauncher.exe" -d "C:\\Sunrin Valley\\prism-data"', 'C:\\Sunrin Valley')).toBe(true)
  expect(commandUsesData('/data/sunrin/runtime/java17/bin/java --gameDir /data/sunrin/prism-data/instances/SunrinValley/.minecraft', '/data/sunrin')).toBe(true)
  expect(commandUsesData('/Applications/Prism.app/prismlauncher -d /data/other/prism-data', '/data/sunrin')).toBe(false)
  expect(commandUsesData('/data/sunrin-extra/runtime/java17/bin/java', '/data/sunrin')).toBe(false)
  expect(commandUsesData('/마을/선린/runtime/java17/bin/java'.normalize('NFD'), '/마을/선린')).toBe(true)
})
it.skipIf(process.platform === 'win32')('rejects a linked game root and a linked ancestor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-links-')); dirs.push(root)
  await mkdir(join(root, 'outside'))
  await symlink(join(root, 'outside'), join(root, 'prism-data'))
  await expect(assertNoSymlinks(root, join(root, 'prism-data/instances/SunrinValley/.minecraft/config/a.toml'))).rejects.toThrow()
  await expect(assertNoSymlinks(join(root, 'prism-data'), join(root, 'prism-data/config/a.toml'))).rejects.toThrow()
})
it('re-extracts the verified Prism distribution during explicit repair', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-prism-')); dirs.push(root)
  const data = join(root, 'data'); await claimDataDirectory(data); await mkdir(join(data, 'cache'))
  const zip = new AdmZip(); zip.addFile('prism.exe', Buffer.from('correct executable')); zip.addFile('qt.dll', Buffer.from('correct library'))
  const buffer = zip.toBuffer(); await writeFile(join(data, 'cache/prism.zip'), buffer)
  const spec = join(root, 'prism.json')
  await writeFile(spec, JSON.stringify({ version: 'test', platforms: { [`${process.platform}-${process.arch}`]: { url: 'https://github.com/PrismLauncher/PrismLauncher/prism.zip', sha256: createHash('sha256').update(buffer).digest('hex'), filename: 'prism.zip', executable: 'prism.exe' } } }))
  const home = join(data, 'runtime/Prism-test'); await mkdir(home, { recursive: true })
  await writeFile(join(home, 'prism.exe'), 'damaged executable'); await writeFile(join(home, '.sunrin-complete'), 'invalid marker')
  const binary = await ensurePrism(data, spec, () => {}, { force: true })
  expect(await readFile(binary, 'utf8')).toBe('correct executable')
  expect(await readFile(join(home, 'qt.dll'), 'utf8')).toBe('correct library')
})
