// NOTE: We rely on preload API; keep helper wrappers for clarity in code.
export const saveKeyToStorage = async (json: string): Promise<boolean> => {
  try {
    // @ts-ignore: preload exposes encryptKey and keystoreSave
    const b64 = await window.api.encryptKey(json);
    // @ts-ignore: preload exposes keystoreSave
    const ok = await window.api.keystoreSave(b64);
    return ok?.ok ?? false;
  } catch (err) {
    console.error("saveKeyToStorage error", err);
    return false;
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
    // fallback to localStorage for legacy data
    const STORAGE_KEY = "cmdforge.google.credentials";
    const b64 = localStorage.getItem(STORAGE_KEY);
    if (!b64) return null;
    // @ts-ignore: preload exposes decryptKey
    const decrypted = await window.api.decryptKey(b64);
    return decrypted ?? null;
    return null;
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

export const deleteDataFromStorage = async (): Promise<boolean> => {
  try {
    // @ts-ignore: preload exposes keystore functions
    const ok = await window.api.keystoreDeleteAll();
    return ok?.ok ?? false;
  } catch (err) {
    console.error("deleteDataFromStorage error", err);
    return false;
  }
};

export default {
  saveKeyToStorage,
  getKeyFromStorage,
  saveSheetIdToStorage,
  getSheetIdFromStorage,
  deleteDataFromStorage
};
