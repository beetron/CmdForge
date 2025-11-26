import React, { useState } from "react";
import { useAlert } from "../hooks/useAlert";
import { useTranslation } from "../contexts/I18nContext";
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
  googleSyncEnabled?: boolean;
  onSetGoogleSync?: (v: boolean) => void;
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
  googleSyncEnabled,
  onSetGoogleSync,
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
  const { t } = useTranslation();

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
      showCustomAlert(t("addCommand.missingNewGroupName"));
      return;
    }
    if (renameOldGroup === renameNewGroup) {
      showCustomAlert(t("addCommand.sameGroupName"));
      return;
    }
    if (!onGroupRename) return;
    await onGroupRename(renameOldGroup, renameNewGroup);
    setRenameNewGroup("");
  };

  const handleDeleteClick = async (): Promise<void> => {
    if (!deleteGroupName) {
      showCustomAlert(t("addCommand.selectGroupToDelete"));
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
              <div className="google-toggle">
                <div
                  className="google-help"
                  role="button"
                  title={t("sync.googleSync")}
                  aria-label="Help: Google Sync"
                >
                  G
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={Boolean(googleSyncEnabled)}
                    onChange={(e) => {
                      const v = e.target.checked;
                      onSetGoogleSync?.(v);
                    }}
                    aria-label="Google Sync Enabled"
                  />
                  <span className="slider" />
                </label>
              </div>
              <div className="stay-toggle">
                <div
                  className="stay-help"
                  role="button"
                  title={t("options.stayOnTop")}
                  aria-label="Help: Stay on top"
                >
                  ?
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
            <div className="add-header-title">
              {editing ? t("addCommand.editTitle") : t("addCommand.title")}
            </div>
            <div className="add-header-controls">
              <button className="back-button btn-primary" onClick={onBack}>
                ← {t("addCommand.back")}
              </button>
              <button className="btn-primary" onClick={handleSaveClick}>
                {editing ? t("addCommand.update") : t("addCommand.save")}
              </button>
              {editing && onDelete && (
                <button className="btn-delete-edit" onClick={() => onDelete(editing.id!)}>
                  {t("commands.delete")}
                </button>
              )}
              <button className="btn-primary" onClick={handleReset}>
                {t("addCommand.clear")}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="add-content">
        <div className="form-container">
          <h2>{editing ? t("addCommand.editTitle") : t("addCommand.title")}</h2>

          <div className="form-group">
            <label>{t("commands.command")}</label>
            <input
              className="input-command"
              placeholder={t("addCommand.commandPlaceholder")}
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t("commands.description")}</label>
            <textarea
              className="input-description"
              placeholder={t("addCommand.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>{t("commands.group")}</label>
            {groups.length > 0 ? (
              <div className="group-input-row">
                <select
                  className="input-group-select"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                >
                  <option value="">{t("commands.noGroup")}</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <span className="group-or">or</span>
                <input
                  className="input-group-text"
                  placeholder={t("addCommand.groupPlaceholder")}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            ) : (
              <input
                className="input-group"
                placeholder={t("addCommand.groupPlaceholder")}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            )}
          </div>

          {editing && (
            <div className="card-panel">
              <div className="form-group">
                <label>{t("groups.rename")}</label>
                <div className="group-input-row">
                  <select
                    className="input-group-select"
                    value={renameOldGroup}
                    onChange={(e) => setRenameOldGroup(e.target.value)}
                  >
                    <option value="">{t("commands.noGroup")}</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input-group-text"
                    placeholder={t("groups.newName")}
                    value={renameNewGroup}
                    onChange={(e) => setRenameNewGroup(e.target.value)}
                  />
                  <button
                    className="btn-primary btn-small"
                    onClick={handleRenameClick}
                    disabled={!renameNewGroup || renameNewGroup.trim() === ""}
                  >
                    {t("modal.save")}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>{t("groups.delete")}</label>
                <div className="group-input-row">
                  <select
                    className="input-group-select input-group-select--small"
                    value={deleteGroupName}
                    onChange={(e) => setDeleteGroupName(e.target.value)}
                  >
                    <option value="">{t("commands.noGroup")}</option>
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
                    {t("commands.delete")}
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
