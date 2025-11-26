import { ElectronAPI } from "@electron-toolkit/preload";

declare type Command = {
  id?: number;
  command: string;
  description?: string;
  groupName?: string;
  created_at?: string;
};

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      createCommand: (payload: {
        command: string;
        description?: string;
        groupName?: string;
      }) => Promise<Command>;
      updateCommand: (payload: {
        id: number;
        command: string;
        description?: string;
        groupName?: string;
      }) => Promise<Command>;
      deleteCommand: (id: number) => Promise<{ ok: boolean }>;
      getCommands: (filters?: { groupName?: string; search?: string }) => Promise<Command[]>;
      getGroups: () => Promise<string[]>;
      exportData: () => Promise<{ cancelled: boolean; filePath?: string }>;
      importData: () => Promise<{ cancelled: boolean; count?: number } | { error: string }>;
      setAlwaysOnTop: (onTop: boolean) => Promise<{ ok: boolean }>;
      getAlwaysOnTop: () => Promise<boolean>;
      renameGroup: (oldName: string, newName: string) => Promise<{ ok: boolean; message?: string }>;
      deleteGroup: (groupName: string) => Promise<{ ok: boolean; message?: string }>;
      deleteAll: () => Promise<{ ok: boolean; message?: string }>;
      loadGoogleKey: () => Promise<{
        canceled: boolean;
        filePath?: string;
        content?: string;
      }>;
      saveGoogleKey: (content: string) => Promise<{ ok: boolean }>;
      encryptKey: (content: string) => Promise<string>;
      decryptKey: (base64: string) => Promise<string>;
      keystoreSave: (base64: string) => Promise<{
        ok: boolean;
        path?: string;
        error?: string;
        length?: number;
        prefix?: string;
        chunked?: boolean;
        parts?: number;
        fallbackPath?: string;
      }>;
      keystoreLoad: () => Promise<{
        ok: boolean;
        content?: string | null;
        error?: string;
      }>;
      keystoreDelete: () => Promise<{ ok: boolean; error?: string }>;
      keystoreSaveSheet: (sheetId: string) => Promise<{ ok: boolean; error?: string }>;
      keystoreLoadSheet: () => Promise<{
        ok: boolean;
        content?: string | null;
        error?: string;
      }>;
      keystoreDeleteAll: () => Promise<{ ok: boolean; error?: string }>;
      settingsGet: (
        key: string
      ) => Promise<{ ok: boolean; value?: unknown } | { ok: false; error?: string }>;
      settingsSet: (
        key: string,
        value: unknown
      ) => Promise<{ ok: boolean; error?: string } | { ok: false; error?: string }>;
      sheetsHasData: (
        sheetId: string
      ) => Promise<{ ok: boolean; hasData: boolean } | { ok: false; error?: string }>;
      sheetsGetRows: (
        sheetId: string,
        range?: string
      ) => Promise<{ ok: boolean; rows: string[][] } | { ok: false; error?: string }>;
      sheetsPushRows: (
        sheetId: string,
        range: string,
        values: string[][]
      ) => Promise<{ ok: boolean; updated?: unknown } | { ok: false; error?: string }>;
      sheetsGetModifiedTime: (
        sheetId: string
      ) => Promise<
        | { ok: boolean; modifiedTime: string | null; name: string | null }
        | { ok: false; error?: string }
      >;
      sheetsClearRange: (
        sheetId: string,
        range?: string
      ) => Promise<{ ok: boolean } | { ok: false; error?: string }>;
      sheetsUpdateRange: (
        sheetId: string,
        range: string,
        values: string[][]
      ) => Promise<{ ok: boolean; updated?: number } | { ok: false; error?: string }>;
      syncNow: () => Promise<
        | { ok: boolean; action?: "pulled" | "pushed" | "no-change"; details?: string }
        | { ok: false; error?: string }
      >;
      syncStatus: () => Promise<
        | {
            ok: boolean;
            hasCredentials: boolean;
            hasSheetId: boolean;
            lastSyncTimestamp: string | null;
            ready: boolean;
          }
        | { ok: false; error?: string }
      >;
      isDev?: boolean;
    };
  }
}
