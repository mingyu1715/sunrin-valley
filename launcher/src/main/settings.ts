import type { Settings } from '../shared'
import { homedir, totalmem } from 'node:os'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { readFile } from 'node:fs/promises'
import { atomicWrite, exists } from './files'
export class SettingsStore {
  constructor(readonly root: string) {}
  defaults(): Settings {
    const minecraft = process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'minecraft') : join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), '.minecraft')
    return { dataPath: join(this.root, 'game'), memoryMb: Math.max(2048, Math.min(8192, Math.floor(totalmem() / 1024 ** 2 / 2 / 512) * 512)), minecraftPath: minecraft, importOptions: true, shareShaders: false }
  }
  validate(value: Settings): Settings {
    if (!value || typeof value !== 'object' || typeof value.dataPath !== 'string' || !isAbsolute(value.dataPath) || /[\r\n\0]/.test(value.dataPath)) throw new Error('설치 위치는 올바른 절대 경로로 설정해 주세요.')
    if (!Number.isInteger(value.memoryMb) || value.memoryMb < 2048 || value.memoryMb > 32768) throw new Error('메모리는 2~32GB 사이로 설정해 주세요.')
    if (typeof value.minecraftPath !== 'string' || (value.minecraftPath && (!isAbsolute(value.minecraftPath) || /[\r\n\0]/.test(value.minecraftPath)))) throw new Error('기존 마인크래프트 폴더 경로를 확인해 주세요.')
    if (value.minecraftPath && (resolve(value.dataPath) === resolve(value.minecraftPath) || resolve(value.dataPath).startsWith(resolve(value.minecraftPath) + sep))) throw new Error('기존 마인크래프트 폴더 밖에 설치 위치를 지정해 주세요.')
    if (typeof value.importOptions !== 'boolean' || typeof value.shareShaders !== 'boolean') throw new Error('설정 값이 올바르지 않습니다.')
    return { dataPath: resolve(value.dataPath), memoryMb: value.memoryMb, minecraftPath: value.minecraftPath, importOptions: value.importOptions, shareShaders: value.shareShaders }
  }
  async load(): Promise<Settings> {
    if (!await exists(join(this.root, 'settings.json'))) return this.defaults()
    return this.validate(JSON.parse(await readFile(join(this.root, 'settings.json'), 'utf8')))
  }
  async save(settings: Settings): Promise<void> { await atomicWrite(join(this.root, 'settings.json'), JSON.stringify(this.validate(settings), null, 2)) }
}
