import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { LauncherState, Settings } from '../shared'
import type { BundlePaths, Progress } from './pack-types'
import { atomicWrite, claimDataDirectory, exists } from './files'
import { SettingsStore } from './settings'
import { bundleFingerprint, inspectInstall, installClient, loadManifest, readReceipt } from './installer'
import { gameRoot, writePrismInstance } from './instance'
import { ensurePrism } from './runtime'
import { assertInstallIdle } from './processes'

let window: BrowserWindow | undefined
let state: LauncherState
let busy = false
let prismProcess: ChildProcess | undefined
let store: SettingsStore
let paths: BundlePaths
let logPath: string

async function log(message: string) {
  if (!logPath) return
  await mkdir(join(store.root, 'logs'), { recursive: true })
  await appendFile(logPath, `${new Date().toISOString()} ${message}\n`).catch(() => {})
}
function update(patch: Partial<LauncherState>) {
  state = { ...state, ...patch }
  if (window && !window.isDestroyed()) window.webContents.send('sunrin:state-changed', state)
}
const progress: Progress = (message, value) => update({ message, progress: value })

async function refresh() { update({ ...await inspectInstall(state.settings, paths), progress: null }) }
function ensureIdle() { if (busy) throw new Error('진행 중인 작업을 마친 뒤 다시 시도해 주세요.') }
function ensurePrismClosed() { if (prismProcess?.exitCode === null) throw new Error('Prism과 게임을 닫은 뒤 설치 또는 설정 변경을 진행해 주세요.') }
async function task(operation: () => Promise<void>) {
  ensureIdle(); busy = true
  try { await operation() }
  catch (error: any) {
    await log(error.stack ?? error.message)
    update({ phase: 'error', message: error.message ?? '작업에 실패했습니다. 복구를 눌러 다시 시도하세요.', progress: null })
    throw error
  } finally { busy = false }
}

async function install() {
  ensurePrismClosed()
  update({ phase: 'installing', progress: 0, message: '선린밸리 설치를 준비합니다.' })
  await installClient(state.settings, paths, progress)
  await log('Installation verified and receipt written')
  await refresh()
  update({ message: '준비 완료! 처음이라면 설정에서 Prism 계정을 연결해 주세요.' })
}

async function prism(launch: boolean) {
  const data = state.settings.dataPath
  const binary = await ensurePrism(data, paths.prism, progress)
  const directory = join(data, 'prism-data')
  await mkdir(directory, { recursive: true })
  if (!await exists(join(directory, 'prismlauncher.cfg'))) {
    await atomicWrite(join(directory, 'prismlauncher.cfg'), '[General]\nLanguage=ko\n')
  }
  if (launch) {
    const receipt = await readReceipt(data), manifest = await loadManifest(paths.manifest)
    if (!receipt || receipt.fingerprint !== await bundleFingerprint(paths)) throw new Error('먼저 설치 또는 업데이트를 완료해 주세요.')
    // An existing Prism owns its live profile; avoid rewriting it during IPC forwarding.
    if (!prismProcess || prismProcess.exitCode !== null) {
      await assertInstallIdle(data)
      await writePrismInstance(directory, manifest.minecraft, manifest.forge, receipt.runtime.java, state.settings.memoryMb)
    }
    update({ phase: 'launching', progress: null, message: 'Prism에서 로그인과 게임 실행을 계속해 주세요.' })
  }
  const child = spawn(binary, ['--dir', directory, ...(launch ? ['--launch', 'SunrinValley'] : ['--show-window'])], { stdio: 'ignore', windowsHide: false })
  await new Promise<void>((ok, fail) => { child.once('spawn', ok); child.once('error', fail) })
  if (!prismProcess || prismProcess.exitCode !== null) prismProcess = child
  child.on('error', error => { void log(`Prism: ${error.message}`); update({ phase: 'error', message: 'Prism 실행에 실패했습니다. 복구를 시도해 주세요.', progress: null }) })
  child.on('exit', code => {
    void log(`Prism exited with ${code}`)
    if (child === prismProcess) { prismProcess = undefined; if (!busy) void refresh() }
    if (code && launch) update({ phase: 'error', message: `Prism이 종료되었습니다(${code}). 설정에서 Prism을 열어 계정과 실행 로그를 확인해 주세요.`, progress: null })
  })
  if (!launch) update({ progress: null, message: 'Prism 오른쪽 위 계정 메뉴에서 Microsoft 계정을 추가해 주세요.' })
}

