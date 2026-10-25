import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, shell } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { totalmem } from 'node:os'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { LauncherState, LauncherUpdateInfo, Settings, StorageInfo } from '../shared'
import type { BundlePaths, Progress } from './pack-types'
import { assertNoSymlinks, atomicWrite, claimDataDirectory, exists } from './files'
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
import { PrimaryActionController } from './primary-action'
import { getStorageInfo } from './storage'
import { createDiagnostic, sanitizeDiagnosticText } from './diagnostics'
import { saveDiagnosticReport } from './diagnostics-export'
import { removeLauncherState, removeSunrinData, validateLauncherStateRemoval } from './uninstall'
import { readCurrentCrash } from './crash-report'
import { checkLauncherUpdate, downloadLauncherUpdate } from './launcher-update'
import { acknowledgeLauncherUpdate, launchLauncherUpdate, prepareLauncherUpdate } from './launcher-update-install'

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
const primaryController = new PrimaryActionController()
let closeAllowed = false
let closePrompt = false
const uninstallMode = process.argv.includes('--uninstall-data')
let launchStartedAt = Date.now()
let lastStorage: StorageInfo | undefined
let appUpdate: LauncherUpdateInfo | undefined
let appUpdateCheck: Promise<void> | undefined
let lastAppUpdateCheck = 0
let launcherReady = false
let rendererConnected = false
let updateAcknowledged = false
let applyingSelfUpdate = false

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
  await appendFile(logPath, `${new Date().toISOString()} ${sanitizeDiagnosticText(message, [store.root, state?.settings.dataPath].filter(Boolean))}\n`).catch(() => {})
}
function diagnostic(error: unknown) {
  return createDiagnostic(error, { launcherVersion: app.getVersion(), installedVersion: state.installedVersion, operatingVersion: state.serverStatus?.activeVersion, phase: state.phase, message: state.message, dataPath: state.settings.dataPath, appRoot: store.root, memoryMb: state.settings.memoryMb, freeBytes: lastStorage?.freeBytes ?? undefined })
}
async function reportError(error: unknown) {
  const report = diagnostic(error)
  update({ phase: 'error', message: report.summary, progress: null, diagnostic: report })
  await log(report.details).catch(() => {})
  await atomicWrite(join(store.root, 'logs', 'latest-diagnostic.json'), JSON.stringify(report)).catch(() => {})
}
const formatBytes = (value: number) => value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(1)} GB` : `${Math.ceil(value / 1024 ** 2)} MB`
function update(patch: Partial<LauncherState>) {
  state = { ...state, ...patch }
  if (window && !window.isDestroyed()) window.webContents.send('sunrin:state-changed', state)
}
const progress: Progress = (message, value) => update({ message, progress: value })
async function checkRemotePack() {
  if (!remoteCheck) remoteCheck = (async () => {
    const result = await resolveRemotePack(store.root, bundledPaths, updateSourcePath, app.getVersion())
    paths = result.paths; launcherUpdate = result.updateRequired; operatingBlocked = result.blocked
    update({ updateMessage: result.message, serverStatus: result.serverStatus, changes: result.changes, availableVersion: (await loadManifest(paths.manifest)).version })
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
  if (Date.now() - lastAppUpdateCheck > 10 * 60 * 1000) await checkAppUpdate()
}

async function checkAppUpdate() {
  if (busy || applyingSelfUpdate || !app.isPackaged) return
  if (!appUpdateCheck) appUpdateCheck = (async () => {
    const previous = state.launcherUpdate
    update({ launcherUpdate: { ...previous, status: 'checking', message: '런처 업데이트를 확인하고 있어요.' } })
    try {
      appUpdate = await checkLauncherUpdate(app.getVersion(), `${process.platform}-${process.arch}`, { includeCurrent: true })
      if (applyingSelfUpdate) return
      update({ launcherUpdate: appUpdate ? { status: appUpdate.version === app.getVersion() ? 'idle' : 'available', version: appUpdate.version, changes: appUpdate.changes, message: appUpdate.version === app.getVersion() ? '최신 런처를 사용하고 있어요.' : `런처 ${appUpdate.version} 업데이트가 있어요.` } : { status: 'idle', message: '최신 런처를 사용하고 있어요.' } })
    } catch (error) {
      appUpdate = undefined
      if (!applyingSelfUpdate) update({ launcherUpdate: { ...previous, status: 'error', message: '런처 업데이트를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' } })
      await log(`Launcher update check: ${error instanceof Error ? error.message : 'failed'}`).catch(() => {})
    } finally { lastAppUpdateCheck = Date.now() }
  })().finally(() => { appUpdateCheck = undefined })
  await appUpdateCheck
}
async function acknowledgeAppUpdate() {
  if (!launcherReady || !rendererConnected || updateAcknowledged) return
  await acknowledgeLauncherUpdate(store.root, app.getVersion(), app.getPath('exe'), process.argv)
  updateAcknowledged = true
}
async function performAppUpdate() {
  if (!app.isPackaged) throw new Error('설치한 배포 앱에서 런처 업데이트를 사용해 주세요.')
  ensurePrismClosed(); await assertInstallIdle(state.settings.dataPath)
  // Recheck the release at click time; metadata never supplies executable scripts.
  const info = await checkLauncherUpdate(app.getVersion(), `${process.platform}-${process.arch}`)
  if (!info) { update({ launcherUpdate: { status: 'idle', message: '최신 런처를 사용하고 있어요.' } }); return }
  const choice = await dialog.showMessageBox(window!, { type: 'question', title: '런처 업데이트', message: `런처 ${info.version}로 업데이트할까요?`, detail: '런처 파일만 교체하고 자동으로 다시 시작합니다. 모드·로그인·설정·월드는 그대로 유지합니다.\n\n'+info.changes.map(change => `• ${change}`).join('\n'), buttons: ['업데이트', '취소'], defaultId: 0, cancelId: 1, noLink: true })
  if (choice.response !== 0) return
  applyingSelfUpdate = true
  appUpdate = info
  update({ launcherUpdate: { status: 'downloading', version: info.version, changes: info.changes, message: '새 런처를 다운로드하고 있어요.', progress: 0 } })
  try {
    const assetPath = await downloadLauncherUpdate(info, store.root, (message, value) => update({ launcherUpdate: { status: 'downloading', version: info.version, changes: info.changes, message, progress: value ?? undefined } }))
    update({ launcherUpdate: { status: 'applying', version: info.version, changes: info.changes, message: '런처 업데이트를 준비하고 있어요. 잠시 후 다시 시작합니다.' } })
    const exe = app.getPath('exe')
    const appPath = process.platform === 'darwin' ? dirname(dirname(dirname(exe))) : dirname(exe)
    const prepared = await prepareLauncherUpdate({ assetPath, info, root: store.root, appPath, executablePath: exe, currentVersion: app.getVersion(), protectedDataPath: state.settings.dataPath })
    await launchLauncherUpdate(prepared, process.pid)
    closeAllowed = true
    app.quit()
  } catch (error) {
    applyingSelfUpdate = false
    update({ launcherUpdate: { status: 'error', version: info.version, changes: info.changes, message: '런처 업데이트에 실패했어요. 기존 앱과 게임 데이터는 유지됩니다.' } })
    throw error
  }
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
      } else if ((sawGame && phaseForActivity(activity, launchRequested, sawGame) === undefined) || (!activity.prism && !activity.java)) {
        const finishedGame = sawGame
        stopMonitoring(); launchRequested = false; sawGame = false
        await sessionWrites; await clearLaunchSession(data)
        launchIdentity = undefined; launchPid = undefined; persistedStage = undefined; persistedKey = undefined
        await refresh()
        const crash = await readCurrentCrash(data, launchStartedAt).catch(() => undefined)
        if (crash) { stopMonitoring(); await reportError(crash) }
        else if (finishedGame) update({ message: '게임이 종료되었습니다. 다음에 또 만나요.' })
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
  const manifest = await loadManifest(paths.manifest)
  update({ availableVersion: manifest.version })
  let patch: Partial<LauncherState> = { ...result, progress: null }
  if (result.phase === 'update' && !primaryController.hasOffer()) patch = { ...patch, phase: 'ready', message: '게임 시작을 누르면 운영 버전을 확인합니다.' }
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
    await reportError(error)
    throw error
  } finally { busy = false; if (BrowserWindow.getAllWindows().length === 0) app.quit() }
}

async function install() {
  ensurePrismClosed()
  if (launcherUpdate || operatingBlocked || maintenance()) { await refresh(); return false }
  update({ phase: 'checking', message: '설치 용량과 디스크 여유 공간을 계산하고 있어요.', progress: null })
  const storage = await getStorageInfo(state.settings.dataPath, paths)
  lastStorage = storage
  if (storage.sufficient === false) throw Object.assign(new Error(`디스크 공간이 부족합니다. 추가 여유 공간 약 ${formatBytes(storage.requiredBytes)}이 필요하고 현재 ${formatBytes(storage.freeBytes!)}이 남아 있어요. 설정에서 설치 위치를 바꾸거나 공간을 확보해 주세요.`), { code: 'ENOSPC' })
  const choice = await dialog.showMessageBox(window!, {
    type: 'info', title: '선린밸리 설치 용량', message: state.installedVersion ? '업데이트에 필요한 공간을 확인했어요.' : '선린밸리를 설치할까요?',
    detail: `예상 다운로드: ${formatBytes(storage.downloadBytes)}\n예상 설치 구성: ${formatBytes(storage.estimatedInstalledBytes)}\n필요한 추가 여유 공간: 약 ${formatBytes(storage.requiredBytes)}\n현재 여유 공간: ${storage.freeBytes === null ? '확인하지 못함' : formatBytes(storage.freeBytes)}\n\n압축 해제·실행 환경·복구 파일과 여유 공간을 포함한 예상치예요. 월드 사용량에 따라 늘어날 수 있어요.`,
    buttons: ['설치 진행', '취소'], defaultId: 0, cancelId: 1, noLink: true
  })
  if (choice.response !== 0) { await refresh(); return false }
  update({ phase: 'installing', progress: 0, message: '선린밸리 설치를 준비합니다.' })
  await installClient(state.settings, paths, progress)
  await log('Installation verified and receipt written')
  await refresh()
  update({ message: '준비 완료! 게임 시작을 누르면 필요한 로그인을 안내합니다.' })
  return true
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
    launchRequested = true; sawGame = activity.game; launchStartedAt = Date.now()
    update({ phase: activity.game ? 'running' : 'authenticating', progress: null, message: activity.game ? 'Minecraft가 실행 중입니다.' : 'Microsoft 계정을 확인합니다. 필요한 경우 로그인 창에서 계속해 주세요.' })
  }
  await connectEngineLog(data)
  // The engine and its downloads survive closing the frontend. Its own UTF-8 log
  // supplies whitelisted stages without an stdout pipe tied to this process.
  let earlyFailure = false
  const child = spawn(binary, prismArguments(data, !launch), { detached: true, stdio: 'ignore', windowsHide: true })
  child.on('error', error => { earlyFailure = true; void reportError(error) })
  child.on('exit', (code, signal) => {
    void log(`Prism exited with ${code}`)
    if (child === prismProcess) prismProcess = undefined
    if ((code || signal) && launch) {
      earlyFailure = true
      stopMonitoring(); launchRequested = false
      launchIdentity = undefined; launchPid = undefined; persistedStage = undefined; persistedKey = undefined
      void readCurrentCrash(data, launchStartedAt).catch(() => undefined).then(crash => reportError(crash ?? new Error(`실행 환경이 종료되었습니다(${code ?? signal}). Prism 직접 열기에서 게임 오류를 확인할 수 있어요.`)))
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
  ipcMain.handle(channel, async (event, ...args) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('허용되지 않은 요청입니다.')
    try { return await callback(...args) }
    catch (error) { throw new Error(sanitizeDiagnosticText(error instanceof Error ? error.message : String(error), [store.root, state.settings.dataPath])) }
  })
}

function createWindow() {
  closeAllowed = false
  window = new BrowserWindow({
    width: 1040, height: 740, minWidth: 768, minHeight: 600,
    title: '선린밸리 · Sunrin Valley', backgroundColor: '#f3eedc', autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  window.on('close', event => {
    if (closeAllowed || !state || (!busy && !['checking', 'installing', 'launching', 'authenticating', 'preparing'].includes(state.phase))) return
    event.preventDefault()
    if (closePrompt) return
    closePrompt = true
    void dialog.showMessageBox(window!, {
      type: 'question', title: '선린밸리 준비 중', message: '창을 닫아도 준비는 계속돼요.',
      detail: '설치·업데이트 또는 게임 준비는 백그라운드에서 계속됩니다. 다시 실행하면 진행 상태를 확인할 수 있어요. 로그인 창이 열려 있다면 그 창에서 계속해 주세요.',
      buttons: ['계속 보기', '창만 닫기'], defaultId: 0, cancelId: 0, noLink: true
    }).then(result => { if (result.response === 1 && window && !window.isDestroyed()) { closeAllowed = true; window.close() } }).catch(() => {}).finally(() => { closePrompt = false })
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    const permitted = process.env.ELECTRON_RENDERER_URL ?? pathToFileURL(join(__dirname, '../renderer/index.html')).href
    if (url !== permitted) event.preventDefault()
  })
  window.webContents.on('render-process-gone', (_event, details) => { void reportError(new Error(`화면이 종료되었습니다: ${details.reason}`)) })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}

async function ensureLauncherMarker(root: string) {
  const marker = join(root, '.sunrin-launcher.json')
  await assertNoSymlinks(root, marker)
  if (await exists(marker)) {
    const value = JSON.parse(await readFile(marker, 'utf8'))
    if (value.id !== 'sunrin-valley-launcher' || value.formatVersion !== 1) throw new Error('런처 데이터의 관리 정보가 올바르지 않습니다.')
  } else await atomicWrite(marker, JSON.stringify({ id: 'sunrin-valley-launcher', formatVersion: 1 }))
}
async function uninstallData(root: string) {
  const settings = await new SettingsStore(root).load()
  await assertInstallIdle(settings.dataPath)
  // app.getPath('userData') is owned by this installed app; initialize the same
  // marker on a first uninstall or an upgrade from a pre-marker launcher.
  await ensureLauncherMarker(root)
  await validateLauncherStateRemoval(root, settings.minecraftPath)
  await removeSunrinData(settings.dataPath, settings.minecraftPath, root)
  await removeLauncherState(root, settings.minecraftPath)
}
async function uninstallMac() {
  if (!app.isPackaged) { dialog.showErrorBox('선린밸리 제거', '설치한 배포 앱에서 제거를 실행해 주세요.'); return }
  try {
    ensureIdle(); ensurePrismClosed(); await assertInstallIdle(state.settings.dataPath)
    const result = await dialog.showMessageBox(window!, { type: 'warning', title: '선린밸리 제거', message: '선린밸리 앱과 전용 데이터를 제거할까요?', detail: '전용 모드·리소스팩·Java·Prism·로그인 정보·캐시·설정·저장한 월드가 삭제됩니다. 월드는 먼저 백업해 주세요. 기존 Minecraft 폴더는 유지됩니다.', buttons: ['취소', '전체 제거'], defaultId: 0, cancelId: 0, noLink: true })
    if (result.response !== 1) return
    await task(async () => {
      const bundle = dirname(dirname(dirname(app.getPath('exe'))))
      if (!bundle.endsWith('.app')) throw new Error('설치된 앱 경로를 확인하지 못했습니다.')
      await uninstallData(store.root)
      await shell.trashItem(bundle)
      closeAllowed = true; app.quit()
    })
  } catch (error) { await reportError(error) }
}

if (process.env.SUNRIN_APP_DATA) {
  const testRoot = resolve(process.env.SUNRIN_APP_DATA)
  // Packaged test profiles must already be ours or empty. An arbitrary populated
  // override must never become eligible for recursive uninstall by being opened.
  if (app.isPackaged && existsSync(testRoot)) {
    if (lstatSync(testRoot).isSymbolicLink()) app.exit(1)
    const marker = join(testRoot, '.sunrin-launcher.json')
    if (readdirSync(testRoot).length) {
      let owned = false
      try { const owner = JSON.parse(readFileSync(marker, 'utf8')); owned = !lstatSync(marker).isSymbolicLink() && owner.id === 'sunrin-valley-launcher' && owner.formatVersion === 1 } catch { /* Refuse unowned populated overrides. */ }
      if (!owned) app.exit(1)
    }
  }
  mkdirSync(testRoot, { recursive: true })
  app.setPath('userData', testRoot)
}
if (uninstallMode) {
  if (!app.requestSingleInstanceLock()) app.exit(1)
  else void app.whenReady().then(async () => {
    if (!app.isPackaged) throw new Error('배포 앱에서 제거를 실행해 주세요.')
    await uninstallData(app.getPath('userData'))
    app.exit(0)
  }).catch(() => app.exit(1))
}
else if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { if (window && !window.isDestroyed()) { if (window.isMinimized()) window.restore(); window.focus() } else if (state) createWindow() })
  app.whenReady().then(async () => {
    const root = process.env.SUNRIN_APP_DATA ? resolve(process.env.SUNRIN_APP_DATA) : app.getPath('userData')
    store = new SettingsStore(root); logPath = join(root, 'logs', 'launcher.log')
    await ensureLauncherMarker(root)
    const pack = app.isPackaged ? join(process.resourcesPath, 'pack') : resolve(__dirname, '../../..')
    bundledPaths = app.isPackaged ? {
      manifest: join(pack, 'manifest.json'), prism: join(pack, 'prism-runtime.json'), customPack: join(pack, 'Sunrin-Custom.zip'), startup: join(pack, 'sunrin_items.js')
    } : {
      manifest: join(pack, 'client-pack/manifest.json'), prism: join(pack, 'client-pack/prism-runtime.json'), customPack: join(pack, 'resourcepacks/dist/Sunrin-Custom.zip'), startup: join(pack, 'kubejs-custom/startup_scripts/sunrin_items.js')
    }
    paths = bundledPaths
    updateSourcePath = app.isPackaged ? join(pack, 'update-source.json') : join(pack, 'client-pack/update-source.json')
    state = { phase: 'checking', message: '최신 게임 구성 확인 중', progress: null, settings: await store.load(), launcherVersion: app.getVersion(), memoryRecommendation: recommendMemory(Math.floor(totalmem() / 1024 ** 2)) }
    try {
      const text = await readFile(join(root, 'logs', 'latest-diagnostic.json'), 'utf8')
      if (text.length <= 128 * 1024) {
        const previous = JSON.parse(text)
        if (['id', 'createdAt', 'summary', 'details'].every(key => typeof previous[key] === 'string')) state.diagnostic = previous
      }
    } catch { /* A missing or damaged previous report does not prevent startup. */ }
    handle('sunrin:state', () => { rendererConnected = true; void acknowledgeAppUpdate().catch(error => { void log(`Update acknowledgment: ${error instanceof Error ? error.message : 'failed'}`) }); return state })
    handle('sunrin:primary', () => task(async () => {
      update({ phase: 'checking', message: '최신 게임 구성 확인 중', progress: null })
      await checkRemotePack()
      if (launcherUpdate) { await refresh(); await performAppUpdate(); return }
      if (operatingBlocked || maintenance()) { await refresh(); return }
      await primaryController.run({
        check: async () => {
          const result = await inspectInstall(state.settings, paths)
          return { phase: result.phase === 'ready' || result.phase === 'update' || result.phase === 'repair' || result.phase === 'not-installed' ? result.phase : 'blocked', key: await bundleFingerprint(paths) }
        },
        offer: () => update({ phase: 'update', progress: null, message: `운영 버전 ${state.availableVersion ?? ''} 업데이트가 있어요. 버튼을 눌러 적용하고 실행하세요.` }),
        install,
        launch: async () => {
          await checkRemotePack()
          if (launcherUpdate || operatingBlocked || maintenance()) { await refresh(); return }
          if ((await inspectInstall(state.settings, paths)).phase !== 'ready') { await refresh(); return }
          await prism(true)
        }
      })
    }))
    handle('sunrin:repair', () => task(async () => { await checkRemotePack(); await install() }))
    handle('sunrin:open-prism', () => task(() => prism(false)))
    handle('sunrin:choose-directory', async () => { const result = await dialog.showOpenDialog(window!, { properties: ['openDirectory', 'createDirectory'] }); return result.canceled ? null : result.filePaths[0] })
    handle('sunrin:save-settings', (settings: Settings) => task(async () => { ensurePrismClosed(); await assertInstallIdle(state.settings.dataPath); await assertInstallIdle(store.validate(settings).dataPath); await store.save(settings); primaryController.clear(); lastStorage = undefined; update({ settings: await store.load(), phase: 'checking' }); await refresh() }))
    handle('sunrin:open-logs', async () => { await mkdir(join(root, 'logs'), { recursive: true }); const error = await shell.openPath(join(root, 'logs')); if (error) throw new Error(error) })
    handle('sunrin:open-instance', async () => { await claimDataDirectory(state.settings.dataPath); const path = gameRoot(state.settings.dataPath); await mkdir(path, { recursive: true }); const error = await shell.openPath(path); if (error) throw new Error(error) })
    handle('sunrin:storage', async () => { const storage = await getStorageInfo(state.settings.dataPath, paths); lastStorage = storage; return storage })
    handle('sunrin:launcher-update-check', () => checkAppUpdate())
    handle('sunrin:launcher-update-apply', () => task(performAppUpdate))
    handle('sunrin:copy-diagnostics', () => { clipboard.writeText((state.diagnostic ?? diagnostic(new Error('사용자가 요청한 현재 상태 정보'))).details) })
    handle('sunrin:save-diagnostics', async () => {
      const report = state.diagnostic ?? diagnostic(new Error('사용자가 요청한 현재 상태 정보'))
      const result = await dialog.showSaveDialog(window!, { title: '선린밸리 진단 파일 저장', defaultPath: join(app.getPath('documents'), `sunrin-diagnostics-${report.createdAt.replace(/[:.]/g, '-')}.txt`), filters: [{ name: '텍스트 파일', extensions: ['txt'] }] })
      if (result.canceled || !result.filePath) return false
      await saveDiagnosticReport(result.filePath, report.details)
      return true
    })
    if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { label: '선린밸리 제거…', click: () => { void uninstallMac() } }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
      { role: 'editMenu' }, { role: 'windowMenu' }
    ]))
    // App health is local renderer readiness, independent of a slow game CDN.
    launcherReady = true
    createWindow()
    void checkAppUpdate()
    await checkRemotePack(); await refresh(); await log('Launcher ready')
    await acknowledgeAppUpdate()
    stopStatusPolling = startStatusPolling(pollOperation, () => !busy && !['checking', 'installing', 'authenticating', 'preparing', 'launching', 'running'].includes(state.phase))
  }).catch(async error => { if (state) await reportError(error); dialog.showErrorBox('선린밸리 시작 오류', `${sanitizeDiagnosticText(String(error.message))}\n설정 파일과 설치 경로를 확인해 주세요.`); closeAllowed = true; app.quit() })
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0 && state) createWindow() })
  app.on('window-all-closed', () => { if (!busy) app.quit() })
  app.on('before-quit', event => {
    if (pendingSessionWrites) { event.preventDefault(); void sessionWrites.finally(() => app.quit()) }
  })
  app.on('will-quit', () => { stopStatusPolling?.(); stopMonitoring() })
}
