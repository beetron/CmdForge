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
  deleteGroup: (groupName: string) => ipcRenderer.invoke("db-delete-group", groupName),
  deleteAll: () => ipcRenderer.invoke("db-delete-all")
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
      encryptKey: async (content: string): Promise<string> => {
        try {
          if (typeof safeStorage !== "undefined" && safeStorage.encryptString)
            return Promise.resolve(safeStorage.encryptString(content).toString("base64"));
          // fallback using basic base64 if safeStorage not available
          console.warn(
            "safeStorage missing in preload; falling back to base64 encoding for encryptKey"
          );
          return Buffer.from(content, "utf8").toString("base64");
        } catch (err) {
          console.error("encryptKey error", err);
          throw err;
        }
      },
      decryptKey: async (base64: string): Promise<string> => {
        try {
          if (typeof safeStorage !== "undefined" && safeStorage.decryptString) {
            try {
              return Promise.resolve(safeStorage.decryptString(Buffer.from(base64, "base64")));
            } catch (err) {
              // If safeStorage is available but decryption fails (e.g., data was not encrypted),
              // fallback to a base64 decode so we can still read legacy or plain base64 content.
              console.warn(
                "safeStorage.decryptString failed; falling back to base64 decoding",
                err
              );
              return Buffer.from(base64, "base64").toString("utf8");
            }
          }
          // fallback: base64 decode
          console.warn(
            "safeStorage missing in preload; falling back to base64 decoding for decryptKey"
          );
          return Buffer.from(base64, "base64").toString("utf8");
        } catch (err) {
          console.error("decryptKey error", err);
          throw err;
        }
      },
      // Keystore handlers - persist the base64 encrypted key via main process
      keystoreSave: (base64: string) => ipcRenderer.invoke("keystore-save", base64),
      keystoreLoad: () => ipcRenderer.invoke("keystore-load"),
      keystoreDelete: () => ipcRenderer.invoke("keystore-delete"),
      // sheet id keystore
      keystoreSaveSheet: (sheetId: string) => ipcRenderer.invoke("keystore-save-sheet", sheetId),
      keystoreLoadSheet: () => ipcRenderer.invoke("keystore-load-sheet"),
      keystoreDeleteAll: () => ipcRenderer.invoke("keystore-delete-all"),
      // Settings store
      settingsGet: (key: string) => ipcRenderer.invoke("settings-get", key),
      settingsSet: (key: string, value: unknown) => ipcRenderer.invoke("settings-set", key, value),
      sheetsHasData: (sheetId: string) => ipcRenderer.invoke("sheets-has-data", sheetId),
      sheetsGetRows: (sheetId: string, range?: string) =>
        ipcRenderer.invoke("sheets-get-rows", sheetId, range),
      sheetsPushRows: (sheetId: string, range: string, values: string[][]) =>
        ipcRenderer.invoke("sheets-push-rows", sheetId, range, values),
      sheetsGetModifiedTime: (sheetId: string) =>
        ipcRenderer.invoke("sheets-get-modified-time", sheetId),
      sheetsClearRange: (sheetId: string, range?: string) =>
        ipcRenderer.invoke("sheets-clear-range", sheetId, range),
      sheetsUpdateRange: (sheetId: string, range: string, values: string[][]) =>
        ipcRenderer.invoke("sheets-update-range", sheetId, range, values),
      syncNow: () => ipcRenderer.invoke("sync-now"),
      syncStatus: () => ipcRenderer.invoke("sync-status")
    };
    // expose a simple development flag to the renderer
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    apiFull.isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";
    contextBridge.exposeInMainWorld("api", apiFull);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = {
    ...api,
    loadGoogleKey: (): Promise<{ canceled: boolean; filePath?: string; content?: string }> =>
      ipcRenderer.invoke("google-load-key"),
    saveGoogleKey: (content: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke("google-save-key", content),
    encryptKey: async (content: string): Promise<string> => {
      try {
        if (typeof safeStorage !== "undefined" && safeStorage.encryptString)
          return Promise.resolve(safeStorage.encryptString(content).toString("base64"));
        console.warn(
          "safeStorage missing in preload; falling back to base64 encoding for encryptKey"
        );
        return Buffer.from(content, "utf8").toString("base64");
      } catch (err) {
        console.error("encryptKey fallback error", err);
        throw err;
      }
    },
    decryptKey: async (base64: string): Promise<string> => {
      try {
        if (typeof safeStorage !== "undefined" && safeStorage.decryptString)
          return Promise.resolve(safeStorage.decryptString(Buffer.from(base64, "base64")));
        console.warn(
          "safeStorage missing in preload; falling back to base64 decoding for decryptKey"
        );
        return Buffer.from(base64, "base64").toString("utf8");
      } catch (err) {
        console.error("decryptKey fallback error", err);
        throw err;
      }
    },
    // Keystore handlers - persist the base64 encrypted key via main process
    keystoreSave: (base64: string) => ipcRenderer.invoke("keystore-save", base64),
    keystoreLoad: () => ipcRenderer.invoke("keystore-load"),
    keystoreDelete: () => ipcRenderer.invoke("keystore-delete"),
    // sheet id keystore
    keystoreSaveSheet: (sheetId: string) => ipcRenderer.invoke("keystore-save-sheet", sheetId),
    keystoreLoadSheet: () => ipcRenderer.invoke("keystore-load-sheet"),
    keystoreDeleteAll: () => ipcRenderer.invoke("keystore-delete-all"),
    // settings store
    settingsGet: (key: string) => ipcRenderer.invoke("settings-get", key),
    settingsSet: (key: string, value: unknown) => ipcRenderer.invoke("settings-set", key, value),
    sheetsHasData: (sheetId: string) => ipcRenderer.invoke("sheets-has-data", sheetId),
    sheetsGetRows: (sheetId: string, range?: string) =>
      ipcRenderer.invoke("sheets-get-rows", sheetId, range),
    sheetsPushRows: (sheetId: string, range: string, values: string[][]) =>
      ipcRenderer.invoke("sheets-push-rows", sheetId, range, values),
    sheetsGetModifiedTime: (sheetId: string) =>
      ipcRenderer.invoke("sheets-get-modified-time", sheetId),
    sheetsClearRange: (sheetId: string, range?: string) =>
      ipcRenderer.invoke("sheets-clear-range", sheetId, range),
    sheetsUpdateRange: (sheetId: string, range: string, values: string[][]) =>
      ipcRenderer.invoke("sheets-update-range", sheetId, range, values),
    syncNow: () => ipcRenderer.invoke("sync-now"),
    syncStatus: () => ipcRenderer.invoke("sync-status"),
    isDev: process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev"
  };
}