function handle(channel: string, callback: (...args: any[]) => any) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('허용되지 않은 요청입니다.')
    return callback(...args)
  })
}

function createWindow() {
  window = new BrowserWindow({
    width: 1040, height: 740, minWidth: 768, minHeight: 600,
    title: '선린밸리 · Sunrin Valley', backgroundColor: '#f3eedc', autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    const permitted = process.env.ELECTRON_RENDERER_URL ?? pathToFileURL(join(__dirname, '../renderer/index.html')).href
    if (url !== permitted) event.preventDefault()
  })
  window.webContents.on('render-process-gone', (_event, details) => { void log(`Renderer gone: ${details.reason}`) })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus() } })
  app.whenReady().then(async () => {
    const root = process.env.SUNRIN_APP_DATA ? resolve(process.env.SUNRIN_APP_DATA) : app.getPath('userData')
    store = new SettingsStore(root); logPath = join(root, 'logs', 'launcher.log')
    const pack = app.isPackaged ? join(process.resourcesPath, 'pack') : resolve(__dirname, '../../..')
    paths = app.isPackaged ? {
      manifest: join(pack, 'manifest.json'), prism: join(pack, 'prism-runtime.json'), customPack: join(pack, 'Sunrin-Custom.zip'), startup: join(pack, 'sunrin_items.js')
    } : {
      manifest: join(pack, 'client-pack/manifest.json'), prism: join(pack, 'client-pack/prism-runtime.json'), customPack: join(pack, 'resourcepacks/dist/Sunrin-Custom.zip'), startup: join(pack, 'kubejs-custom/startup_scripts/sunrin_items.js')
    }
    state = { phase: 'checking', message: '설치 상태 확인 중', progress: null, settings: await store.load() }
    handle('sunrin:state', () => state)
    handle('sunrin:primary', () => task(async () => { const result = await inspectInstall(state.settings, paths); if (result.phase === 'ready') await prism(true); else await install() }))
    handle('sunrin:repair', () => task(install))
    handle('sunrin:open-prism', () => task(() => prism(false)))
    handle('sunrin:choose-directory', async () => { const result = await dialog.showOpenDialog(window!, { properties: ['openDirectory', 'createDirectory'] }); return result.canceled ? null : result.filePaths[0] })
    handle('sunrin:save-settings', (settings: Settings) => task(async () => { ensurePrismClosed(); await assertInstallIdle(state.settings.dataPath); await assertInstallIdle(store.validate(settings).dataPath); await store.save(settings); update({ settings: await store.load(), phase: 'checking' }); await refresh() }))
    handle('sunrin:open-logs', async () => { await mkdir(join(root, 'logs'), { recursive: true }); const error = await shell.openPath(join(root, 'logs')); if (error) throw new Error(error) })
    handle('sunrin:open-instance', async () => { await claimDataDirectory(state.settings.dataPath); const path = gameRoot(state.settings.dataPath); await mkdir(path, { recursive: true }); const error = await shell.openPath(path); if (error) throw new Error(error) })
    createWindow(); await refresh(); await log('Launcher ready')
  }).catch(error => { dialog.showErrorBox('선린밸리 시작 오류', `${error.message}\n설정 파일과 설치 경로를 확인해 주세요.`); app.quit() })
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0 && state) createWindow() })
  app.on('window-all-closed', () => { if (!busy) app.quit() })
}
