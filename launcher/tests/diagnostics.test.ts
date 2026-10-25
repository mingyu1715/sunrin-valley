import { homedir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { createDiagnostic, sanitizeDiagnosticText, type DiagnosticContext } from '../src/main/diagnostics'

const context: DiagnosticContext = {
  launcherVersion: '1.0.0', installedVersion: '2026.10.1', operatingVersion: '2026.10.2',
  phase: 'installing', message: '설치 중 파일을 저장하지 못했습니다.',
  dataPath: '/private/launcher-data', appRoot: '/Applications/Sunrin Valley.app', memoryMb: 6144, freeBytes: 1024
}

describe('sanitized launcher diagnostics', () => {
  it('retains useful nested and aggregate error information with safe stacks and environment context', () => {
    const disk = Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' })
    disk.stack = 'Error: ENOSPC\n    at save (/Applications/Sunrin Valley.app/out/main.js:12:8)'
    const error = new AggregateError([new Error('download failed', { cause: disk }), new Error('checksum mismatch')], 'installation failed')
    const report = createDiagnostic(error, context)
    expect(report.id).toBeTruthy()
    expect(Number.isNaN(Date.parse(report.createdAt))).toBe(false)
    expect(report.summary).toMatch(/공간|디스크/)
    expect(report.summary.length).toBeLessThan(200)
    for (const expected of ['1.0.0', '2026.10.1', '2026.10.2', 'installing', '6144', '1024', 'installation failed', 'download failed', 'ENOSPC', 'checksum mismatch', 'main.js:12:8', process.platform, process.arch]) {
      expect(report.details).toContain(expected)
    }
    expect(report.details).not.toContain(context.appRoot)
    expect(report.details).not.toContain(context.dataPath)
  })

  it('redacts URL credentials, query strings, whole JWTs, labelled authentication and account values', () => {
    const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzZWNyZXQifQ.signature_secret'
    const input = [
      'download https://alice:password@cdn.example.com/pack.zip?token=url-secret#fragment-secret failed',
      `jwt ${jwt}`, 'Authorization: Bearer auth-secret', 'Cookie: session=cookie-secret',
      'access_token=access-secret refresh_token=refresh-secret', 'device_code: device-secret',
      'user_code: ABCD-EFGH', 'username: alice-secret', 'email=alice@example.com',
      'uuid=550e8400-e29b-41d4-a716-446655440000', 'profile 550e8400e29b41d4a716446655440000',
      'safe checksum mismatch'
    ].join('\n')
    const result = sanitizeDiagnosticText(input)
    expect(result).toContain('cdn.example.com/pack.zip')
    expect(result).toContain('safe checksum mismatch')
    for (const secret of ['alice', 'password', 'url-secret', 'fragment-secret', jwt, 'eyJzdWI', 'signature_secret', 'auth-secret', 'cookie-secret', 'access-secret', 'refresh-secret', 'device-secret', 'ABCD-EFGH', '550e8400']) {
      expect(result).not.toContain(secret)
    }
  })

  it('redacts supplied roots, home directories and game chat without losing diagnostic lines', () => {
    const text = [
      '/private/launcher-data/prism/instance.cfg', 'C:\\Users\\Alice\\AppData\\Sunrin\\cache.zip',
      '/Users/alice/Desktop/debug.log', '/home/bob/.minecraft', `${homedir()}/Library/runtime`,
      '/Applications/Sunrin Valley.app/out/main.js:20:3',
      '[12:00:00] [Render thread/INFO]: [CHAT] <Alice> private-chat-message',
      '[12:00:01] [Server thread/INFO]: <Bob> another-private-chat',
      'Error: checksum mismatch'
    ].join('\n')
    const result = sanitizeDiagnosticText(text, [context.dataPath, context.appRoot, 'C:\\Users\\Alice\\AppData\\Sunrin'])
    expect(result).toContain('main.js:20:3')
    expect(result).toContain('checksum mismatch')
    for (const secret of ['/private/launcher-data', '/Applications/Sunrin Valley.app', 'Alice', 'alice', 'bob', homedir(), 'private-chat-message', 'another-private-chat']) {
      expect(result).not.toContain(secret)
    }
  })
})

describe('bounded diagnostic error traversal', () => {
  it('limits output and traversal without serializing arbitrary object fields or invoking accessors', () => {
    const error = new Error('safe failure')
    Object.defineProperty(error, 'cause', { get: () => { throw new Error('getter must never run') } })
    Object.assign(error, { accounts: { token: 'private-account-data' }, stdout: 'private-log-data' })
    const report = createDiagnostic(error, { ...context, message: 'x'.repeat(200_000) })
    expect(report.details.length).toBeLessThanOrEqual(32_768)
    expect(report.details).toContain('safe failure')
    expect(report.details).not.toMatch(/private-account-data|private-log-data|getter must never run/)
  })

  it('handles cycles, very deep causes, broad aggregates and unknown thrown values', () => {
    const cyclic = new Error('cyclic error')
    Object.assign(cyclic, { cause: cyclic })
    expect(createDiagnostic(cyclic, context).details).toContain('cyclic error')
    let deep = new Error('bottom')
    for (let i = 0; i < 10_000; i++) deep = new Error(`level ${i}`, { cause: deep })
    const report = createDiagnostic(new AggregateError(Array(10_000).fill(deep), 'wide aggregate'), context)
    expect(report.details.length).toBeLessThanOrEqual(32_768)
    expect(report.details).toMatch(/limit|truncat|omitted/i)
    expect(createDiagnostic('plain thrown error', context).details).toContain('plain thrown error')
    expect(createDiagnostic({ arbitrarySecret: 'secret-value' }, context).details).not.toContain('secret-value')
    expect(createDiagnostic(null, context).summary).toBeTruthy()
  })
})

describe('diagnostic redaction boundaries', () => {
  it('removes command arguments and whitespace-separated secret labels even in stack headers', () => {
    const text = [
      'Error: Command failed: java -Xmx6G --username private-player --accessToken private-token',
      'spawn java --clientToken private-client-token',
      'device code: device-with-spaces', 'user code: ABCD EFGH',
      'xboxToken: private-xbox-token', 'identityToken=private-identity-token',
      '    at prepare (/safe/module.js:22:3)'
    ].join('\n')
    const result = sanitizeDiagnosticText(text)
    for (const secret of ['private-player', 'private-token', 'private-client-token', 'device-with-spaces', 'ABCD EFGH', 'private-xbox-token', 'private-identity-token']) {
      expect(result).not.toContain(secret)
    }
    expect(result).toContain('module.js:22:3')
  })

  it('sanitizes URL-encoded local paths and complete nonstandard JWTs', () => {
    const jwt = 'ewogICJhbGciOiAiUlMyNTYiCn0.eyJzdWIiOiJwcml2YXRlIn0.private_signature'
    const text = `https://cdn.example.com/Users/alice/private.zip?email=private@example.com\nfile:///Users/alice/private.log\n${encodeURI(context.appRoot)}/Contents/MacOS/main\n${jwt}`
    const result = sanitizeDiagnosticText(text, [context.appRoot])
    expect(result).not.toContain('alice')
    expect(result).not.toContain('Sunrin%20Valley')
    expect(result).not.toContain('private_signature')
  })

  it('never invokes a user-defined stack getter', () => {
    let reads = 0
    const error = new Error('safe structured error')
    Object.defineProperty(error, 'stack', { get: () => { reads++; return 'secret stack data' } })
    const report = createDiagnostic(error, context)
    expect(reads).toBe(0)
    expect(report.details).toContain('safe structured error')
    expect(report.details).not.toContain('secret stack data')
  })
})

describe('private values that resemble diagnostic fields', () => {
  it('redacts bare device codes and roots before secret-label processing can split a path', () => {
    const root = '/private/test token storage'
    const result = sanitizeDiagnosticText(`Sign in using ABCD-EFGH\nFailed at ${root}/config.json`, [root])
    expect(result).not.toContain('ABCD-EFGH')
    expect(result).not.toContain('/private/test')
    expect(result).toContain('[PATH]/config.json')
  })

  it('avoids invoking a custom error name accessor while obtaining a native stack', () => {
    let reads = 0
    const error = new Error('failure')
    Object.defineProperty(error, 'name', { get: () => { reads++; return 'private name' } })
    const report = createDiagnostic(error, context)
    expect(reads).toBe(0)
    expect(report.details).not.toContain('private name')
  })
})
