import React, { useEffect, useState } from 'react'
import { HomePage } from '../pages/HomePage'
import { AddCommandPage } from '../pages/AddCommandPage'
import { ViewCommandsPage } from '../pages/ViewCommandsPage'
import { Alert } from './common/Alert'
import { Confirm } from './common/Confirm'
import { useCommands } from '../hooks/useCommands'
import { useSearch } from '../hooks/useSearch'
import { useAlert } from '../hooks/useAlert'
import { useConfirm } from '../hooks/useConfirm'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { commandService } from '../services/commandService'
import { Command } from '../types/command'

type ViewType = 'home' | 'add' | 'view'

export default function CommandManager(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [groupFilter, setGroupFilter] = useState<string | undefined>(undefined)
  const [editing, setEditing] = useState<Command | null>(null)

  const { commands, allCommands, groups, loadCommands } = useCommands(groupFilter)
  const { search, setSearch, filteredSuggestions, showSuggestions, setShowSuggestions } =
    useSearch(allCommands)
  const { alertMessage, showAlert, showCustomAlert, closeAlert } = useAlert()
  const { confirmMessage, showConfirm, showCustomConfirm, closeConfirm } = useConfirm()
  const { copiedId, copyToClipboard } = useCopyToClipboard()

  // Keyboard ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (showAlert || showConfirm) {
          return
        }
        if (currentView === 'home') {
          setSearch('')
          setShowSuggestions(false)
        } else if (currentView === 'add' || currentView === 'view') {
          setCurrentView('home')
          resetForm()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentView, showAlert, showConfirm, setSearch, setShowSuggestions])

  const resetForm = (): void => {
    setEditing(null)
  }

  const handleSave = async (cmd: Command): Promise<void> => {
    if (!cmd.command?.trim()) {
      showCustomAlert('Please enter a command')
      return
    }
    if (!cmd.groupName?.trim()) {
      showCustomAlert('Please select or enter a group name')
      return
    }

    if (editing) {
      await commandService.updateCommand({
        id: editing.id!,
        command: cmd.command,
        description: cmd.description,
        groupName: cmd.groupName
      })
    } else {
      await commandService.createCommand({
        command: cmd.command,
        description: cmd.description,
        groupName: cmd.groupName
      })
    }

    showCustomAlert('Saved!')
    resetForm()
    await loadCommands()
  }

  const handleEdit = (row: Command): void => {
    setEditing(row)
    setCurrentView('add')
  }

  const handleDelete = async (id: number): Promise<void> => {
    showCustomConfirm('Are you sure you want to delete this command?', async () => {
      await commandService.deleteCommand(id)
      await loadCommands()
    })
  }

  const handleExport = async (): Promise<void> => {
    const res = await commandService.exportData()
    if (!res || res.cancelled) {
      showCustomAlert('Export cancelled')
    } else {
      showCustomAlert('Exported to ' + (res.filePath || 'file'))
    }
  }

  const handleImport = async (): Promise<void> => {
    const res = await commandService.importData()
    if (!res || res.cancelled) {
      showCustomAlert('Import cancelled')
    } else if (res.error) {
      showCustomAlert('Import error: ' + res.error)
    } else {
      showCustomAlert(`Imported ${res.count ?? 0} commands`)
      await loadCommands()
    }
  }

  return (
    <div className="command-manager">
      {currentView === 'home' && (
        <HomePage
          search={search}
          setSearch={setSearch}
          groups={groups}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          filteredSuggestions={filteredSuggestions}
          showSuggestions={showSuggestions}
          copiedId={copiedId}
          onCopy={copyToClipboard}
          onEdit={handleEdit}
          onAddClick={() => {
            resetForm()
            setCurrentView('add')
          }}
          onViewClick={() => setCurrentView('view')}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}

      {currentView === 'add' && (
        <AddCommandPage
          editing={editing || undefined}
          groups={groups}
          onSave={handleSave}
          onDelete={handleDelete}
          onBack={() => {
            setCurrentView('home')
            resetForm()
          }}
          onReset={resetForm}
          onFormCleared={() => {
            // onFormCleared is called after form is cleared in AddCommandPage
          }}
        />
      )}

      {currentView === 'view' && (
        <ViewCommandsPage
          commands={commands}
          groups={groups}
          groupFilter={groupFilter}
          onGroupFilterChange={setGroupFilter}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={copyToClipboard}
          copiedId={copiedId}
          onBack={() => setCurrentView('home')}
          empty={allCommands.length === 0}
        />
      )}

      <Alert show={showAlert} message={alertMessage} onClose={closeAlert} />
      <Confirm
        show={showConfirm}
        message={confirmMessage}
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />
    </div>
  )
}
