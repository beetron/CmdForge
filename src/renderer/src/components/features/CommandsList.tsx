import React from "react";
import { Command } from "../../types/command";

interface CommandsListProps {
  commands: Command[];
  copiedId: number | null;
  onEdit: (cmd: Command) => void;
  onDelete: (id: number) => void;
  onCopy: (text: string, id: number) => void;
  empty?: boolean;
}

export const CommandsList: React.FC<CommandsListProps> = ({
  commands,
  copiedId,
  onEdit,
  onDelete,
  onCopy,
  empty
}) => {
  return (
    <div className="list-container">
      <h2>
        Saved Commands ({commands.length}){" "}
        {commands.length > 0 && <span className="copy-hint">Click to copy!</span>}
      </h2>
      {empty ? (
        <p className="empty-state">No commands saved yet. Add your first command!</p>
      ) : commands.length === 0 ? (
        <p className="empty-state">No commands match your search.</p>
      ) : (
        <div className="commands-list">
          {commands.map((c) => (
            <div
              key={c.id}
              className="command-item"
              onClick={() => onCopy(c.command, c.id!)}
              style={{ cursor: "pointer" }}
            >
              <div className="command-content">
                <div className="command-header">
                  <code className="command-text">{c.command}</code>
                  {c.groupName && <span className="command-group">{c.groupName}</span>}
                </div>
                {c.description && <div className="command-description">{c.description}</div>}
              </div>
              <div className="command-actions">
                {copiedId === c.id && <span className="copied-indicator">✓ Copied!</span>}
                <button
                  className="btn-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(c);
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id!);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
