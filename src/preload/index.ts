import { contextBridge, ipcRenderer, safeStorage } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
type CommandPayload = {
  command: string;
  description?: string;
  groupName?: string;
};
type CommandUpdatePayload = {
  id: number;
  command: string;
  description?: string;
  groupName?: string;
};
type Filters = {
  groupName?: string;
  search?: string;
};

const api = {
  createCommand: (payload: CommandPayload) => ipcRenderer.invoke("db-create-command", payload),

  updateCommand: (payload: CommandUpdatePayload) =>
    ipcRenderer.invoke("db-update-command", payload),
  deleteCommand: (id: number) => ipcRenderer.invoke("db-delete-command", id),
  getCommands: (filters?: Filters) => ipcRenderer.invoke("db-get-commands", filters),
  getGroups: () => ipcRenderer.invoke("db-get-groups"),
  exportData: () => ipcRenderer.invoke("db-export"),
  importData: () => ipcRenderer.invoke("db-import"),
  setAlwaysOnTop: (onTop: boolean) => ipcRenderer.invoke("set-always-on-top", onTop),
  getAlwaysOnTop: () => ipcRenderer.invoke("get-always-on-top"),
  renameGroup: (oldName: string, newName: string) =>
    ipcRenderer.invoke("db-rename-group", oldName, newName),
  deleteGroup: (groupName: string) => ipcRenderer.invoke("db-delete-group", groupName)
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    const apiFull = {
      ...api,
      loadGoogleKey: (): Promise<{ canceled: boolean; filePath?: string; content?: string }> =>
        ipcRenderer.invoke("google-load-key"),
      saveGoogleKey: (content: string): Promise<{ ok: boolean }> =>
        ipcRenderer.invoke("google-save-key", content),
      encryptKey: (content: string): Promise<string> =>
        // returns base64 encoded encrypted value
        Promise.resolve(safeStorage.encryptString(content).toString("base64")),
      decryptKey: (base64: string): Promise<string> =>
        Promise.resolve(safeStorage.decryptString(Buffer.from(base64, "base64"))),
      // Keystore handlers - persist the base64 encrypted key via main process
      keystoreSave: (base64: string) => ipcRenderer.invoke("keystore-save", base64),
      keystoreLoad: () => ipcRenderer.invoke("keystore-load"),
      keystoreDelete: () => ipcRenderer.invoke("keystore-delete"),
      // sheet id keystore
      keystoreSaveSheet: (sheetId: string) => ipcRenderer.invoke("keystore-save-sheet", sheetId),
      keystoreLoadSheet: () => ipcRenderer.invoke("keystore-load-sheet"),
      keystoreDeleteAll: () => ipcRenderer.invoke("keystore-delete-all")
    };
    contextBridge.exposeInMainWorld("api", apiFull);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
