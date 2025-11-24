<div style="display: flex; align-items: center; gap: 20px;">
  <img src="resources/CmdForgeLogo.png" alt="CmdForge Logo" width="200" height="200">
  <div>
    <h1 style="margin: 0;">CmdForge</h1>
    <p>Your personal command snippet manager. Consolidate and organize commands you use.<br/>
    <p>Tested on: MacOS, Windows 10/11
    <div style="margin-top: 10px;">
      <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white" alt="Python 3.11">
      <img src="https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white" alt="Node 20">
      <img src="https://img.shields.io/badge/Electron-30.5.1-47848F?logo=electron&logoColor=white" alt="Electron 30.5.1">
      <img src="https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react&logoColor=black" alt="React 19.1.1">
      <img src="https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9.2">
      <img src="https://img.shields.io/badge/Vite-7.1.6-646CFF?logo=vite&logoColor=white" alt="Vite 7.1.6">
      <img src="https://img.shields.io/badge/Better%20SQLite3-12.4.6-003B57?logo=sqlite&logoColor=white" alt="Better SQLite3 12.4.6">
    </div>
  </div>
</div>

## Table of Contents

- [What is CmdForge?](#what-is-cmdforge)
- [Key Features](#key-features)
- [How to Use](#how-to-use)
  - [Adding Commands](#adding-commands)
  - [Viewing Commands](#viewing-commands)
  - [Searching Commands](#searching-commands)
  - [Editing Commands](#editing-commands)
  - [Export Commands](#export-commands-backup)
  - [Import Commands](#import-commands-restoreoverwrite)
- [Development](#development)
  - [Recommended IDE Setup](#recommended-ide-setup)
  - [Project Setup](#project-setup)
  - [Building for Production](#building-for-production)
- [Project Architecture](#project-architecture)
- [License](#license)

## What is CmdForge?

CmdForge is a command snippet manager built with Electron, React, and TypeScript. It helps developers and system administrators store, organize, search, and quickly access frequently used commands. Instead of searching through documentation or terminal history, you can keep all your commands organized in groups, searchable, and easily shareable.

## Key Features

- **Add Commands**: Store command snippets with descriptions and group them by category
- **Organize by Groups**: Create custom groups (e.g., Kubernetes, Docker, Git, etc.) to keep commands organized
- **Quick Search**: Real-time search with wildcard support to find commands instantly
- **Copy to Clipboard**: Click any command to copy it to your clipboard with visual feedback
- **Edit Commands**: Update existing commands and their descriptions
- **Delete Commands**: Remove commands you no longer need
- **Export Commands**: Backup all your commands to a JSON file
- **Import Commands**: Load commands from a JSON file (overwrites existing data)

## How to Use

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### Adding Commands

1. Click the **"Add Command"** button on the home page
2. Enter the command text (e.g., `kubectl get pods`)
3. Add a description explaining what the command does
4. Select an existing group or create a new one
5. Click **"Save Command"** to store it
6. The form will clear and you'll remain on the Add page to add more commands

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### Viewing Commands

1. Click **"View All Commands"** to see your entire command library
2. Use the **Group Filter** dropdown to filter by category
3. **Click any command** to copy it to your clipboard
4. You'll see a **"✓ Copied!"** indicator when the copy is successful
5. Use **"Click to copy!"** as a reminder that commands are clickable

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### Searching Commands

1. On the home page, type in the search box to find commands by name or description
2. Use the **`*`** wildcard character for pattern matching (e.g., `*pod*` finds "get pods", "describe pods")
3. Select a group from the **Group Filter** to narrow your search

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### Editing Commands

1. In **View All Commands**, click the **"Edit"** button next to a command
2. Modify the command text, description, or group
3. Click **"Update Command"** to save changes
4. A **"Delete"** button appears when in edit mode if you want to remove the command

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### Export Commands (Backup)

1. Click the **"Export"** button on the home page
2. Choose a location to save the JSON file
3. All your commands will be exported to this file for backup or sharing

**Note:** The export contains a complete snapshot of all commands at the time of export.

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### Import Commands (Restore/Overwrite)

1. Click the **"Import"** button on the home page
2. Select a previously exported JSON file
3. **⚠️ Important:** Importing will **completely replace** all existing commands with the data from the file
4. You'll see a confirmation showing how many commands were imported

#### Understanding the Import Behavior

- **Complete Replacement**: When you import, CmdForge deletes ALL existing commands first, then imports the new data
- **No Appending**: Commands are not added to your existing collection; they replace it entirely
- **Data Loss**: Make sure to export your current commands before importing if you want to preserve them
- **Use Case**: Import is ideal for:
  - Restoring from a backup
  - Switching between different command sets (personal vs. work)
  - Sharing command libraries across team members
  - Starting fresh with a pre-built command collection

#### Example Workflow

```
1. You have 50 personal commands stored
2. Export them: "personal-commands.json" (backup)
3. Import work commands: "work-commands.json"
   → Your 50 personal commands are deleted
   → 75 work commands are now in your library
4. Later, import personal commands back: "personal-commands.json"
   → Your 75 work commands are deleted
   → Your 50 personal commands are restored
```

</div>

## Development

### System Requirements

Before setting up CmdForge, ensure you have the following installed:

- **Python**: 3.11 or below (required for Better SQLite3 native module compilation)
- **Node.js**: 20 or below (required for Better SQLite3 native module compatibility)

> **Note:** Better SQLite3 requires native module compilation. Using versions above the recommended ones may cause build failures.

### Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

### Project Setup

#### Install Dependencies

```bash
npm install
```

#### Development Server

```bash
npm run dev
```

Starts the Electron development server with hot module reloading.

#### Linting

```bash
npm run lint
```

Checks code for style and error issues.

#### Code Formatting

```bash
npm run format
```

Automatically formats all code with Prettier.

#### Type Checking

```bash
npm run typecheck
```

Validates TypeScript types across the project.

### Building for Production

Build the application for your platform:

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

## Project Architecture

CmdForge follows a modular, component-based architecture:

- **Pages**: HomePage, AddCommandPage, ViewCommandsPage
- **Components**: Reusable UI components (Common & Feature components)
- **Hooks**: Custom React hooks for state management (useCommands, useSearch, useCopyToClipboard, etc.)
- **Services**: Centralized API communication layer (commandService)
- **Types**: TypeScript type definitions for type safety
- **Storage**: SQLite database (primary) with JSON fallback

## License

MIT
