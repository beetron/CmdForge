import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage } from "electron";
import fs from "fs";
import { join } from "path";
import registerKeystoreHandlers from "./keystore";
import registerSettingsHandlers from "./settings";
import registerGoogleFileHandlers from "./google-file";
import registerGoogleServiceHandlers from "./google-service";
import registerSyncServiceHandlers from "./sync-service";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
// Resolve the app icon path in a way that works both for development and for packaged builds.
// - In development, we use the project's resources directory
// - In packaged builds, assets may be unpacked under process.resourcesPath/app.asar.unpacked/resources
// We prefer an ICO on Windows if available (exe icon is embedded by the packager), otherwise fall
// back to PNG if present in the unpacked resources. The BrowserWindow will use the executable
// icon on Windows if no icon is provided.
function resolveAppIcon(): string | undefined {
  try {
    const devPng = join(__dirname, "../../resources/icon.png");
    const devIco = join(__dirname, "../../resources/icon.ico");
    const devIcns = join(__dirname, "../../build/icon.icns");
    const packagedIco = join(process.resourcesPath, "icon.ico");
    const packagedUnpackedIco = join(
      process.resourcesPath,
      "app.asar.unpacked",
      "resources",
      "icon.ico"
    );
    const packagedIcns = join(process.resourcesPath, "icon.icns");
    const packagedUnpackedIcns = join(
      process.resourcesPath,
      "app.asar.unpacked",
      "resources",
      "icon.icns"
    );
    const packagedUnpackedPng = join(
      process.resourcesPath,
      "app.asar.unpacked",
      "resources",
      "icon.png"
    );

    if (is.dev) {
      // Prefer ico, then icns, then png in dev
      if (fs.existsSync(devIco)) return devIco;
      if (fs.existsSync(devIcns)) return devIcns;
      if (fs.existsSync(devPng)) return devPng;
      return undefined;
    }

    if (fs.existsSync(packagedIco)) return packagedIco;
    if (fs.existsSync(packagedIcns)) return packagedIcns;
    if (fs.existsSync(packagedUnpackedIco)) return packagedUnpackedIco;
    if (fs.existsSync(packagedUnpackedIcns)) return packagedUnpackedIcns;
    if (fs.existsSync(packagedUnpackedPng)) return packagedUnpackedPng;
    return undefined;
  } catch {
    return undefined;
  }
}

const iconPath = resolveAppIcon();
const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

let Database: unknown = null;
let mainWindowRef: BrowserWindow | null = null;

