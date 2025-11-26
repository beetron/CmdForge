import { ipcMain } from "electron";
import { google } from "googleapis";
import type { JWT } from "google-auth-library";
import keytar from "keytar";
import { safeStorage } from "electron";

const KEY_SERVICE = "CmdForge";
const KEY_ACCOUNT = "google-service-account";
const SHEET_ACCOUNT = "google-sheet-id";

type Command = {
  id: number;
  command: string;
  description?: string;
  groupName?: string;
};

type SyncResult = {
  ok: boolean;
  action?: "pulled" | "pushed" | "no-change";
  error?: string;
  details?: string;
};

type DbHandlers = {
  getCommands: () => Promise<Command[]>;
  deleteAllCommands: () => Promise<void>;
  createCommand: (cmd: Omit<Command, "id">) => Promise<Command>;
  getMetadata: (key: string) => Promise<string | null>;
  setMetadata: (key: string, value: string) => Promise<void>;
  getDbPath?: () => string; // Optional: path to the database file
};

async function getCredentialsFromKeystore(): Promise<string | null> {
  try {
    // First, check if we have chunked data (most common case for large keys)
    const metaAccount = `${KEY_ACCOUNT}:meta`;
    const metaRaw = (await keytar.getPassword(KEY_SERVICE, metaAccount)) as unknown as
      | string
      | null;
    if (metaRaw) {
      const meta = JSON.parse(metaRaw) as { parts: number };
      let joined = "";
      for (let i = 0; i < meta.parts; i++) {
        const part = (await keytar.getPassword(
          KEY_SERVICE,
          `${KEY_ACCOUNT}:part:${i}`
        )) as unknown as string | null;
        if (!part) {
          console.error("sync-service getCredentials: Missing chunk part", i);
          return null;
        }
        joined += part;
      }
      console.log("sync-service getCredentials: Loaded chunked key (parts:", meta.parts, ")");

      // Decrypt the joined base64 content
      try {
        const buf = Buffer.from(joined, "base64");
        try {
          return safeStorage.decryptString(buf);
        } catch {
          return Buffer.from(joined, "base64").toString("utf8");
        }
      } catch {
        return joined;
      }
    }

    // Try single key (for small keys or legacy data)
    const base64 = (await keytar.getPassword(KEY_SERVICE, KEY_ACCOUNT)) as unknown as string | null;
    if (!base64) return null;

    console.log("sync-service getCredentials: Loaded single key");
    try {
      const buf = Buffer.from(base64, "base64");
      try {
        return safeStorage.decryptString(buf);
      } catch {
        return Buffer.from(base64, "base64").toString("utf8");
      }
    } catch {
      return base64;
    }
  } catch (err) {
    console.warn("sync-service: failed to read key from keystore", err);
    return null;
  }
}

