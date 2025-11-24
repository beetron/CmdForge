import React, { useState } from 'react'
import { Command } from '../types/command'
import cmdForgeLogo from '../../../../resources/CmdForgeLogo.png'

interface AddCommandPageProps {
  editing?: Command
  groups: string[]
  onSave: (cmd: Command) => Promise<void>
  onDelete?: (id: number) => void
  onBack: () => void
  onReset: () => void
  onFormCleared?: () => void
}

export const AddCommandPage: React.FC<AddCommandPageProps> = ({
  editing,
  groups,
  onSave,
  onDelete,
  onBack,
  onReset,
  onFormCleared
}) => {
  const [commandText, setCommandText] = useState(editing?.command || '')
  const [description, setDescription] = useState(editing?.description || '')
  const [groupName, setGroupName] = useState(editing?.groupName || '')

  const handleSaveClick = async (): Promise<void> => {
    await onSave({
      id: editing?.id,
      command: commandText,
      description,
      groupName
    })
    // Clear form fields after successful save
    if (!editing) {
      setCommandText('')
      setDescription('')
      setGroupName('')
      onFormCleared?.()
    }
  }

  const handleReset = (): void => {
    setCommandText(editing?.command || '')
    setDescription(editing?.description || '')
    setGroupName(editing?.groupName || '')
    onReset()
  }

  return (
    <div className="add-screen">
      <h1 className="app-title">
        <div className="app-logo">
          <img src={cmdForgeLogo} alt="CmdForge Logo" />
        </div>
        CmdForge
      </h1>
      <div className="add-header">
        <div className="add-header-title">{editing ? 'Edit Command' : 'Add New Command'}</div>
        <div className="add-header-controls">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <button className="btn-primary" onClick={handleSaveClick}>
            {editing ? 'Update Command' : 'Save Command'}
          </button>
          {editing && onDelete && (
            <button className="btn-delete" onClick={() => onDelete(editing.id!)}>
              Delete
            </button>
          )}
          <button className="btn-secondary" onClick={handleReset}>
            {editing ? 'Cancel' : 'Clear'}
          </button>
        </div>
      </div>
      <div className="add-content">
        <div className="form-container">
          <h2>{editing ? 'Edit Command' : 'Add New Command'}</h2>

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
        </div>
      </div>
    </div>
  )
}
