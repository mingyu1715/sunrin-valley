import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { link, lstat, mkdir, open, rename, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { SUNRIN_SERVER_ICON_BASE64 } from './server-icon'

const ADDRESS = 'mc.mingyu1715.dev'
const MAX_BYTES = 16 * 1024 * 1024, MAX_DEPTH = 64, MAX_TAGS = 100_000
const pending = new Map<string, Promise<{ changed: boolean }>>()
const invalid = () => new Error('서버 목록 파일을 안전하게 읽을 수 없어 원본을 보존했습니다. servers.dat를 확인해 주세요.')

type Tag = {
  type: number; name?: string; start: number; payload: number; end: number
  children?: Tag[]; elementType?: number
}

// Keep every untouched tag as its original byte slice. Java modified UTF-8,
// floating-point NaN payloads and tags added by mods survive byte for byte.
class NbtReader {
  private offset = 0
  private tags = 0
  constructor(readonly data: Buffer) {}
  private take(length: number): number {
    if (length < 0 || length > this.data.length - this.offset) throw invalid()
    const start = this.offset; this.offset += length; return start
  }
  private byte() { return this.data[this.take(1)] }
  private int() { return this.data.readInt32BE(this.take(4)) }
  private text() {
    const length = this.data.readUInt16BE(this.take(2))
    const start = this.take(length)
    return this.data.toString('utf8', start, start + length)
  }
  private named(depth: number): Tag {
    const start = this.offset, type = this.byte(), name = this.text()
    return this.payload(type, depth, start, name)
  }
  private payload(type: number, depth: number, start: number, name?: string): Tag {
    if (++this.tags > MAX_TAGS || depth > MAX_DEPTH || type < 1 || type > 12) throw invalid()
    const tag: Tag = { type, name, start, payload: this.offset, end: 0 }
    const widths: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 4, 6: 8 }
    if (widths[type]) this.take(widths[type])
    else if (type === 8) this.text()
    else if (type === 7 || type === 11 || type === 12) {
      const length = this.int(), width = type === 7 ? 1 : type === 11 ? 4 : 8
      if (length < 0 || length > Math.floor((this.data.length - this.offset) / width)) throw invalid()
      this.take(length * width)
    } else if (type === 9) {
      tag.elementType = this.byte()
      const length = this.int()
      if (length < 0 || length > MAX_TAGS || tag.elementType > 12 || (tag.elementType === 0 && length !== 0)) throw invalid()
      tag.children = []
      for (let i = 0; i < length; i++) tag.children.push(this.payload(tag.elementType, depth + 1, this.offset))
    } else if (type === 10) {
      tag.children = []
      while (this.data[this.offset] !== 0) tag.children.push(this.named(depth + 1))
      this.take(1)
    }
    tag.end = this.offset
    return tag
  }
  root(): Tag {
    const root = this.named(0)
    if (root.type !== 10 || this.offset !== this.data.length) throw invalid()
    return root
  }
}

function encodedString(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8'), size = Buffer.alloc(2)
  if (bytes.length > 65_535) throw invalid()
  size.writeUInt16BE(bytes.length)
  return Buffer.concat([size, bytes])
}
function namedString(name: string, value: string): Buffer {
  return Buffer.concat([Buffer.from([8]), encodedString(name), encodedString(value)])
}
function compound(fields: Buffer[]): Buffer { return Buffer.concat([...fields, Buffer.from([0])]) }
function field(fields: Tag[], name: string): Tag | undefined {
  const matches = fields.filter(tag => tag.name === name)
  if (matches.length > 1) throw invalid()
  return matches[0]
}
function stringValue(data: Buffer, tag: Tag): string {
  if (tag.type !== 8) throw invalid()
  return data.toString('utf8', tag.payload + 2, tag.end)
}

function merge(data: Buffer): Buffer {
  const tree = new NbtReader(data).root(), fields = tree.children!
  const list = field(fields, 'servers')
  if (list && (list.type !== 9 || (list.elementType !== 10 && !(list.elementType === 0 && list.children?.length === 0)))) throw invalid()
  let found = false
  const entries = (list?.children ?? []).map(server => {
    const fields = server.children!, ip = field(fields, 'ip')
    // Duplicate address tags are ambiguous, including on otherwise unrelated servers.
    if (!ip || !/^(?:mc\.mingyu1715\.dev|3\.36\.221\.160)(?::25565)?$/i.test(stringValue(data, ip))) return data.subarray(server.start, server.end)
    found = true
    const name = field(fields, 'name'), icon = field(fields, 'icon')
    const updated = fields.map(tag => tag === ip ? namedString('ip', ADDRESS) : tag === icon ? namedString('icon', SUNRIN_SERVER_ICON_BASE64) : data.subarray(tag.start, tag.end))
    if (!name) updated.push(namedString('name', '선린밸리'))
    if (!icon) updated.push(namedString('icon', SUNRIN_SERVER_ICON_BASE64))
    return compound(updated)
  })
  if (!found) entries.push(compound([namedString('name', '선린밸리'), namedString('ip', ADDRESS), namedString('icon', SUNRIN_SERVER_ICON_BASE64)]))
  const count = Buffer.alloc(4); count.writeInt32BE(entries.length)
  const header = list ? data.subarray(list.start, list.payload) : Buffer.concat([Buffer.from([9]), encodedString('servers')])
  const updatedList = Buffer.concat([header, Buffer.from([10]), count, ...entries])
  const updatedFields = fields.map(tag => tag === list ? updatedList : data.subarray(tag.start, tag.end))
  if (!list) updatedFields.push(updatedList)
  const result = Buffer.concat([data.subarray(0, tree.payload), compound(updatedFields)])
  if (result.length > MAX_BYTES) throw invalid()
  return result
}

