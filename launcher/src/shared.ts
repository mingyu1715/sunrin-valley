export type Phase = 'checking' | 'not-installed' | 'ready' | 'update' | 'launcher-update' | 'maintenance' | 'repair' | 'installing' | 'launching' | 'authenticating' | 'preparing' | 'running' | 'error'
export interface Settings {
  dataPath: string
  memoryMb: number
  minecraftPath: string
  importOptions: boolean
  shareShaders: boolean
}
export interface MemoryRecommendation { totalMb: number; minimumMb: number; preferredMb: number; recommendedMb: number }
export interface StorageInfo {
  installedBytes: number
  freeBytes: number | null
  requiredBytes: number
  downloadBytes: number
  estimatedInstalledBytes: number
  sufficient: boolean | null
}
export interface DiagnosticReport { id: string; createdAt: string; summary: string; details: string }
export interface LauncherUpdateInfo {
  version: string
  changes: string[]
  asset: { url: string; sha256: string; size: number; kind: 'dmg' | 'zip' }
}
export interface LauncherUpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'applying' | 'error'
  version?: string
  changes?: string[]
  message?: string
  progress?: number
}
export interface ServerStatus {
  state: 'unconfigured' | 'online' | 'scheduled' | 'maintenance' | 'failed' | 'unknown'
  activeVersion: string
  targetVersion?: string
  startsAt?: string
  message: string
}
export interface LauncherState {
  phase: Phase
  message: string
  progress: number | null
  installedVersion?: string
  settings: Settings
  memoryRecommendation?: MemoryRecommendation
  updateMessage?: string
  serverStatus?: ServerStatus
  changes?: string[]
  launcherVersion?: string
  availableVersion?: string
  diagnostic?: DiagnosticReport
  launcherUpdate?: LauncherUpdateState
}
export interface SunrinAPI {
  getState(): Promise<LauncherState>
  primaryAction(): Promise<void>
  saveSettings(settings: Settings): Promise<void>
  chooseDirectory(): Promise<string | null>
  openPrism(): Promise<void>
  repair(): Promise<void>
  openLogs(): Promise<void>
  openInstance(): Promise<void>
  getStorageInfo(): Promise<StorageInfo>
  copyDiagnostics(): Promise<void>
  saveDiagnostics(): Promise<boolean>
  checkLauncherUpdate(): Promise<void>
  applyLauncherUpdate(): Promise<void>
  onState(callback: (state: LauncherState) => void): () => void
}
declare global { interface Window { sunrin?: SunrinAPI } }