function createWindow(): void {
  // Create the browser window with rounded corners
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 650,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    transparent: false,
    icon,
    // roundedCorners is only supported on Windows 11+
    ...(process.platform === "win32" ? { roundedCorners: true } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

  // Apply content styling
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow.webContents.insertCSS(`
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #root {
        height: 100vh;
        width: 100vw;
        overflow: auto;
      }
    `);
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
  mainWindowRef = mainWindow;
}

app.whenReady().then(async () => {
  // Dynamically import better-sqlite3 if available at runtime (optional dependency)
  try {
    const dbModule = await import("better-sqlite3");
    Database = (dbModule as unknown as { default?: unknown }).default ?? (dbModule as unknown);
  } catch {
    // Not available - staying with JSON fallback
  }

  electronApp.setAppUserModelId("com.electron");
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on("ping", () => console.log("pong"));

  // DB initialization with better-sqlite3
  try {
    const dataPath = app.getPath("userData");
    const dbPath = join(dataPath, "commands.db");
    const jsonPath = join(dataPath, "commands.json");
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

    let useSqlite = false;
    if (Database) {
      try {
        type PreparedStatement = {
          run: (...args: unknown[]) => { lastInsertRowid?: number };
          get: (...args: unknown[]) => unknown;
          all: (...args: unknown[]) => unknown[];
        };

        type BetterSqlite3Ctor = new (filename: string) => {
          pragma: (s: string) => unknown;
          prepare: (sql: string) => PreparedStatement;
          transaction: <T extends (...args: unknown[]) => unknown>(fn: T) => T;
        };

        const DBConstructor = Database as unknown as BetterSqlite3Ctor;
        const db = new DBConstructor(dbPath);
        useSqlite = true;
        db.pragma("journal_mode = WAL");

        db.prepare(
          `
          CREATE TABLE IF NOT EXISTS commands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command TEXT NOT NULL,
            description TEXT,
            groupName TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
        ).run();

        db.prepare(
          `
          CREATE TABLE IF NOT EXISTS sync_metadata (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `
        ).run();

        ipcMain.handle(
          "db-create-command",
          (_, payload: { command: string; description?: string; groupName?: string }) => {
            const info = db
              .prepare("INSERT INTO commands (command, description, groupName) VALUES (?, ?, ?)")
              .run(payload.command, payload.description || "", payload.groupName || "") as {
              lastInsertRowid?: number;
            };

            // Force WAL checkpoint to update file mtime for sync detection
            try {
              db.pragma("wal_checkpoint(TRUNCATE)");
            } catch (err) {
              console.warn("WAL checkpoint after create failed", err);
            }

            return db
              .prepare("SELECT * FROM commands WHERE id = ?")
              .get(info.lastInsertRowid as number);
          }
        );

        ipcMain.handle(
          "db-update-command",
          (
            _,
            payload: { id: number; command: string; description?: string; groupName?: string }
          ) => {
            db.prepare(
              "UPDATE commands SET command = ?, description = ?, groupName = ? WHERE id = ?"
            ).run(payload.command, payload.description || "", payload.groupName || "", payload.id);

            // Force WAL checkpoint to update file mtime for sync detection
            try {
              db.pragma("wal_checkpoint(TRUNCATE)");
            } catch (err) {
              console.warn("WAL checkpoint after update failed", err);
            }

            return db.prepare("SELECT * FROM commands WHERE id = ?").get(payload.id);
          }
        );

        ipcMain.handle("db-delete-command", (_, id: number) => {
          db.prepare("DELETE FROM commands WHERE id = ?").run(id);

          // Force WAL checkpoint to update file mtime for sync detection
          try {
            db.pragma("wal_checkpoint(TRUNCATE)");
          } catch (err) {
            console.warn("WAL checkpoint after delete failed", err);
          }

          return { ok: true };
        });

        ipcMain.handle(
          "db-get-commands",
          (_, filters: { groupName?: string; search?: string } | undefined) => {
            if (!filters)
              return db.prepare("SELECT * FROM commands ORDER BY created_at DESC").all();
            if (filters.groupName)
              return db
                .prepare("SELECT * FROM commands WHERE groupName = ? ORDER BY created_at DESC")
                .all(filters.groupName);
            if (filters.search) {
              const term = `%${filters.search}%`;
              return db
                .prepare(
                  "SELECT * FROM commands WHERE (command LIKE ? OR description LIKE ?) ORDER BY created_at DESC"
                )
                .all(term, term);
            }
            return db.prepare("SELECT * FROM commands ORDER BY created_at DESC").all();
          }
        );

        ipcMain.handle("db-get-groups", () =>
          db
            .prepare(
              "SELECT DISTINCT groupName FROM commands WHERE groupName IS NOT NULL ORDER BY groupName"
            )
            .all()
            .map((r: unknown) => (r as { groupName: string }).groupName)
        );

        ipcMain.handle("db-rename-group", async (_, oldName: string, newName: string) => {
          if (!oldName || !newName || oldName === newName) return { ok: false, message: "No-op" };
          try {
            const exists = db
              .prepare("SELECT 1 FROM commands WHERE groupName = ? LIMIT 1")
              .get(newName);
            if (exists) return { ok: false, message: "Group name already in use" };
            db.prepare("UPDATE commands SET groupName = ? WHERE groupName = ?").run(
              newName,
              oldName
            );

            // Force WAL checkpoint to update file mtime for sync detection
            try {
              db.pragma("wal_checkpoint(TRUNCATE)");
            } catch (err) {
              console.warn("WAL checkpoint after rename-group failed", err);
            }

            return { ok: true };
          } catch (err) {
            console.error("db-rename-group sqlite error", err);
            return { ok: false, message: "Failed to rename group" };
          }
        });

        ipcMain.handle("db-delete-group", async (_, groupName: string) => {
          if (!groupName) return { ok: false, message: "Missing group name" };
          try {
            const exists = db
              .prepare("SELECT 1 FROM commands WHERE groupName = ? LIMIT 1")
              .get(groupName);
            if (!exists) return { ok: false, message: "Group not found" };
            db.prepare("DELETE FROM commands WHERE groupName = ?").run(groupName);

            // Force WAL checkpoint to update file mtime for sync detection
            try {
              db.pragma("wal_checkpoint(TRUNCATE)");
            } catch (err) {
              console.warn("WAL checkpoint after delete-group failed", err);
            }

            return { ok: true };
          } catch (err) {
            console.error("db-delete-group sqlite error", err);
            return { ok: false, message: "Failed to delete group" };
          }
        });

        ipcMain.handle("db-delete-all", async () => {
          try {
            db.prepare("DELETE FROM commands").run();

            // Force WAL checkpoint to ensure changes are written to the main DB file
            try {
              db.pragma("wal_checkpoint(TRUNCATE)");
            } catch (err) {
              console.warn("WAL checkpoint after delete-all failed", err);
            }

            return { ok: true };
          } catch (err) {
            console.error("db-delete-all sqlite error", err);
            return { ok: false, message: "Failed to delete all commands" };
          }
        });

        ipcMain.handle("db-export", async () => {
          const rows = db.prepare("SELECT * FROM commands ORDER BY created_at DESC").all();
          const { filePath } = await dialog.showSaveDialog({
            title: "Export commands as JSON",
            defaultPath: join(app.getPath("documents"), "cmdforge-commands.json"),
            filters: [{ name: "JSON", extensions: ["json"] }]
          });
          if (!filePath) return { cancelled: true };
          fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf8");
          return { cancelled: false, filePath };
        });

        ipcMain.handle("db-import", async () => {
          const { canceled, filePaths } = await dialog.showOpenDialog({
            title: "Import commands from JSON",
            filters: [{ name: "JSON", extensions: ["json"] }],
            properties: ["openFile"]
          });
          if (canceled || !filePaths || filePaths.length === 0) return { cancelled: true };
          const content = fs.readFileSync(filePaths[0], "utf8");
          let parsed: Array<{ command: string; description?: string; groupName?: string }> = [];
          try {
            parsed = JSON.parse(content);
          } catch (err) {
            console.error("Import JSON parse error", err);
            return { error: "Invalid JSON file" };
          }
          // DELETE all existing commands
          db.prepare("DELETE FROM commands").run();
          // INSERT imported commands
          const insert = db.prepare(
            "INSERT INTO commands (command, description, groupName) VALUES (?, ?, ?)"
          );
          const insertMany = (
            db.transaction as unknown as (
              fn: (
                items: Array<{ command: string; description?: string; groupName?: string }>
              ) => void
            ) => (
              items: Array<{ command: string; description?: string; groupName?: string }>
            ) => void
          )((items) => {
            for (const it of items)
              insert.run(it.command, it.description || "", it.groupName || "");
          });
          insertMany(parsed);

          // Force WAL checkpoint to ensure changes are written to the main DB file
          // This updates the file modification time which is used for sync comparison
          try {
            db.pragma("wal_checkpoint(TRUNCATE)");
          } catch (err) {
            console.warn("WAL checkpoint after import failed", err);
          }

          return { cancelled: false, count: parsed.length };
        });

        // Sync metadata handlers
        ipcMain.handle("sync-metadata-get", (_, key: string) => {
          const row = db.prepare("SELECT value FROM sync_metadata WHERE key = ?").get(key) as
            | { value: string }
            | undefined;
          return { ok: true, value: row?.value || null };
        });

        ipcMain.handle("sync-metadata-set", (_, key: string, value: string) => {
          db.prepare(
            "INSERT INTO sync_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
          ).run(key, value);
          return { ok: true };
        });

        ipcMain.handle("sync-metadata-delete", (_, key: string) => {
          db.prepare("DELETE FROM sync_metadata WHERE key = ?").run(key);
          return { ok: true };
        });

        // Create dbHandlers for sync service with direct DB access
        const dbHandlers = {
          getCommands: async () => {
            return db.prepare("SELECT * FROM commands ORDER BY created_at DESC").all() as Array<{
              id: number;
              command: string;
              description?: string;
              groupName?: string;
            }>;
          },
          deleteAllCommands: async () => {
            db.prepare("DELETE FROM commands").run();
          },
          createCommand: async (payload: {
            command: string;
            description?: string;
            groupName?: string;
          }) => {
            const info = db
              .prepare("INSERT INTO commands (command, description, groupName) VALUES (?, ?, ?)")
              .run(payload.command, payload.description || "", payload.groupName || "") as {
              lastInsertRowid?: number;
            };
            return db
              .prepare("SELECT * FROM commands WHERE id = ?")
              .get(info.lastInsertRowid as number) as {
              id: number;
              command: string;
              description?: string;
              groupName?: string;
            };
          },
          getMetadata: async (key: string) => {
            const row = db.prepare("SELECT value FROM sync_metadata WHERE key = ?").get(key) as
              | { value: string }
              | undefined;
            return row?.value || null;
          },
          setMetadata: async (key: string, value: string) => {
            db.prepare(
              "INSERT INTO sync_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
            ).run(key, value);
          },
          getDbPath: () => dbPath
        };

        // Register sync service with SQLite handlers
        registerSyncServiceHandlers(dbHandlers);
      } catch (err) {
        console.warn("Failed to initialize SQLite, falling back to JSON storage", err);
        useSqlite = false;
      }
    }

    // JSON fallback
    if (!useSqlite) {
      if (!fs.existsSync(jsonPath)) fs.writeFileSync(jsonPath, JSON.stringify([], null, 2), "utf8");

      const metadataPath = join(dataPath, "sync_metadata.json");
      if (!fs.existsSync(metadataPath))
        fs.writeFileSync(metadataPath, JSON.stringify({}, null, 2), "utf8");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const readAll = (): any[] => {
        try {
          const content = fs.readFileSync(jsonPath, "utf8");
          return JSON.parse(content);
        } catch (err) {
          console.error("JSON DB read error", err);
          return [];
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeAll = (items: any[]): void =>
        fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2), "utf8");

      ipcMain.handle(
        "db-create-command",
        (_, payload: { command: string; description?: string; groupName?: string }) => {
          const rows = readAll();
          const id = (rows.reduce((max, r) => (r.id && r.id > max ? r.id : max), 0) as number) + 1;
          const newRow = {
            id,
            command: payload.command,
            description: payload.description || "",
            groupName: payload.groupName || "",
            created_at: new Date().toISOString()
          };
          rows.unshift(newRow);
          writeAll(rows);
          return newRow;
        }
      );

      ipcMain.handle(
        "db-update-command",
        (_, payload: { id: number; command: string; description?: string; groupName?: string }) => {
          const rows = readAll();
          const idx = rows.findIndex((r) => r.id === payload.id);
          if (idx === -1) return null;
          rows[idx] = {
            ...rows[idx],
            command: payload.command,
            description: payload.description || "",
            groupName: payload.groupName || ""
          };
          writeAll(rows);
          return rows[idx];
        }
      );

      ipcMain.handle("db-delete-command", (_, id: number) => {
        const rows = readAll().filter((r) => r.id !== id);
        writeAll(rows);
        return { ok: true };
      });

      // existing DB handlers continue

      ipcMain.handle(
        "db-get-commands",
        (_, filters: { groupName?: string; search?: string } | undefined) => {
          let rows = readAll();
          if (!filters) return rows;
          if (filters.groupName) rows = rows.filter((r) => r.groupName === filters.groupName);
          if (filters.search) {
            const term = filters.search.toLowerCase();
            rows = rows.filter(
              (r) =>
                r.command.toLowerCase().includes(term) ||
                (r.description || "").toLowerCase().includes(term)
            );
          }
          return rows;
        }
      );

      ipcMain.handle("db-get-groups", () =>
        Array.from(
          new Set(
            readAll()
              .map((r) => r.groupName)
              .filter(Boolean)
          )
        ).sort()
      );

      ipcMain.handle("db-export", async () => {
        const rows = readAll();
        const { filePath } = await dialog.showSaveDialog({
          title: "Export commands as JSON",
          defaultPath: join(app.getPath("documents"), "cmdforge-commands.json"),
          filters: [{ name: "JSON", extensions: ["json"] }]
        });
        if (!filePath) return { cancelled: true };
        fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf8");
        return { cancelled: false, filePath };
      });

      ipcMain.handle("db-import", async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: "Import commands from JSON",
          filters: [{ name: "JSON", extensions: ["json"] }],
          properties: ["openFile"]
        });
        if (canceled || !filePaths || filePaths.length === 0) return { cancelled: true };
        const content = fs.readFileSync(filePaths[0], "utf8");
        let parsed: Array<{ command: string; description?: string; groupName?: string }> = [];
        try {
          parsed = JSON.parse(content);
        } catch (err) {
          console.error("Import JSON parse error", err);
          return { error: "Invalid JSON file" };
        }
        // REPLACE all existing commands with imported data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newRows: any[] = [];
        let nextId = 1;
        for (const it of parsed)
          newRows.unshift({
            id: nextId++,
            command: it.command,
            description: it.description || "",
            groupName: it.groupName || "",
            created_at: new Date().toISOString()
          });
        writeAll(newRows);
        return { cancelled: false, count: parsed.length };
      });

      // JSON fallback rename group implementation
      ipcMain.handle("db-rename-group", async (_, oldName: string, newName: string) => {
        if (!oldName || !newName || oldName === newName) return { ok: false, message: "No-op" };
        try {
          const rows = readAll();
          // Check for conflicts where a group already uses the new name
          const exists = rows.some(
            (r: unknown) => (r as { groupName?: string }).groupName === newName
          );
          if (exists) return { ok: false, message: "Group name already in use" };
          let changed = false;
          const newRows = rows.map((r: unknown) => {
            const rr = r as { groupName?: string };
            if (rr.groupName === oldName) {
              changed = true;
              return { ...(r as Record<string, unknown>), groupName: newName };
            }
            return r;
          });
          if (changed) writeAll(newRows);
          return { ok: true };
        } catch (err) {
          console.error("db-rename-group json error", err);
          return { ok: false, message: "Failed to rename group" };
        }
      });

      ipcMain.handle("db-delete-group", async (_, groupName: string) => {
        if (!groupName) return { ok: false, message: "Missing group name" };
        try {
          const rows = readAll();
          const exists = rows.some(
            (r: unknown) => (r as { groupName?: string }).groupName === groupName
          );
          if (!exists) return { ok: false, message: "Group not found" };
          const newRows = rows.filter(
            (r: unknown) => (r as { groupName?: string }).groupName !== groupName
          );
          writeAll(newRows);
          return { ok: true };
        } catch (err) {
          console.error("db-delete-group json error", err);
          return { ok: false, message: "Failed to delete group" };
        }
      });

      ipcMain.handle("db-delete-all", async () => {
        try {
          writeAll([]);
          return { ok: true };
        } catch (err) {
          console.error("db-delete-all json error", err);
          return { ok: false, message: "Failed to delete all commands" };
        }
      });

      // Sync metadata handlers for JSON fallback
      const readMetadata = (): Record<string, string> => {
        try {
          const content = fs.readFileSync(metadataPath, "utf8");
          return JSON.parse(content);
        } catch {
          return {};
        }
      };

      const writeMetadata = (data: Record<string, string>): void =>
        fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2), "utf8");

      ipcMain.handle("sync-metadata-get", (_, key: string) => {
        const meta = readMetadata();
        return { ok: true, value: meta[key] || null };
      });

      ipcMain.handle("sync-metadata-set", (_, key: string, value: string) => {
        const meta = readMetadata();
        meta[key] = value;
        writeMetadata(meta);
        return { ok: true };
      });

      ipcMain.handle("sync-metadata-delete", (_, key: string) => {
        const meta = readMetadata();
        delete meta[key];
        writeMetadata(meta);
        return { ok: true };
      });

      // Create dbHandlers for sync service with JSON fallback access
      const dbHandlersJSON = {
        getCommands: async () => {
          return readAll() as Array<{
            id: number;
            command: string;
            description?: string;
            groupName?: string;
          }>;
        },
        deleteAllCommands: async () => {
          writeAll([]);
        },
        createCommand: async (payload: {
          command: string;
          description?: string;
          groupName?: string;
        }) => {
          const rows = readAll();
          const id = (rows.reduce((max, r) => (r.id && r.id > max ? r.id : max), 0) as number) + 1;
          const newRow = {
            id,
            command: payload.command,
            description: payload.description || "",
            groupName: payload.groupName || "",
            created_at: new Date().toISOString()
          };
          rows.unshift(newRow);
          writeAll(rows);
          return newRow;
        },
        getMetadata: async (key: string) => {
          const meta = readMetadata();
          return meta[key] || null;
        },
        setMetadata: async (key: string, value: string) => {
          const meta = readMetadata();
          meta[key] = value;
          writeMetadata(meta);
        },
        getDbPath: () => jsonPath
      };

      // Register sync service with JSON handlers
      registerSyncServiceHandlers(dbHandlersJSON);
    }
  } catch (err) {
    console.error("DB init error", err);
  }

  // Register main process service handlers before creating window to ensure handlers exist
  registerKeystoreHandlers();
  registerSettingsHandlers();
  registerGoogleFileHandlers();
  registerGoogleServiceHandlers();
  createWindow();

  // Set macOS Dock icon explicitly when available
  if (process.platform === "darwin" && icon) {
    try {
      app.dock.setIcon(icon);
    } catch (err) {
      console.warn("set Dock icon error", err);
    }
  }

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Handle set-always-on-top
ipcMain.handle("set-always-on-top", (_, enabled: boolean) => {
  try {
    const win = mainWindowRef || BrowserWindow.getAllWindows()[0];
    if (win) win.setAlwaysOnTop(Boolean(enabled));
    return { ok: true };
  } catch (err) {
    console.error("set-always-on-top error", err);
    return { ok: false };
  }
});

ipcMain.handle("get-always-on-top", () => {
  try {
    const win = mainWindowRef || BrowserWindow.getAllWindows()[0];
    if (win) return win.isAlwaysOnTop();
    return false;
  } catch (err) {
    console.error("get-always-on-top error", err);
    return false;
  }
});

// NOTE: registration of these handlers happens above inside app.whenReady().

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Custom main process code can be added here.

// settings handlers are registered from the settings module
/* settings handlers moved to src/main/settings.ts */

// sheets-has-data handler moved to keystore module
