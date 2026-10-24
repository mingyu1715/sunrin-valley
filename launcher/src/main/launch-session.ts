import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { assertNoSymlinks, atomicWrite } from './files'

export type LaunchStage = 'authenticating' | 'preparing' | 'running'
export interface LaunchSession { version: 1; identity: string; stage: LaunchStage }
const stages: LaunchStage[] = ['authenticating', 'preparing', 'running']
const sessionPath = (data: string) => join(data, '.sunrin-launch.json')
export function chooseLaunchIdentity(identities: string[], existing?: string, childPid?: number): string | undefined {
  if (existing && identities.includes(existing)) return existing
  return childPid ? identities.find(identity => identity.startsWith(`${childPid}:`)) : undefined
}

export async function readLaunchSession(data: string, identities: string[]): Promise<LaunchSession | undefined> {
  await assertNoSymlinks(data, sessionPath(data))
  try {
    const value = JSON.parse(await readFile(sessionPath(data), 'utf8')) as LaunchSession
    if (value.version === 1 && typeof value.identity === 'string' && identities.includes(value.identity) && stages.includes(value.stage)) return value
  } catch (error: any) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error }
  return undefined
}
export async function writeLaunchSession(data: string, identity: string, stage: LaunchStage): Promise<void> {
  await assertNoSymlinks(data, sessionPath(data))
  await atomicWrite(sessionPath(data), JSON.stringify({ version: 1, identity, stage } satisfies LaunchSession))
}
export async function clearLaunchSession(data: string): Promise<void> {
  await assertNoSymlinks(data, sessionPath(data))
  await rm(sessionPath(data), { force: true })
}
