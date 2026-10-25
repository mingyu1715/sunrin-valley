import { lstat, readdir, readFile, realpath, rm, rmdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path'

function absolutePath(path: string): string {
  if (!path || !isAbsolute(path) || /[\r\n\0]/.test(path)) throw new Error('삭제할 폴더의 절대 경로를 확인해 주세요.')
  return resolve(path)
}

function contains(parent: string, child: string): boolean {
  // Be conservative on commonly case-insensitive filesystems, including a
  // missing protected folder whose spelling cannot be canonicalized yet.
  const normalize = (value: string) => process.platform === 'linux' ? value : value.toLowerCase()
  const difference = relative(normalize(parent), normalize(child))
  return !difference || (!difference.startsWith(`..${sep}`) && difference !== '..' && !isAbsolute(difference))
}

async function statOrMissing(path: string) {
  try { return await lstat(path) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
}

async function assertUnlinkedPath(path: string): Promise<void> {
  // Walk from the filesystem root so even an intermediate directory is never
  // traversed before we have checked that it is not a symbolic link/junction.
  const paths: string[] = []
  for (let current = path; ; current = dirname(current)) {
    paths.push(current)
    if (current === dirname(current)) break
  }
  for (const current of paths.reverse()) {
    const info = await statOrMissing(current)
    if (!info) return
    if (info.isSymbolicLink()) throw new Error('연결된 폴더는 안전하게 삭제할 수 없습니다. 설치 경로를 확인해 주세요.')
    if (!info.isDirectory()) throw new Error('삭제할 설치 경로가 폴더가 아닙니다.')
  }
}

async function canonicalPath(path: string): Promise<string> {
  // Protected paths may not exist yet; canonicalize their existing prefix so
  // an alias of an existing Minecraft/app root remains protected too.
  try { return await realpath(path) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const parent = dirname(path)
    if (parent === path) throw error
    return join(await canonicalPath(parent), relative(parent, path))
  }
}

async function inspectLauncherState(appRoot: string, minecraftPath: string) {
  const root = absolutePath(appRoot), minecraft = minecraftPath ? absolutePath(minecraftPath) : undefined
  const home = absolutePath(homedir())
  const validatePaths = (protectedHome: string, protectedMinecraft?: string) => {
    if (root === parse(root).root || contains(root, protectedHome) ||
        (protectedMinecraft && (contains(root, protectedMinecraft) || contains(protectedMinecraft, root)))) {
      throw new Error('기존 Minecraft 또는 사용자 폴더를 보호하기 위해 런처 데이터 삭제를 중단했습니다.')
    }
  }
  validatePaths(home, minecraft)
  await assertUnlinkedPath(root)
  validatePaths(await canonicalPath(home), minecraft ? await canonicalPath(minecraft) : undefined)
  const original = await statOrMissing(root)
  if (!original) return undefined
  const marker = join(root, '.sunrin-launcher.json')
  const markerInfo = await statOrMissing(marker)
  if (!markerInfo?.isFile() || markerInfo.isSymbolicLink() || markerInfo.size > 4096) {
    throw new Error('선린밸리 런처 전용 폴더인지 확인할 수 없어 삭제하지 않았습니다.')
  }
  let owner: unknown
  try { owner = JSON.parse(await readFile(marker, 'utf8')) }
  catch { throw new Error('런처 폴더의 관리 정보가 올바르지 않아 삭제하지 않았습니다.') }
  if (!owner || typeof owner !== 'object' || (owner as Record<string, unknown>).id !== 'sunrin-valley-launcher' ||
      (owner as Record<string, unknown>).formatVersion !== 1) throw new Error('선린밸리 런처 전용 폴더인지 확인할 수 없어 삭제하지 않았습니다.')
  return { root, original, markerInfo }
}

/** Check all launcher-root protections before any game or launcher removal. */
export async function validateLauncherStateRemoval(appRoot: string, minecraftPath: string): Promise<void> {
  await inspectLauncherState(appRoot, minecraftPath)
}

/** Delete the complete marked userData tree, including Electron-managed caches. */
export async function removeLauncherState(appRoot: string, minecraftPath: string): Promise<void> {
  const original = await inspectLauncherState(appRoot, minecraftPath)
  if (!original) return
  // Repeat ownership/path checks immediately before rm, after the reusable
  // preflight may have been separated from deletion by game data cleanup.
  const current = await inspectLauncherState(appRoot, minecraftPath)
  if (!current || current.original.dev !== original.original.dev || current.original.ino !== original.original.ino ||
      current.markerInfo.dev !== original.markerInfo.dev || current.markerInfo.ino !== original.markerInfo.ino) {
    throw new Error('삭제 준비 중 런처 폴더가 변경되어 중단했습니다.')
  }
  await rm(current.root, { recursive: true, force: false })
}

/** Remove only a validated, dedicated Sunrin data tree. Never remove appRoot. */
export async function removeSunrinData(dataPath: string, minecraftPath: string, appRoot: string): Promise<void> {
  const data = absolutePath(dataPath), application = absolutePath(appRoot)
  const minecraft = minecraftPath ? absolutePath(minecraftPath) : undefined
  const home = absolutePath(homedir())
  const protectedPaths = [application, home, ...(minecraft ? [minecraft] : [])]
  const validate = (targets: string[]) => {
    if (data === parse(data).root || targets.some(target => contains(data, target)) ||
        (minecraft && contains(minecraft, data))) throw new Error('기존 Minecraft 또는 런처 폴더를 보호하기 위해 삭제를 중단했습니다.')
  }
  validate(protectedPaths)
  await assertUnlinkedPath(data)
  const canonical = await Promise.all(protectedPaths.map(canonicalPath))
  validate(canonical)
  if (minecraft && contains(canonical[2], data)) throw new Error('기존 Minecraft 폴더 안의 데이터는 삭제할 수 없습니다.')
  const original = await statOrMissing(data)
  if (!original) return
  const entries = await readdir(data)
  if (!entries.length) { await rmdir(data); return }

  const marker = join(data, '.sunrin-valley.json')
  const markerInfo = await statOrMissing(marker)
  if (!markerInfo?.isFile() || markerInfo.isSymbolicLink() || markerInfo.size > 4096) throw new Error('선린밸리 전용 폴더인지 확인할 수 없어 삭제하지 않았습니다.')
  let owner: unknown
  try { owner = JSON.parse(await readFile(marker, 'utf8')) }
  catch { throw new Error('설치 폴더의 관리 정보가 올바르지 않아 삭제하지 않았습니다.') }
  if (!owner || typeof owner !== 'object' || (owner as Record<string, unknown>).id !== 'sunrin-valley' ||
      (owner as Record<string, unknown>).formatVersion !== 1) throw new Error('선린밸리 전용 폴더인지 확인할 수 없어 삭제하지 않았습니다.')

  // Recheck the entire prefix immediately before the only recursive removal.
  // Node's rm unlinks internal symlinks instead of following their targets.
  await assertUnlinkedPath(data)
  const current = await statOrMissing(data)
  const currentMarker = await statOrMissing(marker)
  if (!current || current.dev !== original.dev || current.ino !== original.ino ||
      !currentMarker?.isFile() || currentMarker.dev !== markerInfo.dev || currentMarker.ino !== markerInfo.ino) throw new Error('삭제 준비 중 설치 폴더가 변경되어 중단했습니다.')
  await rm(data, { recursive: true, force: false })
}
