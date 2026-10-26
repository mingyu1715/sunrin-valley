import { createHash } from 'node:crypto'
import { lstat, readFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'
import { atomicWrite, type FileHash } from './files'

export const KOREAN_INPUT_PATH = 'mods/koreanpatch-forge-1.9.6+mc1.20.1.jar'
const ORIGINAL_SIZE = 378658
const ORIGINAL_SHA256 = '19a3390c1852dea94b32422e280ee70aa1686e62a1a00a07e18e5747b02c1bd7'
const METADATA = 'META-INF/mods.toml'
const DISPLAY_TEST = 'IGNORE_ALL_VERSION'
const invalid = () => new Error('Korean Patch 원본 또는 모드 정보가 올바르지 않아 파일을 변경하지 않았습니다.')

function metadataLines(text: string): string[] {
  let multiline: string | undefined
  return text.split(/\r?\n/).map(line => {
    let code = '', position = 0
    while (position < line.length) {
      if (multiline) {
        const end = line.indexOf(multiline, position)
        if (end < 0) return code
        position = end + 3; multiline = undefined
      } else if (line[position] === '#') break
      else if (line[position] === '"' || line[position] === "'") {
        const quote = line[position]
        if (line.slice(position, position + 3) === quote.repeat(3)) {
          multiline = quote.repeat(3); code += '""'; position += 3
        } else {
          const start = position++
          while (position < line.length && line[position] !== quote) {
            if (quote === '"' && line[position] === '\\') position++
            position++
          }
          if (position >= line.length) throw invalid()
          code += line.slice(start, ++position)
        }
      } else code += line[position++]
    }
    return code.trim()
  })
}

function patchedMetadata(text: string): string {
  const lines = text.split(/\r?\n/), code = metadataLines(text)
  let section = '', firstTable = -1, modHeader = -1
  const fields = new Map<string, { index: number; value: string }>()
  for (let index = 0; index < code.length; index++) {
    if (code[index].startsWith('[')) {
      if (firstTable < 0) firstTable = index
      if (/^\[\[\s*mods\s*\]\]$/.test(code[index])) {
        if (modHeader >= 0) throw invalid()
        modHeader = index; section = 'mod'
      } else section = 'other'
      continue
    }
    const key = /^(clientSideOnly|modId|version|displayTest)\s*=\s*(.*)$/.exec(code[index])
    if (!key || (key[1] === 'clientSideOnly' ? section !== '' : section !== 'mod')) continue
    if (fields.has(key[1])) throw invalid()
    fields.set(key[1], { index, value: key[2] })
  }
  if (firstTable < 0 || modHeader < 0
    || !/^(?:"koreanpatch"|'koreanpatch')$/.test(fields.get('modId')?.value ?? '')
    || !/^(?:"1\.9\.6\+mc1\.20\.1"|'1\.9\.6\+mc1\.20\.1')$/.test(fields.get('version')?.value ?? '')) throw invalid()
  const client = fields.get('clientSideOnly'), display = fields.get('displayTest')
  if (client && !/^(true|false)$/.test(client.value)) throw invalid()
  if (display && !/^(?:"(?:MATCH_VERSION|IGNORE_SERVER_VERSION|IGNORE_ALL_VERSION|NONE)"|'(?:MATCH_VERSION|IGNORE_SERVER_VERSION|IGNORE_ALL_VERSION|NONE)')$/.test(display.value)) throw invalid()
  if (client?.value === 'true' && display && /^(["'])IGNORE_ALL_VERSION\1$/.test(display.value)) return text
  const output = ['# Sunrin Valley: client-only Forge metadata; publisher code and assets unchanged.']
  for (let index = 0; index < lines.length; index++) {
    if (!client && index === firstTable) output.push('clientSideOnly = true', '')
    let line = lines[index]
    if (index === client?.index) line = line.replace(/(clientSideOnly\s*=\s*)(true|false)/, '$1true')
    if (index === display?.index) line = line.replace(/(displayTest\s*=\s*)("[^"]*"|'[^']*')/, `$1"${DISPLAY_TEST}"`)
    output.push(line)
    if (!display && index === modHeader) output.push(`displayTest = "${DISPLAY_TEST}"`)
  }
  return output.join(text.includes('\r\n') ? '\r\n' : '\n')
}

/** Pure test boundary. Installation must use prepareKoreanInputMetadata, which authenticates publisher bytes first. */
export function transformKoreanInputMetadata(original: Buffer): Buffer {
  const archive = new AdmZip(original), entries = archive.getEntries()
  if (!entries.length || entries.length > 4096) throw invalid()
  const before = new Map<string, Buffer>(), names = new Set<string>()
  let total = 0
  for (const entry of entries) {
    const name = entry.entryName.toLowerCase()
    if (names.has(name)) throw invalid()
    names.add(name)
    if (/^meta-inf\/(?:[^/]+\.(?:sf|rsa|dsa|ec)|sig-[^/]+)$/i.test(entry.entryName)) throw new Error('서명된 Korean Patch JAR은 변경하지 않습니다. (signed JAR)')
    if ((total += entry.header.size) > 16 * 1024 * 1024) throw invalid()
    const data = entry.getData()
    if (name === 'meta-inf/manifest.mf' && /^[^:\r\n]*-digest(?:-[^:\r\n]*)?\s*:/im.test(data.toString('utf8'))) throw new Error('서명된 Korean Patch JAR은 변경하지 않습니다. (signed JAR)')
    before.set(entry.entryName, data)
  }
  const originalMetadata = before.get(METADATA)
  if (!originalMetadata || originalMetadata.length > 128 * 1024) throw invalid()
  const text = originalMetadata.toString('utf8')
  if (!Buffer.from(text, 'utf8').equals(originalMetadata)) throw invalid()
  const patched = patchedMetadata(text)
  if (patched === text) return original
  archive.updateFile(METADATA, Buffer.from(patched, 'utf8'))
  const output = archive.toBuffer(), check = new AdmZip(output)
  if (check.getEntries().length !== before.size) throw invalid()
  for (const [name, data] of before) {
    const expected = name === METADATA ? Buffer.from(patched, 'utf8') : data
    if (!check.readFile(name)?.equals(expected)) throw invalid()
  }
  return output
}

export async function prepareKoreanInputMetadata(path: string): Promise<FileHash> {
  const stat = await lstat(path)
  if (!stat.isFile() || stat.size !== ORIGINAL_SIZE) throw invalid()
  const original = await readFile(path)
  if (original.length !== ORIGINAL_SIZE || createHash('sha256').update(original).digest('hex') !== ORIGINAL_SHA256) throw invalid()
  const prepared = transformKoreanInputMetadata(original)
  await atomicWrite(path, prepared)
  return { algorithm: 'sha256', value: createHash('sha256').update(prepared).digest('hex') }
}
