import React from 'react'
import { Command } from '../../types/command'

interface SearchResultsProps {
  suggestions: Command[]
  copiedId: number | null
  onCopy: (text: string, id: number) => void
  onEdit: (cmd: Command) => void
  onDelete: (id: number) => void
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  suggestions,
  copiedId,
  onCopy,
  onEdit,
  onDelete
}) => {
  if (suggestions.length === 0) return null

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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                {cmd.groupName && <span className="command-group">{cmd.groupName}</span>}
                {cmd.description && <div className="suggestion-description">{cmd.description}</div>}
              </div>
            </div>
            <div className="suggestion-actions">
              {copiedId === cmd.id && <span className="copied-indicator">✓ Copied!</span>}
              <button
                className="btn-edit suggestion-edit-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(cmd)
                }}
              >
                Edit
              </button>
              <button
                className="btn-delete suggestion-edit-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(cmd.id!)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
