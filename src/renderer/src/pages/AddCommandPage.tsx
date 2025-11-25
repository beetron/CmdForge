import React, { useState } from "react";
import { useAlert } from "../hooks/useAlert";
import { Command } from "../types/command";
import cmdForgeLogo from "../../../../resources/CmdForgeLogo.png";

interface AddCommandPageProps {
  editing?: Command;
  groups: string[];
  onSave: (cmd: Command) => Promise<boolean>;
  onDelete?: (id: number) => void;
  onBack: () => void;
  onReset: () => void;
  onFormCleared?: () => void;
  stayOnTop: boolean;
  onSetStayOnTop: (v: boolean) => void;
  onGroupRename?: (oldName: string, newName: string) => Promise<void>;
  onGroupDelete?: (groupName: string) => Promise<void>;
}

export const AddCommandPage: React.FC<AddCommandPageProps> = ({
  editing,
  groups,
  onSave,
  onDelete,
  onBack,
  onReset,
  onFormCleared,
  stayOnTop,
  onSetStayOnTop,
  onGroupRename,
  onGroupDelete
}) => {
  const [commandText, setCommandText] = useState(editing?.command || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [groupName, setGroupName] = useState(editing?.groupName || "");
  const [renameOldGroup, setRenameOldGroup] = useState<string>(editing?.groupName || "");
  const [renameNewGroup, setRenameNewGroup] = useState<string>("");
  const [deleteGroupName, setDeleteGroupName] = useState<string>(editing?.groupName || "");
  const { showCustomAlert } = useAlert();

  const handleSaveClick = async (): Promise<void> => {
    const success = await onSave({
      id: editing?.id,
      command: commandText,
      description,
      groupName
    });
    // Clear form fields after successful save (only when creating new command)
    if (success && !editing) {
      setCommandText("");
      setDescription("");
      setGroupName("");
      onFormCleared?.();
    }
  };

  const handleReset = (): void => {
    setCommandText(editing?.command || "");
    setDescription(editing?.description || "");
    setGroupName(editing?.groupName || "");
    onReset();
  };

  React.useEffect(() => {
    setRenameOldGroup(editing?.groupName || "");
    setDeleteGroupName("");
  }, [editing]);

  const handleRenameClick = async (): Promise<void> => {
    if (!renameNewGroup) {
      showCustomAlert("Missing new group name");
      return;
    }
    if (renameOldGroup === renameNewGroup) {
      showCustomAlert("New group name is the same as existing name");
      return;
    }
    if (!onGroupRename) return;
    await onGroupRename(renameOldGroup, renameNewGroup);
    setRenameNewGroup("");
  };

  const handleDeleteClick = async (): Promise<void> => {
    if (!deleteGroupName) {
      showCustomAlert("Please select a group to delete");
      return;
    }
    if (!onGroupDelete) return;
    await onGroupDelete(deleteGroupName);
  };

  return (
    <div className="add-screen">
      <div className="add-header-wrapper">
        <div className="add-header">
          <div className="header-top">
            <h1 className="app-title">
              <div className="app-logo">
                <img src={cmdForgeLogo} alt="CmdForge Logo" />
              </div>
              CmdForge
            </h1>
            <div className="header-actions">
              <div className="stay-toggle">
                <div
                  className="stay-help"
                  role="button"
                  title="Toggle to have window stay on top"
                  aria-label="Help: Stay on top"
                >
                  ? <span className="tooltip">Toggle to have window stay on top</span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={stayOnTop}
                    onChange={(e) => {
                      const v = e.target.checked;
                      onSetStayOnTop(v);
                      // @ts-ignore - preload API
                      window.api?.setAlwaysOnTop?.(v);
                    }}
                    aria-label="Stay on top"
                  />
                  <span className="slider" />
                </label>
              </div>
            </div>
          </div>
          <div className="add-header-inner">
            <div className="add-header-title">{editing ? "Edit Command" : "Add New Command"}</div>
            <div className="add-header-controls">
              <button className="back-button btn-primary" onClick={onBack}>
                ← Back
              </button>
              <button className="btn-primary" onClick={handleSaveClick}>
                {editing ? "Update" : "Save Command"}
              </button>
              {editing && onDelete && (
                <button className="btn-delete-edit" onClick={() => onDelete(editing.id!)}>
                  Delete
                </button>
              )}
              <button className="btn-primary" onClick={handleReset}>
                {editing ? "Cancel" : "Clear"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="add-content">
        <div className="form-container">
          <h2>{editing ? "Edit Command" : "Add New Command"}</h2>

          <div className="form-group">
            <label>Command</label>
            <input
              className="input-command"
              placeholder="e.g., kubectl get pods"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="input-description"
              placeholder="Describe what this command does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Group</label>
            {groups.length > 0 ? (
              <div className="group-input-row">
                <select
                  className="input-group-select"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                >
                  <option value="">Select group...</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <span className="group-or">or</span>
                <input
                  className="input-group-text"
                  placeholder="New group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            ) : (
              <input
                className="input-group"
                placeholder="e.g., Kubernetes, Docker, Git"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            )}
          </div>

          {editing && (
            <div className="card-panel">
              <div className="form-group">
                <label>Change Group Name</label>
                <div className="group-input-row">
                  <select
                    className="input-group-select"
                    value={renameOldGroup}
                    onChange={(e) => setRenameOldGroup(e.target.value)}
                  >
                    <option value="">Select group...</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input-group-text"
                    placeholder="New group name"
                    value={renameNewGroup}
                    onChange={(e) => setRenameNewGroup(e.target.value)}
                  />
                  <button
                    className="btn-primary btn-small"
                    onClick={handleRenameClick}
                    disabled={!renameNewGroup || renameNewGroup.trim() === ""}
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Delete Group</label>
                <div className="group-input-row">
                  <select
                    className="input-group-select input-group-select--small"
                    value={deleteGroupName}
                    onChange={(e) => setDeleteGroupName(e.target.value)}
                  >
                    <option value="">Select group...</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary btn-small"
                    onClick={handleDeleteClick}
                    disabled={!deleteGroupName}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
