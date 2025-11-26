import React, { useEffect, useState } from "react";
import { HomePage } from "../pages/HomePage";
import { AddCommandPage } from "../pages/AddCommandPage";
import { Alert } from "./common/Alert";
import { Confirm } from "./common/Confirm";
import GoogleSyncModal from "./common/GoogleSyncModal";
import { getKeyFromStorage, getSheetIdFromStorage } from "../utils/keytarStorage";
import { useCommands } from "../hooks/useCommands";
import { useSearch } from "../hooks/useSearch";
import { useAlert } from "../hooks/useAlert";
import { useConfirm } from "../hooks/useConfirm";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { commandService } from "../services/commandService";
import { Command } from "../types/command";

type ViewType = "home" | "add";

export default function CommandManager(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [groupFilter, setGroupFilter] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<Command | null>(null);

  const { allCommands, groups, loadCommands } = useCommands(groupFilter);
  const { search, setSearch, filteredSuggestions, showSuggestions, setShowSuggestions } =
    useSearch(allCommands);
  const { alertMessage, showAlert, showCustomAlert, closeAlert } = useAlert();
  const { confirmMessage, showConfirm, showCustomConfirm, closeConfirm } = useConfirm();
  const { copiedId, copyToClipboard } = useCopyToClipboard();
  const [stayOnTop, setStayOnTop] = useState<boolean>(false);
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState<boolean>(false);
  const [showGoogleSync, setShowGoogleSync] = useState<boolean>(false);
  const [googleKey, setGoogleKey] = useState<string | null>(null);
  const [googleSheetId, setGoogleSheetId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Keyboard ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (showAlert || showConfirm) {
          return;
        }
        if (currentView === "home") {
          setSearch("");
          setShowSuggestions(false);
        } else if (currentView === "add") {
          setCurrentView("home");
          resetForm();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, showAlert, showConfirm, setSearch, setShowSuggestions]);

  const resetForm = (): void => {
    setEditing(null);
  };

  const handleSave = async (cmd: Command): Promise<boolean> => {
    if (!cmd.command?.trim()) {
      showCustomAlert("Please enter a command");
      return false;
    }
    if (!cmd.groupName?.trim()) {
      showCustomAlert("Please select or enter a group name");
      return false;
    }

    if (editing) {
      const updated = await commandService.updateCommand({
        id: editing.id!,
        command: cmd.command,
        description: cmd.description,
        groupName: cmd.groupName
      });
      // keep the page in edit mode and update the editing state
      setEditing(updated);
      showCustomAlert("Updated!");
      await loadCommands();

      // Trigger sync if enabled
      if (googleSyncEnabled && window.api.syncNow) {
        window.api.syncNow().catch((err) => console.error("Sync after update failed", err));
      }

      return true;
    } else {
      await commandService.createCommand({
        command: cmd.command,
        description: cmd.description,
        groupName: cmd.groupName
      });
      showCustomAlert("Saved!");
      resetForm();
      await loadCommands();

      // Trigger sync if enabled
      if (googleSyncEnabled && window.api.syncNow) {
        window.api.syncNow().catch((err) => console.error("Sync after create failed", err));
      }

      return true;
    }
  };

  const handleEdit = (row: Command): void => {
    setEditing(row);
    setCurrentView("add");
  };

  const handleDelete = async (id: number): Promise<void> => {
    showCustomConfirm("Are you sure you want to delete this command?", async () => {
      const res = await commandService.deleteCommand(id);
      if (!res || !res.ok) {
        showCustomAlert("Failed to delete command");
        return;
      }
      await loadCommands();
      // If we deleted the command currently being edited, clear the form and return to home
      if (editing && editing.id === id) {
        resetForm();
        setCurrentView("home");
      }

      // Trigger sync if enabled
      if (googleSyncEnabled && window.api.syncNow) {
        window.api.syncNow().catch((err) => console.error("Sync after delete failed", err));
      }
    });
  };

  const handleExport = async (): Promise<void> => {
    const res = await commandService.exportData();
    if (!res || res.cancelled) {
      showCustomAlert("Export cancelled");
    } else {
      showCustomAlert("Exported to " + (res.filePath || "file"));
    }
  };

  const handleImport = async (): Promise<void> => {
    const res = await commandService.importData();
    if (!res || res.cancelled) {
      showCustomAlert("Import cancelled");
    } else if (res.error) {
      showCustomAlert("Import error: " + res.error);
    } else {
      showCustomAlert(`Imported ${res.count ?? 0} commands`);
      await loadCommands();

      // Trigger sync if enabled
      if (googleSyncEnabled && window.api.syncNow) {
        window.api.syncNow().catch((err) => console.error("Sync after import failed", err));
      }
    }
  };

  const handleRenameGroup = async (oldName: string, newName: string): Promise<void> => {
    if (!oldName || !newName) {
      showCustomAlert("Please select a group and enter a new group name");
      return;
    }
    if (oldName === newName) {
      showCustomAlert("New group name is the same as the existing one");
      return;
    }
    const res = await commandService.renameGroup(oldName, newName);
    if (!res || !res.ok) {
      showCustomAlert(res?.message ?? "Rename failed");
    } else {
      showCustomAlert("Group renamed");
      await loadCommands();
      // If we're editing a command which used the old group, update its groupName
      setEditing((prev) =>
        prev && prev.groupName === oldName ? { ...prev, groupName: newName } : prev
      );
    }
  };

  const handleDeleteGroup = (groupName: string): Promise<void> => {
    if (!groupName) {
      showCustomAlert("Please select a group to delete");
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      showCustomConfirm(
        "Deleting the Group will delete any commands in the same group",
        async () => {
          const res = await commandService.deleteGroup(groupName);
          if (!res || !res.ok) {
            showCustomAlert(res?.message ?? "Failed to delete group");
            resolve();
          } else {
            showCustomAlert("Group deleted");
            await loadCommands();
            // If the user was editing a command in that group, reset the form and return to home
            resetForm();
            setCurrentView("home");
            resolve();
          }
        }
      );
    });
  };

  const handleDeleteAll = (): Promise<void> => {
    return new Promise((resolve) => {
      showCustomConfirm("Delete all commands?", async () => {
        const res = await commandService.deleteAll();
        if (!res || !res.ok) {
          showCustomAlert(res?.message ?? "Delete all failed");
          resolve();
        } else {
          showCustomAlert("All commands deleted");
          await loadCommands();
          resetForm();
          setCurrentView("home");

          // Trigger sync if enabled
          if (googleSyncEnabled && window.api.syncNow) {
            window.api.syncNow().catch((err) => console.error("Sync after delete all failed", err));
          }

          resolve();
        }
      });
    });
  };

  // Initialize stay-on-top state from main window when the component mounts
  useEffect(() => {
    const init = async (): Promise<void> => {
      try {
        // @ts-ignore preload
        const v = (await window.api?.getAlwaysOnTop?.()) as boolean;
        setStayOnTop(Boolean(v));
      } catch {
        // ignore
      }
    };
    init();
  }, []);

  // Initialize Google Sync setting from settings store
  useEffect(() => {
    const initGoogleSync = async (): Promise<void> => {
      try {
        // @ts-ignore - preload exposes api
        const res = await window.api?.settingsGet?.("googleSyncEnabled");
        if (res && res.ok) setGoogleSyncEnabled(Boolean(res.value));
      } catch {
        // ignore
      }
    };
    initGoogleSync();
  }, []);

  // Handler that intercepts attempts to toggle Google Sync so we can confirm / backup
  const handleRequestSetGoogleSync = async (v: boolean): Promise<void> => {
    // disable path: just update state and let effect persist it
    if (!v) {
      setGoogleSyncEnabled(false);
      return;
    }

    // If enabling sync and credentials are missing, open the modal to configure them
    if (!googleKey || !googleSheetId) {
      // Open the Google Sync modal so user can configure credentials
      setShowGoogleSync(true);
      // Keep the toggle off for now; user will enable after setup
      return;
    }

    // Both key and sheet ID are present, enable sync immediately
    setGoogleSyncEnabled(true);
  };

  // Persist Google Sync setting changes when updated elsewhere in the app
  useEffect(() => {
    const persist = async (): Promise<void> => {
      try {
        // @ts-ignore - preload exposes api
        await window.api?.settingsSet?.("googleSyncEnabled", googleSyncEnabled);
      } catch {
        // ignore
      }
    };
    persist();
  }, [googleSyncEnabled]);

  // Load saved Google key + sheet ID at app start
  const loadGoogleSavedData = async (): Promise<void> => {
    try {
      const existing = await getKeyFromStorage();
      const existingSheet = await getSheetIdFromStorage();
      if (existing) setGoogleKey(existing);
      if (existingSheet) setGoogleSheetId(existingSheet);
    } catch {
      // ignore - already handled in util
    }
  };

  useEffect(() => {
    loadGoogleSavedData();
  }, []);

  // Initialize sync on mount and check sync status
  useEffect(() => {
    const initializeSync = async (): Promise<void> => {
      try {
        console.log("Sync initialization check:", {
          googleSyncEnabled,
          hasKey: !!googleKey,
          hasSheetId: !!googleSheetId,
          hasSyncAPI: typeof window.api.syncStatus === "function"
        });

        if (!window.api.syncStatus || !window.api.syncNow) {
          console.log("Sync API not available");
          return;
        }

        // Only sync if we have credentials
        if (!googleKey || !googleSheetId) {
          console.log("Skipping sync - no credentials yet");
          return;
        }

        const status = await window.api.syncStatus();
        console.log("Sync status:", JSON.stringify(status, null, 2));

        if (status.ok && status.ready && googleSyncEnabled) {
          // Perform initial sync
          console.log("Performing initial sync...");
          setIsSyncing(true);
          const syncResult = await window.api.syncNow();
          setIsSyncing(false);
          console.log("Sync result:", syncResult);

          // Reload commands after sync
          if (syncResult.ok) {
            await loadCommands();
            // Spinner provides feedback, no need for alert on success
          } else {
            const errorMsg = "error" in syncResult ? syncResult.error : "Unknown error";
            console.error("Sync failed:", errorMsg);
            showCustomAlert(`Sync failed: ${errorMsg || "Unknown error"}`);
          }
        }
      } catch (err) {
        console.error("Sync initialization failed", err);
      }
    };

    if (googleSyncEnabled) {
      initializeSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleSyncEnabled, googleSheetId]);

  return (
    <div className="command-manager">
      {isSyncing && (
        <div className="sync-overlay">
          <div className="sync-spinner">
            <div className="spinner"></div>
            <p>Syncing with Google Sheets...</p>
          </div>
        </div>
      )}
      {currentView === "home" && (
        <HomePage
          search={search}
          setSearch={setSearch}
          groups={groups}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          filteredSuggestions={filteredSuggestions}
          showSuggestions={showSuggestions}
          copiedId={copiedId}
          onCopy={copyToClipboard}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddClick={() => {
            resetForm();
            setCurrentView("add");
          }}
          onExport={handleExport}
          onImport={handleImport}
          onGoogleSync={() => setShowGoogleSync(true)}
          onDeleteAll={handleDeleteAll}
          googleSyncEnabled={googleSyncEnabled}
          onSetGoogleSync={handleRequestSetGoogleSync}
          stayOnTop={stayOnTop}
          onSetStayOnTop={setStayOnTop}
        />
      )}

      {currentView === "add" && (
        <AddCommandPage
          editing={editing || undefined}
          groups={groups}
          onSave={handleSave}
          onDelete={handleDelete}
          onBack={() => {
            setCurrentView("home");
            resetForm();
          }}
          onReset={resetForm}
          onFormCleared={() => {
            // onFormCleared is called after form is cleared in AddCommandPage
          }}
          stayOnTop={stayOnTop}
          googleSyncEnabled={googleSyncEnabled}
          onSetGoogleSync={handleRequestSetGoogleSync}
          onSetStayOnTop={setStayOnTop}
          onGroupRename={handleRenameGroup}
          onGroupDelete={handleDeleteGroup}
        />
      )}

      <Alert show={showAlert} message={alertMessage} onClose={closeAlert} />
      <Confirm
        show={showConfirm}
        message={confirmMessage}
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />
      <GoogleSyncModal
        show={showGoogleSync}
        onClose={() => setShowGoogleSync(false)}
        onSaved={async () => {
          await loadGoogleSavedData();
          // After loading credentials, enable sync
          setGoogleSyncEnabled(true);
        }}
        onDeleted={() => {
          loadGoogleSavedData();
          setGoogleKey(null);
          setGoogleSheetId(null);
          setGoogleSyncEnabled(false);
          showCustomAlert("Google Sync data deleted and sync disabled");
        }}
      />
    </div>
  );
}
