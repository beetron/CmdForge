import React from "react";
import { Command } from "../types/command";
import { CommandsList } from "../components/features/CommandsList";
import { GroupFilter } from "../components/features/GroupFilter";
import cmdForgeLogo from "../../../../resources/CmdForgeLogo.png";

interface ViewCommandsPageProps {
  commands: Command[];
  groups: string[];
  groupFilter: string | undefined;
  onGroupFilterChange: (value: string | undefined) => void;
  onEdit: (cmd: Command) => void;
  onDelete: (id: number) => void;
  onCopy: (text: string, id: number) => void;
  copiedId: number | null;
  onBack: () => void;
  empty?: boolean;
}

export const ViewCommandsPage: React.FC<ViewCommandsPageProps> = ({
  commands,
  groups,
  groupFilter,
  onGroupFilterChange,
  onEdit,
  onDelete,
  onCopy,
  copiedId,
  onBack,
  empty
}) => {
  return (
    <div className="view-screen">
      <h1 className="app-title">
        <div className="app-logo">
          <img src={cmdForgeLogo} alt="CmdForge Logo" />
        </div>
        CmdForge
      </h1>
      <div className="view-header">
        <div className="view-header-title">View Commands</div>
        <div className="view-header-controls">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <GroupFilter value={groupFilter} groups={groups} onChange={onGroupFilterChange} />
        </div>
      </div>
      <div className="view-content">
        <CommandsList
          commands={commands}
          copiedId={copiedId}
          onEdit={onEdit}
          onDelete={onDelete}
          onCopy={onCopy}
          empty={empty}
        />
      </div>
    </div>
  );
};
