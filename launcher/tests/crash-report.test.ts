import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { gameRoot } from '../src/main/instance'
import { readCurrentCrash } from '../src/main/crash-report'

const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
async function fixture() {
  const data = await mkdtemp(join(await realpath(tmpdir()), 'sunrin-crash-'))
  directories.push(data)
  return { data, reports: join(gameRoot(data), 'crash-reports'), startedAt: Date.now() - 1000 }
}
async function put(file: string, text: string, modified: number) {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, text)
  await utimes(file, new Date(modified), new Date(modified))
}
const crash = (message: string) => `---- Minecraft Crash Report ----\nDescription: Initializing game\njava.lang.IllegalStateException: ${message}\n\tat example.Game.load(Game.java:42)\nCaused by: java.lang.NoClassDefFoundError: example/mod/Missing\n\tat example.Mod.init(Mod.java:10)\n\tMod File: example.jar\n\tFailure message: Example has failed to load correctly\n\tMod Version: 1.2.3\n-- System Details --\nOS: secret-os-environment\nPlayer Count: private-player-list\nCommandline: java --accessToken private-token\n[CHAT] <Player> private-chat\n`

describe('current game crash capture', () => {
  it('uses the newest fresh regular report with only actionable exception and mod information', async () => {
    const { data, reports, startedAt } = await fixture()
    await put(join(reports, 'older.txt'), crash('older-error'), startedAt + 10)
    await put(join(reports, 'newest.txt'), crash('newest-error'), startedAt + 20)
    await put(join(reports, 'newest.json'), crash('wrong-extension'), startedAt + 30)
    await mkdir(join(reports, 'directory.txt'))
    const error = await readCurrentCrash(data, startedAt)
    expect(error).toBeInstanceOf(Error)
    for (const text of ['newest-error', 'Game.java:42', 'NoClassDefFoundError', 'Mod.java:10', 'Example has failed', '1.2.3']) expect(error!.message).toContain(text)
    for (const text of ['older-error', 'wrong-extension', 'secret-os-environment', 'private-player-list', 'private-token', 'private-chat']) expect(error!.message).not.toContain(text)
  })

  it('ignores missing and stale reports', async () => {
    const { data, reports, startedAt } = await fixture()
    expect(await readCurrentCrash(data, startedAt)).toBeUndefined()
    await put(join(reports, 'stale.txt'), crash('stale-error'), startedAt - 1)
    expect(await readCurrentCrash(data, startedAt)).toBeUndefined()
  })

  it('does not follow report-file or intermediate-directory symlinks', async () => {
    const { data, reports, startedAt } = await fixture()
    const external = await fixture()
    const outside = join(external.data, 'external.txt')
    await put(outside, crash('outside-private-error'), startedAt + 100)
    await mkdir(reports, { recursive: true })
    await symlink(outside, join(reports, 'linked.txt'))
    expect(await readCurrentCrash(data, startedAt)).toBeUndefined()
    await rm(reports, { recursive: true })
    await symlink(external.data, reports)
    expect(await readCurrentCrash(data, startedAt)).toBeUndefined()
  })

  it('rejects linked data roots and linked ancestors', async () => {
    const { data, reports, startedAt } = await fixture()
    await put(join(reports, 'crash.txt'), crash('must-not-read'), startedAt + 100)
    const host = await fixture()
    const linkedData = join(host.data, 'linked-data')
    await symlink(data, linkedData)
    expect(await readCurrentCrash(linkedData, startedAt)).toBeUndefined()
    const linkedParent = join(host.data, 'linked-parent')
    await symlink(dirname(data), linkedParent)
    expect(await readCurrentCrash(join(linkedParent, basename(data)), startedAt)).toBeUndefined()
  })

  it('bounds reads and output and sanitizes paths and authentication in exception messages', async () => {
    const { data, reports, startedAt } = await fixture()
    const text = `java.lang.RuntimeException: failed at ${data}/prism/accounts.json\nCaused by: java.lang.Exception: access_token=private-token\n${'\tat example.Game.load(Game.java:42)\n'.repeat(9000)}\nCaused by: java.lang.Exception: beyond-read-limit`
    await put(join(reports, 'huge.txt'), text, startedAt + 100)
    const error = await readCurrentCrash(data, startedAt)
    expect(error!.message.length).toBeLessThanOrEqual(12_288)
    for (const secret of [data, 'private-token', 'beyond-read-limit']) expect(error!.message).not.toContain(secret)
    expect(error!.message).toContain('RuntimeException')
  })
})