function validateGame(game: string): string {
  if (!isAbsolute(game) || game.includes('\0') || game.split(/[\\/]/).some(part => part === '.' || part === '..')) throw new Error('서버 목록은 선린밸리 전용 인스턴스에만 등록할 수 있습니다.')
  const target = resolve(game)
  if (basename(target) !== '.minecraft' || basename(dirname(target)) !== 'SunrinValley' || basename(dirname(dirname(target))) !== 'instances' || basename(dirname(dirname(dirname(target)))) !== 'prism-data') {
    throw new Error('서버 목록은 선린밸리 전용 인스턴스에만 등록할 수 있습니다.')
  }
  return target
}
async function rejectSymlinks(path: string): Promise<void> {
  for (let current = path; ; current = dirname(current)) {
    try {
      const stat = await lstat(current)
      if (stat.isSymbolicLink()) throw new Error('서버 목록 경로에 연결 파일이나 폴더가 있습니다.')
      if (current === path && !stat.isFile()) throw invalid()
    }
    catch (error: any) { if (error.code !== 'ENOENT') throw error }
    if (dirname(current) === current) return
  }
}
async function readBounded(path: string): Promise<Buffer | undefined> {
  let handle
  try { handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)) }
  catch (error: any) { if (error.code === 'ENOENT') return undefined; throw error }
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > MAX_BYTES) throw invalid()
    const buffer = Buffer.alloc(stat.size + 1)
    let length = 0
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null)
      if (bytesRead === 0) break
      length += bytesRead
    }
    if (length !== stat.size) throw invalid()
    return buffer.subarray(0, length)
  } finally { await handle.close() }
}
async function writeTemporary(path: string, data: Buffer): Promise<string> {
  const temporary = `${path}.${randomUUID()}.tmp`
  const handle = await open(temporary, 'wx', 0o600)
  try { await handle.writeFile(data); await handle.sync() }
  catch (error) { await handle.close(); await rm(temporary, { force: true }); throw error }
  await handle.close()
  return temporary
}
async function sameOriginal(path: string, original: Buffer | undefined): Promise<void> {
  const current = await readBounded(path)
  if (original ? !current?.equals(original) : current !== undefined) throw new Error('서버 목록이 변경되어 덮어쓰지 않았습니다. 다시 시도해 주세요.')
}
async function configure(game: string): Promise<{ changed: boolean }> {
  const file = join(game, 'servers.dat'), backup = `${file}.sunrin-backup`
  await rejectSymlinks(file)
  await rejectSymlinks(backup)
  const original = await readBounded(file)
  // Minecraft 1.20.1 uses uncompressed, big-endian NBT for servers.dat.
  // Compressed or malformed files are left intact, never silently replaced.
  const result = merge(original ?? Buffer.from([10, 0, 0, 0]))
  if (original?.equals(result)) return { changed: false }
  await mkdir(game, { recursive: true })
  await rejectSymlinks(file)
  await rejectSymlinks(backup)
  if (original) {
    const temporary = await writeTemporary(backup, original)
    try {
      // Exclusive hard-link publication keeps the first original backup intact,
      // including when another launcher process reaches this step concurrently.
      try { await link(temporary, backup) }
      catch (error: any) { if (error.code !== 'EEXIST') throw error }
    } finally { await rm(temporary, { force: true }) }
  }
  const temporary = await writeTemporary(file, result)
  try {
    await rejectSymlinks(file)
    await rejectSymlinks(backup)
    await sameOriginal(file, original)
    await rename(temporary, file)
  } finally { await rm(temporary, { force: true }) }
  return { changed: true }
}

export async function configureSunrinServer(game: string): Promise<{ changed: boolean }> {
  const target = validateGame(game), previous = pending.get(target) ?? Promise.resolve({ changed: false })
  const operation = previous.catch(() => ({ changed: false })).then(() => configure(target))
  pending.set(target, operation)
  try { return await operation }
  finally { if (pending.get(target) === operation) pending.delete(target) }
}
