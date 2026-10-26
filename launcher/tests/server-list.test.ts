import { afterEach, expect, it } from 'vitest'
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { configureSunrinServer } from '../src/main/server-list'

const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'sunrin-servers-'))); directories.push(root)
  const game = join(root, 'prism-data', 'instances', 'SunrinValley', '.minecraft')
  await mkdir(game, { recursive: true })
  return { root, game, file: join(game, 'servers.dat') }
}

function short(value: number) { const data = Buffer.alloc(2); data.writeUInt16BE(value); return data }
function int(value: number) { const data = Buffer.alloc(4); data.writeInt32BE(value); return data }
function utf(value: string) { const data = Buffer.from(value); return Buffer.concat([short(data.length), data]) }
function tag(type: number, name: string, payload: Buffer) { return Buffer.concat([Buffer.from([type]), utf(name), payload]) }
function string(name: string, value: string) { return tag(8, name, utf(value)) }
function compound(fields: Buffer[]) { return Buffer.concat([...fields, Buffer.from([0])]) }
function servers(entries: Buffer[], name = 'servers') { return tag(9, name, Buffer.concat([Buffer.from([10]), int(entries.length), ...entries])) }
function root(fields: Buffer[], name = '') { return tag(10, name, compound(fields)) }
function entry(name: string, ip: string, fields: Buffer[] = []) { return compound([string('name', name), string('ip', ip), ...fields]) }
function namedString(data: Buffer, key: string): string {
  const header = Buffer.concat([Buffer.from([8]), utf(key)])
  const offset = data.indexOf(header) + header.length
  expect(offset).toBeGreaterThanOrEqual(header.length)
  return data.toString('utf8', offset + 2, offset + 2 + data.readUInt16BE(offset))
}
function suppliedIcon(data: Buffer) {
  const icon = namedString(data, 'icon')
  expect(icon).not.toContain('data:image')
  const png = Buffer.from(icon, 'base64')
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(png.readUInt32BE(16)).toBe(64)
  expect(png.readUInt32BE(20)).toBe(64)
  return icon
}

it('creates an offline visible Sunrin server in only the dedicated instance and is idempotent', async () => {
  const { root: directory, game, file } = await fixture()
  const originalGame = join(directory, '.minecraft')
  await mkdir(originalGame)
  const original = root([servers([entry('Original', 'example.org')])])
  await writeFile(join(originalGame, 'servers.dat'), original)
  await expect(configureSunrinServer(game)).resolves.toEqual({ changed: true })
  const actual = await readFile(file)
  const icon = suppliedIcon(actual)
  expect(actual).toEqual(root([servers([entry('선린밸리', 'mc.mingyu1715.dev', [string('icon', icon)])])]))
  const before = await lstat(file)
  await expect(configureSunrinServer(game)).resolves.toEqual({ changed: false })
  expect((await lstat(file)).mtimeMs).toBe(before.mtimeMs)
  expect(await readFile(join(originalGame, 'servers.dat'))).toEqual(original)
})

it('preserves all unknown NBT tag payloads, user servers and the first original backup', async () => {
  const { game, file } = await fixture()
  const unknown = [
    tag(1, 'byte', Buffer.from([255])), tag(2, 'short', Buffer.from('8001', 'hex')),
    tag(3, 'int', int(-123)), tag(4, 'long', Buffer.from('fedcba9876543210', 'hex')),
    tag(5, 'nan', Buffer.from('7fc12345', 'hex')), tag(6, 'double', Buffer.from('fff0000000000000', 'hex')),
    tag(7, 'bytes', Buffer.concat([int(3), Buffer.from([0, 128, 255])])),
    // Modified UTF-8 and unpaired surrogates must survive without decoding/re-encoding.
    tag(8, 'javaString', Buffer.from('0005c080eda080', 'hex')),
    tag(9, 'list', Buffer.concat([Buffer.from([3]), int(2), int(-1), int(42)])),
    tag(10, 'nested', compound([string('ip', 'unrelated.invalid')])),
    tag(11, 'ints', Buffer.concat([int(2), int(-1), int(0)])),
    tag(12, 'longs', Buffer.concat([int(1), Buffer.from('ffffffffffffffff', 'hex')]))
  ]
  const other = entry('선린밸리', 'different.example', unknown)
  const initial = root([tag(3, 'DataVersion', int(3465)), servers([other]), ...unknown], 'SavedServers')
  await writeFile(file, initial)
  await configureSunrinServer(game)
  const result = await readFile(file)
  const icon = suppliedIcon(result)
  expect(result).toEqual(root([tag(3, 'DataVersion', int(3465)), servers([other, entry('선린밸리', 'mc.mingyu1715.dev', [string('icon', icon)])]), ...unknown], 'SavedServers'))
  expect(await readFile(`${file}.sunrin-backup`)).toEqual(initial)
  // A later user edit must not replace the first backup.
  await writeFile(file, root([servers([other])]))
  await configureSunrinServer(game)
  expect(await readFile(`${file}.sunrin-backup`)).toEqual(initial)
})

it.each(['mc.mingyu1715.dev', 'MC.MINGYU1715.DEV:25565', '3.36.221.160', '3.36.221.160:25565'])('updates the exact managed alias %s while preserving custom name and options', async ip => {
  const { game, file } = await fixture()
  const custom = [tag(1, 'acceptTextures', Buffer.from([0])), tag(1, 'hidden', Buffer.from([1])), string('future', 'preserved')]
  await writeFile(file, root([servers([entry('우리 친구 서버', ip, [...custom, string('icon', 'old cached icon')])])]))
  await configureSunrinServer(game)
  const result = await readFile(file)
  expect(result).toEqual(root([servers([entry('우리 친구 서버', 'mc.mingyu1715.dev', [...custom, string('icon', suppliedIcon(result))])])]))
  await expect(configureSunrinServer(game)).resolves.toEqual({ changed: false })
})

