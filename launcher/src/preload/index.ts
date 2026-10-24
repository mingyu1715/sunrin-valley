import { contextBridge, ipcRenderer } from 'electron'
import type { LauncherState, SunrinAPI } from '../shared'

const api: SunrinAPI = {
  getState: () => ipcRenderer.invoke('sunrin:state'),
  primaryAction: () => ipcRenderer.invoke('sunrin:primary'),
  saveSettings: settings => ipcRenderer.invoke('sunrin:save-settings', settings),
  chooseDirectory: () => ipcRenderer.invoke('sunrin:choose-directory'),
  openPrism: () => ipcRenderer.invoke('sunrin:open-prism'),
  repair: () => ipcRenderer.invoke('sunrin:repair'),
  openLogs: () => ipcRenderer.invoke('sunrin:open-logs'),
  openInstance: () => ipcRenderer.invoke('sunrin:open-instance'),
  onState: callback => {
    const handler = (_event: unknown, state: LauncherState) => callback(state)
    ipcRenderer.on('sunrin:state-changed', handler)
    return () => ipcRenderer.removeListener('sunrin:state-changed', handler)
  }
}
contextBridge.exposeInMainWorld('sunrin', api)
