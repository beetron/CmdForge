import React from "react";
import { Command } from "../../types/command";
import { useTranslation } from "../../contexts/I18nContext";

interface SearchResultsProps {
  suggestions: Command[];
  copiedId: number | null;
  onCopy: (text: string, id: number) => void;
  onEdit: (cmd: Command) => void;
  onDelete: (id: number) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  suggestions,
  copiedId,
  onCopy,
  onEdit,
  onDelete
}) => {
  const { t } = useTranslation();

  if (suggestions.length === 0) return null;

  return (
    <div className="suggestions-container">
      <h3>
        Search Results <span className="copy-hint">Click to copy!</span>
      </h3>
      <div className="suggestions-list">
        {suggestions.map((cmd) => (
          <div
            key={cmd.id}
            className="suggestion-item"
            onClick={() => onCopy(cmd.command, cmd.id!)}
          >
            <div className="suggestion-content">
              <div className="suggestion-command">{cmd.command}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                {cmd.groupName && <span className="command-group">{cmd.groupName}</span>}
                {cmd.description && <div className="suggestion-description">{cmd.description}</div>}
              </div>
            </div>
            <div className="suggestion-actions">
              {copiedId === cmd.id && (
                <span className="copied-indicator">✓ {t("messages.copiedToClipboard")}</span>
              )}
              <button
                className="btn-edit suggestion-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(cmd);
                }}
              >
                {t("commands.edit")}
              </button>
              <button
                className="btn-delete suggestion-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(cmd.id!);
                }}
              >
                {t("commands.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