async function getSheetIdFromKeystore(): Promise<string | null> {
  try {
    const sheetId = (await keytar.getPassword(KEY_SERVICE, SHEET_ACCOUNT)) as unknown as
      | string
      | null;
    return sheetId || null;
  } catch (err) {
    console.warn("sync-service: failed to read sheet id from keystore", err);
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
  try {
    await jwtClient.authorize();
  } catch {
    // ignore, request calls will handle authorization errors
  }
  return jwtClient as JWT;
}

async function getCloudModifiedTime(
  sheetId: string,
  auth: JWT
): Promise<{ modifiedTime: string | null; error?: string }> {
  try {
    const resp = await google.drive({ version: "v3" }).files.get({
      auth,
      fileId: sheetId,
      fields: "modifiedTime"
    });
    return { modifiedTime: resp.data.modifiedTime ?? null };
  } catch (err) {
    return { modifiedTime: null, error: (err as Error)?.message ?? String(err) };
  }
}

async function pullFromCloud(
  sheetId: string,
  auth: JWT,
  range = "A2:Z1000"
): Promise<{ commands: Command[]; error?: string }> {
  try {
    const resp = await google.sheets("v4").spreadsheets.values.get({
      auth,
      spreadsheetId: sheetId,
      range
    });
    const rows = resp.data.values || [];
    // Parse rows into commands (assuming format: id, command, description, groupName)
    const commands: Command[] = [];
    for (const row of rows) {
      const id = parseInt(row[0], 10);
      if (isNaN(id)) continue;
      commands.push({
        id,
        command: row[1] || "",
        description: row[2] || "",
        groupName: row[3] || ""
      });
    }
    return { commands };
  } catch (err) {
    return { commands: [], error: (err as Error)?.message ?? String(err) };
  }
}

async function pushToCloud(
  sheetId: string,
  auth: JWT,
  commands: Command[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Clear existing data (A2 onwards)
    await google.sheets("v4").spreadsheets.values.clear({
      auth,
      spreadsheetId: sheetId,
      range: "A2:Z1000"
    });

    // Prepare rows
    const values: string[][] = commands.map((cmd) => [
      String(cmd.id),
      cmd.command,
      cmd.description || "",
      cmd.groupName || ""
    ]);

    // Update with new data
    await google.sheets("v4").spreadsheets.values.update({
      auth,
      spreadsheetId: sheetId,
      range: "A2",
      valueInputOption: "RAW",
      requestBody: { values }
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? String(err) };
  }
}

async function replaceLocalWithCloud(
  commands: Command[],
  dbHandlers: DbHandlers
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Delete all local commands
    await dbHandlers.deleteAllCommands();

    // Insert all commands from cloud
    for (const cmd of commands) {
      await dbHandlers.createCommand({
        command: cmd.command,
        description: cmd.description,
        groupName: cmd.groupName
      });
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? String(err) };
  }
}

async function getLocalCommands(dbHandlers: DbHandlers): Promise<Command[]> {
  try {
    return await dbHandlers.getCommands();
  } catch (err) {
    console.error("sync-service: failed to get local commands", err);
    return [];
  }
}

async function getLastSyncTimestamp(dbHandlers: DbHandlers): Promise<string | null> {
  try {
    return await dbHandlers.getMetadata("last_sync_timestamp");
  } catch {
    return null;
  }
}

async function setLastSyncTimestamp(timestamp: string, dbHandlers: DbHandlers): Promise<void> {
  try {
    await dbHandlers.setMetadata("last_sync_timestamp", timestamp);
  } catch (err) {
    console.error("sync-service: failed to set last sync timestamp", err);
  }
}

async function getLocalDataModified(dbHandlers: DbHandlers): Promise<string | null> {
  try {
    return await dbHandlers.getMetadata("local_data_modified");
  } catch {
    return null;
  }
}

async function setLocalDataModified(dbHandlers: DbHandlers): Promise<void> {
  try {
    const now = new Date().toISOString();
    await dbHandlers.setMetadata("local_data_modified", now);
    console.log(`sync-service: Updated local_data_modified to ${now}`);
  } catch (err) {
    console.error("sync-service: failed to set local data modified timestamp", err);
  }
}

async function performSync(dbHandlers: DbHandlers): Promise<SyncResult> {
  try {
    console.log("performSync: Starting sync...");

    // Get credentials and sheet id
    const credentials = await getCredentialsFromKeystore();
    if (!credentials) {
      console.log("performSync: Missing credentials");
      return { ok: false, error: "Missing credentials" };
    }

    const sheetId = await getSheetIdFromKeystore();
    if (!sheetId) {
      console.log("performSync: Missing sheet id");
      return { ok: false, error: "Missing sheet id" };
    }

    console.log("performSync: Creating auth client...");
    const auth = await createAuthClientFromKey(credentials);

    // Get cloud modified time
    console.log("performSync: Getting cloud modified time...");
    const { modifiedTime: cloudModified, error: cloudError } = await getCloudModifiedTime(
      sheetId,
      auth
    );
    if (cloudError) {
      console.log("performSync: Error getting cloud modified time:", cloudError);
      return { ok: false, error: cloudError };
    }
    if (!cloudModified) {
      console.log("performSync: Could not determine cloud modified time");
      return { ok: false, error: "Could not determine cloud modified time" };
    }

    console.log("performSync: Cloud modified time:", cloudModified);

    // Get last sync timestamp
    const lastSync = await getLastSyncTimestamp(dbHandlers);
    console.log("performSync: Last sync timestamp:", lastSync);

    // Get local and cloud data counts
    const localCommands = await getLocalCommands(dbHandlers);
    console.log("performSync: Local commands count:", localCommands.length);

    const { commands: cloudCommands, error: pullError } = await pullFromCloud(sheetId, auth);
    if (pullError) {
      console.log("performSync: Failed to check cloud data:", pullError);
      return { ok: false, error: pullError };
    }
    console.log("performSync: Cloud commands count:", cloudCommands.length);

    // Smart sync logic:
    // 1. If this is first sync (no lastSync) and cloud is empty but local has data → PUSH
    // 2. If this is first sync (no lastSync) and cloud has data → PULL
    // 3. If both empty → no-op
    // 4. If we have lastSync, use timestamp comparison

    if (!lastSync) {
      // First sync scenario
      if (cloudCommands.length === 0 && localCommands.length > 0) {
        // Cloud empty, local has data - push to cloud
        console.log("performSync: First sync - pushing local data to empty cloud...");
        const pushResult = await pushToCloud(sheetId, auth, localCommands);
        if (!pushResult.ok) {
          console.log("performSync: Push failed:", pushResult.error);
          return { ok: false, error: pushResult.error };
        }

        const { modifiedTime: newCloudModified } = await getCloudModifiedTime(sheetId, auth);
        if (newCloudModified) await setLastSyncTimestamp(newCloudModified, dbHandlers);

        console.log("performSync: First push complete");
        return {
          ok: true,
          action: "pushed",
          details: `Pushed ${localCommands.length} commands to cloud`
        };
      } else if (cloudCommands.length > 0) {
        // Cloud has data - pull from cloud
        console.log("performSync: First sync - pulling from cloud...");
        const replaceResult = await replaceLocalWithCloud(cloudCommands, dbHandlers);
        if (!replaceResult.ok) {
          console.log("performSync: Replace local failed:", replaceResult.error);
          return { ok: false, error: replaceResult.error };
        }

        await setLastSyncTimestamp(cloudModified, dbHandlers);
        console.log("performSync: First pull complete");
        return {
          ok: true,
          action: "pulled",
          details: `Pulled ${cloudCommands.length} commands from cloud`
        };
      } else {
        // Both empty
        console.log("performSync: Both local and cloud are empty, nothing to sync");
        await setLastSyncTimestamp(cloudModified, dbHandlers);
        return { ok: true, action: "no-change", details: "No data to sync" };
      }
    }

    // Subsequent syncs - use timestamp comparison
    if (new Date(cloudModified) <= new Date(lastSync)) {
      // Cloud is same or older than last sync
      // Check if local data was modified after last sync
      const localDataModified = await getLocalDataModified(dbHandlers);

      if (localDataModified && new Date(localDataModified) > new Date(lastSync)) {
        // Local data was modified after last sync - push to cloud
        console.log(
          `performSync: Local data modified (${localDataModified}) after last sync (${lastSync}), pushing...`
        );

        const pushResult = await pushToCloud(sheetId, auth, localCommands);
        if (!pushResult.ok) {
          console.log("performSync: Push failed:", pushResult.error);
          return { ok: false, error: pushResult.error };
        }

        const { modifiedTime: newCloudModified } = await getCloudModifiedTime(sheetId, auth);
        if (newCloudModified) await setLastSyncTimestamp(newCloudModified, dbHandlers);

        console.log("performSync: Push complete (local data was modified)");
        return {
          ok: true,
          action: "pushed",
          details: `Pushed ${localCommands.length} commands (local changes detected)`
        };
      } else {
        // Local data not modified - no changes
        console.log("performSync: No local changes detected, cloud unchanged");
        return { ok: true, action: "no-change", details: "No changes detected" };
      }
    } else {
      // Cloud is newer - pull from cloud
      console.log("performSync: Cloud is newer, pulling from cloud...");

      const replaceResult = await replaceLocalWithCloud(cloudCommands, dbHandlers);
      if (!replaceResult.ok) {
        console.log("performSync: Replace local failed:", replaceResult.error);
        return { ok: false, error: replaceResult.error };
      }

      // Update last sync timestamp
      await setLastSyncTimestamp(cloudModified, dbHandlers);

      console.log("performSync: Pull complete");
      return { ok: true, action: "pulled", details: `Pulled ${cloudCommands.length} commands` };
    }
  } catch (err) {
    console.error("performSync: Unexpected error:", err);
    return { ok: false, error: (err as Error)?.message ?? String(err) };
  }
}

export function registerSyncServiceHandlers(dbHandlers: DbHandlers): void {
  // Public sync handlers exposed to renderer
  if (ipcMain.listenerCount("sync-now") > 0) ipcMain.removeHandler("sync-now");
  ipcMain.handle("sync-now", async () => {
    return performSync(dbHandlers);
  });

  if (ipcMain.listenerCount("sync-status") > 0) ipcMain.removeHandler("sync-status");
  ipcMain.handle("sync-status", async () => {
    try {
      const credentials = await getCredentialsFromKeystore();
      const sheetId = await getSheetIdFromKeystore();
      const lastSync = await getLastSyncTimestamp(dbHandlers);

      return {
        ok: true,
        hasCredentials: !!credentials,
        hasSheetId: !!sheetId,
        lastSyncTimestamp: lastSync,
        ready: !!credentials && !!sheetId
      };
    } catch (err) {
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });
}

export { setLocalDataModified };
export default registerSyncServiceHandlers;