it.each(['mc.mingyu1715.dev.evil.example', '3.36.221.160:25566', 'mc.mingyu1715.dev:25566'])('does not overwrite a different server at %s', async ip => {
  const { game, file } = await fixture()
  const existing = entry('선린밸리', ip)
  await writeFile(file, root([servers([existing])]))
  await configureSunrinServer(game)
  const result = await readFile(file)
  expect(result).toEqual(root([servers([existing, entry('선린밸리', 'mc.mingyu1715.dev', [string('icon', suppliedIcon(result))])])]))
})

it('adds a missing servers list without losing root tags', async () => {
  const { game, file } = await fixture()
  const dataVersion = tag(3, 'DataVersion', int(3465))
  await writeFile(file, root([dataVersion]))
  await configureSunrinServer(game)
  const result = await readFile(file)
  expect(result).toEqual(root([dataVersion, servers([entry('선린밸리', 'mc.mingyu1715.dev', [string('icon', suppliedIcon(result))])])]))
})

it('accepts Minecraft empty lists whose element type is TAG_End', async () => {
  const { game, file } = await fixture()
  await writeFile(file, root([tag(9, 'servers', Buffer.from('0000000000', 'hex'))]))
  await configureSunrinServer(game)
  const result = await readFile(file)
  expect(result).toEqual(root([servers([entry('선린밸리', 'mc.mingyu1715.dev', [string('icon', suppliedIcon(result))])])]))
})

it('serializes simultaneous repairs so they create a single managed entry', async () => {
  const { game, file } = await fixture()
  const results = await Promise.all(Array.from({ length: 5 }, () => configureSunrinServer(game)))
  expect(results.filter(result => result.changed)).toHaveLength(1)
  const result = await readFile(file)
  expect(result).toEqual(root([servers([entry('선린밸리', 'mc.mingyu1715.dev', [string('icon', suppliedIcon(result))])])]))
})

it('refuses to overwrite the server list when the backup path cannot hold a regular file', async () => {
  const { game, file } = await fixture()
  const original = root([servers([])])
  await writeFile(file, original)
  await mkdir(`${file}.sunrin-backup`)
  await expect(configureSunrinServer(game)).rejects.toThrow()
  expect(await readFile(file)).toEqual(original)
})

it.each([
  ['empty', Buffer.alloc(0)],
  ['truncated', Buffer.from('0a0000090007736572766572730a0000000108', 'hex')],
  ['negative list', root([tag(9, 'servers', Buffer.concat([Buffer.from([10]), int(-1)]))])],
  ['wrong server list type', root([tag(9, 'servers', Buffer.concat([Buffer.from([8]), int(0)]))])],
  ['duplicate server lists', root([servers([]), servers([])])],
  ['duplicate addresses', root([servers([compound([string('ip', 'example.org'), string('ip', 'mc.mingyu1715.dev')])])])],
  ['unknown tag', Buffer.from('0a000063000000', 'hex')],
  ['trailing bytes', Buffer.concat([root([servers([])]), Buffer.from([0])])],
  ['negative byte array', root([tag(7, 'bad', int(-1))])],
  ['oversized list', root([tag(9, 'servers', Buffer.concat([Buffer.from([10]), int(100_001)]))])],
  ['oversized file', Buffer.alloc(16 * 1024 * 1024 + 1)]
])('preserves a malformed or unbounded %s file without creating replacements or backups', async (_label, original) => {
  const { game, file } = await fixture()
  await writeFile(file, original)
  await expect(configureSunrinServer(game)).rejects.toThrow()
  expect((await readFile(file)).equals(original)).toBe(true)
  expect(await readdir(game)).toEqual(['servers.dat'])
})

it('rejects excessive nesting before touching the existing file', async () => {
  const { game, file } = await fixture()
  let nested = string('deep', 'value')
  for (let i = 0; i < 70; i++) nested = tag(10, 'nested', compound([nested]))
  const original = root([nested, servers([])])
  await writeFile(file, original)
  await expect(configureSunrinServer(game)).rejects.toThrow()
  expect(await readFile(file)).toEqual(original)
})

it('rejects arbitrary, original, relative and traversal game paths', async () => {
  const { root: directory, game } = await fixture()
  for (const unsafe of [join(directory, '.minecraft'), directory, 'prism-data/instances/SunrinValley/.minecraft', `${game}/../.minecraft`]) {
    await expect(configureSunrinServer(unsafe)).rejects.toThrow()
  }
  expect(await readdir(game)).toEqual([])
})

it.each(['servers.dat', 'servers.dat.sunrin-backup'])('rejects a linked %s without modifying its target', async filename => {
  const { root: directory, game } = await fixture()
  const external = join(directory, 'external.dat'), original = root([servers([])])
  await writeFile(external, original)
  await symlink(external, join(game, filename))
  await expect(configureSunrinServer(game)).rejects.toThrow()
  expect(await readFile(external)).toEqual(original)
})

it('rejects symlinked directories above the instance boundary', async () => {
  const { root: directory, game } = await fixture()
  const alias = join(directory, 'alias')
  await symlink(directory, alias, 'dir')
  await expect(configureSunrinServer(join(alias, 'prism-data', 'instances', 'SunrinValley', '.minecraft'))).rejects.toThrow()
  expect(await readdir(game)).toEqual([])
})
