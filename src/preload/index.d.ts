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
      loadGoogleKey: () => Promise<{
        canceled: boolean;
        filePath?: string;
        content?: string;
      }>;
      saveGoogleKey: (content: string) => Promise<{ ok: boolean }>;
      encryptKey: (content: string) => Promise<string>;
      decryptKey: (base64: string) => Promise<string>;
      keystoreSave: (base64: string) => Promise<{ ok: boolean; path?: string }>;
      keystoreLoad: () => Promise<{
        ok: boolean;
        content?: string | null;
      }>;
      keystoreDelete: () => Promise<{ ok: boolean }>;
      keystoreSaveSheet: (sheetId: string) => Promise<{ ok: boolean }>;
      keystoreLoadSheet: () => Promise<{ ok: boolean; content?: string | null }>;
      keystoreDeleteAll: () => Promise<{ ok: boolean }>;
    };
  }
}
