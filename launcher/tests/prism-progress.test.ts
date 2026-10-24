import { afterEach, expect, it } from 'vitest'
import { join } from 'node:path'
import { appendFile, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { PrismProgressDecoder, PrismLogTail, prismArguments } from '../src/main/prism-progress'
const temporary: string[] = []
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
it('observes only new fixed stages in the engine log without keeping a pipe that can kill the background engine', async () => {
  const data = await mkdtemp(join(tmpdir(), 'sunrin-tail-')); temporary.push(data)
  const file = join(data, 'prism-data/logs/PrismLauncher-0.log')
  await mkdir(join(data, 'prism-data/logs'), { recursive: true })
  await writeFile(file, 'AuthFlow: previous session\n')
  const stages: string[] = [], tail = new PrismLogTail(data, new PrismProgressDecoder(stage => stages.push(stage)), true)
  await tail.poll(); expect(stages).toEqual([])
  await appendFile(file, 'secret=never-forward-this\nDebug: x: downloading libraries\n')
  await tail.poll(); expect(stages).toEqual(['preparing'])
  await writeFile(file, 'AuthFlow: new session\n')
  await tail.poll(); expect(stages).toEqual(['preparing', 'authenticating'])
})
it('reads a newly created log and resets partial lines when the engine rotates its log', async () => {
  const data = await mkdtemp(join(tmpdir(), 'sunrin-tail-new-')); temporary.push(data)
  const file = join(data, 'prism-data/logs/PrismLauncher-0.log')
  const stages: string[] = [], tail = new PrismLogTail(data, new PrismProgressDecoder(stage => stages.push(stage)), true)
  await tail.poll()
  await mkdir(join(data, 'prism-data/logs'), { recursive: true })
  await writeFile(file, 'AuthFlow: new engine\nunfinished')
  await tail.poll(); expect(stages).toEqual(['authenticating'])
  await rename(file, `${file}.old`)
  await writeFile(file, 'Debug: x: downloading libraries\n')
  await tail.poll(); expect(stages).toEqual(['authenticating', 'preparing'])
})
it('requests a hidden normal launch and exposes the main window only for explicit account management', () => {
  expect(prismArguments('/sunrin', false)).toEqual(['--dir', join('/sunrin', 'prism-data'), '--launch', 'SunrinValley'])
  expect(prismArguments('/sunrin', true)).toEqual(['--dir', join('/sunrin', 'prism-data'), '--show-window'])
})
it('turns fragmented engine output into fixed stages without forwarding credentials or percentages', () => {
  const events: string[] = [], decoder = new PrismProgressDecoder(stage => events.push(stage))
  decoder.feed('\u001b[32mInfo: AuthFl')
  expect(events).toEqual([])
  decoder.feed('ow: validating user secret=value\u001b[0m\r\n')
  decoder.feed('Info: AuthFlow: another step\n')
  decoder.feed('Debug: example: downloading libraries\n')
  decoder.feed('Debug: Starting asset index download for 5\n')
  decoder.feed('access_token=must-never-be-emitted\n')
  expect(events).toEqual(['authenticating', 'preparing'])
})
it('ignores arbitrary long output and resumes only at the next complete line', () => {
  const events: string[] = [], decoder = new PrismProgressDecoder(stage => events.push(stage))
  decoder.feed('X'.repeat(20000)); decoder.feed('AuthFlow: not a fresh line\n')
  expect(events).toEqual([])
  decoder.feed('First layer of Xbox auth commencing.\n')
  expect(events).toEqual(['authenticating'])
})
