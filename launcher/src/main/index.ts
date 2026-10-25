import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { totalmem } from 'node:os'
import { appendFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { LauncherState, Settings } from '../shared'
import type { BundlePaths, Progress } from './pack-types'
import { claimDataDirectory } from './files'
import { SettingsStore } from './settings'
import { bundleFingerprint, inspectInstall, installClient, loadManifest, readReceipt } from './installer'
import { configureOptions, gameRoot, writePrismInstance } from './instance'
import { ensurePrism } from './runtime'
import { assertInstallIdle, phaseForActivity, readProcessActivity } from './processes'
import { configurePrismForBackground } from './prism-config'
import { PrismLogTail, PrismProgressDecoder, prismArguments } from './prism-progress'
import { chooseLaunchIdentity, clearLaunchSession, readLaunchSession, writeLaunchSession, type LaunchStage } from './launch-session'
import { resolveRemotePack } from './remote-pack'
import { recommendMemory } from './memory'
import { startStatusPolling } from './status-poll'

let window: BrowserWindow | undefined
let state: LauncherState
let busy = false
let prismProcess: ChildProcess | undefined
let store: SettingsStore
let paths: BundlePaths
let bundledPaths: BundlePaths
let updateSourcePath: string
let launcherUpdate: { minLauncherVersion: string; downloadUrl: string } | undefined
let operatingBlocked: string | undefined
let remoteCheck: Promise<void> | undefined
let stopStatusPolling: (() => void) | undefined
let logPath: string
let monitor: ReturnType<typeof setInterval> | undefined
let monitorGeneration = 0
let launchRequested = false
let sawGame = false
let engineLog: PrismLogTail | undefined
let launchIdentity: string | undefined
let launchPid: number | undefined
let persistedStage: LaunchStage | undefined
let persistedKey: string | undefined
let sessionWrites = Promise.resolve()
let pendingSessionWrites = 0

function persistLaunchStage(stage: LaunchStage): Promise<void> {
  if (!launchRequested || !launchIdentity) return sessionWrites
  const data = state.settings.dataPath, identity = launchIdentity
  const key = `${identity}\0${stage}`
  if (persistedKey === key) return sessionWrites
  persistedKey = key; persistedStage = stage; pendingSessionWrites++
  sessionWrites = sessionWrites.then(() => writeLaunchSession(data, identity, stage))
    .catch(() => { if (persistedKey === key) persistedKey = undefined })
    .finally(() => { pendingSessionWrites-- })
  return sessionWrites
}

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
async function checkRemotePack() {
  if (!remoteCheck) remoteCheck = (async () => {
    const result = await resolveRemotePack(store.root, bundledPaths, updateSourcePath, app.getVersion())
    paths = result.paths; launcherUpdate = result.updateRequired; operatingBlocked = result.blocked
    update({ updateMessage: result.message, serverStatus: result.serverStatus, changes: result.changes })
  })().finally(() => { remoteCheck = undefined })
  await remoteCheck
}
function maintenance() { return state.serverStatus?.state === 'maintenance' || state.serverStatus?.state === 'failed' }
async function pollOperation() {
  const wasGated = !!launcherUpdate || !!operatingBlocked || maintenance()
  const fingerprint = await bundleFingerprint(paths)
  await checkRemotePack()
  if (busy) return
  if (wasGated || launcherUpdate || operatingBlocked || maintenance() || fingerprint !== await bundleFingerprint(paths)) await refresh()
}

function stopMonitoring() { if (monitor) clearInterval(monitor); monitor = undefined; engineLog = undefined; monitorGeneration++ }
async function connectEngineLog(data: string) {
  if (engineLog) return
  engineLog = new PrismLogTail(data, new PrismProgressDecoder(stage => {
    if (!launchRequested || sawGame) return
    update({ phase: stage, progress: null, message: stage === 'authenticating' ? 'Microsoft 로그인 확인 중입니다. 열린 인증 창에서 계속해 주세요.' : 'Minecraft·Forge 실행 파일과 라이브러리를 준비하고 있습니다.' })
    void persistLaunchStage(stage)
  }), true)
  await engineLog.poll().catch(() => {})
}
function startMonitoring(data: string) {
  if (monitor) return
  const generation = ++monitorGeneration
  let scanning = false
  const scan = async () => {
    if (scanning || busy) return
    scanning = true
    try {
      await engineLog?.poll().catch(() => {})
      const activity = await readProcessActivity(data)
      if (generation !== monitorGeneration) return
      if (launchRequested && !launchIdentity) {
        launchIdentity = chooseLaunchIdentity(activity.prismIdentities ?? [], undefined, launchPid)
        if (launchIdentity) void persistLaunchStage(state.phase === 'running' ? 'running' : state.phase === 'preparing' ? 'preparing' : 'authenticating')
      }
      if (activity.game) {
        sawGame = true
        update({ phase: 'running', progress: null, message: 'Minecraft가 실행 중입니다. 즐거운 하루 보내세요.' })
        void persistLaunchStage('running')
      } else if (activity.java && !sawGame && launchRequested) {
        update({ phase: 'preparing', progress: null, message: 'Minecraft·Forge 실행 구성을 준비하고 있습니다.' })
        void persistLaunchStage('preparing')
      } else if (!activity.prism && !activity.java) {
        const finishedGame = sawGame
        stopMonitoring(); launchRequested = false
        await sessionWrites; await clearLaunchSession(data)
        launchIdentity = undefined; launchPid = undefined; persistedStage = undefined; persistedKey = undefined
        await refresh()
        if (finishedGame) update({ message: '게임이 종료되었습니다. 다음에 또 만나요.' })
      } else if (sawGame && state.phase === 'running') {
        update({ phase: 'preparing', progress: null, message: '게임 종료를 마무리하는 중입니다.' })
      }
    } catch { /* Retain the last known stage if the OS cannot answer this poll. */ }
    finally { scanning = false }
  }
  monitor = setInterval(() => { void scan() }, process.platform === 'win32' ? 4000 : 1500)
  void scan()
}
async function refresh() {
  const result = await inspectInstall(state.settings, paths)
  let patch: Partial<LauncherState> = { ...result, progress: null }
  if (result.phase === 'ready' || result.phase === 'update') {
    try {
      const activity = await readProcessActivity(state.settings.dataPath)
      if (!launchRequested) {
        const session = await readLaunchSession(state.settings.dataPath, activity.prismIdentities ?? [])
        if (session) { launchRequested = true; launchIdentity = session.identity; persistedStage = session.stage; persistedKey = `${session.identity}\0${session.stage}` }
      }
      const phase = phaseForActivity(activity, launchRequested)
      if (phase === 'running') { sawGame = true; patch = { ...patch, phase, message: 'Minecraft가 실행 중입니다.' } }
      else if (phase === 'preparing') patch = { ...patch, phase: persistedStage === 'authenticating' ? 'authenticating' : phase, message: persistedStage === 'authenticating' ? 'Microsoft 로그인 확인을 이어갑니다. 열린 인증 창에서 계속해 주세요.' : 'Minecraft·Forge 준비를 이어갑니다. 이미 받은 파일을 사용합니다.' }
      else if (activity.prism) patch = { ...patch, message: '계정 창이 열려 있습니다. 게임 시작을 눌러 계속할 수 있습니다.' }
      if (activity.game || activity.prism || activity.java) { await connectEngineLog(state.settings.dataPath); startMonitoring(state.settings.dataPath) }
    } catch { /* Integrity inspection still works when process inspection is unavailable. */ }
  }
  if (launcherUpdate && patch.phase !== 'running') patch = { ...patch, phase: 'launcher-update', message: `이 구성을 사용하려면 런처 ${launcherUpdate.minLauncherVersion} 이상이 필요합니다. 버튼을 눌러 새 런처를 받아 주세요.` }
  else if (operatingBlocked && patch.phase !== 'running') patch = { ...patch, phase: 'error', message: operatingBlocked }
  else if (maintenance() && patch.phase !== 'running') patch = { ...patch, phase: 'maintenance', message: state.serverStatus!.message || '서버 점검이 끝난 뒤 다시 시작해 주세요.' }
  update(patch)
}
function ensureIdle() { if (busy) throw new Error('진행 중인 작업을 마친 뒤 다시 시도해 주세요.') }
function ensurePrismClosed() { if (prismProcess?.exitCode === null) throw new Error('Prism과 게임을 닫은 뒤 설치 또는 설정 변경을 진행해 주세요.') }
async function task(operation: () => Promise<void>) {
  ensureIdle(); busy = true
  try { await operation() }
  catch (error: any) {
    await log(error.stack ?? error.message)
    update({ phase: 'error', message: error.message ?? '작업에 실패했습니다. 복구를 눌러 다시 시도하세요.', progress: null })
    throw error
  } finally { busy = false; if (BrowserWindow.getAllWindows().length === 0) app.quit() }
}

async function install() {
  ensurePrismClosed()
  if (launcherUpdate || operatingBlocked || maintenance()) { await refresh(); return }
  update({ phase: 'installing', progress: 0, message: '선린밸리 설치를 준비합니다.' })
  await installClient(state.settings, paths, progress)
  await log('Installation verified and receipt written')
  await refresh()
  update({ message: '준비 완료! 게임 시작을 누르면 필요한 로그인을 안내합니다.' })
}

async function prism(launch: boolean) {
  const data = state.settings.dataPath
  const binary = await ensurePrism(data, paths.prism, progress)
  const directory = join(data, 'prism-data')
  await mkdir(directory, { recursive: true })
  let existingIdentity: string | undefined
  if (launch) {
    const receipt = await readReceipt(data), manifest = await loadManifest(paths.manifest)
    if (!receipt || receipt.fingerprint !== await bundleFingerprint(paths)) throw new Error('먼저 설치 또는 업데이트를 완료해 주세요.')
    // An existing Prism owns its live profile; avoid rewriting it during IPC forwarding.
    const activity = await readProcessActivity(data)
    existingIdentity = activity.prismIdentities?.[0]
    if (!activity.prism && !activity.java) {
      await assertInstallIdle(data)
      await configurePrismForBackground(data, receipt.runtime.java)
      await configureOptions(gameRoot(data), state.settings.minecraftPath, state.settings.importOptions, Object.keys(receipt.managed))
      await writePrismInstance(directory, manifest.minecraft, manifest.forge, receipt.runtime.java, state.settings.memoryMb)
    }
    launchRequested = true; sawGame = activity.game
    update({ phase: activity.game ? 'running' : 'authenticating', progress: null, message: activity.game ? 'Minecraft가 실행 중입니다.' : 'Microsoft 계정을 확인합니다. 필요한 경우 로그인 창에서 계속해 주세요.' })
  }
  await connectEngineLog(data)
  // The engine and its downloads survive closing the frontend. Its own UTF-8 log
  // supplies whitelisted stages without an stdout pipe tied to this process.
  let earlyFailure = false
  const child = spawn(binary, prismArguments(data, !launch), { detached: true, stdio: 'ignore', windowsHide: true })
  child.on('error', error => { earlyFailure = true; void log(`Prism: ${error.message}`); update({ phase: 'error', message: 'Prism 실행에 실패했습니다. 복구를 시도해 주세요.', progress: null }) })
  child.on('exit', (code, signal) => {
    void log(`Prism exited with ${code}`)
    if (child === prismProcess) prismProcess = undefined
    if ((code || signal) && launch) {
      earlyFailure = true
      stopMonitoring(); launchRequested = false
      launchIdentity = undefined; launchPid = undefined; persistedStage = undefined; persistedKey = undefined
      update({ phase: 'error', message: `실행 환경이 종료되었습니다(${code ?? signal}). 설정의 문제 해결에서 자세한 내용을 확인해 주세요.`, progress: null })
    }
  })
  await new Promise<void>((ok, fail) => { child.once('spawn', ok); child.once('error', fail) })
  child.unref()
  if (!prismProcess || prismProcess.exitCode !== null) prismProcess = child
  if (launch) {
    launchPid = child.pid
    const activity = await readProcessActivity(data)
    if (earlyFailure) return
    launchIdentity = chooseLaunchIdentity(activity.prismIdentities ?? [], existingIdentity, child.pid)
    await persistLaunchStage(activity.game ? 'running' : 'authenticating')
  }
  if (earlyFailure) return
  startMonitoring(data)
  if (!launch) update({ progress: null, message: '문제 해결용 Prism 창을 열었습니다. 계정 메뉴와 실행 로그를 확인할 수 있습니다.' })
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

if (process.env.SUNRIN_APP_DATA) {
  const testRoot = resolve(process.env.SUNRIN_APP_DATA)
  mkdirSync(testRoot, { recursive: true })
  app.setPath('userData', testRoot)
}
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { if (window && !window.isDestroyed()) { if (window.isMinimized()) window.restore(); window.focus() } else if (state) createWindow() })
  app.whenReady().then(async () => {
    const root = process.env.SUNRIN_APP_DATA ? resolve(process.env.SUNRIN_APP_DATA) : app.getPath('userData')
    store = new SettingsStore(root); logPath = join(root, 'logs', 'launcher.log')
    const pack = app.isPackaged ? join(process.resourcesPath, 'pack') : resolve(__dirname, '../../..')
    bundledPaths = app.isPackaged ? {
      manifest: join(pack, 'manifest.json'), prism: join(pack, 'prism-runtime.json'), customPack: join(pack, 'Sunrin-Custom.zip'), startup: join(pack, 'sunrin_items.js')
    } : {
      manifest: join(pack, 'client-pack/manifest.json'), prism: join(pack, 'client-pack/prism-runtime.json'), customPack: join(pack, 'resourcepacks/dist/Sunrin-Custom.zip'), startup: join(pack, 'kubejs-custom/startup_scripts/sunrin_items.js')
    }
    paths = bundledPaths
    updateSourcePath = app.isPackaged ? join(pack, 'update-source.json') : join(pack, 'client-pack/update-source.json')
    state = { phase: 'checking', message: '최신 게임 구성 확인 중', progress: null, settings: await store.load(), memoryRecommendation: recommendMemory(Math.floor(totalmem() / 1024 ** 2)) }
    handle('sunrin:state', () => state)
    handle('sunrin:primary', () => task(async () => {
      update({ phase: 'checking', message: '최신 게임 구성 확인 중', progress: null })
      await checkRemotePack()
      if (launcherUpdate) { await refresh(); await shell.openExternal(launcherUpdate.downloadUrl); return }
      if (operatingBlocked || maintenance()) { await refresh(); return }
      const result = await inspectInstall(state.settings, paths)
      if (result.phase === 'ready') await prism(true); else await install()
    }))
    handle('sunrin:repair', () => task(async () => { await checkRemotePack(); await install() }))
    handle('sunrin:open-prism', () => task(() => prism(false)))
    handle('sunrin:choose-directory', async () => { const result = await dialog.showOpenDialog(window!, { properties: ['openDirectory', 'createDirectory'] }); return result.canceled ? null : result.filePaths[0] })
    handle('sunrin:save-settings', (settings: Settings) => task(async () => { ensurePrismClosed(); await assertInstallIdle(state.settings.dataPath); await assertInstallIdle(store.validate(settings).dataPath); await store.save(settings); update({ settings: await store.load(), phase: 'checking' }); await refresh() }))
    handle('sunrin:open-logs', async () => { await mkdir(join(root, 'logs'), { recursive: true }); const error = await shell.openPath(join(root, 'logs')); if (error) throw new Error(error) })
    handle('sunrin:open-instance', async () => { await claimDataDirectory(state.settings.dataPath); const path = gameRoot(state.settings.dataPath); await mkdir(path, { recursive: true }); const error = await shell.openPath(path); if (error) throw new Error(error) })
    createWindow(); await checkRemotePack(); await refresh(); await log('Launcher ready')
    stopStatusPolling = startStatusPolling(pollOperation, () => !busy && !['checking', 'installing', 'authenticating', 'preparing', 'launching', 'running'].includes(state.phase))
  }).catch(error => { dialog.showErrorBox('선린밸리 시작 오류', `${error.message}\n설정 파일과 설치 경로를 확인해 주세요.`); app.quit() })
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0 && state) createWindow() })
  app.on('window-all-closed', () => { if (!busy) app.quit() })
  app.on('before-quit', event => {
    stopStatusPolling?.()
    stopMonitoring()
    if (pendingSessionWrites) { event.preventDefault(); void sessionWrites.finally(() => app.quit()) }
  })
}
