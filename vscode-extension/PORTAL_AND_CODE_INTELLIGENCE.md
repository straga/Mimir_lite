# Portal & Code Intelligence Implementation Guide

## Overview

Mimir VSCode Extension now has **3 major views**:

1. **Studio** (✅ Implemented) - Drag-and-drop workflow builder
2. **Portal** (🔄 In Progress) - Chat interface with file attachments & vector search
3. **Code Intelligence** (📋 Planned) - File indexing, watching, and stats

---

## 1. Portal Chat View

### Features

- ✅ Chat interface with conversation history
- ✅ File attachments (drag & drop or button)
- ✅ Vector search configuration modal
- ✅ Settings persistence
- ✅ Real-time typing indicators
- ✅ Message timestamps
- ✅ Auto-scroll to latest message

### Files Created

```
vscode-extension/webview-src/portal/
├── main.tsx          ✅ Created - Entry point
├── Portal.tsx        ✅ Created - Main component (459 lines)
└── styles.css        ✅ Created - Comprehensive styles

vscode-extension/src/
└── portalPanel.ts    📋 TO CREATE - Panel manager
```

### PortalPanel.ts Implementation (TO CREATE)

```typescript
import * as vscode from 'vscode';
import * as path from 'path';

export class PortalPanel {
  public static currentPanel: PortalPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _apiUrl: string;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, apiUrl: string) {
    this._panel = panel;
    this._apiUrl = apiUrl;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri);
    
    // Send initial config
    this._panel.webview.postMessage({
      command: 'config',
      apiUrl: this._apiUrl,
      model: vscode.workspace.getConfiguration('mimir').get('model', 'gpt-4.1')
    });

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'saveVectorSettings':
            // Save to workspace state or global state
            await vscode.workspace.getConfiguration('mimir').update(
              'vectorSearch',
              message.settings,
              vscode.ConfigurationTarget.Workspace
            );
            vscode.window.showInformationMessage('✅ Vector search settings saved');
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, apiUrl: string) {
    if (PortalPanel.currentPanel) {
      PortalPanel.currentPanel._panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'mimirPortal',
      'Mimir Chat',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );

    PortalPanel.currentPanel = new PortalPanel(panel, extensionUri, apiUrl);
  }

  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'portal.js')
    );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mimir Chat</title>
      </head>
      <body>
        <div id="root"></div>
        <script src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  public dispose() {
    PortalPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
```

### extension.ts Changes (TO ADD)

```typescript
// Add after Studio commands
context.subscriptions.push(
  vscode.commands.registerCommand('mimir.openChat', () => {
    console.log('💬 Opening Mimir Chat...');
    PortalPanel.createOrShow(context.extensionUri, config.apiUrl);
  })
);
```

### package.json Changes (TO ADD)

```json
{
  "commands": [
    {
      "command": "mimir.openChat",
      "title": "Mimir: Open Chat",
      "icon": "$(comment-discussion)"
    }
  ]
}
```

### webpack.config.js Changes (TO ADD)

```javascript
// Add portal entry after studio
{
  name: 'portal',
  target: 'web',
  entry: './webview-src/portal/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'portal.js'
  },
  // ... rest of config same as studio
}
```

---

## 2. Code Intelligence View

### Features

- 📂 **Folder Management**
  - List indexed folders
  - Add/remove folders from indexing
  - Start/stop watching
  - Configure file patterns

- 📊 **Statistics Dashboard**
  - Total files indexed
  - Total chunks created
  - Total embeddings generated
  - Files by type (breakdown)
  - Index health status
  - Last sync time

- 🔍 **File Explorer**
  - Tree view of indexed files
  - File status indicators (✅ indexed, ⏳ pending, ❌ error)
  - Click to view file details
  - Re-index individual files

- ⚙️ **Configuration**
  - File patterns to include/exclude
  - Debounce delay
  - Embedding generation toggle
  - Ignore patterns (beyond .gitignore)

### UI Mockup

