import { randomUUID } from 'node:crypto'
import { homedir, release } from 'node:os'
import type { DiagnosticReport } from '../shared'

export interface DiagnosticContext {
  launcherVersion: string
  installedVersion?: string
  operatingVersion?: string
  phase: string
  message: string
  dataPath: string
  appRoot: string
  memoryMb: number
  freeBytes?: number
}

const MAX_INPUT = 65_536
const MAX_REPORT = 32_768
const MAX_ERRORS = 32
const MAX_DEPTH = 8
const REDACTED = '[REDACTED]'
// Node 24 exposes Error.stack through one built-in getter. Accept that getter
// only; user-supplied accessors must never run during error reporting.
const nativeStackGetter = Object.getOwnPropertyDescriptor(new Error(), 'stack')?.get

function escaped(text: string): string { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/** Operates only on supplied text; never opens logs, profiles or account caches. */
export function sanitizeDiagnosticText(text: string, roots: string[] = []): string {
  const truncated = text.length > MAX_INPUT
  let result = text.slice(0, MAX_INPUT).replace(/\r\n?/g, '\n')
  result = result.split('\n').map(line => {
    if (/\[CHAT\]|(?:^|[\s:])<[A-Za-z0-9_]{1,32}>\s|(?:^|\]\s*)\[[^\]]+\s->\s[^\]]+\]/i.test(line)) return '[GAME CHAT REDACTED]'
    if (/\bcommand(?:line| failed)?\s*[:=]|^\s*(?:Error:\s*)?(?:spawn|exec(?:File)?)\b|^\s*(?:args?|spawnargs|stdout|stderr)\s*[:=]|--(?:[\w-]*token|username|password)(?:[=\s])/i.test(line)) return '[COMMAND OR LOG REDACTED]'
    return line
  }).join('\n')
  // Drop complete userinfo, queries and fragments, including signed download URLs.
  result = result.replace(/\bhttps?:\/\/[^\s<>"']+/gi, raw => {
    try {
      const url = new URL(raw)
      const authentication = /(?:login|oauth|auth|device|token|callback|verify|code)/i.test(`${url.hostname}${url.pathname}`)
      return `${url.protocol}//${url.host}${authentication ? '/[AUTH URL REDACTED]' : url.pathname}`
    } catch { return '[URL REDACTED]' }
  })
  // Longest roots first; accept either separator even in cross-platform reports.
  const rawRoots = [...roots, homedir()]
  const encodedRoots = rawRoots.flatMap(root => {
    try { return [encodeURI(root)] } catch { return [] }
  })
  const knownRoots = [...rawRoots, ...encodedRoots].filter(root => root.length > 1 && root.length <= 4096).sort((a, b) => b.length - a.length)
  for (const root of knownRoots) {
    const pattern = root.replace(/[\\/]+$/, '').split(/[\\/]/).map(escaped).join('[\\\\/]')
    result = result.replace(new RegExp(pattern, 'gi'), '[PATH]')
  }
  // Include partial JWTs at the input boundary so no payload/signature survives.
  result = result.replace(/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g, REDACTED)
    .replace(/\beyJ[A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]*){0,2}/g, REDACTED)
  // A labelled secret can contain spaces or several other labelled values: remove
  // the whole remaining line instead of guessing where its value ends.
  result = result.replace(/(?:["']?\b(?:authorization|proxy-authorization|cookie|set-cookie|[A-Za-z0-9_-]*token|device[ _-]?code|user[ _-]?code|client[ _-]?secret|password|passwd|secret|username|user[_-]?name|email|uuid)["']?\s*(?:[:=]\s*|\s+))[^\n]*/gi, REDACTED)
    .replace(/\bBearer\s+[^\s,;]+/gi, REDACTED)
    .replace(/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/g, REDACTED)
    .replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\b[0-9a-f]{32}\b/gi, REDACTED)
  result = result.replace(/(?:[A-Z]:[\\/]Users[\\/]|\/Users\/|\/home\/)[^\s\\/]+/gi, '[HOME]')
    .replace(/\bfile:\/\/[^\s)]+/gi, '[FILE PATH REDACTED]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  return result + (truncated ? '\n[Input truncated]' : '')
}

function safeNativeStack(value: object): unknown {
  // V8 formats a lazy stack by reading name/message, which could themselves be
  // accessors or objects with a custom toString. Inspect descriptors first.
  for (const key of ['name', 'message']) {
    let current: object | null = value
    let depth = 0
    while (current && depth++ < 8) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key)
      if (descriptor) {
        if (!('value' in descriptor) || (descriptor.value !== undefined && typeof descriptor.value !== 'string')) return undefined
        break
      }
      current = Object.getPrototypeOf(current)
    }
    if (current && depth > 8) return undefined
  }
  return nativeStackGetter?.call(value)
}

