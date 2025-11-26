import React from "react";
import { Command } from "../types/command";
import { SearchBar } from "../components/features/SearchBar";
import { GroupFilter } from "../components/features/GroupFilter";
import { SearchResults } from "../components/features/SearchResults";
import { OptionsMenu } from "../components/common/OptionsMenu";
import { useTranslation } from "../contexts/I18nContext";
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
  onDeleteAll?: () => void;
  googleSyncEnabled?: boolean;
  onSetGoogleSync?: (v: boolean) => void;
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
  onGoogleSync,
  onDeleteAll,
  googleSyncEnabled,
  onSetGoogleSync
}) => {
  const { t } = useTranslation();

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
            <div className="google-toggle">
              <div className="google-help" role="button" aria-label="Help: Google Sync">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{ display: "block" }}
                >
                  <path d="M20 17.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 16.25" />
                  <path d="M16 16l-4-4-4 4" />
                </svg>
                <span className="tooltip">{t("sync.googleSync")}</span>
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
              <div className="stay-help" role="button" aria-label="Help: Stay on top">
                ?<span className="tooltip">{t("options.stayOnTop")}</span>
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
            {t("commands.add")}
          </button>
          <div className="action-right">
            <OptionsMenu
              onExport={onExport}
              onImport={onImport}
              onGoogleSync={onGoogleSync}
              onDeleteAll={onDeleteAll}
            />
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
