import { app, ipcMain } from "electron";
import keytar from "keytar";
import fs from "fs";
import { join } from "path";

const KEYSTORE_FILENAME = "cmdforge-credentials.b64";
const KEY_SERVICE = "CmdForge";
const KEY_ACCOUNT = "google-service-account";
const SHEET_ACCOUNT = "google-sheet-id";

export function registerKeystoreHandlers(): void {
  if (ipcMain.listenerCount("keystore-save") > 0) ipcMain.removeHandler("keystore-save");
  ipcMain.handle("keystore-save", async (_, base64: string) => {
    // Clean up any existing keys first
    try {
      await keytar.deletePassword(KEY_SERVICE, KEY_ACCOUNT);
      const metaAccount = `${KEY_ACCOUNT}:meta`;
      const metaRaw = await keytar.getPassword(KEY_SERVICE, metaAccount);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw as string) as { parts: number };
        for (let i = 0; i < meta.parts; i++) {
          await keytar.deletePassword(KEY_SERVICE, `${KEY_ACCOUNT}:part:${i}`);
        }
        await keytar.deletePassword(KEY_SERVICE, metaAccount);
      }
    } catch (cleanupErr) {
      console.debug("keystore-save: cleanup failed", cleanupErr);
    }

    // If data is large (> 2KB), use chunking immediately to avoid Windows keytar limits
    const MAX_SINGLE_SIZE = 2048;
    if (base64.length > MAX_SINGLE_SIZE) {
      try {
        const chunkSize = 1024; // 1KB chunks
        const parts = Math.ceil(base64.length / chunkSize);
        const metaAccount = `${KEY_ACCOUNT}:meta`;

        for (let i = 0; i < parts; i++) {
          const chunk = base64.slice(i * chunkSize, (i + 1) * chunkSize);
          await keytar.setPassword(KEY_SERVICE, `${KEY_ACCOUNT}:part:${i}`, chunk);
        }
        const meta = JSON.stringify({ parts, length: base64.length });
        await keytar.setPassword(KEY_SERVICE, metaAccount, meta);
        console.log("keystore-save: chunked save (parts:", parts, ")");
        return {
          ok: true,
          length: base64.length,
          prefix: base64.slice(0, 12),
          chunked: true,
          parts
        };
      } catch (chunkErr) {
        console.error("keystore-save chunked failed", chunkErr);
        // Fall through to file fallback
      }
    } else {
      // Try single save for small data
      try {
        await keytar.setPassword(KEY_SERVICE, KEY_ACCOUNT, base64);
        return {
          ok: true,
          length: base64.length,
          prefix: base64.slice(0, 12)
        };
      } catch (err) {
        console.error("keystore-save single save error", err);
        // Fall through to chunking attempt
        try {
          const chunkSize = 1024;
          const parts = Math.ceil(base64.length / chunkSize);
          const metaAccount = `${KEY_ACCOUNT}:meta`;

          for (let i = 0; i < parts; i++) {
            const chunk = base64.slice(i * chunkSize, (i + 1) * chunkSize);
            await keytar.setPassword(KEY_SERVICE, `${KEY_ACCOUNT}:part:${i}`, chunk);
          }
          const meta = JSON.stringify({ parts, length: base64.length });
          await keytar.setPassword(KEY_SERVICE, metaAccount, meta);
          console.warn("keystore-save: chunked fallback (parts:", parts, ")");
          return {
            ok: true,
            length: base64.length,
            prefix: base64.slice(0, 12),
            chunked: true,
            parts
          };
        } catch (chunkErr) {
          console.error("keystore-save chunked fallback failed", chunkErr);
        }
      }
    }

    // File system fallback as last resort
    try {
      const p = join(app.getPath("userData"), KEYSTORE_FILENAME);
      fs.writeFileSync(p, base64, "utf8");
      console.warn("keystore-save: file fallback used", p);
      return {
        ok: true,
        length: base64.length,
        prefix: base64.slice(0, 12),
        fallbackPath: p
      };
    } catch (writeErr) {
      console.error("keystore-save file fallback failed", writeErr);
      return {
        ok: false,
        error: "All save methods failed",
        length: base64.length,
        prefix: base64.slice(0, 12)
      };
    }
  });

  if (ipcMain.listenerCount("keystore-load") > 0) ipcMain.removeHandler("keystore-load");
  ipcMain.handle("keystore-load", async () => {
    // First, check if we have chunked data (most common case for large keys)
    try {
      const metaAccount = `${KEY_ACCOUNT}:meta`;
      const metaRaw = await keytar.getPassword(KEY_SERVICE, metaAccount);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw as string) as { parts: number };
        let joined = "";
        for (let i = 0; i < meta.parts; i++) {
          const part = await keytar.getPassword(KEY_SERVICE, `${KEY_ACCOUNT}:part:${i}`);
          if (!part) {
            console.error("keystore-load: Missing chunk part", i);
            return { ok: false, content: null, error: "Missing key parts" };
          }
          joined += part;
        }
        console.log("keystore-load: Loaded chunked key (parts:", meta.parts, ")");
        return { ok: true, content: joined };
      }
    } catch (chunkErr) {
      console.debug("keystore-load: No chunked data found", chunkErr);
    }

    // Try single key (for small keys or legacy data)
    try {
      const content = await keytar.getPassword(KEY_SERVICE, KEY_ACCOUNT);
      if (content) {
        console.log("keystore-load: Loaded single key");
        return { ok: true, content };
      }
    } catch (err) {
      console.debug("keystore-load: Single key not found", err);
    }

    // File system fallback
    try {
      const p = join(app.getPath("userData"), KEYSTORE_FILENAME);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8");
        console.log("keystore-load: Loaded from file fallback");
        return { ok: true, content };
      }
    } catch (fileErr) {
      console.error("keystore-load: File fallback failed", fileErr);
    }

    return { ok: false, content: null, error: "No key found" };
  });

  if (ipcMain.listenerCount("keystore-delete") > 0) ipcMain.removeHandler("keystore-delete");
  ipcMain.handle("keystore-delete", async () => {
    try {
      const ok = await keytar.deletePassword(KEY_SERVICE, KEY_ACCOUNT);
      return { ok };
    } catch (err) {
      console.error("keystore-delete error", err);
      try {
        const metaAccount = `${KEY_ACCOUNT}:meta`;
        const metaRaw = await keytar.getPassword(KEY_SERVICE, metaAccount);
        if (metaRaw) {
          const meta = JSON.parse(metaRaw as string) as { parts: number };
          for (let i = 0; i < meta.parts; i++) {
            await keytar.deletePassword(KEY_SERVICE, `${KEY_ACCOUNT}:part:${i}`);
          }
          await keytar.deletePassword(KEY_SERVICE, metaAccount);
        }
      } catch (cleanupErr) {
        console.error("keystore-delete chunked cleanup failed", cleanupErr);
      }
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });

  if (ipcMain.listenerCount("keystore-save-sheet") > 0)
    ipcMain.removeHandler("keystore-save-sheet");
  ipcMain.handle("keystore-save-sheet", async (_, sheetId: string) => {
    try {
      try {
        await keytar.deletePassword(KEY_SERVICE, SHEET_ACCOUNT);
      } catch {
        // ignore
      }
      await keytar.setPassword(KEY_SERVICE, SHEET_ACCOUNT, sheetId);
      return { ok: true };
    } catch (err) {
      console.error("keystore-save-sheet error", err);
      try {
        const p = join(app.getPath("userData"), `${SHEET_ACCOUNT}.txt`);
        fs.writeFileSync(p, sheetId, "utf8");
      } catch (writeErr) {
        console.error("keystore-save-sheet fallback write failed", writeErr);
      }
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });

  if (ipcMain.listenerCount("keystore-load-sheet") > 0)
    ipcMain.removeHandler("keystore-load-sheet");
  ipcMain.handle("keystore-load-sheet", async () => {
    try {
      const content = await keytar.getPassword(KEY_SERVICE, SHEET_ACCOUNT);
      if (!content) return { ok: false, content: null };
      return { ok: true, content };
    } catch (err) {
      console.error("keystore-load-sheet error", err);
      return { ok: false, content: null, error: (err as Error)?.message ?? String(err) };
    }
  });

  if (ipcMain.listenerCount("keystore-delete-all") > 0)
    ipcMain.removeHandler("keystore-delete-all");
  ipcMain.handle("keystore-delete-all", async () => {
    try {
      await keytar.deletePassword(KEY_SERVICE, KEY_ACCOUNT);
      await keytar.deletePassword(KEY_SERVICE, SHEET_ACCOUNT);
      try {
        const metaRaw = await keytar.getPassword(KEY_SERVICE, `${KEY_ACCOUNT}:meta`);
        if (metaRaw) {
          const meta = JSON.parse(metaRaw as string) as { parts: number };
          for (let i = 0; i < meta.parts; i++) {
            await keytar.deletePassword(KEY_SERVICE, `${KEY_ACCOUNT}:part:${i}`);
          }
          await keytar.deletePassword(KEY_SERVICE, `${KEY_ACCOUNT}:meta`);
        }
      } catch (cleanupErr) {
        console.warn("keystore-delete-all chunked cleanup failed", cleanupErr);
      }
      const p = join(app.getPath("userData"), KEYSTORE_FILENAME);
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return { ok: true };
    } catch (err) {
      console.error("keystore-delete-all error", err);
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });

  // sheets-has-data handler moved to google-service module
}

export default registerKeystoreHandlers;
