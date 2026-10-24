import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { clearLaunchSession, readLaunchSession, writeLaunchSession, chooseLaunchIdentity } from '../src/main/launch-session'
const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
it('keeps the original engine identity instead of a temporary IPC forwarding process', () => {
  const ids = ['1000:new-forwarder', '999:existing-engine']
  expect(chooseLaunchIdentity(ids, '999:existing-engine', 1000)).toBe('999:existing-engine')
  expect(chooseLaunchIdentity(ids, undefined, 999)).toBe('999:existing-engine')
  expect(chooseLaunchIdentity(ids, undefined, 777)).toBeUndefined()
})
it('restores only the matching engine session and stores no account or command data', async () => {
  const data = await mkdtemp(join(tmpdir(), 'sunrin-session-')); directories.push(data)
  expect(await readLaunchSession(data, ['42:start-a'])).toBeUndefined()
  await writeLaunchSession(data, '42:start-a', 'preparing')
  expect(await readLaunchSession(data, ['42:start-a'])).toEqual({ version: 1, identity: '42:start-a', stage: 'preparing' })
  expect(await readLaunchSession(data, ['42:start-b'])).toBeUndefined()
  expect(Object.keys(JSON.parse(await readFile(join(data, '.sunrin-launch.json'), 'utf8'))).sort()).toEqual(['identity', 'stage', 'version'])
  await clearLaunchSession(data)
  expect(await readLaunchSession(data, ['42:start-a'])).toBeUndefined()
})
it('ignores invalid or stale stage markers rather than trapping the launcher in preparation', async () => {
  const data = await mkdtemp(join(tmpdir(), 'sunrin-session-invalid-')); directories.push(data)
  const file = join(data, '.sunrin-launch.json')
  await writeFile(file, 'interrupted json')
  expect(await readLaunchSession(data, ['42:start-a'])).toBeUndefined()
  await writeFile(file, JSON.stringify({ version: 1, identity: '42:start-a', stage: 'unknown' }))
  expect(await readLaunchSession(data, ['42:start-a'])).toBeUndefined()
})
