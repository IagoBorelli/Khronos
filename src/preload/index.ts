import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI, ElectronAPI } from '@electron-toolkit/preload'

// 1. Definimos o "formato" (Interface) da nossa API customizada
export interface IpcApi {
  getData: (key: string) => Promise<any>
  setData: (key: string, value: any) => Promise<boolean>
  onNavigate: (callback: (tab: string) => void) => void
}

// 2. Avisamos ao TypeScript que o Window global possui essas propriedades
declare global {
  interface Window {
    electron: ElectronAPI
    api: IpcApi
  }
}

// 3. Implementamos a API com as tipagens corretas
const api: IpcApi = {
  getData: (key: string) => ipcRenderer.invoke('get-data', key),
  setData: (key: string, value: any) => ipcRenderer.invoke('set-data', key, value),
  onNavigate: (callback: (tab: string) => void) => {
    ipcRenderer.removeAllListeners('navigate-tab')
    ipcRenderer.on('navigate-tab', (_event: IpcRendererEvent, tab: any) => callback(tab as string))
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}