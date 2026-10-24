export type Phase = 'checking' | 'not-installed' | 'ready' | 'update' | 'repair' | 'installing' | 'launching' | 'error'
export interface Settings {
  dataPath: string
  memoryMb: number
  minecraftPath: string
  importOptions: boolean
  shareShaders: boolean
}
export interface LauncherState {
  phase: Phase
  message: string
  progress: number | null
  installedVersion?: string
  settings: Settings
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
  onState(callback: (state: LauncherState) => void): () => void
}
declare global { interface Window { sunrin?: SunrinAPI } }
