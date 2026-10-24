import { mkdir, readFile, readdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { assertNoSymlinks, atomicWrite, exists } from './files'

export const INSTANCE_ID = 'SunrinValley'
export const instanceRoot = (dataPath: string) => join(dataPath, 'prism-data', 'instances', INSTANCE_ID)
export const gameRoot = (dataPath: string) => join(instanceRoot(dataPath), '.minecraft')

async function textOrEmpty(path: string) { return await exists(path) ? readFile(path, 'utf8') : '' }

function optionLines(text: string): Map<string, string> {
  const lines = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon > 0) lines.set(line.slice(0, colon), line.slice(colon + 1))
  }
  return lines
}

const packList = (value: unknown): string[] => Array.isArray(value) ? value.filter((pack): pack is string => typeof pack === 'string') : []
const packAlias = (pack: string): string => pack === 'file/CreateSophisticatedBackpacks.zip' ? 'file/CreateSophBackpacks.zip' : pack
const stayTrue = 'file/Stay_True_1.20.zip', customPack = 'file/Sunrin-Custom.zip', sunlitPack = 'file/sunlit_overrides.zip'
const priorityPacks = [stayTrue, customPack, sunlitPack]

function selectedPacks(text: string): string[] {
  try { return packList(JSON.parse(optionLines(text).get('resourcePacks') ?? '[]')).map(packAlias) }
  catch { return [] }
}

function resourceOrder(packs: string[]): string[] {
  const unique = new Set(packs.map(packAlias))
  // Minecraft stores selected packs from lowest priority to highest priority.
  return ['vanilla', ...(unique.has(stayTrue) ? [stayTrue] : []), ...[...unique].filter(pack => pack !== 'vanilla' && !priorityPacks.includes(pack)), ...(unique.has(customPack) ? [customPack] : []), ...(unique.has(sunlitPack) ? [sunlitPack] : [])]
}

function configuredOptions(text: string, packs: string[], korean: boolean): string {
  const lines = optionLines(text)
  if (korean) lines.set('lang', 'ko_kr')
  lines.set('resourcePacks', JSON.stringify(packs))
  return [...lines].map(([key, value]) => `${key}:${value}`).join('\n') + '\n'
}

async function jsonOrUndefined(path: string): Promise<any> {
  try { return JSON.parse(await textOrEmpty(path)) }
  catch { return undefined }
}

export async function configureOptions(game: string, original: string, importOptions: boolean, managedPacks?: readonly string[]): Promise<void> {
  const marker = join(game, '.sunrin', 'options-initialized.json')
  const optionsPath = join(game, 'options.txt')
  const defaultsPath = join(game, 'configureddefaults', 'options.txt')
  const overridePath = join(game, 'config', 'resourcepackoverrides.json')
  const receiptPath = join(game, '.sunrin', 'receipt.json')
  const packDirectory = join(game, 'resourcepacks')
  for (const path of [marker, optionsPath, defaultsPath, overridePath, receiptPath, packDirectory]) await assertNoSymlinks(game, path)
  const defaults = await textOrEmpty(defaultsPath)
  const config = await jsonOrUndefined(overridePath)
  const overrides = config?.schema_version === 2 && config.pack_overrides && typeof config.pack_overrides === 'object' && !Array.isArray(config.pack_overrides) ? config.pack_overrides : undefined
  const defaultsPacks = selectedPacks(defaults)
  const groupPacks = packList(overrides?.['1']).map(packAlias)
  const receipt = await jsonOrUndefined(receiptPath)
  const managedIds = (paths: readonly string[]) => paths
    .filter(path => /^resourcepacks\/[^/]+\.zip$/.test(path))
    .map(path => `file/${path.slice('resourcepacks/'.length)}`).map(packAlias)
  const previous = managedIds(Object.keys(receipt?.managed ?? {}))
  const managed = managedPacks === undefined ? previous : managedIds(managedPacks)
  const retired = new Set(managedPacks === undefined ? [] : previous.filter(pack => !managed.includes(pack)))
  const known = new Set([...defaultsPacks, ...groupPacks, ...managed, ...previous, ...priorityPacks])
  const installed = new Set(await exists(packDirectory)
    ? (await readdir(packDirectory, { withFileTypes: true })).filter(entry => entry.isFile()).map(entry => `file/${entry.name}`)
    : [])
  const enabled = resourceOrder([
    ...packList(config?.default_packs).map(packAlias).filter(pack => known.has(pack)),
    ...defaultsPacks, ...groupPacks, ...managed, ...priorityPacks
  ].filter(pack => !retired.has(pack) && (!pack.startsWith('file/') || installed.has(pack))))
  const enabledSet = new Set(enabled)
  let text = await textOrEmpty(optionsPath)
  if (!text && importOptions) text = await textOrEmpty(join(original, 'options.txt'))
  const selected = resourceOrder([...enabled, ...selectedPacks(text).filter(pack => !known.has(pack) || enabledSet.has(pack))])
  const initialized = (await jsonOrUndefined(marker))?.optionsSchema === 1
  const updatedOptions = configuredOptions(text || defaults, selected, !initialized)
  if (updatedOptions !== await textOrEmpty(optionsPath)) await atomicWrite(optionsPath, updatedOptions)
  if (defaults) {
    const updatedDefaults = configuredOptions(defaults, enabled, true)
    if (updatedDefaults !== defaults) await atomicWrite(defaultsPath, updatedDefaults)
  }
  if (config?.schema_version === 2) {
    config.default_packs = selected
    // Keep custom groups and their settings; group 1 is the base pack's required selection.
    if (Array.isArray(overrides?.['1'])) overrides['1'] = enabled.filter(pack => pack !== 'vanilla')
    const updatedConfig = JSON.stringify(config, null, 2) + '\n'
    if (updatedConfig !== await textOrEmpty(overridePath)) await atomicWrite(overridePath, updatedConfig)
  }
  if (!initialized) await atomicWrite(marker, JSON.stringify({ optionsSchema: 1, importedFrom: importOptions ? original : null, initializedAt: new Date().toISOString() }))
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
