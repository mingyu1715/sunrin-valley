/** Run from launcher with: npx tsx scripts/verify-mac-updater.ts [--rollback]
 * Uses only disposable copies and explicitly isolated fake profiles. Build both versions first.
 */
import assert from 'node:assert/strict'
import { spawn, execFile } from 'node:child_process'
import { once } from 'node:events'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { build } from 'esbuild'
import { prepareLauncherUpdate, launchLauncherUpdate } from '../src/main/launcher-update-install'
import type { LauncherUpdateInfo } from '../src/shared'

const command = promisify(execFile)
const pause = (ms: number) => new Promise(resolvePause => setTimeout(resolvePause, ms))
const repo = resolve(__dirname, '../..')
const bridgeSource = join(repo, 'release/1.1.0/mac-arm64/Sunrin Valley.app')
const dmgSource = join(repo, 'release/1.1.1/Sunrin-Valley-1.1.1-mac-arm64.dmg')
const args = new Set(process.argv.slice(2))
async function digest(file: string) {
  const hash = createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest('hex')
}
async function waitJson(file: string, timeoutMs: number): Promise<Record<string, any>> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try { return JSON.parse(await readFile(file, 'utf8')) as Record<string, any> } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error }
    await pause(200)
  }
  throw new Error(`Timed out waiting for ${file}`)
}
async function processExecutable(pid: number) {
  try { return (await command('/bin/ps', ['-ww', '-p', String(pid), '-o', 'comm='])).stdout.trim() } catch (error) { if ((error as { code?: number }).code === 1) return ''; throw error }
}
async function stopOwned(pid: number, executablePath: string) {
  if (!Number.isSafeInteger(pid) || pid < 2 || pid === process.pid) throw new Error('Invalid owned launcher PID')
  const actual = await processExecutable(pid)
  if (!actual) return
  assert.equal(actual, executablePath, 'Refusing to stop a process outside the disposable app')
  process.kill(pid, 'SIGTERM')
  for (let i = 0; i < 50; i++) { if (!await processExecutable(pid)) return; await pause(100) }
  assert.equal(await processExecutable(pid), executablePath, 'Process identity changed during shutdown')
  process.kill(pid, 'SIGKILL')
}
async function fixture(base: string, name: string) {
  const root = join(base, name), game = join(base, `${name}-game`), vanilla = join(base, `${name}-vanilla`)
  await Promise.all([mkdir(root), mkdir(join(game, 'worlds/Fake World'), { recursive: true }), mkdir(join(game, 'prism'), { recursive: true }), mkdir(vanilla)])
  await writeFile(join(root, '.sunrin-launcher.json'), JSON.stringify({ id: 'sunrin-valley-launcher', formatVersion: 1 }))
  const sentinels = new Map<string, Buffer>([
    [join(root, 'settings.json'), Buffer.from(JSON.stringify({ dataPath: game, minecraftPath: vanilla, memoryMb: 4096, importOptions: false, shareShaders: false }, null, 2))],
    [join(game, 'worlds/Fake World/level.dat'), Buffer.from('FAKE WORLD SENTINEL\u0000\u00ff\n')],
    [join(game, 'options.txt'), Buffer.from('lang:ko_kr\ngamma:0.75\n')],
    [join(game, 'prism/accounts.json'), Buffer.from('{"fakeOnly":true,"accounts":[{"type":"test","token":"not-a-real-token"}]}\n')]
  ])
  for (const [file, bytes] of sentinels) await writeFile(file, bytes)
  return { root, game, sentinels }
}
async function verifySentinels(sentinels: Map<string, Buffer>) {
  for (const [file, expected] of sentinels) assert.deepEqual(await readFile(file), expected, `Protected fixture changed: ${file}`)
}
async function absent(file: string) { await assert.rejects(access(file), (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT') }
async function appVersion(appPath: string) { return (await command('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', join(appPath, 'Contents/Info.plist')])).stdout.trim() }
async function runTrial(base: string, mode: 'healthy' | 'rollback', sha256: string, size: number) {
  const area = join(base, mode); await mkdir(area)
  const appPath = join(area, 'Sunrin Valley.app'), executablePath = join(appPath, 'Contents/MacOS/Sunrin Valley')
  await cp(bridgeSource, appPath, { recursive: true, dereference: false, verbatimSymlinks: true, errorOnExist: true, force: false })
  assert.equal(await appVersion(appPath), '1.1.0')
  const profile = await fixture(area, 'profile'), mismatched = mode === 'rollback' ? await fixture(area, 'wrong-profile') : profile
  const downloads = join(profile.root, 'launcher-updates/downloads'); await mkdir(downloads, { recursive: true })
  const assetPath = join(downloads, 'Sunrin-Valley-1.1.1-mac-arm64.dmg'); await cp(dmgSource, assetPath)
  const info: LauncherUpdateInfo = { version: '1.1.1', changes: [], asset: { kind: 'dmg', url: 'https://github.com/mingyu1715/sunrin-valley/releases/download/launcher-1.1.1/Sunrin-Valley-1.1.1-mac-arm64.dmg', sha256, size } }
  // Stage inside the bridge's actual Electron runtime: plain Node cannot reproduce ASAR fs wrapping.
  const stagingInput = join(area, 'staging-input.json'), stagingResult = join(area, 'staging-result.json')
  await writeFile(stagingInput, JSON.stringify({ assetPath, info, root: profile.root, appPath, executablePath, currentVersion: '1.1.0', protectedDataPath: profile.game }))
  await command(executablePath, [join(base, 'stage.cjs'), join(base, 'staging-module.cjs'), stagingInput, stagingResult], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } })
  const staged = JSON.parse(await readFile(stagingResult, 'utf8'))
  const prepared: Awaited<ReturnType<typeof prepareLauncherUpdate>> = { ...staged, helperEnv: { ...process.env, ELECTRON_RUN_AS_NODE: '1', SUNRIN_APP_DATA: mismatched.root } }
  const transaction = JSON.parse(await readFile(join(prepared.transactionPath, 'transaction.json'), 'utf8'))
  const parent = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  await once(parent, 'spawn'); assert.ok(parent.pid)
  try {
    await launchLauncherUpdate(prepared, parent.pid)
    const ready = await waitJson(join(prepared.transactionPath, 'helper-ready.json'), 1000)
    assert.equal(ready.parentPid, parent.pid); assert.equal(ready.id, prepared.id)
    parent.kill('SIGTERM'); await once(parent, 'exit')
    if (mode === 'healthy') {
      const health = await waitJson(join(prepared.transactionPath, 'healthy.json'), 110000)
      assert.equal(health.nonce, prepared.id); assert.equal(health.version, '1.1.1'); assert.equal(health.executablePath, executablePath)
      try {
        const result = await waitJson(join(prepared.transactionPath, 'result.json'), 30000)
        assert.equal(result.status, 'healthy'); assert.equal(result.cleanupPending, false)
        assert.equal(await appVersion(appPath), '1.1.1')
        await absent(transaction.candidate); await absent(transaction.backup); await absent(assetPath)
        await verifySentinels(profile.sentinels)
        console.log(JSON.stringify({ mode, status: 'passed', version: '1.1.1', rendererIpcAcknowledged: true, cleanup: 'complete', sentinels: 'byte-identical', transactionPath: prepared.transactionPath }))
      } finally { await stopOwned(health.pid, executablePath) }
    } else {
      const result = await waitJson(join(prepared.transactionPath, 'result.json'), 125000)
      assert.equal(result.status, 'rolled-back'); assert.equal(await appVersion(appPath), '1.1.0')
      await absent(join(prepared.transactionPath, 'healthy.json')); await access(assetPath); await access(transaction.candidate)
      await verifySentinels(profile.sentinels); await verifySentinels(mismatched.sentinels)
      // The helper restarts only this unique disposable path after restoring it.
      const processes = (await command('/bin/ps', ['-ww', '-axo', 'pid=,comm='])).stdout.split('\n')
      for (const line of processes) { const match = line.match(/^\s*(\d+)\s+(.+)$/); if (match?.[2] === executablePath) await stopOwned(Number(match[1]), executablePath) }
      console.log(JSON.stringify({ mode, status: 'passed', version: '1.1.0', missingHealth: 'rolled-back', sentinels: 'byte-identical', transactionPath: prepared.transactionPath }))
    }
  } finally { if (parent.exitCode === null && parent.signalCode === null) parent.kill('SIGTERM') }
}
async function main() {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Run this integration check on Apple Silicon macOS')
  if ([...args].some(arg => arg !== '--rollback')) throw new Error('Only --rollback is supported')
  await Promise.all([access(bridgeSource), access(dmgSource)])
  assert.equal(await appVersion(bridgeSource), '1.1.0')
  const workspace = join(repo, '.work/self-update'); await mkdir(workspace, { recursive: true })
  const base = await mkdtemp(join(await realpath(workspace), 'native-mac-updater-'))
  console.log(`Disposable integration directory: ${base}`)
  try {
    await build({ entryPoints: [join(repo, 'launcher/src/main/launcher-update-install.ts')], outfile: join(base, 'staging-module.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['original-fs'], logLevel: 'silent' })
    await writeFile(join(base, 'stage.cjs'), `const fs = require('original-fs'), path = require('node:path'); const input = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); process.resourcesPath = path.join(input.appPath, 'Contents/Resources'); require(process.argv[2]).prepareLauncherUpdate(input).then(({helperEnv, ...result}) => fs.writeFileSync(process.argv[4], JSON.stringify(result), {mode:0o600})).catch(error => { console.error(error); process.exitCode=1; });`)
    const sha256 = await digest(dmgSource), size = (await lstat(dmgSource)).size
    await runTrial(base, 'healthy', sha256, size)
    if (args.has('--rollback')) await runTrial(base, 'rollback', sha256, size)
    await rm(base, { recursive: true })
  } catch (error) { console.error(`Integration evidence retained at ${base}`); throw error }
}
void main().catch(error => { console.error(error); process.exitCode = 1 })
