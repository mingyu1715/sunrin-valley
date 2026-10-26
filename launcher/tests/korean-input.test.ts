import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'vitest'
import AdmZip from 'adm-zip'
import { KOREAN_INPUT_PATH, prepareKoreanInputMetadata, transformKoreanInputMetadata } from '../src/main/korean-input'

const metadata = `modLoader = "javafml"
loaderVersion = "[46,)"
license = "LGPL-3.0"

[[mods]]
modId = "koreanpatch"
version = "1.9.6+mc1.20.1"
description = '''
Natural Hangul composition.
displayTest = "this is description text"
'''

[[dependencies.koreanpatch]]
modId = "minecraft"
versionRange = "[1.20, 1.20.2)"
side = "CLIENT"
`
function jar(toml = metadata, signature?: string): Buffer {
  const archive = new AdmZip()
  archive.addFile('META-INF/mods.toml', Buffer.from(toml))
  archive.addFile('META-INF/MANIFEST.MF', Buffer.from('Manifest-Version: 1.0\r\n\r\n'))
  archive.addFile('com/example/Client.class', Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 61]))
  archive.addFile('native/libdarwincocoainput.dylib', Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 2]))
  archive.addFile('native/libwincocoainput-x64.dll', Buffer.from('MZ native Windows input'))
  archive.addFile('assets/koreanpatch/lang/ko_kr.json', Buffer.from('{"input":"한글"}'))
  archive.addFile('LICENSE_Korean Patch', Buffer.from('GNU LESSER GENERAL PUBLIC LICENSE'))
  if (signature) archive.addFile(signature, Buffer.from('signature must never be invalidated'))
  return archive.toBuffer()
}

test('client-only display metadata is the only changed JAR entry', () => {
  const original = jar(), result = transformKoreanInputMetadata(original)
  const before = new AdmZip(original), after = new AdmZip(result)
  assert.deepEqual(after.getEntries().map(entry => entry.entryName).sort(), before.getEntries().map(entry => entry.entryName).sort())
  for (const entry of before.getEntries()) {
    if (entry.entryName !== 'META-INF/mods.toml') assert.deepEqual(after.readFile(entry.entryName), entry.getData(), entry.entryName)
  }
  const toml = after.readAsText('META-INF/mods.toml')
  assert.match(toml, /^clientSideOnly\s*=\s*true$/m)
  assert.match(toml, /^displayTest\s*=\s*"IGNORE_ALL_VERSION"$/m)
  assert.match(toml, /Natural Hangul composition\.\ndisplayTest = "this is description text"/)
  assert.match(toml, /modId = "koreanpatch"\nversion = "1\.9\.6\+mc1\.20\.1"/)
  assert.match(toml, /# Sunrin Valley:/)
  assert.notDeepEqual(result, original)
})

test('already-correct metadata is byte-for-byte idempotent', () => {
  const correct = jar('clientSideOnly = true\n' + metadata.replace('[[mods]]', '[[mods]]\ndisplayTest = "IGNORE_ALL_VERSION"'))
  assert.deepEqual(transformKoreanInputMetadata(correct), correct)
  const patched = transformKoreanInputMetadata(jar())
  assert.deepEqual(transformKoreanInputMetadata(patched), patched)
})

test('existing flag values are corrected without duplicating keys or losing comments', () => {
  const input = 'clientSideOnly = false # preserve this explanation\n' + metadata.replace('[[mods]]', '[[mods]]\ndisplayTest = \'MATCH_VERSION\' # also preserve')
  const result = new AdmZip(transformKoreanInputMetadata(jar(input))).readAsText('META-INF/mods.toml')
  assert.match(result, /^clientSideOnly = true # preserve this explanation$/m)
  assert.match(result, /^displayTest = "IGNORE_ALL_VERSION" # also preserve$/m)
  assert.equal(result.match(/^clientSideOnly\s*=/gm)?.length, 1)
  assert.equal(result.match(/^displayTest\s*=\s*"IGNORE_ALL_VERSION"/gm)?.length, 1)
})

for (const [label, input] of [
  ['wrong mod ID', metadata.replace('modId = "koreanpatch"', 'modId = "anothermod"')],
  ['wrong version', metadata.replace('1.9.6+mc1.20.1', '1.9.5+mc1.20.1')],
  ['duplicate mod identity', metadata.replace('modId = "koreanpatch"', 'modId = "koreanpatch"\nmodId = "koreanpatch"')],
  ['multiple mods', metadata + '\n[[mods]]\nmodId = "extra"\nversion = "1"\n'],
] as const) {
  test(`rejects ${label}`, () => {
    const original = jar(input), copy = Buffer.from(original)
    assert.throws(() => transformKoreanInputMetadata(original), /Korean Patch/)
    assert.deepEqual(original, copy)
  })
}

for (const signature of ['META-INF/AUTHOR.SF', 'META-INF/AUTHOR.RSA', 'META-INF/AUTHOR.DSA', 'META-INF/AUTHOR.EC', 'META-INF/SIG-AUTHOR']) {
  test(`rejects signed JAR marker ${signature}`, () => {
    const original = jar(metadata, signature), copy = Buffer.from(original)
    assert.throws(() => transformKoreanInputMetadata(original), /서명|signed/i)
    assert.deepEqual(original, copy)
  })
}

test('rejects manifest entry digests even if a signature block was removed', () => {
  const archive = new AdmZip(jar())
  archive.updateFile('META-INF/MANIFEST.MF', Buffer.from('Manifest-Version: 1.0\r\n\r\nName: Client.class\r\nSHA-256-Digest: unchanged\r\n\r\n'))
  assert.throws(() => transformKoreanInputMetadata(archive.toBuffer()), /서명|signed/i)
})

for (const [label, bytes] of [['size', Buffer.from('untrusted')], ['SHA256', Buffer.alloc(378658)]] as const) {
  test(`production pin rejects incorrect ${label} and preserves the file`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'sunrin-korean-pin-'))
    try {
      const path = join(directory, KOREAN_INPUT_PATH.split('/').at(-1)!)
      await writeFile(path, bytes)
      const previous = createHash('sha256').update(bytes).digest('hex')
      await assert.rejects(prepareKoreanInputMetadata(path), /Korean Patch/)
      assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), previous)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
}
