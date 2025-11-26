import { ipcMain } from "electron";
import keytar from "keytar";
import { google } from "googleapis";
import type { JWT } from "google-auth-library";
import { safeStorage } from "electron";

const KEY_SERVICE = "CmdForge";
const KEY_ACCOUNT = "google-service-account";

async function getCredentialsFromKeystore(): Promise<string | null> {
  try {
    const base64 = (await keytar.getPassword(KEY_SERVICE, KEY_ACCOUNT)) as unknown as string | null;
    if (!base64) return null;
    try {
      // Try to decode via safeStorage (it expects a Buffer of the encrypted string)
      const buf = Buffer.from(base64, "base64");
      try {
        // safeStorage.decryptString returns a string
        return safeStorage.decryptString(buf);
      } catch {
        // fallback to raw base64 decode if safeStorage decryption fails
        return Buffer.from(base64, "base64").toString("utf8");
      }
    } catch {
      // If base64 decode fails, assume stored as plain JSON
      return base64;
    }
  } catch (err) {
    console.warn("google-service: failed to read key from keystore", err);
    return null;
  }
}

async function createAuthClientFromKey(jsonKey: string): Promise<JWT> {
  const key: Record<string, unknown> = JSON.parse(jsonKey);
  const clientEmail = (key.client_email as string) || (key.clientId as string);
  const clientKey = (key.private_key as string) || (key.privateKey as string);
  const jwtClient = new google.auth.JWT({
    email: clientEmail,
    key: clientKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly"
    ]
  });
  // Optionally ensure the client is authorized
  try {
    await jwtClient.authorize();
  } catch {
    // ignore, request calls will handle authorization errors
  }
  return jwtClient as JWT;
}

export function registerGoogleServiceHandlers(): void {
  if (ipcMain.listenerCount("sheets-has-data") > 0) ipcMain.removeHandler("sheets-has-data");
  ipcMain.handle("sheets-has-data", async (_, sheetId: string) => {
    try {
      if (!sheetId) return { ok: false, error: "Missing sheet id" };
      const credentials = await getCredentialsFromKeystore();
      if (!credentials) return { ok: false, error: "Missing credentials" };
      const resp = await google.sheets("v4").spreadsheets.values.get({
        auth: (await createAuthClientFromKey(credentials)) as JWT,
        spreadsheetId: sheetId,
        range: "A1:Z1000"
      });
      const values = resp.data.values;
      return { ok: true, hasData: Array.isArray(values) && values.length > 0 };
    } catch (err) {
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });

  if (ipcMain.listenerCount("sheets-get-rows") > 0) ipcMain.removeHandler("sheets-get-rows");
  ipcMain.handle("sheets-get-rows", async (_, sheetId: string, range = "A1:Z1000") => {
    try {
      if (!sheetId) return { ok: false, error: "Missing sheet id" };
      const credentials = await getCredentialsFromKeystore();
      if (!credentials) return { ok: false, error: "Missing credentials" };
      const resp = await google.sheets("v4").spreadsheets.values.get({
        auth: (await createAuthClientFromKey(credentials)) as JWT,
        spreadsheetId: sheetId,
        range
      });
      return { ok: true, rows: resp.data.values || [] };
    } catch (err) {
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });

  if (ipcMain.listenerCount("sheets-push-rows") > 0) ipcMain.removeHandler("sheets-push-rows");
  ipcMain.handle(
    "sheets-push-rows",
    async (_, sheetId: string, range = "A1", values: string[][] = []) => {
      try {
        if (!sheetId) return { ok: false, error: "Missing sheet id" };
        const credentials = await getCredentialsFromKeystore();
        if (!credentials) return { ok: false, error: "Missing credentials" };
        const resp = await google.sheets("v4").spreadsheets.values.append({
          auth: (await createAuthClientFromKey(credentials)) as JWT,
          spreadsheetId: sheetId,
          range,
          valueInputOption: "RAW",
          requestBody: { values }
        });
        return { ok: true, updated: resp.data.updates ?? null };
      } catch (err) {
        return { ok: false, error: (err as Error)?.message ?? String(err) };
      }
    }
  );

  if (ipcMain.listenerCount("sheets-get-modified-time") > 0)
    ipcMain.removeHandler("sheets-get-modified-time");
  ipcMain.handle("sheets-get-modified-time", async (_, sheetId: string) => {
    try {
      if (!sheetId) return { ok: false, error: "Missing sheet id" };
      const credentials = await getCredentialsFromKeystore();
      if (!credentials) return { ok: false, error: "Missing credentials" };
      const resp = await google.drive({ version: "v3" }).files.get({
        auth: (await createAuthClientFromKey(credentials)) as JWT,
        fileId: sheetId,
        fields: "modifiedTime,name"
      });
      return {
        ok: true,
        modifiedTime: resp.data.modifiedTime ?? null,
        name: resp.data.name ?? null
      };
    } catch (err) {
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });

  if (ipcMain.listenerCount("sheets-clear-range") > 0) ipcMain.removeHandler("sheets-clear-range");
  ipcMain.handle("sheets-clear-range", async (_, sheetId: string, range = "A2:Z1000") => {
    try {
      if (!sheetId) return { ok: false, error: "Missing sheet id" };
      const credentials = await getCredentialsFromKeystore();
      if (!credentials) return { ok: false, error: "Missing credentials" };
      await google.sheets("v4").spreadsheets.values.clear({
        auth: (await createAuthClientFromKey(credentials)) as JWT,
        spreadsheetId: sheetId,
        range
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });

  if (ipcMain.listenerCount("sheets-update-range") > 0)
    ipcMain.removeHandler("sheets-update-range");
  ipcMain.handle(
    "sheets-update-range",
    async (_, sheetId: string, range = "A2", values: string[][] = []) => {
      try {
        if (!sheetId) return { ok: false, error: "Missing sheet id" };
        const credentials = await getCredentialsFromKeystore();
        if (!credentials) return { ok: false, error: "Missing credentials" };
        const resp = await google.sheets("v4").spreadsheets.values.update({
          auth: (await createAuthClientFromKey(credentials)) as JWT,
          spreadsheetId: sheetId,
          range,
          valueInputOption: "RAW",
          requestBody: { values }
        });
        return { ok: true, updated: resp.data.updatedRows ?? 0 };
      } catch (err) {
        return { ok: false, error: (err as Error)?.message ?? String(err) };
      }
    }
  );
}

export default registerGoogleServiceHandlers;