```
┌─────────────────────────────────────────┐
│ 🧠 Mimir Code Intelligence              │
├─────────────────────────────────────────┤
│                                          │
│ 📊 Index Statistics                     │
│ ├─ 📁 3 folders watched                 │
│ ├─ 📄 1,247 files indexed               │
│ ├─ 🧩 4,892 chunks created              │
│ └─ 🎯 4,892 embeddings generated        │
│                                          │
│ 📂 Indexed Folders                       │
│ ├─ ✅ /src (892 files)                  │
│ │   └─ [Stop Watching] [Configure]      │
│ ├─ ✅ /docs (234 files)                 │
│ │   └─ [Stop Watching] [Configure]      │
│ └─ ✅ /tests (121 files)                │
│     └─ [Stop Watching] [Configure]      │
│                                          │
│ [+ Add Folder] [Refresh All]            │
│                                          │
│ 📋 File Type Breakdown                   │
│ ├─ TypeScript: 645 files (52%)          │
│ ├─ JavaScript: 342 files (27%)          │
│ ├─ Markdown: 156 files (13%)            │
│ ├─ JSON: 89 files (7%)                  │
│ └─ Other: 15 files (1%)                 │
│                                          │
│ 🔍 Recent Activity                       │
│ ├─ 2 min ago: /src/api/chat.ts updated  │
│ ├─ 5 min ago: /docs/README.md created   │
│ └─ 10 min ago: Full re-index completed  │
│                                          │
└─────────────────────────────────────────┘
```

### Files to Create

```
vscode-extension/webview-src/intelligence/
├── main.tsx              📋 Entry point
├── Intelligence.tsx      📋 Main component
├── FolderList.tsx        📋 Folder management
├── Statistics.tsx        📋 Stats dashboard
├── FileTree.tsx          📋 File explorer
└── styles.css            📋 Styles

vscode-extension/src/
└── intelligencePanel.ts  📋 Panel manager
```

### Intelligence.tsx Structure

```typescript
import React, { useState, useEffect } from 'react';

interface FolderInfo {
  path: string;
  fileCount: number;
  status: 'active' | 'stopped' | 'error';
  lastSync: Date;
  patterns: string[];
}

interface IndexStats {
  totalFolders: number;
  totalFiles: number;
  totalChunks: number;
  totalEmbeddings: number;
  byType: Record<string, number>;
}

export function Intelligence() {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFolders();
    loadStats();
  }, []);

  const loadFolders = async () => {
    // Call Mimir API: GET /api/indexed-folders
    const response = await fetch(`${apiUrl}/api/indexed-folders`);
    const data = await response.json();
    setFolders(data.folders);
  };

  const loadStats = async () => {
    // Call Mimir API: GET /api/index-stats
    const response = await fetch(`${apiUrl}/api/index-stats`);
    const data = await response.json();
    setStats(data);
  };

  const handleAddFolder = async () => {
    // Use VSCode API to select folder
    vscode.postMessage({ command: 'selectFolder' });
  };

  const handleStopWatching = async (path: string) => {
    // Call Mimir API: DELETE /api/indexed-folders
    await fetch(`${apiUrl}/api/indexed-folders`, {
      method: 'DELETE',
      body: JSON.stringify({ path })
    });
    loadFolders();
  };

  const handleStartWatching = async (path: string) => {
    // Call Mimir API: POST /api/index-folder
    await fetch(`${apiUrl}/api/index-folder`, {
      method: 'POST',
      body: JSON.stringify({ path })
    });
    loadFolders();
  };

  return (
    <div className="intelligence-container">
      <div className="intelligence-header">
        <h1>🧠 Mimir Code Intelligence</h1>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="stats-section">
          <h2>📊 Index Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalFolders}</div>
              <div className="stat-label">Folders Watched</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalFiles.toLocaleString()}</div>
              <div className="stat-label">Files Indexed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalChunks.toLocaleString()}</div>
              <div className="stat-label">Chunks Created</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalEmbeddings.toLocaleString()}</div>
              <div className="stat-label">Embeddings Generated</div>
            </div>
          </div>
        </div>
      )}

      {/* Folder List */}
      <div className="folders-section">
        <div className="section-header">
          <h2>📂 Indexed Folders</h2>
          <button onClick={handleAddFolder}>+ Add Folder</button>
        </div>
        
        {folders.map((folder) => (
          <div key={folder.path} className="folder-item">
            <div className="folder-info">
              <span className={`folder-status ${folder.status}`}>
                {folder.status === 'active' ? '✅' : folder.status === 'stopped' ? '⏸️' : '❌'}
              </span>
              <span className="folder-path">{folder.path}</span>
              <span className="folder-count">({folder.fileCount} files)</span>
            </div>
            <div className="folder-actions">
              {folder.status === 'active' ? (
                <button onClick={() => handleStopWatching(folder.path)}>Stop Watching</button>
              ) : (
                <button onClick={() => handleStartWatching(folder.path)}>Start Watching</button>
              )}
              <button>Configure</button>
            </div>
          </div>
        ))}
      </div>

      {/* File Type Breakdown */}
      {stats && (
        <div className="breakdown-section">
          <h2>📋 File Type Breakdown</h2>
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="type-row">
              <span className="type-name">{type}</span>
              <span className="type-count">{count} files</span>
              <div className="type-bar" style={{ width: `${(count / stats.totalFiles) * 100}%` }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Backend API Endpoints (TO IMPLEMENT)

```typescript
// src/api/indexing-api.ts (NEW FILE)

