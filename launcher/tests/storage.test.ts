import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import AdmZip from 'adm-zip'
import { getStorageInfo } from '../src/main/storage'
import { gameRoot } from '../src/main/instance'
import type { BundlePaths } from '../src/main/pack-types'

const roots: string[] = []
const MiB = 1024 ** 2, GiB = 1024 ** 3
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
async function put(path: string, bytes: Buffer | string) { await fs.mkdir(dirname(path), { recursive: true }); await fs.writeFile(path, bytes) }
async function fixture(options: { fileSize?: number; fileBytes?: string; overrideBytes?: number } = {}) {
  const root = await fs.mkdtemp(join(tmpdir(), 'sunrin-storage-')); roots.push(root)
  const data = join(root, 'data'), pack = join(root, 'bundle')
  const base = new AdmZip(); base.addFile('overrides/config/example.txt', Buffer.alloc(options.overrideBytes ?? 1024, 97))
  const archive = base.toBuffer()
  const paths: BundlePaths = { manifest: join(pack, 'manifest.json'), prism: join(pack, 'prism.json'), customPack: join(pack, 'custom.zip'), startup: join(pack, 'startup.js') }
  const manifest = { formatVersion: 1, id: 'sunrin-valley', version: '1.0.0', minecraft: '1.20.1', forge: '47.4.0', base: { url: 'https://example.test/base.zip', filename: 'base.zip', fileId: 1, sha256: hash(archive), size: archive.length }, files: [{ path: 'mods/example.jar', url: 'https://example.test/mod.jar', hash: { algorithm: 'sha256', value: hash(options.fileBytes ?? 'verified mod') }, ...(options.fileSize === undefined ? {} : { size: options.fileSize }) }] }
  const prism = { version: '11.1.1', platforms: { [`${process.platform}-${process.arch}`]: { filename: 'prism.zip', executable: 'prism', sha256: hash('prism archive'), url: 'https://example.test/prism.zip', size: 17 } } }
  await put(paths.manifest, JSON.stringify(manifest)); await put(paths.prism, JSON.stringify(prism))
  await put(paths.customPack, 'custom'); await put(paths.startup, 'startup')
  return { data, paths, archive, root }
}
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map(path => fs.rm(path, { recursive: true, force: true }))) })

describe('storage estimates', () => {
  it('estimates a new directory from its existing volume without creating it or using the network', async () => {
    const { data, paths } = await fixture()
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network prohibited'))
    const info = await getStorageInfo(join(data, 'nested'), paths)
    expect(info.installedBytes).toBe(0)
    expect(info.freeBytes).toBeGreaterThan(0)
    expect(info.downloadBytes).toBeGreaterThan(GiB)
    expect(info.requiredBytes).toBeGreaterThan(info.downloadBytes + 2 * GiB)
    expect(info.estimatedInstalledBytes).toBeGreaterThan(GiB)
    expect(info.sufficient).toBe(info.freeBytes! >= info.requiredBytes)
    await expect(fs.lstat(data)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(network).not.toHaveBeenCalled()
  })
  it('deducts verified cached archives and installed managed files from remaining downloads', async () => {
    const mod = 'verified mod', { data, paths, archive } = await fixture({ fileSize: 80 * MiB, fileBytes: mod })
    const before = await getStorageInfo(data, paths)
    await put(join(data, 'cache/base.zip'), archive)
    await put(join(gameRoot(data), 'mods/example.jar'), mod)
    const after = await getStorageInfo(data, paths)
    expect(before.downloadBytes - after.downloadBytes).toBe(archive.length + 80 * MiB)
    expect(after.requiredBytes).toBeLessThan(before.requiredBytes)
    await put(join(data, 'cache/base.zip'), 'corrupt')
    const corrupt = await getStorageInfo(data, paths)
    expect(corrupt.downloadBytes - after.downloadBytes).toBe(archive.length)
  })
  it('uses a positive fallback for each unknown file length', async () => {
    const { data, paths } = await fixture()
    const unknown = await getStorageInfo(data, paths)
    const manifest = JSON.parse(await fs.readFile(paths.manifest, 'utf8'))
    manifest.files[0].size = 1
    await fs.writeFile(paths.manifest, JSON.stringify(manifest))
    const known = await getStorageInfo(data, paths)
    expect(unknown.downloadBytes - known.downloadBytes).toBeGreaterThanOrEqual(32 * MiB)
  })
  it('budgets cached ZIP uncompressed bytes and temporary extraction copies', async () => {
    const small = await fixture({ fileSize: 1, overrideBytes: 1024 }), large = await fixture({ fileSize: 1, overrideBytes: 8 * MiB })
    await put(join(small.data, 'cache/base.zip'), small.archive); await put(join(large.data, 'cache/base.zip'), large.archive)
    const smallInfo = await getStorageInfo(small.data, small.paths), largeInfo = await getStorageInfo(large.data, large.paths)
    expect(largeInfo.estimatedInstalledBytes - smallInfo.estimatedInstalledBytes).toBeGreaterThanOrEqual(8 * MiB - 1024)
    expect(largeInfo.requiredBytes - smallInfo.requiredBytes).toBeGreaterThanOrEqual(2 * (8 * MiB - 1024))
  })
  it('counts dedicated regular files while skipping links to external data and loops', async () => {
    const { data, paths, root } = await fixture({ fileSize: 1 })
    await put(join(data, 'own/file.bin'), '12345'); await put(join(root, 'external/big.bin'), Buffer.alloc(MiB))
    await fs.symlink(join(root, 'external'), join(data, 'external-link'), 'dir')
    await fs.symlink(data, join(data, 'loop'), 'dir')
    await fs.symlink(join(root, 'external/big.bin'), join(data, 'file-link'))
    expect((await getStorageInfo(data, paths)).installedBytes).toBe(5)
  })
  it('refuses a linked data root rather than reporting unrelated files as owned', async () => {
    const { data, paths, root } = await fixture()
    await fs.mkdir(join(root, 'external')); await fs.symlink(join(root, 'external'), data, 'dir')
    await expect(getStorageInfo(data, paths)).rejects.toThrow(/연결|link/i)
  })
  it('rejects linked ancestors before counting external descendants or estimating missing descendants', async () => {
    const { paths, root } = await fixture()
    const external = join(root, 'external'), link = join(root, 'linked-parent')
    await put(join(external, 'nested/private.bin'), 'outside-owned-data')
    await fs.symlink(external, link, 'dir')
    await expect(getStorageInfo(join(link, 'nested'), paths)).rejects.toThrow(/연결|link/i)
    await expect(getStorageInfo(join(link, 'missing/child'), paths)).rejects.toThrow(/연결|link/i)
    await expect(fs.lstat(join(external, 'missing'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('preserves unknown free space when volume inspection is unavailable', async () => {
    const { data, paths } = await fixture()
    vi.spyOn(fs, 'statfs').mockRejectedValue(Object.assign(new Error('unsupported'), { code: 'ENOSYS' }))
    const info = await getStorageInfo(data, paths)
    expect(info.freeBytes).toBeNull(); expect(info.sufficient).toBeNull()
    expect(info.requiredBytes).toBeGreaterThan(0)
  })
  it('rejects unreadable tree inspection instead of inventing a known zero-byte installation', async () => {
    const { data, paths } = await fixture()
    await fs.mkdir(data)
    vi.spyOn(fs, 'readdir').mockRejectedValue(Object.assign(new Error('denied'), { code: 'EACCES' }))
    await expect(getStorageInfo(data, paths)).rejects.toThrow('denied')
  })
})
