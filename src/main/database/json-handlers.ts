import { ipcMain, dialog, app } from "electron";
import fs from "fs";
import { join } from "path";

type Command = {
  id: number;
  command: string;
  description?: string;
  groupName?: string;
  created_at?: string;
};

export function registerJsonHandlers(
  jsonPath: string,
  metadataPath: string
): {
  readAll: () => Command[];
  writeAll: (rows: Command[]) => void;
  readMetadata: () => Record<string, string>;
  writeMetadata: (meta: Record<string, string>) => void;
} {
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
  const writeAll = (rows: any[]): void => {
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf8");
    } catch (err) {
      console.error("JSON DB write error", err);
    }
  };

  const readMetadata = (): Record<string, string> => {
    try {
      const content = fs.readFileSync(metadataPath, "utf8");
      return JSON.parse(content);
    } catch {
      return {};
    }
  };

  const writeMetadata = (meta: Record<string, string>): void => {
    try {
      fs.writeFileSync(metadataPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (err) {
      console.error("Metadata write error", err);
    }
  };

  // Create command
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

  // Update command
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

  // Delete command
  ipcMain.handle("db-delete-command", (_, id: number) => {
    const rows = readAll().filter((r) => r.id !== id);
    writeAll(rows);
    return { ok: true };
  });

  // Get commands with filters
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

  // Get groups
  ipcMain.handle("db-get-groups", () =>
    Array.from(
      new Set(
        readAll()
          .map((r) => r.groupName)
          .filter(Boolean)
      )
    ).sort()
  );

  // Export
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

  // Rename group
  ipcMain.handle("db-rename-group", async (_, oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return { ok: false, message: "No-op" };
    try {
      const rows = readAll();
      const exists = rows.some((r: unknown) => (r as { groupName?: string }).groupName === newName);
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

  // Delete group
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

  // Delete all
  ipcMain.handle("db-delete-all", async () => {
    try {
      writeAll([]);
      return { ok: true };
    } catch (err) {
      console.error("db-delete-all json error", err);
      return { ok: false, message: "Failed to delete all commands" };
    }
  });

  // Sync metadata handlers
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

  return {
    readAll,
    writeAll,
    readMetadata,
    writeMetadata
  };
}

export function createJsonDbHandlers(
  jsonPath: string,
  readAll: () => Command[],
  writeAll: (rows: Command[]) => void,
  readMetadata: () => Record<string, string>,
  writeMetadata: (meta: Record<string, string>) => void
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
}
