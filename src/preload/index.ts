import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
type CommandPayload = {
  command: string
  description?: string
  groupName?: string
}
type CommandUpdatePayload = {
  id: number
  command: string
  description?: string
  groupName?: string
}
type Filters = {
  groupName?: string
  search?: string
}

const api = {
  createCommand: (payload: CommandPayload) => ipcRenderer.invoke('db-create-command', payload),

  updateCommand: (payload: CommandUpdatePayload) =>
    ipcRenderer.invoke('db-update-command', payload),
  deleteCommand: (id: number) => ipcRenderer.invoke('db-delete-command', id),
  getCommands: (filters?: Filters) => ipcRenderer.invoke('db-get-commands', filters),
  getGroups: () => ipcRenderer.invoke('db-get-groups'),
  exportData: () => ipcRenderer.invoke('db-export'),
  importData: () => ipcRenderer.invoke('db-import')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
