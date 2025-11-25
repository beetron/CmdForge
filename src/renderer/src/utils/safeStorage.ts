// Wrapped safe storage helpers that call preload encrypt/decrypt endpoints.

const STORAGE_KEY = "cmdforge.google.credentials";

export const saveKeyToSafeStorage = async (json: string): Promise<boolean> => {
  try {
    // @ts-ignore: preload exposes encryptKey
    const b64 = await window.api.encryptKey(json);
    // Persist the base64 encrypted payload into the app keystore
    // @ts-ignore: preload exposes keystoreSave
    const res = await window.api.keystoreSave(b64);
    if (res && res.ok) return true;
    // fallback to localStorage for older versions if keystore fails
    localStorage.setItem(STORAGE_KEY, b64);
    return true;
  } catch (err) {
    console.error("saveKeyToSafeStorage error", err);
    return false;
  }
};

export const getKeyFromSafeStorage = async (): Promise<string | null> => {
  try {
    // Prefer the app keystore
    // @ts-ignore: preload exposes keystoreDelete
    const kr = await window.api.keystoreLoad();
    let b64 = null as string | null;
    if (kr && kr.ok && kr.content) b64 = kr.content;
    if (!b64) {
      // Fallback to localStorage (old behavior)
      b64 = localStorage.getItem(STORAGE_KEY);
    }
    if (!b64) return null;
    // @ts-ignore - exposed in preload
    const decrypted = await window.api.decryptKey(b64);
    return decrypted;
  } catch (err) {
    console.error("getKeyFromSafeStorage error", err);
    return null;
  }
};

export const deleteKeyFromSafeStorage = async (): Promise<boolean> => {
  try {
    // Remove keystore file if present
    // @ts-ignore: preload exposes keystoreDelete
    await window.api.keystoreDelete();
    // Remove fallback localStorage entry
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error("deleteKeyFromSafeStorage error", err);
    return false;
  }
};
