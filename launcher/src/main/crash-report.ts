import { constants } from 'node:fs'
import { lstat, open, readdir } from 'node:fs/promises'
import { join, parse, relative, resolve, sep } from 'node:path'
import { gameRoot } from './instance'
import { sanitizeDiagnosticText } from './diagnostics'

const MAX_READ = 128 * 1024
const MAX_MESSAGE = 12 * 1024
const MAX_LINE = 2048

/** Check every component, including the data root's ancestors, without following links. */
async function unlinkedStat(path: string, kind: 'file' | 'directory') {
  const absolute = resolve(path)
  let current = parse(absolute).root
  try {
    const parts = relative(current, absolute).split(sep).filter(Boolean)
    for (let index = 0; index < parts.length; index++) {
      current = join(current, parts[index])
      const stat = await lstat(current)
      if (stat.isSymbolicLink()) return undefined
      const final = index === parts.length - 1
      if (!final && !stat.isDirectory()) return undefined
      if (final) return (kind === 'file' ? stat.isFile() : stat.isDirectory()) ? stat : undefined
    }
  } catch { /* Crash inspection must not turn an ordinary exit into another failure. */ }
  return undefined
}

async function readBounded(path: string, startedAt: number, tail = false): Promise<string | undefined> {
  const before = await unlinkedStat(path, 'file')
  if (!before || before.mtimeMs < startedAt) return undefined
  try {
    const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    try {
      const opened = await handle.stat()
      if (!opened.isFile() || opened.mtimeMs < startedAt || opened.ino !== before.ino || opened.dev !== before.dev) return undefined
      // Recheck ancestors after opening, so a link swap during discovery is rejected.
      const checked = await unlinkedStat(path, 'file')
      if (!checked || checked.ino !== opened.ino || checked.dev !== opened.dev) return undefined
      const size = Math.min(MAX_READ, opened.size)
      const buffer = Buffer.alloc(size)
      const start = tail ? Math.max(0, opened.size - size) : 0
      const { bytesRead } = await handle.read(buffer, 0, size, start)
      let text = buffer.subarray(0, bytesRead).toString('utf8')
      if (start > 0) text = text.slice(text.indexOf('\n') + 1)
      return text
    } finally { await handle.close() }
  } catch { return undefined }
}

const exception = /^(?:(?:Caused by|Suppressed):\s*)?(?:[\w$]+\.)+[\w$]*(?:Exception|Error)(?:\b|:)/
const stack = /^(?:at\s+\S+\([^\n]*\)|\.\.\.\s+\d+\s+more)/
const modCause = /^(?:Description|Mod File|Mod Version|Mod ID|Failure message|Exception message):\s*\S/i
const privateLine = /\[CHAT\]|<[A-Za-z0-9_]{1,32}>\s|\b(?:command(?:line)?|program arguments|JVM flags|environment|system properties|player count|players?|server brands?|session id)\s*[:=]/i

function excerpt(text: string, dataPath: string, fromLog: boolean): string | undefined {
  const result: string[] = []
  let fatal = !fromLog
  let hasCause = false
  let length = 0
  for (const raw of text.split(/\r?\n/)) {
    if (privateLine.test(raw)) continue
    if (!fromLog && /^\s*--\s*(?:System Details|Server|Player|Affected level)/i.test(raw)) break
    const line = raw.slice(0, MAX_LINE).trim()
    // A regular ERROR or a recoverable exception is insufficient evidence of a crash.
    if (fromLog && /\/(?:FATAL)\]|Exception in thread\s+["']|(?:uncaught|unhandled) exception|encountered an unexpected exception|reported exception thrown/i.test(line)) fatal = true
    if (!fatal) continue
    // Logger prefixes can precede the actual exception in latest.log.
    const content = fromLog ? line.replace(/^(?:\[[^\]]*\]\s*)+:\s*/, '').replace(/^Exception in thread\s+["'][^"']+["']\s+/, '') : line
    const isException = exception.test(content) || /^(?:Caused by|Suppressed):\s+\S/.test(content)
    if (!isException && !stack.test(content) && !(modCause.test(content) && !fromLog)) continue
    hasCause ||= isException
    result.push(content)
    length += content.length + 1
    if (length >= MAX_MESSAGE) break
  }
  if (!result.length || (fromLog && !hasCause)) return undefined
  const heading = fromLog ? '게임 실행 중 치명적인 오류가 발생했습니다.' : '게임 충돌 보고서가 생성되었습니다.'
  const sanitized = sanitizeDiagnosticText(`${heading}\n${result.join('\n')}`, [dataPath])
  return sanitized.length > MAX_MESSAGE ? sanitized.slice(0, MAX_MESSAGE - 20) + '\n[Excerpt truncated]' : sanitized
}

/** Read only a fresh dedicated crash report, or explicit fatal evidence in the current log. */
export async function readCurrentCrash(dataPath: string, startedAt: number): Promise<Error | undefined> {
  if (!Number.isFinite(startedAt) || startedAt < 0) return undefined
  const reports = join(gameRoot(dataPath), 'crash-reports')
  let newest: { path: string; modified: number } | undefined
  if (await unlinkedStat(reports, 'directory')) {
    try {
      for (const entry of await readdir(reports, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.txt')) continue
        const path = join(reports, entry.name)
        const stat = await unlinkedStat(path, 'file')
        if (!stat || stat.mtimeMs < startedAt) continue
        if (!newest || stat.mtimeMs > newest.modified || (stat.mtimeMs === newest.modified && path > newest.path)) newest = { path, modified: stat.mtimeMs }
      }
    } catch { /* Missing/unreadable reports are optional diagnostic evidence. */ }
  }
  if (newest) {
    const text = await readBounded(newest.path, startedAt)
    const message = text === undefined ? undefined : excerpt(text, dataPath, false)
    if (message) return new Error(message)
  }
  const text = await readBounded(join(gameRoot(dataPath), 'logs', 'latest.log'), startedAt, true)
  const message = text === undefined ? undefined : excerpt(text, dataPath, true)
  return message ? new Error(message) : undefined
}