import { Router } from 'express';
import { FileIndexer } from '../indexing/file-indexer';

const router = Router();

// GET /api/indexed-folders - List all indexed folders
router.get('/indexed-folders', async (req, res) => {
  const folders = await FileIndexer.listIndexedFolders();
  res.json({ folders });
});

// POST /api/index-folder - Start indexing a folder
router.post('/index-folder', async (req, res) => {
  const { path, patterns, recursive } = req.body;
  await FileIndexer.indexFolder(path, { patterns, recursive });
  res.json({ success: true });
});

// DELETE /api/indexed-folders - Stop watching a folder
router.delete('/indexed-folders', async (req, res) => {
  const { path } = req.body;
  await FileIndexer.removeFolder(path);
  res.json({ success: true });
});

// GET /api/index-stats - Get indexing statistics
router.get('/index-stats', async (req, res) => {
  const stats = await FileIndexer.getStats();
  res.json(stats);
});

export default router;
```

---

## 3. Unified Extension Architecture

### Command Palette Commands

| Command | Icon | Purpose | Works In |
|---------|------|---------|----------|
| `mimir.askQuestion` | 💬 | Quick input box query | All IDEs |
| `mimir.openChat` | 🗨️ | Open full chat interface | All IDEs |
| `mimir.openStudio` | 🎨 | Open workflow studio | All IDEs |
| `mimir.openIntelligence` | 🧠 | Open code intelligence | All IDEs |

### VSCode Chat Participant

| Trigger | Purpose | Works In |
|---------|---------|----------|
| `@mimir` | Native VSCode chat integration | VSCode only |

### Activation Events

```json
{
  "activationEvents": [
    "onStartupFinished",
    "onCommand:mimir.askQuestion",
    "onCommand:mimir.openChat",
    "onCommand:mimir.openStudio",
    "onCommand:mimir.openIntelligence"
  ]
}
```

---

## 4. Implementation Checklist

### Portal Chat ✅ (Phase 1 - Core Complete)

- [x] Create Portal.tsx component
- [x] Add file attachment support
- [x] Add vector search modal
- [x] Create Portal styles.css
- [x] Create main.tsx entry point
- [ ] Create PortalPanel.ts manager
- [ ] Update webpack.config.js
- [ ] Register command in extension.ts
- [ ] Register command in package.json
- [ ] Test in VSCode/Cursor/Windsurf

### Command Palette ✅ (Complete)

- [x] Implement `mimir.askQuestion` command
- [x] Add command to package.json
- [x] Test in VSCode/Cursor/Windsurf

### Code Intelligence 📋 (Phase 2 - Planned)

- [ ] Design UI mockup
- [ ] Create Intelligence.tsx component
- [ ] Create FolderList.tsx component
- [ ] Create Statistics.tsx component
- [ ] Create FileTree.tsx component
- [ ] Create intelligence styles.css
- [ ] Create IntelligencePanel.ts manager
- [ ] Implement backend API endpoints
- [ ] Update webpack.config.js
- [ ] Register command in extension.ts
- [ ] Register command in package.json
- [ ] Test integration with Mimir server

---

## 5. Build & Test Instructions

### Build Extension

```bash
cd vscode-extension
npm run build
```

### Package Extension

```bash
npm run package
# Creates mimir-chat-0.1.0.vsix
```

### Install & Test

```bash
# Install in VSCode
code --install-extension mimir-chat-0.1.0.vsix

# Install in Cursor
cursor --install-extension mimir-chat-0.1.0.vsix

# Test commands
Ctrl+Shift+P → "Mimir: Ask a Question"
Ctrl+Shift+P → "Mimir: Open Chat"
Ctrl+Shift+P → "Mimir: Open Workflow Studio"
Ctrl+Shift+P → "Mimir: Open Code Intelligence" (when implemented)
```

---

## 6. Next Steps

1. **Complete Portal Integration**
   - Create PortalPanel.ts
   - Update webpack.config.js for portal build
   - Register commands
   - Test file attachments and vector search

2. **Implement Code Intelligence View**
   - Create Intelligence component structure
   - Implement backend API endpoints
   - Add folder watching integration
   - Add statistics dashboard

3. **Polish & Documentation**
   - Add keyboard shortcuts
   - Add context menus
   - Write user documentation
   - Create demo videos

4. **Advanced Features**
   - Streaming responses in Portal
   - Markdown rendering in chat
   - Code syntax highlighting
   - Export chat history
   - Workspace-specific settings

---

**Last Updated**: 2025-11-19  
**Status**: Portal Chat UI complete, PortalPanel & Code Intelligence pending
