import React from 'react'
import { Command } from '../types/command'
import { SearchBar } from '../components/features/SearchBar'
import { GroupFilter } from '../components/features/GroupFilter'
import { SearchResults } from '../components/features/SearchResults'
import cmdForgeLogo from '../../../../resources/CmdForgeLogo.png'

interface HomePageProps {
  search: string
  setSearch: (value: string) => void
  groups: string[]
  groupFilter: string | undefined
  setGroupFilter: (value: string | undefined) => void
  filteredSuggestions: Command[]
  showSuggestions: boolean
  copiedId: number | null
  onCopy: (text: string, id: number) => void
  onEdit: (cmd: Command) => void
  onAddClick: () => void
  onViewClick: () => void
  onExport: () => void
  onImport: () => void
}

export const HomePage: React.FC<HomePageProps> = ({
  search,
  setSearch,
  groups,
  groupFilter,
  setGroupFilter,
  filteredSuggestions,
  showSuggestions,
  copiedId,
  onCopy,
  onEdit,
  onAddClick,
  onViewClick,
  onExport,
  onImport
}) => {
  return (
    <>
      <h1 className="app-title">
        <div className="app-logo">
          <img src={cmdForgeLogo} alt="CmdForge Logo" />
        </div>
        CmdForge
      </h1>

      <div className="top-row">
        <SearchBar
          value={search}
          onChange={setSearch}
          onFocus={() => search.trim() && showSuggestions}
        />
        <GroupFilter value={groupFilter} groups={groups} onChange={setGroupFilter} />
      </div>

      <div className="action-row">
        <button className="btn-secondary" onClick={onAddClick}>
          Add Cmd
        </button>
        <button className="btn-secondary" onClick={onViewClick}>
          View Cmds
        </button>
        <button className="btn-secondary" onClick={onExport}>
          Export
        </button>
        <button className="btn-secondary" onClick={onImport}>
          Import
        </button>
      </div>

      {showSuggestions && (
        <SearchResults
          suggestions={filteredSuggestions}
          copiedId={copiedId}
          onCopy={onCopy}
          onEdit={onEdit}
        />
      )}
    </>
  )
}
