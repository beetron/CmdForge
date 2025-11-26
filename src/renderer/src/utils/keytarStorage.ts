// NOTE: We rely on preload API; keep helper wrappers for clarity in code.
export type SaveKeyResult = {
  ok: boolean;
  keyOk?: boolean;
  sheetOk?: boolean;
  error?: string;
  keyLength?: number;
  keyPrefix?: string;
  keyFallbackPath?: string;
  keyChunked?: boolean;
  keyParts?: number;
};
export const saveKeyToStorage = async (json: string, sheetId?: string): Promise<SaveKeyResult> => {
  try {
    // @ts-ignore: preload exposes encryptKey and keystoreSave
    const b64 = await window.api.encryptKey(json);
    // @ts-ignore: preload exposes keystoreSave
    const keyRes = await window.api.keystoreSave(b64);
    const keyOk = keyRes?.ok ?? false;
    if (!keyOk)
      return {
        ok: false,
        keyOk: false,
        error: keyRes?.error,
        keyLength: keyRes?.length,
        keyPrefix: keyRes?.prefix,
        keyFallbackPath: keyRes?.fallbackPath
      };
    // Save sheet id if present
    if (sheetId) {
      // @ts-ignore: preload exposes keystoreSaveSheet
      const sheetRes = await window.api.keystoreSaveSheet(sheetId);
      const sheetOk = sheetRes?.ok ?? false;
      if (!sheetOk)
        return {
          ok: false,
          keyOk: true,
          sheetOk: false,
          error: sheetRes?.error,
          keyLength: keyRes?.length,
          keyPrefix: keyRes?.prefix,
          keyFallbackPath: keyRes?.fallbackPath
        };
      return {
        ok: true,
        keyOk: true,
        sheetOk: true,
        keyLength: keyRes?.length,
        keyPrefix: keyRes?.prefix,
        keyFallbackPath: keyRes?.fallbackPath,
        keyChunked: keyRes?.chunked ?? false,
        keyParts: keyRes?.parts
      };
    }
    return {
      ok: true,
      keyOk: true,
      keyLength: keyRes?.length,
      keyPrefix: keyRes?.prefix,
      keyFallbackPath: keyRes?.fallbackPath,
      keyChunked: keyRes?.chunked ?? false,
      keyParts: keyRes?.parts
    };
  } catch (err) {
    console.error("saveKeyToStorage error", err);
    return { ok: false, error: (err as Error)?.message ?? String(err) };
  }
};

export const getKeyFromStorage = async (): Promise<string | null> => {
  try {
    // @ts-ignore: preload exposes keystoreLoad and decryptKey
    const res = await window.api.keystoreLoad();
    let content = null as string | null;
    if (res && res.ok && res.content) {
      // decrypt
      // @ts-ignore: preload exposes decryptKey
      content = await window.api.decryptKey(res.content);
      return content ?? null;
    }
    // if we receive an error or no content, log it for diagnostics; fallback to localStorage
    if (res && !res.ok) {
      console.warn("getKeyFromStorage: keystoreLoad returned not OK", res.error);
    }
    // fallback to localStorage for legacy data
    const STORAGE_KEY = "cmdforge.google.credentials";
    const b64 = localStorage.getItem(STORAGE_KEY);
    if (!b64) return null;
    // @ts-ignore: preload exposes decryptKey
    const decrypted = await window.api.decryptKey(b64);
    return decrypted ?? null;
  } catch (err) {
    console.error("getKeyFromStorage error", err);
    return null;
  }
};

export const saveSheetIdToStorage = async (sheetId: string): Promise<boolean> => {
  try {
    // @ts-ignore: preload exposes keystore functions
    const ok = await window.api.keystoreSaveSheet(sheetId);
    return ok?.ok ?? false;
  } catch (err) {
    console.error("saveSheetIdToStorage error", err);
    return false;
  }
};

export const getSheetIdFromStorage = async (): Promise<string | null> => {
  try {
    // @ts-ignore: preload exposes keystore functions
    const res = await window.api.keystoreLoadSheet();
    if (res && res.ok) return res.content ?? null;
    return null;
  } catch (err) {
    console.error("getSheetIdFromStorage error", err);
    return null;
  }
};

export const deleteDataFromStorage = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    // @ts-ignore: preload exposes keystore functions
    const res = await window.api.keystoreDeleteAll();
    return { ok: res?.ok ?? false, error: res?.error };
  } catch (err) {
    console.error("deleteDataFromStorage error", err);
    return { ok: false, error: (err as Error)?.message ?? String(err) };
  }
};

export default {
  saveKeyToStorage,
  getKeyFromStorage,
  saveSheetIdToStorage,
  getSheetIdFromStorage,
  deleteDataFromStorage
};
