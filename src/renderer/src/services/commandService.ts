import { Command, CreateCommandInput, UpdateCommandInput } from "../types/command";

interface ExportResult {
  filePath?: string;
  cancelled?: boolean;
}

interface ImportResult {
  count?: number;
  cancelled?: boolean;
  error?: string;
}

export const commandService = {
  async getCommands(groupName?: string): Promise<Command[]> {
    return window.api.getCommands({ groupName });
  },

  async getGroups(): Promise<string[]> {
    return window.api.getGroups();
  },

  async createCommand(input: CreateCommandInput): Promise<Command> {
    return window.api.createCommand(input);
  },

  async updateCommand(input: UpdateCommandInput): Promise<Command> {
    return window.api.updateCommand(input);
  },

  async deleteCommand(id: number): Promise<{ ok: boolean }> {
    return window.api.deleteCommand(id);
  },

  async exportData(): Promise<ExportResult> {
    return window.api.exportData();
  },

  async importData(): Promise<ImportResult> {
    return window.api.importData();
  },

  async renameGroup(oldName: string, newName: string): Promise<{ ok: boolean; message?: string }> {
    return window.api.renameGroup(oldName, newName);
  },
  async deleteGroup(groupName: string): Promise<{ ok: boolean; message?: string }> {
    return window.api.deleteGroup(groupName);
  }
};
