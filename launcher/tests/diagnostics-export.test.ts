import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { saveDiagnosticReport } from '../src/main/diagnostics-export'

vi.mock('node:fs/promises', async importOriginal => {
  const original = await importOriginal<typeof import('node:fs/promises')>()
  return { ...original, writeFile: vi.fn(original.writeFile) }
})
const directories: string[] = []
afterEach(async () => {
  vi.mocked(writeFile).mockReset()
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  vi.mocked(writeFile).mockImplementation(actual.writeFile)
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})
async function destination() {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-report-export-'))
  directories.push(root)
  return { root, file: join(root, 'diagnostic.txt') }
}

describe('atomic diagnostic report export', () => {
  it.each(['ENOSPC', 'EIO'])('preserves an existing destination byte-for-byte after a partial %s write and removes its temp file', async code => {
    const { root, file } = await destination()
    const original = Buffer.from([0, 1, 2, 255, 254, 17, 18, 19])
    await writeFile(file, original)
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
    vi.mocked(writeFile).mockImplementationOnce(async path => {
      await actual.writeFile(path, 'partially written report')
      throw Object.assign(new Error('simulated filesystem write failure'), { code })
    })
    await expect(saveDiagnosticReport(file, 'new sanitized report')).rejects.toMatchObject({ code })
    expect(await readFile(file)).toEqual(original)
    expect(await readdir(root)).toEqual(['diagnostic.txt'])
  })

  it('writes the provided sanitized representation verbatim as UTF-8 and replaces the previous report', async () => {
    const { root, file } = await destination()
    await writeFile(file, 'previous report')
    const details = 'Sunrin Valley diagnostic report\n오류 세부 정보 🔧\n[REDACTED]\n'
    await saveDiagnosticReport(file, details)
    expect(await readFile(file)).toEqual(Buffer.from(details, 'utf8'))
    expect(await readdir(root)).toEqual(['diagnostic.txt'])
  })

  it('uses private destination permissions on platforms with POSIX modes', async () => {
    if (process.platform === 'win32') return
    const { file } = await destination()
    await saveDiagnosticReport(file, 'sanitized report')
    expect((await stat(file)).mode & 0o777).toBe(0o600)
  })
})