function ownValue(value: object, key: string): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor && 'value' in descriptor) return descriptor.value
    if (key === 'stack' && nativeStackGetter && descriptor?.get === nativeStackGetter) return safeNativeStack(value)
    return undefined
  } catch { return undefined }
}

function scalar(value: unknown, limit = 2048): string {
  if (typeof value === 'string') return value.slice(0, limit)
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  return ''
}

/** Capture a bounded whitelist of structured error fields, never arbitrary data. */
export function createDiagnostic(error: unknown, context: DiagnosticContext): DiagnosticReport {
  const createdAt = new Date().toISOString()
  const id = randomUUID()
  const lines = [
    'Sunrin Valley diagnostic report', `Created: ${createdAt}`, `Report: ${id}`,
    `OS: ${process.platform} ${release()}`, `Architecture: ${process.arch}`,
    `Launcher version: ${scalar(context.launcherVersion)}`,
    `Installed version: ${scalar(context.installedVersion) || 'unknown'}`,
    `Operating version: ${scalar(context.operatingVersion) || 'unknown'}`,
    `Phase: ${scalar(context.phase)}`, `Message: ${scalar(context.message, 1024)}`,
    `Memory MB: ${scalar(context.memoryMb)}`, `Free bytes: ${scalar(context.freeBytes) || 'unknown'}`,
    '', 'Errors:'
  ]
  const seen = new WeakSet<object>()
  let count = 0
  let noSpace = false
  const visit = (value: unknown, label: string, depth: number): void => {
    if (count >= MAX_ERRORS || depth > MAX_DEPTH) { lines.push('[Error traversal limit reached]'); return }
    count++
    if (typeof value !== 'object' || value === null) {
      const message = scalar(value)
      noSpace ||= /\bENOSPC\b/i.test(message)
      lines.push(`${label}: ${message || 'Unknown error'}`)
      return
    }
    if (seen.has(value)) { lines.push(`${label}: [Repeated or cyclic error omitted]`); return }
    seen.add(value)
    const name = scalar(ownValue(value, 'name'), 128) || 'Error'
    const message = scalar(ownValue(value, 'message'))
    const code = scalar(ownValue(value, 'code'), 128)
    noSpace ||= /\bENOSPC\b/i.test(`${code} ${message}`)
    lines.push(`${label}: ${name}${code ? ` (${code})` : ''}${message ? `: ${message}` : ''}`)
    const stack = scalar(ownValue(value, 'stack'), 4096)
    if (stack) lines.push(stack)
    const cause = ownValue(value, 'cause')
    if (cause !== undefined) visit(cause, `${label}.cause`, depth + 1)
    const errors = ownValue(value, 'errors')
    if (Array.isArray(errors)) {
      const length = ownValue(errors, 'length')
      if (typeof length === 'number') {
        const available = Math.min(length, MAX_ERRORS - count)
        for (let i = 0; i < available; i++) visit(ownValue(errors, String(i)), `${label}.errors[${i}]`, depth + 1)
        if (length > available) lines.push('[Aggregate errors omitted at traversal limit]')
      }
    }
  }
  visit(error, 'Error', 0)
  const roots = [context.dataPath, context.appRoot]
  let details = sanitizeDiagnosticText(lines.join('\n'), roots)
  if (details.length > MAX_REPORT) details = details.slice(0, MAX_REPORT - 20) + '\n[Report truncated]'
  const summary = noSpace
    ? '디스크 공간이 부족합니다. 저장 공간을 확보한 뒤 다시 시도해 주세요.'
    : '작업을 완료하지 못했습니다. 오류 세부 정보를 확인하고 다시 시도해 주세요.'
  return { id, createdAt, summary, details }
}
