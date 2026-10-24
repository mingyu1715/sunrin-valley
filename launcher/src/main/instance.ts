import { mkdir, readFile, readdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWrite, exists } from './files'

export const INSTANCE_ID = 'SunrinValley'
export const instanceRoot = (dataPath: string) => join(dataPath, 'prism-data', 'instances', INSTANCE_ID)
export const gameRoot = (dataPath: string) => join(instanceRoot(dataPath), '.minecraft')

async function textOrEmpty(path: string) { return await exists(path) ? readFile(path, 'utf8') : '' }

function koreanOptions(text: string, defaults: string): string {
  const lines = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon > 0) lines.set(line.slice(0, colon), line.slice(colon + 1))
  }
  lines.set('lang', 'ko_kr')
  const parsePacks = (value: string | undefined): string[] => {
    try { const packs = JSON.parse(value ?? '[]'); return Array.isArray(packs) ? packs.filter(p => typeof p === 'string') : [] }
    catch { return [] }
  }
  const packs = [...parsePacks(defaults.match(/^resourcePacks:(.*)$/m)?.[1]), ...parsePacks(lines.get('resourcePacks'))]
    .map(p => p === 'file/CreateSophisticatedBackpacks.zip' ? 'file/CreateSophBackpacks.zip' : p)
    .filter(p => p !== 'vanilla' && p !== 'file/Sunrin-Custom.zip')
  lines.set('resourcePacks', JSON.stringify(['vanilla', ...new Set(packs), 'file/Sunrin-Custom.zip']))
  return [...lines].map(([key, value]) => `${key}:${value}`).join('\n') + '\n'
}

export async function configureOptions(game: string, original: string, importOptions: boolean): Promise<void> {
  const marker = join(game, '.sunrin', 'options-initialized.json')
  const optionsPath = join(game, 'options.txt')
  const defaultsPath = join(game, 'configureddefaults', 'options.txt')
  const defaults = await textOrEmpty(defaultsPath)
  if (defaults) await atomicWrite(defaultsPath, koreanOptions(defaults, defaults))
  if (await exists(marker) && await exists(optionsPath)) {
    try { if (JSON.parse(await readFile(marker, 'utf8')).optionsSchema === 1) return } catch { /* migrate from current options */ }
  }
  let text = await textOrEmpty(optionsPath)
  if (!text && importOptions) text = await textOrEmpty(join(original, 'options.txt'))
  await atomicWrite(optionsPath, koreanOptions(text || defaults, defaults))
  await atomicWrite(marker, JSON.stringify({ optionsSchema: 1, importedFrom: importOptions ? original : null, initializedAt: new Date().toISOString() }))
}

export async function writePrismInstance(root: string, minecraft: string, forge: string, javaPath: string, memoryMb: number): Promise<void> {
  if (!Number.isInteger(memoryMb) || memoryMb < 2048 || memoryMb > 32768) throw new Error('메모리는 2~32GB 사이로 설정해 주세요.')
  if ([root, javaPath].some(path => /[\r\n\0]/.test(path))) throw new Error('경로에 사용할 수 없는 문자가 있습니다.')
  const instance = join(root, 'instances', INSTANCE_ID)
  await mkdir(join(instance, '.minecraft'), { recursive: true })
  await atomicWrite(join(instance, 'mmc-pack.json'), JSON.stringify({ formatVersion: 1, components: [
    { uid: 'net.minecraft', version: minecraft, important: true },
    { uid: 'net.minecraftforge', version: forge, important: true }
  ] }, null, 2))
  const quote = (path: string) => path.replaceAll('\\', '/')
  await atomicWrite(join(instance, 'instance.cfg'), [
    '[General]', 'ConfigVersion=1.2', 'InstanceType=OneSix', 'name=선린밸리',
    'OverrideJavaLocation=true', 'AutomaticJava=false', `JavaPath=${quote(javaPath)}`, 'OverrideJavaArgs=false',
    'OverrideMemory=true', 'MinMemAlloc=1024', `MaxMemAlloc=${memoryMb}`, 'notes=Sunrin Valley / Society 4.1.5A', ''
  ].join('\n'))
}

export async function shareShaderFiles(original: string, game: string): Promise<string[]> {
  const source = join(original, 'shaderpacks'), target = join(game, 'shaderpacks'), warnings: string[] = []
  if (!await exists(source)) return ['기존 shaderpacks 폴더가 없어 공유를 건너뛰었습니다.']
  await mkdir(target, { recursive: true })
  for (const file of await readdir(source, { withFileTypes: true })) {
    if (file.name.startsWith('.') || !file.isFile() || !file.name.endsWith('.zip')) continue
    const destination = join(target, file.name)
    if (!await exists(destination)) {
      try { await symlink(join(source, file.name), destination, 'file') }
      catch { warnings.push(`셰이더 연결 권한이 없어 ${file.name} 공유를 건너뛰었습니다.`) }
    }
  }
  return warnings
}
