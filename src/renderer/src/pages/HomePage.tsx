import React from "react";
import { Command } from "../types/command";
import { SearchBar } from "../components/features/SearchBar";
import { GroupFilter } from "../components/features/GroupFilter";
import { SearchResults } from "../components/features/SearchResults";
import { OptionsMenu } from "../components/common/OptionsMenu";
import cmdForgeLogo from "../../../../resources/CmdForgeLogo.png";

interface HomePageProps {
  search: string;
  setSearch: (value: string) => void;
  stayOnTop: boolean;
  onSetStayOnTop: (v: boolean) => void;
  groups: string[];
  groupFilter: string | undefined;
  setGroupFilter: (value: string | undefined) => void;
  filteredSuggestions: Command[];
  showSuggestions: boolean;
  copiedId: number | null;
  onCopy: (text: string, id: number) => void;
  onEdit: (cmd: Command) => void;
  onDelete: (id: number) => void;
  onAddClick: () => void;
  onExport: () => void;
  onImport: () => void;
  onGoogleSync?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  search,
  setSearch,
  stayOnTop,
  onSetStayOnTop,
  groups,
  groupFilter,
  setGroupFilter,
  filteredSuggestions,
  showSuggestions,
  copiedId,
  onCopy,
  onEdit,
  onDelete,
  onAddClick,
  onExport,
  onImport,
  onGoogleSync
}) => {
  return (
    <div className="home-screen">
      <div className="home-header">
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

        <div className="top-row">
          <SearchBar
            value={search}
            onChange={setSearch}
            onFocus={() => search.trim() && showSuggestions}
          />
          <GroupFilter value={groupFilter} groups={groups} onChange={setGroupFilter} />
        </div>

        <div className="action-row">
          <button className="btn-secondary add-btn" onClick={onAddClick}>
            Add Command
          </button>
          <div className="action-right">
            <OptionsMenu onExport={onExport} onImport={onImport} onGoogleSync={onGoogleSync} />
          </div>
        </div>
      </div>

      <div className="home-content">
        {showSuggestions && (
          <SearchResults
            suggestions={filteredSuggestions}
            copiedId={copiedId}
            onCopy={onCopy}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
