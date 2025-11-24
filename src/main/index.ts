import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'

let Database: any = null
try {
  // Try to import better-sqlite3 if available. This may fail on some systems without
  // native build toolchain; we'll handle that below and fallback to JSON storage.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Database = require('better-sqlite3')
} catch (err) {
  // ignore - we'll use JSON fallback
}

function createWindow(): void {
  // Create the browser window with rounded corners
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 650,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    transparent: false,
    icon,
    // roundedCorners is only supported on Windows 11+
    ...(process.platform === 'win32' ? { roundedCorners: true } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Apply content styling
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #root {
        height: 100vh;
        width: 100vw;
        overflow: auto;
      }
    `)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // DB initialization with better-sqlite3
  try {
    const dataPath = app.getPath('userData')
    const dbPath = join(dataPath, 'commands.db')
    const jsonPath = join(dataPath, 'commands.json')
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true })

    let useSqlite = false
    if (Database) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = new (Database as any)(dbPath)
        useSqlite = true
        db.pragma('journal_mode = WAL')

        db.prepare(
          `
          CREATE TABLE IF NOT EXISTS commands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command TEXT NOT NULL,
            description TEXT,
            groupName TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
        ).run()

        ipcMain.handle(
          'db-create-command',
          (_, payload: { command: string; description?: string; groupName?: string }) => {
            const info = db
              .prepare('INSERT INTO commands (command, description, groupName) VALUES (?, ?, ?)')
              .run(payload.command, payload.description || '', payload.groupName || '')
            return db.prepare('SELECT * FROM commands WHERE id = ?').get(info.lastInsertRowid)
          }
        )

        ipcMain.handle(
          'db-update-command',
          (
            _,
            payload: { id: number; command: string; description?: string; groupName?: string }
          ) => {
            db.prepare(
              'UPDATE commands SET command = ?, description = ?, groupName = ? WHERE id = ?'
            ).run(payload.command, payload.description || '', payload.groupName || '', payload.id)
            return db.prepare('SELECT * FROM commands WHERE id = ?').get(payload.id)
          }
        )

        ipcMain.handle('db-delete-command', (_, id: number) => {
          db.prepare('DELETE FROM commands WHERE id = ?').run(id)
          return { ok: true }
        })

        ipcMain.handle(
          'db-get-commands',
          (_, filters: { groupName?: string; search?: string } | undefined) => {
            if (!filters) return db.prepare('SELECT * FROM commands ORDER BY created_at DESC').all()
            if (filters.groupName)
              return db
                .prepare('SELECT * FROM commands WHERE groupName = ? ORDER BY created_at DESC')
                .all(filters.groupName)
            if (filters.search) {
              const term = `%${filters.search}%`
              return db
                .prepare(
                  'SELECT * FROM commands WHERE (command LIKE ? OR description LIKE ?) ORDER BY created_at DESC'
                )
                .all(term, term)
            }
            return db.prepare('SELECT * FROM commands ORDER BY created_at DESC').all()
          }
        )

        ipcMain.handle('db-get-groups', () =>
          db
            .prepare(
              'SELECT DISTINCT groupName FROM commands WHERE groupName IS NOT NULL ORDER BY groupName'
            )
            .all()
            .map((r: { groupName: string }) => r.groupName)
        )

        ipcMain.handle('db-export', async () => {
          const rows = db.prepare('SELECT * FROM commands ORDER BY created_at DESC').all()
          const { filePath } = await dialog.showSaveDialog({
            title: 'Export commands as JSON',
            defaultPath: join(app.getPath('documents'), 'cmdforge-commands.json'),
            filters: [{ name: 'JSON', extensions: ['json'] }]
          })
          if (!filePath) return { cancelled: true }
          fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8')
          return { cancelled: false, filePath }
        })

        ipcMain.handle('db-import', async () => {
          const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Import commands from JSON',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
          })
          if (canceled || !filePaths || filePaths.length === 0) return { cancelled: true }
          const content = fs.readFileSync(filePaths[0], 'utf8')
          let parsed: Array<{ command: string; description?: string; groupName?: string }> = []
          try {
            parsed = JSON.parse(content)
          } catch (err) {
            console.error('Import JSON parse error', err)
            return { error: 'Invalid JSON file' }
          }
          // DELETE all existing commands
          db.prepare('DELETE FROM commands').run()
          // INSERT imported commands
          const insert = db.prepare(
            'INSERT INTO commands (command, description, groupName) VALUES (?, ?, ?)'
          )
          const insertMany = db.transaction(
            (items: Array<{ command: string; description?: string; groupName?: string }>) => {
              for (const it of items)
                insert.run(it.command, it.description || '', it.groupName || '')
            }
          )
          insertMany(parsed)
          return { cancelled: false, count: parsed.length }
        })
      } catch (err) {
        console.warn('Failed to initialize SQLite, falling back to JSON storage', err)
        useSqlite = false
      }
    }

    // JSON fallback
    if (!useSqlite) {
      if (!fs.existsSync(jsonPath)) fs.writeFileSync(jsonPath, JSON.stringify([], null, 2), 'utf8')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const readAll = (): any[] => {
        try {
          const content = fs.readFileSync(jsonPath, 'utf8')
          return JSON.parse(content)
        } catch (err) {
          console.error('JSON DB read error', err)
          return []
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeAll = (items: any[]): void =>
        fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2), 'utf8')

      ipcMain.handle(
        'db-create-command',
        (_, payload: { command: string; description?: string; groupName?: string }) => {
          const rows = readAll()
          const id = (rows.reduce((max, r) => (r.id && r.id > max ? r.id : max), 0) as number) + 1
          const newRow = {
            id,
            command: payload.command,
            description: payload.description || '',
            groupName: payload.groupName || '',
            created_at: new Date().toISOString()
          }
          rows.unshift(newRow)
          writeAll(rows)
          return newRow
        }
      )

      ipcMain.handle(
        'db-update-command',
        (_, payload: { id: number; command: string; description?: string; groupName?: string }) => {
          const rows = readAll()
          const idx = rows.findIndex((r) => r.id === payload.id)
          if (idx === -1) return null
          rows[idx] = {
            ...rows[idx],
            command: payload.command,
            description: payload.description || '',
            groupName: payload.groupName || ''
          }
          writeAll(rows)
          return rows[idx]
        }
      )

      ipcMain.handle('db-delete-command', (_, id: number) => {
        const rows = readAll().filter((r) => r.id !== id)
        writeAll(rows)
        return { ok: true }
      })

      ipcMain.handle(
        'db-get-commands',
        (_, filters: { groupName?: string; search?: string } | undefined) => {
          let rows = readAll()
          if (!filters) return rows
          if (filters.groupName) rows = rows.filter((r) => r.groupName === filters.groupName)
          if (filters.search) {
            const term = filters.search.toLowerCase()
            rows = rows.filter(
              (r) =>
                r.command.toLowerCase().includes(term) ||
                (r.description || '').toLowerCase().includes(term)
            )
          }
          return rows
        }
      )

      ipcMain.handle('db-get-groups', () =>
        Array.from(
          new Set(
            readAll()
              .map((r) => r.groupName)
              .filter(Boolean)
          )
        ).sort()
      )

      ipcMain.handle('db-export', async () => {
        const rows = readAll()
        const { filePath } = await dialog.showSaveDialog({
          title: 'Export commands as JSON',
          defaultPath: join(app.getPath('documents'), 'cmdforge-commands.json'),
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
        if (!filePath) return { cancelled: true }
        fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8')
        return { cancelled: false, filePath }
      })

      ipcMain.handle('db-import', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: 'Import commands from JSON',
          filters: [{ name: 'JSON', extensions: ['json'] }],
          properties: ['openFile']
        })
        if (canceled || !filePaths || filePaths.length === 0) return { cancelled: true }
        const content = fs.readFileSync(filePaths[0], 'utf8')
        let parsed: Array<{ command: string; description?: string; groupName?: string }> = []
        try {
          parsed = JSON.parse(content)
        } catch (err) {
          console.error('Import JSON parse error', err)
          return { error: 'Invalid JSON file' }
        }
        // REPLACE all existing commands with imported data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newRows: any[] = []
        let nextId = 1
        for (const it of parsed)
          newRows.unshift({
            id: nextId++,
            command: it.command,
            description: it.description || '',
            groupName: it.groupName || '',
            created_at: new Date().toISOString()
          })
        writeAll(newRows)
        return { cancelled: false, count: parsed.length }
      })
    }
  } catch (err) {
    console.error('DB init error', err)
  }

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Custom main process code can be added here.
