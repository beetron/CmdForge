import { ipcMain, dialog, app } from "electron";
import fs from "fs";
import { join } from "path";

type PreparedStatement = {
  run: (...args: unknown[]) => { lastInsertRowid?: number };
  get: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown[];
};

type BetterSqlite3Database = {
  pragma: (s: string) => unknown;
  prepare: (sql: string) => PreparedStatement;
  transaction: <T extends (...args: unknown[]) => unknown>(fn: T) => T;
};

/**
 * Force WAL checkpoint to flush changes to disk and update file mtime.
 * This ensures sync can detect local changes by comparing file modification times.
 */
function forceWalCheckpoint(db: BetterSqlite3Database, operation: string): void {
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch (err) {
    console.warn(`WAL checkpoint after ${operation} failed`, err);
  }
}

export function registerSqliteHandlers(db: BetterSqlite3Database): void {
  // Create command
  ipcMain.handle(
    "db-create-command",
    (_, payload: { command: string; description?: string; groupName?: string }) => {
      const info = db
        .prepare("INSERT INTO commands (command, description, groupName) VALUES (?, ?, ?)")
        .run(payload.command, payload.description || "", payload.groupName || "") as {
        lastInsertRowid?: number;
      };

      forceWalCheckpoint(db, "create");

      return db.prepare("SELECT * FROM commands WHERE id = ?").get(info.lastInsertRowid as number);
    }
  );

  // Update command
  ipcMain.handle(
    "db-update-command",
    (_, payload: { id: number; command: string; description?: string; groupName?: string }) => {
      db.prepare(
        "UPDATE commands SET command = ?, description = ?, groupName = ? WHERE id = ?"
      ).run(payload.command, payload.description || "", payload.groupName || "", payload.id);

      forceWalCheckpoint(db, "update");

      return db.prepare("SELECT * FROM commands WHERE id = ?").get(payload.id);
    }
  );

  // Delete command
  ipcMain.handle("db-delete-command", (_, id: number) => {
    db.prepare("DELETE FROM commands WHERE id = ?").run(id);
    forceWalCheckpoint(db, "delete");
    return { ok: true };
  });

  // Get commands with filters
  ipcMain.handle(
    "db-get-commands",
    (_, filters: { groupName?: string; search?: string } | undefined) => {
      if (!filters) return db.prepare("SELECT * FROM commands ORDER BY created_at DESC").all();
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

  // Get groups
  ipcMain.handle("db-get-groups", () =>
    db
      .prepare(
        "SELECT DISTINCT groupName FROM commands WHERE groupName IS NOT NULL ORDER BY groupName"
      )
      .all()
      .map((r: unknown) => (r as { groupName: string }).groupName)
  );

  // Rename group
  ipcMain.handle("db-rename-group", async (_, oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return { ok: false, message: "No-op" };
    try {
      const exists = db.prepare("SELECT 1 FROM commands WHERE groupName = ? LIMIT 1").get(newName);
      if (exists) return { ok: false, message: "Group name already in use" };
      db.prepare("UPDATE commands SET groupName = ? WHERE groupName = ?").run(newName, oldName);

      forceWalCheckpoint(db, "rename-group");

      return { ok: true };
    } catch (err) {
      console.error("db-rename-group sqlite error", err);
      return { ok: false, message: "Failed to rename group" };
    }
  });

  // Delete group
  ipcMain.handle("db-delete-group", async (_, groupName: string) => {
    if (!groupName) return { ok: false, message: "Missing group name" };
    try {
      const exists = db
        .prepare("SELECT 1 FROM commands WHERE groupName = ? LIMIT 1")
        .get(groupName);
      if (!exists) return { ok: false, message: "Group not found" };
      db.prepare("DELETE FROM commands WHERE groupName = ?").run(groupName);

      forceWalCheckpoint(db, "delete-group");

      return { ok: true };
    } catch (err) {
      console.error("db-delete-group sqlite error", err);
      return { ok: false, message: "Failed to delete group" };
    }
  });

  // Delete all commands
  ipcMain.handle("db-delete-all", async () => {
    try {
      db.prepare("DELETE FROM commands").run();
      forceWalCheckpoint(db, "delete-all");
      return { ok: true };
    } catch (err) {
      console.error("db-delete-all sqlite error", err);
      return { ok: false, message: "Failed to delete all commands" };
    }
  });

  // Export
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

  // Import
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
        fn: (items: Array<{ command: string; description?: string; groupName?: string }>) => void
      ) => (items: Array<{ command: string; description?: string; groupName?: string }>) => void
    )((items) => {
      for (const it of items) insert.run(it.command, it.description || "", it.groupName || "");
    });
    insertMany(parsed);

    forceWalCheckpoint(db, "import");

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
}

export function createSqliteDbHandlers(
  db: BetterSqlite3Database,
  dbPath: string
): {
  getCommands: () => Promise<
    Array<{ id: number; command: string; description?: string; groupName?: string }>
  >;
  deleteAllCommands: () => Promise<void>;
  createCommand: (payload: {
    command: string;
    description?: string;
    groupName?: string;
  }) => Promise<{ id: number; command: string; description?: string; groupName?: string }>;
  getMetadata: (key: string) => Promise<string | null>;
  setMetadata: (key: string, value: string) => Promise<void>;
  getDbPath: () => string;
} {
  return {
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
}
