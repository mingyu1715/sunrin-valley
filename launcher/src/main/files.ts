import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, rm, lstat, writeFile, readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { once } from 'node:events'
import AdmZip from 'adm-zip'

export type FileHash = { algorithm: 'sha1' | 'sha256' | 'sha512'; value: string }
export async function claimDataDirectory(root: string): Promise<void> {
  await mkdir(root, { recursive: true })
  if ((await lstat(root)).isSymbolicLink()) throw new Error('연결 폴더 대신 별도의 설치 폴더를 선택해 주세요.')
  const marker = join(root, '.sunrin-valley.json')
  if (await exists(marker)) {
    const value = JSON.parse(await readFile(marker, 'utf8'))
    if (value.id !== 'sunrin-valley' || value.formatVersion !== 1) throw new Error('설치 폴더의 관리 정보가 올바르지 않습니다.')
    return
  }
  if ((await readdir(root)).some(name => name !== '.DS_Store')) throw new Error('처음 설치할 때는 비어 있는 새 폴더를 선택해 주세요. 기존 파일은 변경하지 않았습니다.')
  await atomicWrite(marker, JSON.stringify({ id: 'sunrin-valley', formatVersion: 1 }))
}

export function safeTarget(root: string, relative: string): string {
  if (!relative || relative.includes('\\') || relative.includes(':') || relative.includes('\0') || relative.startsWith('/') || relative.split('/').some(p => p === '..' || p === '.')) {
    throw new Error(`안전하지 않은 파일 경로: ${relative}`)
  }
  const target = resolve(root, relative)
  if (!target.startsWith(resolve(root) + sep)) throw new Error(`경로가 설치 폴더를 벗어납니다: ${relative}`)
  return target
}

export async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true } catch (error: any) { if (error.code === 'ENOENT') return false; throw error }
}

export async function hashFile(path: string, algorithm: FileHash['algorithm'] = 'sha256'): Promise<string> {
  const hash = createHash(algorithm)
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

export async function matchesHash(path: string, hash: FileHash): Promise<boolean> {
  return await exists(path) && await hashFile(path, hash.algorithm) === hash.value.toLowerCase()
}

export async function assertNoSymlinks(root: string, target: string): Promise<void> {
  let current = target
  while (true) {
    if (current !== resolve(root) && !current.startsWith(resolve(root) + sep)) throw new Error('설치 경로를 벗어났습니다.')
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`관리 파일 경로에 연결 파일이 있습니다: ${current}`) }
    catch (error: any) { if (error.code !== 'ENOENT') throw error }
    if (current === resolve(root)) break
    current = dirname(current)
  }
}

export async function atomicWrite(path: string, data: string | Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  try { await writeFile(temporary, data); await rename(temporary, path) }
  finally { await rm(temporary, { force: true }) }
}

export async function downloadVerified(url: string, target: string, hash: FileHash, options: { fetcher?: typeof fetch; retries?: number; progress?: (done: number, total: number) => void } = {}): Promise<void> {
  if (new URL(url).protocol !== 'https:') throw new Error('HTTPS 다운로드만 허용됩니다.')
  if (!['sha1', 'sha256', 'sha512'].includes(hash.algorithm) || !new RegExp(`^[a-f0-9]{${{ sha1: 40, sha256: 64, sha512: 128 }[hash.algorithm]}}$`, 'i').test(hash.value)) throw new Error('잘못된 검증 해시입니다.')
  if (await matchesHash(target, hash)) return
  await mkdir(dirname(target), { recursive: true })
  for (let attempt = 0; ; attempt++) {
    const temporary = `${target}.${randomUUID()}.part`
    let stream: ReturnType<typeof createWriteStream> | undefined
    try {
      const response = await (options.fetcher ?? fetch)(url, { signal: AbortSignal.timeout(180_000), headers: { 'User-Agent': 'SunrinValley/0.1.0' } })
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}: ${url}`)
      const digest = createHash(hash.algorithm)
      stream = createWriteStream(temporary, { flags: 'wx' })
      // Keep a rejection handler attached while the network stream is being read.
      const finished = new Promise<void>((ok, fail) => { stream!.once('finish', ok); stream!.once('error', fail) })
      finished.catch(() => {})
      let done = 0
      const total = Number(response.headers.get('content-length') ?? 0)
      for await (const chunk of response.body as any) {
        digest.update(chunk)
        if (!stream.write(chunk)) await once(stream, 'drain')
        done += chunk.length
        options.progress?.(done, total)
      }
      stream.end()
      await finished
      if (digest.digest('hex') !== hash.value.toLowerCase()) throw new Error(`파일 hash 검증 실패: ${url}`)
      await rename(temporary, target)
      return
    } catch (error) {
      stream?.destroy()
      await rm(temporary, { force: true })
      if (attempt >= (options.retries ?? 2)) throw error
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }
}

export async function extractZip(archive: string, destination: string, prefix = ''): Promise<string[]> {
  const paths: string[] = []
  const zip = new AdmZip(archive)
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !entry.entryName.startsWith(prefix)) continue
    const relative = entry.entryName.slice(prefix.length)
    const target = safeTarget(destination, relative)
    if (((entry.attr >>> 16) & 0xf000) === 0xa000) throw new Error(`ZIP 연결 파일은 허용되지 않습니다: ${relative}`)
    await assertNoSymlinks(destination, target)
    await atomicWrite(target, entry.getData())
    paths.push(relative)
  }
  return paths
}
