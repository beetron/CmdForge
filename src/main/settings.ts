import { app, ipcMain } from "electron";
import fsPromises from "fs/promises";
import fs from "fs";
import { join } from "path";

const SETTINGS_FILENAME = "settings.json";

const readSettingsFile = async (): Promise<Record<string, unknown>> => {
  try {
    const p = join(app.getPath("userData"), SETTINGS_FILENAME);
    if (!fs.existsSync(p)) return {};
    const str = await fsPromises.readFile(p, "utf8");
    return JSON.parse(str) as Record<string, unknown>;
  } catch (err) {
    console.error("readSettingsFile error", err);
    return {};
  }
};

const writeSettingsFile = async (data: Record<string, unknown>): Promise<boolean> => {
  try {
    const p = join(app.getPath("userData"), SETTINGS_FILENAME);
    await fsPromises.writeFile(p, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("writeSettingsFile error", err);
    return false;
  }
};

export function registerSettingsHandlers(): void {
  if (ipcMain.listenerCount("settings-get") > 0) ipcMain.removeHandler("settings-get");
  ipcMain.handle("settings-get", async (_, key: string) => {
    try {
      const settings = await readSettingsFile();
      return { ok: true, value: settings[key] };
    } catch (err) {
      console.error("settings-get error", err);
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });

  if (ipcMain.listenerCount("settings-set") > 0) ipcMain.removeHandler("settings-set");
  ipcMain.handle("settings-set", async (_, key: string, value: unknown) => {
    try {
      const settings = await readSettingsFile();
      settings[key] = value;
      const ok = await writeSettingsFile(settings);
      return { ok };
    } catch (err) {
      console.error("settings-set error", err);
      return { ok: false, error: (err as Error)?.message ?? String(err) };
    }
  });
}

export default registerSettingsHandlers;
