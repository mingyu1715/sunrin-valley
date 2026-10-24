import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { chmod, mkdir, readFile, readdir, rename, rm } from 'node:fs/promises'
import { dirname, join, posix } from 'node:path'
import { randomUUID } from 'node:crypto'
import AdmZip from 'adm-zip'
import { assertNoSymlinks, atomicWrite, claimDataDirectory, downloadVerified, exists, extractZip, safeTarget } from './files'
import type { Progress, RuntimePaths } from './pack-types'

const execute = promisify(execFile)
export interface PrismDistribution { url: string; sha256: string; filename: string; executable: string }

async function findJava(root: string): Promise<string | undefined> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const directory = join(root, entry.name)
    for (const relative of ['bin/java', 'Contents/Home/bin/java', 'bin/java.exe']) {
      if (await exists(join(directory, relative))) return join(directory, relative)
    }
    const deeper = await findJava(directory)
    if (deeper) return deeper
  }
  return undefined
}

export async function ensureJava(data: string, progress: Progress): Promise<string> {
  await claimDataDirectory(data)
  const platform = process.platform, arch = process.arch
  if (!(platform === 'darwin' && arch === 'arm64') && !(platform === 'win32' && arch === 'x64')) throw new Error('Windows x64 또는 macOS Apple Silicon에서 실행해 주세요.')
  const home = join(data, 'runtime', 'java17'), receipt = join(home, 'runtime.json')
  await assertNoSymlinks(data, home)
  if (await exists(receipt)) {
    try {
      const saved = JSON.parse(await readFile(receipt, 'utf8'))
      const java = safeTarget(home, saved.executable)
      const version = await execute(java, ['-version'], { timeout: 15000, windowsHide: true })
      if (/version "17\./.test(version.stderr + version.stdout)) return java
    } catch { /* A damaged runtime is reinstalled from the vendor. */ }
  }
  progress('Java 17 준비 중', null)
  const api = `https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=${arch === 'arm64' ? 'aarch64' : 'x64'}&image_type=jre&os=${platform === 'darwin' ? 'mac' : 'windows'}&vendor=eclipse`
  const response = await fetch(api, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Java 배포 조회 실패: HTTP ${response.status}`)
  const assets = await response.json() as any[]
  const pkg = assets[0]?.binary?.package
  if (!pkg?.link || !pkg?.checksum || !pkg?.name) throw new Error('Java 17 배포 파일을 찾지 못했습니다.')
  const archive = safeTarget(join(data, 'cache'), pkg.name)
  await assertNoSymlinks(data, archive)
  await downloadVerified(pkg.link, archive, { algorithm: 'sha256', value: pkg.checksum })
  const staging = join(data, 'runtime', `java17-${randomUUID()}`)
  await mkdir(staging, { recursive: true })
  try {
    if (pkg.name.endsWith('.zip')) await extractZip(archive, staging)
    else {
      const listing = await execute('/usr/bin/tar', ['-tzf', archive], { maxBuffer: 16 * 1024 * 1024 })
      for (const name of listing.stdout.trim().split('\n')) safeTarget(staging, name.replace(/\/$/, ''))
      await execute('/usr/bin/tar', ['-xzf', archive, '-C', staging], { maxBuffer: 16 * 1024 * 1024 })
    }
    const executable = await findJava(staging)
    if (!executable) throw new Error('설치한 Java 실행 파일을 찾지 못했습니다.')
    await chmod(executable, 0o755)
    const check = await execute(executable, ['-version'], { timeout: 15000, windowsHide: true })
    if (!/version "17\./.test(check.stderr + check.stdout)) throw new Error('Java 17 실행 검증에 실패했습니다.')
    const relative = executable.slice(staging.length + 1).replaceAll('\\', '/')
    await atomicWrite(join(staging, 'runtime.json'), JSON.stringify({ executable: relative, source: pkg.link, sha256: pkg.checksum }))
    await rm(home, { recursive: true, force: true }); await rename(staging, home)
    return safeTarget(home, relative)
  } finally { await rm(staging, { recursive: true, force: true }) }
}

export async function ensurePrism(data: string, manifestPath: string, progress: Progress, options: { force?: boolean } = {}): Promise<string> {
  await claimDataDirectory(data)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const distribution: PrismDistribution = manifest.platforms[`${process.platform}-${process.arch}`]
  if (!distribution) throw new Error('이 컴퓨터용 Prism 배포 파일이 없습니다.')
  const home = join(data, 'runtime', `Prism-${manifest.version}`)
  await assertNoSymlinks(data, home)
  const binary = safeTarget(home, distribution.executable)
  if (!options.force && await exists(binary) && await exists(join(home, '.sunrin-complete')) && (await readFile(join(home, '.sunrin-complete'), 'utf8')) === distribution.sha256) return binary
  progress('Prism 실행 환경 준비 중', null)
  const archive = safeTarget(join(data, 'cache'), distribution.filename)
  await assertNoSymlinks(data, archive)
  await downloadVerified(distribution.url, archive, { algorithm: 'sha256', value: distribution.sha256 })
  const staging = `${home}-${randomUUID()}`
  await mkdir(staging, { recursive: true })
  try {
    if (process.platform === 'darwin') {
      // ditto preserves the official app bundle's framework links and executable modes.
      for (const entry of new AdmZip(archive).getEntries()) {
        const relative = entry.entryName.replace(/\/$/, '')
        safeTarget(staging, relative)
        if (((entry.attr >>> 16) & 0xf000) === 0xa000) {
          const link = entry.getData().toString('utf8')
          if (link.startsWith('/')) throw new Error('Prism ZIP에 절대 경로 연결이 있습니다.')
          safeTarget(staging, posix.normalize(posix.join(posix.dirname(relative), link)))
        }
      }
      await execute('/usr/bin/ditto', ['-x', '-k', archive, staging])
    } else await extractZip(archive, staging)
    if (!await exists(safeTarget(staging, distribution.executable))) throw new Error('Prism 실행 파일을 찾지 못했습니다.')
    await atomicWrite(join(staging, '.sunrin-complete'), distribution.sha256)
    await rm(home, { recursive: true, force: true }); await rename(staging, home)
    return binary
  } finally { await rm(staging, { recursive: true, force: true }) }
}

export async function ensureRuntimes(data: string, prismManifest: string, progress: Progress): Promise<RuntimePaths> {
  const java = await ensureJava(data, progress)
  const prism = await ensurePrism(data, prismManifest, progress, { force: true })
  return { java, prism }
}