describe('current log fatal fallback', () => {
  it('ignores a normal exit and recoverable logged exceptions', async () => {
    const { data, startedAt } = await fixture()
    const log = join(gameRoot(data), 'logs', 'latest.log')
    await put(log, '[Render thread/INFO]: Stopping!\n[Worker/ERROR]: Optional texture failed\njava.io.IOException: optional resource missing\n', startedAt + 100)
    expect(await readCurrentCrash(data, startedAt)).toBeUndefined()
  })

  it('captures a fresh fatal exception when no crash report exists', async () => {
    const { data, startedAt } = await fixture()
    await put(join(gameRoot(data), 'logs', 'latest.log'), '[Render thread/FATAL]: Uncaught exception\njava.lang.LinkageError: missing-library\n\tat example.Game.start(Game.java:88)\n[Render thread/INFO]: [CHAT] private-chat\n', startedAt + 100)
    const error = await readCurrentCrash(data, startedAt)
    expect(error!.message).toContain('LinkageError: missing-library')
    expect(error!.message).toContain('Game.java:88')
    expect(error!.message).not.toContain('private-chat')
  })

  it('prefers a real crash report over a fatal latest log and ignores stale logs', async () => {
    const { data, reports, startedAt } = await fixture()
    const log = join(gameRoot(data), 'logs', 'latest.log')
    await put(log, '[main/FATAL]: Uncaught exception\njava.lang.Error: log-error\n', startedAt - 1)
    expect(await readCurrentCrash(data, startedAt)).toBeUndefined()
    await put(log, '[main/FATAL]: Uncaught exception\njava.lang.Error: log-error\n', startedAt + 200)
    await put(join(reports, 'crash.txt'), crash('report-error'), startedAt + 100)
    const error = await readCurrentCrash(data, startedAt)
    expect(error!.message).toContain('report-error')
    expect(error!.message).not.toContain('log-error')
  })
})

it('captures a JVM uncaught exception on the same line as its thread header', async () => {
  const { data, startedAt } = await fixture()
  await put(join(gameRoot(data), 'logs', 'latest.log'), 'Exception in thread "main" java.lang.UnsatisfiedLinkError: native-library-missing\n\tat example.Game.start(Game.java:44)\n', startedAt + 100)
  const error = await readCurrentCrash(data, startedAt)
  expect(error!.message).toContain('UnsatisfiedLinkError: native-library-missing')
})

it('finds fatal evidence at the end of a large current log without reading earlier chat', async () => {
  const { data, startedAt } = await fixture()
  await put(join(gameRoot(data), 'logs', 'latest.log'), '[INFO]: [CHAT] private-old-chat\n'.repeat(8000) + '[main/FATAL]: Uncaught exception\njava.lang.IllegalStateException: tail-error\n', startedAt + 100)
  const error = await readCurrentCrash(data, startedAt)
  expect(error!.message).toContain('tail-error')
  expect(error!.message).not.toContain('private-old-chat')
})

it('does not follow a linked latest log', async () => {
  const { data, startedAt } = await fixture()
  const outside = await fixture()
  const file = join(outside.data, 'fatal.log')
  await put(file, '[main/FATAL]: Uncaught exception\njava.lang.Error: outside-log\n', startedAt + 100)
  const logs = join(gameRoot(data), 'logs')
  await mkdir(logs, { recursive: true })
  await symlink(file, join(logs, 'latest.log'))
  expect(await readCurrentCrash(data, startedAt)).toBeUndefined()
})
