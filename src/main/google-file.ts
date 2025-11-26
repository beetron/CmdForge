import { dialog, ipcMain, app } from "electron";
import fs from "fs";
import { join } from "path";

export function registerGoogleFileHandlers(): void {
  if (ipcMain.listenerCount("google-load-key") > 0) ipcMain.removeHandler("google-load-key");
  ipcMain.handle("google-load-key", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Load Google service account key",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"]
    });
    if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };
    try {
      const content = fs.readFileSync(filePaths[0], "utf8");
      return { canceled: false, filePath: filePaths[0], content };
    } catch (err) {
      console.error("Failed to read Google key", err);
      return { canceled: true };
    }
  });

  if (ipcMain.listenerCount("google-save-key") > 0) ipcMain.removeHandler("google-save-key");
  ipcMain.handle("google-save-key", async (_, content: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save Google service account key",
      defaultPath: join(app.getPath("documents"), "service-account.json"),
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (!filePath || canceled) return { ok: false };
    try {
      fs.writeFileSync(filePath, content, "utf8");
      return { ok: true };
    } catch (err) {
      console.error("Failed to save Google key", err);
      return { ok: false };
    }
  });
}

export default registerGoogleFileHandlers;
