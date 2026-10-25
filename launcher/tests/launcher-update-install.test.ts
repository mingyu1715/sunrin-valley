import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm, access, symlink, realpath, readlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import AdmZip from 'adm-zip'
import { prepareLauncherUpdate, acknowledgeLauncherUpdate } from '../src/main/launcher-update-install'
import type { LauncherUpdateInfo } from '../src/shared'
const require = createRequire(import.meta.url)
const helper = require('../build/launcher-update-helper.cjs')
const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))) })
async function fixture() {
  const base = await mkdtemp(join(await realpath(tmpdir()), 'launcher-self-update-')); dirs.push(base)
  const root = join(base, 'user-data'), appPath = join(base, 'application'), executablePath = join(appPath, 'Sunrin Valley.exe')
  await mkdir(join(appPath, 'resources'), { recursive: true }); await mkdir(root)
  await writeFile(executablePath, 'old exe'); await writeFile(join(appPath, 'obsolete.dll'), 'old dll')
  await writeFile(join(appPath, 'resources/launcher-files.json'), JSON.stringify({ formatVersion: 1, files: ['Sunrin Valley.exe', 'obsolete.dll', 'resources/launcher-files.json'] }))
  const assetPath = join(root, 'launcher-updates/downloads/fixture.dmg'); await mkdir(join(root, 'launcher-updates/downloads'), { recursive: true }); await writeFile(assetPath, 'fixture')
  return { base, root, appPath, executablePath, currentVersion: '1.1.0', assetPath, assetSha256: createHash('sha256').update('fixture').digest('hex'), assetSize: 7 }
}
async function payload(f: Awaited<ReturnType<typeof fixture>>, files: Record<string, string>, listed = Object.keys(files)) {
  if (!files['resources/launcher-files.json'] && listed.length === Object.keys(files).length) { files = { ...files, 'resources/launcher-files.json': '' }; listed = Object.keys(files); files['resources/launcher-files.json'] = JSON.stringify({ formatVersion: 1, files: listed }) }
  const zip = new AdmZip(); zip.addFile('appFiles.json', Buffer.from(JSON.stringify({ formatVersion: 1, files: listed })))
  for (const [path, value] of Object.entries(files)) zip.addFile(path, Buffer.from(value))
  const bytes = zip.toBuffer(), assetPath = join(f.root, 'launcher-updates/downloads/update.zip'); await writeFile(assetPath, bytes)
  const info: LauncherUpdateInfo = { version: '1.1.1', changes: [], asset: { kind: 'zip', url: 'https://example.invalid/update.zip', sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length } }
  return { ...f, assetPath, info, platform: 'win32' as const }
}
it('stages exactly inventoried files without changing the installed launcher or game', async () => {
  const f = await fixture(); await writeFile(join(f.appPath, 'player-world.dat'), 'precious')
  const prepared = await prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new exe', 'resources/launcher-files.json': JSON.stringify({ formatVersion: 1, files: ['Sunrin Valley.exe', 'resources/launcher-files.json'] }) }))
  expect(await readFile(join(prepared.transactionPath, 'candidate', 'Sunrin Valley.exe'), 'utf8')).toBe('new exe')
  expect(await readFile(f.executablePath, 'utf8')).toBe('old exe')
  expect(await readFile(join(f.appPath, 'player-world.dat'), 'utf8')).toBe('precious')
  expect(prepared.helperArgs).toContain('-NoProfile')
})
it('rejects extra archive files, case collisions and an invalid payload hash', async () => {
  const f = await fixture()
  await expect(prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new', 'surprise.dll': 'bad' }, ['Sunrin Valley.exe']))).rejects.toThrow(/inventory/i)
  await expect(prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new', 'SUNRIN VALLEY.EXE': 'collision' }))).rejects.toThrow(/collision/i)
  const input = await payload(f, { 'Sunrin Valley.exe': 'new' }); input.info.asset.sha256 = '0'.repeat(64)
  await expect(prepareLauncherUpdate(input)).rejects.toThrow(/hash|sha256/i)
})
it('rejects linked installation paths and user data inside the app', async () => {
  const f = await fixture(), input = await payload(f, { 'Sunrin Valley.exe': 'new' })
  await expect(prepareLauncherUpdate({ ...input, root: join(f.appPath, 'data') })).rejects.toThrow(/outside/i)
  const inventoryPath = join(f.appPath, 'resources/launcher-files.json'); const old = JSON.parse(await readFile(inventoryPath, 'utf8')); old.files.push('linked/file'); await writeFile(inventoryPath, JSON.stringify(old))
  await mkdir(join(f.base, 'elsewhere')); await symlink(join(f.base, 'elsewhere'), join(f.appPath, 'linked'))
  await expect(prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new', 'linked/file': 'bad' }))).rejects.toThrow(/link/i)
})
it('acknowledges only the transaction nonce, exact version and executable path', async () => {
  const f = await fixture(), prepared = await prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new' }))
  const args = ['--launcher-update-token', prepared.id]
  await expect(acknowledgeLauncherUpdate(f.root, '9.9.9', f.executablePath, args)).rejects.toThrow(/version/i)
  await expect(acknowledgeLauncherUpdate(f.root, '1.1.1', join(f.appPath, 'other.exe'), args)).rejects.toThrow(/executable/i)
  await acknowledgeLauncherUpdate(f.root, '1.1.1', f.executablePath, args)
  expect(JSON.parse(await readFile(join(prepared.transactionPath, 'healthy.json'), 'utf8'))).toMatchObject({ nonce: prepared.id, version: '1.1.1', executablePath: f.executablePath })
})
it('swaps the Mac bundle and removes only its backup after health confirmation', async () => {
  const f = await fixture(), target = join(f.base, 'Sunrin.app'), id = 'e427f120-d060-429a-a156-13a1aaf95cf2'
  const candidate = join(f.base, `.sunrin-update-${id}.app`), backup = join(f.base, `.sunrin-backup-${id}.app`)
  await mkdir(target); await mkdir(candidate); await writeFile(join(target, 'version'), 'old'); await writeFile(join(candidate, 'version'), 'new')
  const tx = { formatVersion: 1, parentPid: process.ppid, platform: 'darwin', id, nonce: id, version: '1.1.1', currentVersion: '1.1.0', assetPath: f.assetPath, assetSha256: f.assetSha256, assetSize: f.assetSize, transactionPath: join(f.root, 'launcher-updates/transactions', id), root: f.root, appPath: target, candidate, backup, executablePath: join(target, 'Contents/MacOS/Sunrin Valley') }
  await mkdir(tx.transactionPath, { recursive: true })
  await helper.applyMacTransaction(tx, { waitForParent: async () => {}, validateCandidate: async () => {}, start: async () => 123, waitForHealth: async () => true, stop: async () => {} })
  expect(await readFile(join(target, 'version'), 'utf8')).toBe('new')
  await expect(access(backup)).rejects.toThrow(); await expect(access(f.assetPath)).rejects.toThrow()
  expect(JSON.parse(await readFile(join(tx.transactionPath, 'result.json'), 'utf8'))).toMatchObject({ status: 'healthy', cleanupPending: false })
})
it('restores the old Mac bundle and restarts it if the new launcher is unhealthy', async () => {
  const f = await fixture(), target = join(f.base, 'Sunrin.app'), id = 'e427f120-d060-429a-a156-13a1aaf95cf2'
  const candidate = join(f.base, `.sunrin-update-${id}.app`), backup = join(f.base, `.sunrin-backup-${id}.app`)
  await mkdir(target); await mkdir(candidate); await writeFile(join(target, 'version'), 'old'); await writeFile(join(candidate, 'version'), 'new')
  const tx = { formatVersion: 1, parentPid: process.ppid, platform: 'darwin', id, nonce: id, version: '1.1.1', currentVersion: '1.1.0', assetPath: f.assetPath, assetSha256: f.assetSha256, assetSize: f.assetSize, transactionPath: join(f.root, 'launcher-updates/transactions', id), root: f.root, appPath: target, candidate, backup, executablePath: join(target, 'Contents/MacOS/Sunrin Valley') }
  await mkdir(tx.transactionPath, { recursive: true }); const starts: string[][] = []
  await expect(helper.applyMacTransaction(tx, { waitForParent: async () => {}, validateCandidate: async () => {}, start: async (_path: string, args: string[]) => { starts.push(args); return 123 }, waitForHealth: async () => false, stop: async () => {} })).rejects.toThrow(/health/i)
  expect(await readFile(join(target, 'version'), 'utf8')).toBe('old'); expect(starts).toEqual([['--launcher-update-token', id], []]); await access(f.assetPath); await access(candidate)
})
it('rejects ZIP symlinks, unmanaged overwrites, file/directory collisions and expansion bombs', async () => {
  const f = await fixture(); await writeFile(join(f.appPath, 'custom-game.dat'), 'keep')
  await expect(prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new', 'custom-game.dat': 'overwrite' }))).rejects.toThrow(/unmanaged/i)
  await expect(prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new', 'a': 'file', 'a/b': 'nested' }))).rejects.toThrow(/collision/i)
  let input = await payload(f, { 'Sunrin Valley.exe': 'new', 'linked': 'target' })
  const linked = new AdmZip(input.assetPath); linked.getEntry('linked')!.attr = (0xa1ff << 16) >>> 0
  let bytes = linked.toBuffer(); await writeFile(input.assetPath, bytes); input.info.asset = { ...input.info.asset, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  await expect(prepareLauncherUpdate(input)).rejects.toThrow(/link|nonregular/i)
  input = await payload(f, { 'Sunrin Valley.exe': 'new' }); bytes = await readFile(input.assetPath)
  // Central directory's uncompressed length must be rejected before decompression.
  const signature = Buffer.from([0x50, 0x4b, 0x01, 0x02]); const central = bytes.indexOf(signature, bytes.indexOf(signature) + 4); bytes.writeUInt32LE(0x50000000, central + 24)
  await writeFile(input.assetPath, bytes); input.info.asset = { ...input.info.asset, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  await expect(prepareLauncherUpdate(input)).rejects.toThrow(/large|limit/i)
})
async function macFixture() {
  const f = await fixture(), appPath = join(f.base, 'Sunrin Valley.app'), executablePath = join(appPath, 'Contents/MacOS/Sunrin Valley')
  await mkdir(join(appPath, 'Contents/MacOS'), { recursive: true }); await writeFile(executablePath, 'old binary'); await writeFile(join(appPath, 'Contents/Info.plist'), 'plist')
  const assetPath = join(f.root, 'launcher-updates/downloads/update.dmg'); await writeFile(assetPath, 'dmg')
  const info: LauncherUpdateInfo = { version: '1.1.1', changes: [], asset: { kind: 'dmg', size: 3, sha256: createHash('sha256').update('dmg').digest('hex'), url: 'https://example.invalid/update.dmg' } }
  const calls: [string, string[]][] = []
  const command = async (file: string, args: string[]) => {
    calls.push([file, args])
    if (file.endsWith('hdiutil') && args[0] === 'attach') {
      const mountedApp = join(args[args.indexOf('-mountpoint') + 1], 'Sunrin Valley.app')
      await mkdir(join(mountedApp, 'Contents/MacOS'), { recursive: true }); await writeFile(join(mountedApp, 'Contents/MacOS/Sunrin Valley'), 'new binary'); await writeFile(join(mountedApp, 'Contents/Info.plist'), 'plist')
    }
    if (file.endsWith('PlistBuddy')) return args[1].endsWith('CFBundleIdentifier') ? 'kr.sunrinvalley.launcher' : args[1].endsWith('CFBundleExecutable') ? 'Sunrin Valley' : args[2].startsWith(appPath) ? '1.1.0' : '1.1.1'
    return file.endsWith('lipo') ? 'arm64' : ''
  }
  return { ...f, appPath, executablePath, assetPath, info, platform: 'darwin' as const, command, calls }
}
it('mounts a Mac DMG read-only, validates and stages a same-volume sibling without replacing the running app', async () => {
  const f = await macFixture(), prepared = await prepareLauncherUpdate(f)
  const tx = JSON.parse(await readFile(join(prepared.transactionPath, 'transaction.json'), 'utf8'))
  expect(await readFile(join(tx.candidate, 'Contents/MacOS/Sunrin Valley'), 'utf8')).toBe('new binary')
  expect(await readFile(f.executablePath, 'utf8')).toBe('old binary')
  expect(tx.candidate).toBe(join(f.base, `.sunrin-update-${prepared.id}.app`))
  expect(f.calls.find(([file, args]) => file.endsWith('hdiutil') && args[0] === 'attach')?.[1]).toContain('-readonly')
  expect(f.calls.at(-1)?.[1][0]).toBe('detach')
  expect(prepared.helperEnv.ELECTRON_RUN_AS_NODE).toBe('1')
})
it('detaches the Mac disk image and keeps the old app when staged codesign verification fails', async () => {
  const f = await macFixture(), command = async (file: string, args: string[]) => {
    if (file.endsWith('codesign') && args.at(-1)?.includes('.sunrin-update-')) throw new Error('codesign failed')
    return f.command(file, args)
  }
  await expect(prepareLauncherUpdate({ ...f, command })).rejects.toThrow(/codesign/i)
  expect(f.calls.at(-1)?.[1][0]).toBe('detach'); expect(await readFile(f.executablePath, 'utf8')).toBe('old binary')
})
it('refuses a Mac transaction whose candidate or backup escapes its exact sibling location', async () => {
  const f = await fixture(), id = 'e427f120-d060-429a-a156-13a1aaf95cf2', target = join(f.base, 'Sunrin.app')
  const tx = { formatVersion: 1, id, nonce: id, version: '1.1.1', currentVersion: '1.1.0', platform: 'darwin', assetPath: f.assetPath, assetSha256: f.assetSha256, assetSize: f.assetSize, root: f.root, transactionPath: join(f.root, 'launcher-updates/transactions', id), appPath: target, executablePath: join(target, 'Contents/MacOS/Sunrin Valley'), candidate: f.root, backup: join(f.base, `.sunrin-backup-${id}.app`) }
  await expect(helper.applyMacTransaction(tx)).rejects.toThrow(/unsafe/i)
})
it('rejects a downgrade before creating a new transaction', async () => {
  const f = await fixture(), input = await payload(f, { 'Sunrin Valley.exe': 'new' })
  await expect(prepareLauncherUpdate({ ...input, currentVersion: '1.2.0' }).then(() => 'unexpected success')).rejects.toThrow(/version|newer/i)
})
it('waits for a matching helper-ready handshake before allowing the launcher to quit', async () => {
  const { launchLauncherUpdate } = await import('../src/main/launcher-update-install')
  const f = await fixture(), prepared = await prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new' }))
  await expect(launchLauncherUpdate({ ...prepared, helperExecutable: join(f.base, 'does-not-exist') }, process.pid)).rejects.toThrow()
  const script = join(prepared.transactionPath, 'handshake.cjs')
  await writeFile(script, `require('node:fs').writeFileSync(${JSON.stringify(join(prepared.transactionPath, 'helper-ready.json'))}, JSON.stringify({ id: ${JSON.stringify(prepared.id)}, parentPid: Number(process.argv[2]), helperPid: process.pid })); setInterval(() => {}, 1000)`)
  await launchLauncherUpdate({ ...prepared, helperExecutable: process.execPath, helperArgs: [script], helperEnv: process.env }, process.pid)
  const marker = JSON.parse(await readFile(join(prepared.transactionPath, 'helper-ready.json'), 'utf8'))
  expect(marker).toMatchObject({ id: prepared.id, parentPid: process.pid }); process.kill(marker.helperPid, 'SIGTERM')
})
it('rejects an early helper exit without quitting the old launcher', async () => {
  const { launchLauncherUpdate } = await import('../src/main/launcher-update-install')
  const f = await fixture(), prepared = await prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new' }))
  await expect(launchLauncherUpdate({ ...prepared, helperExecutable: process.execPath, helperArgs: ['-e', 'process.exit(7)'], helperEnv: process.env }, process.pid)).rejects.toThrow(/exited.*ready/i)
})
it('rejects a mismatched readiness marker and kills the helper on timeout', async () => {
  const { launchLauncherUpdate } = await import('../src/main/launcher-update-install')
  const f = await fixture(), prepared = await prepareLauncherUpdate(await payload(f, { 'Sunrin Valley.exe': 'new' }))
  const script = join(prepared.transactionPath, 'wrong-handshake.cjs')
  await writeFile(script, `require('node:fs').writeFileSync(${JSON.stringify(join(prepared.transactionPath, 'helper-ready.json'))}, JSON.stringify({ id: 'wrong', parentPid: Number(process.argv[2]), helperPid: process.pid })); setInterval(() => {}, 1000)`)
  await expect(launchLauncherUpdate({ ...prepared, helperExecutable: process.execPath, helperArgs: [script], helperEnv: process.env }, process.pid, { readyTimeoutMs: 300 })).rejects.toThrow(/timed out/i)
  const marker = JSON.parse(await readFile(join(prepared.transactionPath, 'helper-ready.json'), 'utf8'))
  await new Promise(resolve => setTimeout(resolve, 100)); expect(() => process.kill(marker.helperPid, 0)).toThrow()
})
it('detaches and rejects a Mac app containing a link outside its bundle', async () => {
  const f = await macFixture(), command = async (file: string, args: string[]) => {
    const result = await f.command(file, args)
    if (file.endsWith('hdiutil') && args[0] === 'attach') await symlink(f.root, join(args[args.indexOf('-mountpoint') + 1], 'Sunrin Valley.app/Contents/external'))
    return result
  }
  await expect(prepareLauncherUpdate({ ...f, command })).rejects.toThrow(/external.*link/i)
  expect(f.calls.at(-1)?.[1][0]).toBe('detach')
})
it('accepts a health marker only for the exact nonce, version, executable and launched PID', async () => {
  const f = await fixture(), tx = { transactionPath: f.root, nonce: 'correct', version: '1.1.1', executablePath: f.executablePath }
  await writeFile(join(f.root, 'healthy.json'), JSON.stringify({ ...tx, nonce: 'wrong', pid: process.pid }))
  let resolved = false; const result = helper.waitForHealth(tx, process.pid).then((value: boolean) => { resolved = true; return value })
  await new Promise(resolve => setTimeout(resolve, 30)); expect(resolved).toBe(false)
  await writeFile(join(f.root, 'healthy.json'), JSON.stringify({ nonce: tx.nonce, version: tx.version, executablePath: tx.executablePath, pid: process.pid }))
  expect(await result).toBe(true)
})

it('requires the full installer when Windows update adds a native managed file', async () => {
  const f = await fixture(), input = await payload(f, { 'Sunrin Valley.exe': 'new', 'new-runtime.dll': 'new native file' })
  await expect(prepareLauncherUpdate(input).then(() => 'unexpected success')).rejects.toThrow(/새 실행 환경 파일.*설치 프로그램/)
})
it('rejects update archives outside the dedicated download directory', async () => {
  const f = await fixture(), input = await payload(f, { 'Sunrin Valley.exe': 'new' }); const outside = join(f.root, 'precious-game.zip'); await writeFile(outside, await readFile(input.assetPath))
  await expect(prepareLauncherUpdate({ ...input, assetPath: outside }).then(() => 'unexpected success')).rejects.toThrow(/download|다운로드/i)
  await access(outside)
})
it('keeps a healthy Mac update when cleanup cannot delete a changed download', async () => {
  const f = await fixture(), id = 'e427f120-d060-429a-a156-13a1aaf95cf2', appPath = join(f.base, 'Sunrin.app')
  const candidate = join(f.base, `.sunrin-update-${id}.app`), backup = join(f.base, `.sunrin-backup-${id}.app`)
  await mkdir(appPath); await mkdir(candidate); await writeFile(join(appPath, 'version'), 'old'); await writeFile(join(candidate, 'version'), 'new')
  const tx = { formatVersion: 1, platform: 'darwin', parentPid: process.ppid, id, nonce: id, currentVersion: '1.1.0', version: '1.1.1', root: f.root, transactionPath: join(f.root, 'launcher-updates/transactions', id), appPath, executablePath: join(appPath, 'Contents/MacOS/Sunrin Valley'), candidate, backup, assetPath: f.assetPath, assetSha256: f.assetSha256, assetSize: f.assetSize }
  await mkdir(tx.transactionPath, { recursive: true }); let starts = 0
  await helper.applyMacTransaction(tx, { waitForParent: async () => {}, validateCandidate: async () => {}, start: async () => { starts++; return 123 }, waitForHealth: async () => { await writeFile(f.assetPath, 'unrelated replacement'); return true } })
  expect(starts).toBe(1); expect(await readFile(join(appPath, 'version'), 'utf8')).toBe('new')
  expect(await readFile(f.assetPath, 'utf8')).toBe('unrelated replacement')
  await expect(access(candidate)).rejects.toThrow(); await expect(access(backup)).rejects.toThrow()
  expect(JSON.parse(await readFile(join(tx.transactionPath, 'result.json'), 'utf8'))).toMatchObject({ status: 'healthy', cleanupPending: true })
})

it('preserves signed internal framework symlinks verbatim when staging a Mac bundle', async () => {
  const f = await macFixture(), command = async (file: string, args: string[]) => {
    const result = await f.command(file, args)
    if (file.endsWith('hdiutil') && args[0] === 'attach') {
      const framework = join(args[args.indexOf('-mountpoint') + 1], 'Sunrin Valley.app/Contents/Frameworks/Test.framework')
      await mkdir(join(framework, 'Versions/A'), { recursive: true }); await writeFile(join(framework, 'Versions/A/Binary'), 'framework')
      await symlink('A', join(framework, 'Versions/Current')); await symlink('Versions/Current/Binary', join(framework, 'Binary'))
    }
    return result
  }
  const prepared = await prepareLauncherUpdate({ ...f, command })
  const tx = JSON.parse(await readFile(join(prepared.transactionPath, 'transaction.json'), 'utf8'))
  const framework = join(tx.candidate, 'Contents/Frameworks/Test.framework')
  expect(await readlink(join(framework, 'Versions/Current'))).toBe('A')
  expect(await readlink(join(framework, 'Binary'))).toBe('Versions/Current/Binary')
  expect(await readFile(join(framework, 'Binary'), 'utf8')).toBe('framework')
  expect(f.calls.at(-1)?.[1][0]).toBe('detach')
})
