import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SettingsStore } from '../src/main/settings'
const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
it('persists settings and rejects unsafe paths and memory before changing them', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-settings-')); dirs.push(root)
  const store = new SettingsStore(root)
  const initial = await store.load()
  await expect(store.save({ ...initial, memoryMb: -1 })).rejects.toThrow()
  await expect(store.save({ ...initial, dataPath: 'relative/path' })).rejects.toThrow()
  await expect(store.save({ ...initial, dataPath: initial.minecraftPath })).rejects.toThrow()
  await store.save({ ...initial, memoryMb: 8192, shareShaders: false })
  const saved = await new SettingsStore(root).load()
  expect(saved.memoryMb).toBe(8192)
  expect(saved.shareShaders).toBe(false)
  expect(JSON.parse(await readFile(join(root, 'settings.json'), 'utf8')).memoryMb).toBe(8192)
})
