import React, { useEffect, useState } from "react";
import { HomePage } from "../pages/HomePage";
import { AddCommandPage } from "../pages/AddCommandPage";
import { Alert } from "./common/Alert";
import { Confirm } from "./common/Confirm";
import GoogleSyncModal from "./common/GoogleSyncModal";
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
  const [showGoogleSync, setShowGoogleSync] = useState<boolean>(false);

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

  return (
    <div className="command-manager">
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
      <GoogleSyncModal show={showGoogleSync} onClose={() => setShowGoogleSync(false)} />
    </div>
  );
}
