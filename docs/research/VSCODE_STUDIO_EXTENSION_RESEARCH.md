# VSCode Studio Extension Research: Drag-and-Drop Workflow Builder

## Executive Summary

This research explores integrating Mimir's Orchestration Studio into a VSCode extension, allowing users to create multi-agent workflows through drag-and-drop directly in their IDE. The existing Studio (React + react-dnd) can be embedded in VSCode using Webview API with message-based communication.

**Key Findings:**
- ✅ **Feasible**: VSCode Webview API supports complex React applications
- ✅ **React DnD Compatible**: HTML5Backend works in webviews with minor adjustments
- ✅ **Communication Pattern**: postMessage API for extension ↔ webview coordination
- ⚠️ **Challenge**: State persistence and file system integration require careful design
- ⚠️ **Performance**: Large workflows may require optimization strategies

**Recommendation**: Proceed with phased implementation using existing Studio codebase as foundation.

**Architecture Decision**: ✅ **UNIFIED EXTENSION** - Combine chat participant and Studio UI in single extension for optimal user experience.

---

## 1. Unified Extension Architecture

### 1.1 Why One Extension?

**User Benefits:**
- ✅ **Single Installation**: Install once, get both chat and visual workflow builder
- ✅ **Unified Settings**: Configure API URL and credentials once
- ✅ **Seamless Workflow**: Chat → Design workflow → Execute → View results
- ✅ **Consistent Branding**: One extension name, icon, and marketplace listing
- ✅ **Better Discoverability**: Users find both features in one place

**Developer Benefits:**
- ✅ **Shared Codebase**: Common API client, configuration, and utilities
- ✅ **Single Maintenance**: One version, one release cycle, one test suite
- ✅ **Simpler Deployment**: One marketplace listing to manage
- ✅ **Code Reuse**: Both features use same backend connection logic

### 1.2 Feature Separation

**Chat Participant (Existing - No Changes)**
- Activated: `@mimir` in chat panel
- Purpose: Conversational AI with Graph-RAG memory
- UI: Native VSCode chat interface
- Code: `src/extension.ts` (handleChatRequest function)

**Studio UI (New - Add Alongside)**
- Activated: Command palette `Mimir: Open Workflow Studio` or `.mimir-workflow` file
- Purpose: Visual drag-and-drop workflow designer
- UI: React webview with custom components
- Code: `src/studioPanel.ts` + `webview-src/studio/`

**Shared Infrastructure**
- Configuration: `mimir.*` settings apply to both
- API Connection: Both use `config.apiUrl`
- Preambles: Studio can reference chat preambles for agent configuration
- Backend: Both connect to same Mimir MCP server

### 1.3 User Journey

```
1. Install "Mimir" extension from marketplace
   ↓
2. Configure API URL once: Settings → Mimir → API URL
   ↓
3. Use Chat: Open chat panel, type @mimir to start conversation
   ↓
4. Use Studio: Command palette → "Mimir: Open Workflow Studio"
   ↓
5. Create workflow visually with drag-and-drop
   ↓
6. Save as .mimir-workflow file in workspace
   ↓
7. Execute workflow from Studio or via command
   ↓
8. View results in output channel
```

### 1.4 Code Organization Strategy

**Extension Host (Node.js context)**
```
src/
├── extension.ts           ← Single entry point for BOTH features
├── chat/                  ← Chat-specific modules
│   ├── chatHandler.ts
│   └── preambleManager.ts
└── studio/                ← Studio-specific modules
    ├── studioPanel.ts
    ├── workflowEditor.ts
    └── executionManager.ts
```

**Webview (Browser context)**
```
webview-src/studio/        ← Only Studio needs webview
├── main.tsx               ← React app entry
├── Studio.tsx             ← Root component
├── components/            ← Copied from frontend/
└── store/                 ← Copied from frontend/
```

**Shared**
```
src/shared/
├── config.ts              ← Configuration management
├── apiClient.ts           ← Backend API wrapper
└── types.ts               ← Common type definitions
```

---

## 2. Current Architecture Analysis

### Existing Studio Implementation

**Technology Stack:**
- **Frontend**: React 18 + TypeScript
- **Drag-and-Drop**: `react-dnd` v16.0.1 + `react-dnd-html5-backend`
- **State Management**: Zustand (`usePlanStore`)
- **Routing**: React Router v6
- **Styling**: TailwindCSS + Norse theme
- **Build**: Vite + esbuild

**Key Components:**
```
/Users/c815719/src/Mimir/frontend/src/
├── pages/
│   └── Studio.tsx (278 lines) - Main orchestration UI
├── components/
│   ├── TaskCanvas.tsx (602 lines) - Drag-and-drop canvas
│   ├── TaskEditor.tsx (333 lines) - Task detail editor
│   ├── AgentPalette.tsx (281 lines) - Agent selection palette
│   ├── TaskCard.tsx (260 lines) - Individual task cards
│   ├── ParallelGroupContainer.tsx (142 lines) - Parallel execution groups
│   └── AgentDragPreview.tsx (95 lines) - Custom drag preview
└── store/
    └── planStore.ts - Zustand state management
```

**Studio Features:**
- Drag agents from palette to canvas
- Create sequential and parallel task flows
- Edit task properties (requirements, files, dependencies)
- Execute workflows via API
- View deliverables from completed executions
- Export/download workflow definitions

### Existing VSCode Extension

**Current Capabilities:**
```typescript
// vscode-extension/src/extension.ts (346 lines)
- Chat participant integration (@mimir)
- Preamble management
- Dynamic model selection
- Vector search configuration
- Flag-based CLI arguments (-u, -m, -d, -l, -s, -t)
- Streaming chat responses
```

**Planned Integration Strategy:**
✅ **UNIFIED EXTENSION** - Both chat and Studio UI in one extension
- Chat participant remains at `@mimir` (existing functionality)
- Studio UI accessible via command palette or file association
- Shared configuration and backend connection
- Single marketplace listing and installation
- Consistent UX across both features

**Benefits of Unified Approach:**
- ✅ Single installation for users
- ✅ Shared authentication and configuration
- ✅ Consistent API client logic
- ✅ One extension to maintain
- ✅ Better discoverability

---

## 2. VSCode Webview API Research

### 2.1 Webview Architecture

**Official Documentation:** [VSCode Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)

**Core Concepts:**

```typescript
// Create webview panel
const panel = vscode.window.createWebviewPanel(
  'mimirStudio',           // viewType
  'Mimir Studio',          // title
  vscode.ViewColumn.One,   // column
  {
    enableScripts: true,          // REQUIRED for React
    retainContextWhenHidden: true, // Persist state when hidden
    localResourceRoots: [         // Security: allowed file paths
      vscode.Uri.joinPath(context.extensionUri, 'media'),
      vscode.Uri.joinPath(context.extensionUri, 'dist')
    ]
  }
);
```

**Key Features:**
- ✅ Full HTML/CSS/JS support (can run React apps)
- ✅ Two-way message passing (extension ↔ webview)
- ✅ Access to VSCode theme colors
- ✅ Persistence across visibility changes
- ⚠️ Sandboxed environment (no direct Node.js access)
- ⚠️ Limited file system access (must use extension host as proxy)

### 2.2 Communication Pattern

**Extension Host → Webview:**
```typescript
// Extension host sends command
panel.webview.postMessage({
  command: 'loadWorkflow',
  workflow: { /* workflow data */ }
});
```

**Webview → Extension Host:**
```typescript
// Webview sends message
const vscode = acquireVsCodeApi();
vscode.postMessage({
  command: 'saveWorkflow',
  workflow: { /* workflow data */ }
});

// Extension host receives message
panel.webview.onDidReceiveMessage(async (message) => {
  switch (message.command) {
    case 'saveWorkflow':
      await saveWorkflowToFile(message.workflow);
      break;
  }
});
```

### 2.3 React Integration

**Webview UI Toolkit for React:**
- **Package**: `@vscode/webview-ui-toolkit-react`
- **Purpose**: Pre-built components matching VSCode's native UI
- **Components**: Buttons, inputs, dropdowns, text areas, checkboxes, etc.
- **Theming**: Automatically adapts to VSCode light/dark themes

**Example:**
```tsx
import { VSCodeButton, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';

function StudioPanel() {
  return (
    <div>
      <VSCodeTextField placeholder="Task name" />
      <VSCodeButton onClick={handleSave}>Save Workflow</VSCodeButton>
    </div>
  );
}
```

**Compatibility with Existing Studio:**
- ✅ Can keep existing React components
- ✅ Can incrementally adopt @vscode/webview-ui-toolkit
- ✅ TailwindCSS works in webviews
- ✅ React DnD works in webviews (verified by community)

### 2.4 Resource Loading

**Content Security Policy (CSP):**
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'none'; 
           img-src ${webview.cspSource} https:; 
           script-src ${webview.cspSource}; 
           style-src ${webview.cspSource} 'unsafe-inline';" />
```

**Loading React Build:**
```typescript
// Get URIs for bundled assets
const scriptUri = panel.webview.asWebviewUri(
  vscode.Uri.joinPath(context.extensionUri, 'dist', 'studio.js')
);

const styleUri = panel.webview.asWebviewUri(
  vscode.Uri.joinPath(context.extensionUri, 'dist', 'studio.css')
);

// Inject into HTML
panel.webview.html = `
  <!DOCTYPE html>
  <html>
    <head>
      <link href="${styleUri}" rel="stylesheet">
    </head>
    <body>
      <div id="root"></div>
      <script src="${scriptUri}"></script>
    </body>
  </html>
`;
```

---

## 3. Drag-and-Drop Implementation

### 3.1 React DnD in VSCode Webviews

**Current Studio Implementation:**
```tsx
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export function Studio() {
  return (
    <DndProvider backend={HTML5Backend}>
      <AgentPalette />    {/* Drag source */}
      <TaskCanvas />      {/* Drop target */}
    </DndProvider>
  );
}
```

**Compatibility Verification:**
- ✅ HTML5Backend works in webviews (iframes)
- ✅ No special modifications needed
- ✅ Drag preview renders correctly
- ⚠️ May need to handle cross-origin if loading external resources

**Drag Source Example (AgentPalette):**
```tsx
const [{ isDragging }, drag] = useDrag(() => ({
  type: 'AGENT',
  item: { agentType: 'worker', role: 'Implementation' },
  collect: (monitor) => ({
    isDragging: monitor.isDragging(),
  }),
}));
```

**Drop Target Example (TaskCanvas):**
```tsx
const [{ isOver }, drop] = useDrop(() => ({
  accept: 'AGENT',
  drop: (item: { agentType: string, role: string }, monitor) => {
    // Create new task at drop position
    addTask({
      id: generateId(),
      type: item.agentType,
      role: item.role,
      // ...
    });
  },
  collect: (monitor) => ({
    isOver: monitor.isOver(),
  }),
}));
```

### 3.2 Custom Drag Preview

**Current Implementation:**
```tsx
export function AgentDragPreview() {
  return (
    <DragLayer>
      {({ item, currentOffset }) => (
        <div style={{ 
          position: 'fixed', 
          pointerEvents: 'none',
          left: currentOffset?.x,
          top: currentOffset?.y 
        }}>
          {/* Custom preview content */}
        </div>
      )}
    </DragLayer>
  );
}
```

**VSCode Considerations:**
- ✅ Works as-is in webviews
- ⚠️ May need z-index adjustments for VSCode UI elements
- ⚠️ Preview positioning should be relative to webview, not window

---

## 4. State Management & Persistence

### 4.1 Current State Architecture (Zustand)

```typescript
// store/planStore.ts
interface PlanStore {
  tasks: Task[];
  parallelGroups: ParallelGroup[];
  projectPrompt: string;
  selectedTaskId: string | null;
  
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  createParallelGroup: (taskIds: string[]) => void;
  // ...
}

export const usePlanStore = create<PlanStore>((set) => ({
  tasks: [],
  parallelGroups: [],
  // ...
}));
```

### 4.2 VSCode Extension State Strategy

**Option 1: Webview State + File Persistence**
```typescript
// Extension host manages persistence
class WorkflowManager {
  private workflowPath: string;
  
  async saveWorkflow(workflow: Workflow) {
    const uri = vscode.Uri.file(this.workflowPath);
    const content = JSON.stringify(workflow, null, 2);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
  }
  
  async loadWorkflow(): Promise<Workflow | null> {
    const uri = vscode.Uri.file(this.workflowPath);
    const content = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(content.toString());
  }
}

// Webview requests save
vscode.postMessage({
  command: 'saveWorkflow',
  workflow: usePlanStore.getState()
});

// Extension host persists to file
panel.webview.onDidReceiveMessage(async (message) => {
  if (message.command === 'saveWorkflow') {
    await workflowManager.saveWorkflow(message.workflow);
    vscode.window.showInformationMessage('Workflow saved!');
  }
});
```

**Option 2: VSCode Memento (Extension State)**
```typescript
// Extension host uses globalState
context.globalState.update('mimir.workflow', workflow);

// Retrieve
const workflow = context.globalState.get<Workflow>('mimir.workflow');
```

**Option 3: Workspace Settings (JSON Files)**
```json
// .vscode/mimir-workflows/my-workflow.json
{
  "name": "Authentication Feature",
  "tasks": [...],
  "parallelGroups": [...],
  "createdAt": "2025-11-19T..."
}
```

**Recommended Approach:**
- **Primary**: JSON files in `.vscode/mimir-workflows/` (Option 3)
  - ✅ Version controllable
  - ✅ Human-readable
  - ✅ Shareable across team
  - ✅ Can open/edit manually
- **Secondary**: Memento for UI preferences (Option 2)
  - ✅ Canvas zoom level
  - ✅ Last opened workflow
  - ✅ Panel visibility

### 4.3 Auto-Save Strategy

```typescript
// Debounced auto-save in webview
import { debounce } from 'lodash-es';

const autoSave = debounce(() => {
  vscode.postMessage({
    command: 'saveWorkflow',
    workflow: usePlanStore.getState(),
    autoSave: true // Don't show notification
  });
}, 2000);

// Subscribe to store changes
usePlanStore.subscribe(autoSave);
```

---

## 5. File System Integration

### 5.1 Workspace File Picker

**Use Case**: User needs to select files to attach to tasks

**Current Studio**: Uses HTML `<input type="file">` (browser-based)

**VSCode Extension**: Must use VSCode file picker

```typescript
// Extension host provides file picker
panel.webview.onDidReceiveMessage(async (message) => {
  if (message.command === 'pickFiles') {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: 'Select files for task',
      filters: {
        'All Files': ['*']
      }
    });
    
    if (uris) {
      // Send selected files back to webview
      panel.webview.postMessage({
        command: 'filesSelected',
        files: uris.map(uri => ({
          path: uri.fsPath,
          name: path.basename(uri.fsPath)
        }))
      });
    }
  }
});
```

### 5.2 Relative Path Handling

```typescript
// Convert absolute paths to workspace-relative
function makeRelativePath(absolutePath: string): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    return path.relative(workspaceFolder.uri.fsPath, absolutePath);
  }
  return absolutePath;
}

// Store relative paths in workflow
{
  "tasks": [
    {
      "id": "task-1",
      "files": [
        "src/auth/login.ts",      // Relative to workspace
        "src/auth/register.ts"
      ]
    }
  ]
}
```

### 5.3 File Watcher Integration

```typescript
// Watch for file changes
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceFolder, '.vscode/mimir-workflows/**/*.json')
);

watcher.onDidChange(uri => {
  // Reload workflow if currently open
  if (uri.fsPath === currentWorkflowPath) {
    loadAndUpdateWebview(uri);
  }
});
```

---

## 6. Execution Integration

### 6.1 Current Studio Execution Flow

```typescript
// Studio.tsx
const handleExecute = async () => {
  const response = await fetch('/api/execute', {
    method: 'POST',
    body: JSON.stringify({
      tasks: usePlanStore.getState().tasks,
      parallelGroups: usePlanStore.getState().parallelGroups
    })
  });
  
  const { executionId } = await response.json();
  navigate(`/execution/${executionId}`);
};
```

### 6.2 VSCode Extension Execution Strategy

**Option A: API Proxy (Recommended)**
```typescript
// Extension host proxies to Mimir backend
panel.webview.onDidReceiveMessage(async (message) => {
  if (message.command === 'executeWorkflow') {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/api/execute`, {
      method: 'POST',
      body: JSON.stringify(message.workflow)
    });
    
    const { executionId } = await response.json();
    
    // Open output channel for streaming logs
    const outputChannel = vscode.window.createOutputChannel('Mimir Execution');
    outputChannel.show();
    
    // Stream execution logs
    streamExecutionLogs(executionId, outputChannel);
  }
});
```

**Option B: Terminal Execution**
```typescript
// Run mimir-execute via integrated terminal
const terminal = vscode.window.createTerminal('Mimir');
terminal.sendText(`mimir-execute ${workflowPath}`);
terminal.show();
```

### 6.3 Progress Reporting

```typescript
// Use VSCode progress API
await vscode.window.withProgress({
  location: vscode.ProgressLocation.Notification,
  title: "Executing workflow",
  cancellable: true
}, async (progress, token) => {
  
  // Update progress
  progress.report({ increment: 0, message: "Starting PM agent..." });
  
  // Listen for cancellation
  token.onCancellationRequested(() => {
    cancelExecution(executionId);
  });
  
  // Poll execution status
  await pollExecutionStatus(executionId, (status) => {
    progress.report({ 
      increment: status.percentComplete, 
      message: status.currentTask 
    });
  });
  
  progress.report({ increment: 100, message: "Complete!" });
});
```

---

## 7. UI/UX Considerations

### 7.1 Theme Integration

**VSCode Theme Variables:**
```css
/* Use VSCode CSS variables */
:root {
  --vscode-editor-background: #1e1e1e;
  --vscode-editor-foreground: #d4d4d4;
  --vscode-button-background: #0e639c;
  --vscode-button-hoverBackground: #1177bb;
}
```

**Adapt Norse Theme:**
```css
/* Map Norse theme to VSCode variables */
.norse-night {
  background-color: var(--vscode-editor-background);
}

.valhalla-gold {
  color: var(--vscode-textLink-foreground);
}

.norse-rune {
  border-color: var(--vscode-panel-border);
}
```

### 7.2 Layout Strategy

**Current Studio**: Full-page React app with header/sidebar/canvas

**VSCode Extension Options:**

**Option 1: Custom Editor (Recommended)**
- Opens `.mimir-workflow` files in custom webview
- Preserves file association
- Appears in editor tabs like normal files

```typescript
vscode.window.registerCustomEditorProvider('mimir.workflow', {
  async openCustomDocument(uri, openContext, token) {
    const content = await vscode.workspace.fs.readFile(uri);
    return { uri, content: JSON.parse(content.toString()) };
  },
  
  async resolveCustomEditor(document, webviewPanel, token) {
    // Set up webview with Studio UI
    webviewPanel.webview.html = getStudioHtml();
  }
});
```

**Option 2: Sidebar Webview**
- Always visible in sidebar
- Persistent across file switches
- Less screen real estate

```typescript
vscode.window.registerWebviewViewProvider('mimir.studioView', {
  resolveWebviewView(webviewView, context, token) {
    webviewView.webview.html = getStudioHtml();
  }
});
```

**Option 3: Panel Webview**
- Opens as bottom panel (like terminal)
- Collapsible
- Good for quick access

### 7.3 Canvas Sizing

```tsx
// Adapt to webview dimensions
const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

useEffect(() => {
  const handleResize = () => {
    setCanvasSize({
      width: window.innerWidth,
      height: window.innerHeight - 100 // Account for header
    });
  };
  
  window.addEventListener('resize', handleResize);
  handleResize();
  
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

---

## 8. Build System Integration

### 8.1 Separate Build for Webview

**Project Structure:**
```
vscode-extension/
├── src/
│   ├── extension.ts          # Extension host code
│   └── preambleManager.ts
├── webview-src/
│   ├── studio/
│   │   ├── main.tsx          # Studio webview entry
│   │   ├── components/       # Copy from frontend/src/components
│   │   └── store/            # Copy from frontend/src/store
│   └── tsconfig.json
├── package.json
└── webpack.config.js
```

**Webpack Config for Webview:**
```javascript
// webpack.config.js
module.exports = [
  // Extension host config (existing)
  {
    target: 'node',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js'
    }
  },
  
  // Webview config (new)
  {
    target: 'web',
    entry: './webview-src/studio/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'studio.js'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader'
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader']
        }
      ]
    }
  }
];
```

### 8.2 Shared Code Strategy

**Option 1: Copy Components (Simple)**
```bash
# Copy Studio components to extension
cp -r frontend/src/components/ vscode-extension/webview-src/
cp -r frontend/src/store/ vscode-extension/webview-src/
```

**Option 2: Symlink (Development)**
```bash
# Symlink for development
ln -s ../../frontend/src/components vscode-extension/webview-src/
```

**Option 3: Workspace Packages (Production)**
```json
// package.json (root)
{
  "workspaces": [
    "frontend",
    "vscode-extension",
    "shared-ui"
  ]
}

// shared-ui/package.json
{
  "name": "@mimir/shared-ui",
  "main": "dist/index.js",
  "exports": {
    "./components": "./dist/components/index.js",
    "./store": "./dist/store/index.js"
  }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Testing

```typescript
// Extension tests (existing pattern)
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Studio Extension Tests', () => {
  test('Opens workflow file in custom editor', async () => {
    const uri = vscode.Uri.file('/path/to/test.mimir-workflow');
    await vscode.commands.executeCommand('vscode.openWith', uri, 'mimir.workflow');
    
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor);
  });
});
```

### 9.2 Webview Testing

```typescript
// Mock VSCode API for React components
const mockVSCode = {
  postMessage: jest.fn(),
  getState: jest.fn(() => ({})),
  setState: jest.fn()
};

(global as any).acquireVsCodeApi = () => mockVSCode;

// Test Studio components
import { render, screen } from '@testing-library/react';
import { Studio } from './Studio';

test('renders task canvas', () => {
  render(<Studio />);
  expect(screen.getByText(/drag agents here/i)).toBeInTheDocument();
});
```

### 9.3 Integration Testing

```typescript
// Test message passing
suite('Extension-Webview Communication', () => {
  test('Saves workflow on message', async () => {
    const panel = await openStudioPanel();
    
    // Simulate webview message
    await panel.webview.postMessage({
      command: 'saveWorkflow',
      workflow: { tasks: [...] }
    });
    
    // Verify file was created
    const uri = vscode.Uri.file('.vscode/mimir-workflows/test.json');
    const exists = await fileExists(uri);
    assert.ok(exists);
  });
});
```

---

## 10. Implementation Roadmap

### Phase 1: Proof of Concept ✅ **COMPLETE**

**Goals:**
- [x] Research VSCode Webview API
- [x] Create basic webview with React
- [x] Test React DnD in webview
- [x] Implement simple message passing

**Tasks:**
1. [x] Set up webview build configuration (webpack dual-config)
2. [x] Create minimal Studio webview (1 component)
3. [x] Test drag-and-drop from palette to canvas
4. [x] Implement save/load workflow messages
5. [x] Document findings (STUDIO_POC.md)

**Success Criteria:**
- ✅ Can drag-drop agent cards (PM, Worker, QC)
- ✅ Can save workflow to `.mimir-workflow` file
- ✅ No major blockers identified
- ✅ Unified extension architecture working
- ✅ Build size: ~205 KiB total

**Completed:** November 18, 2025 (~1 hour implementation time)  
**See:** `vscode-extension/STUDIO_POC.md` for full details

### Phase 2: Core Features (4 weeks)

**Goals:**
- [ ] Port all Studio components to webview
- [ ] Implement file system integration
- [ ] Add auto-save functionality
- [ ] Create custom editor provider

**Tasks:**
1. Copy Studio components to `webview-src/`
2. Adapt styling for VSCode themes
3. Implement workspace file picker
4. Add relative path conversion
5. Create `.mimir-workflow` file association
6. Implement auto-save with debouncing
7. Add file watcher for external changes

**Success Criteria:**
- Full Studio UI functional in VSCode
- Can create complex workflows with parallel groups
- Workflows saved to workspace automatically
- Can open existing workflow files

### Phase 3: Execution Integration (3 weeks)

**Goals:**
- [ ] Integrate with Mimir backend
- [ ] Stream execution logs to output channel
- [ ] Add progress notifications
- [ ] Implement cancellation

**Tasks:**
1. Create execution API proxy
2. Add output channel for logs
3. Implement progress reporting
4. Add cancellation support
5. Create deliverables viewer
6. Add execution history panel

**Success Criteria:**
- Can execute workflows from extension
- Live logs appear in output channel
- Progress shown in notification
- Can cancel running workflows
- Can download deliverables

### Phase 4: Polish & Release (2 weeks)

**Goals:**
- [ ] Optimize performance
- [ ] Add keyboard shortcuts
- [ ] Write user documentation
- [ ] Create demo videos

**Tasks:**
1. Performance profiling and optimization
2. Add command palette commands
3. Create keyboard shortcut bindings
4. Write README and user guide
5. Record demo videos
6. Test on Windows/macOS/Linux
7. Publish to VSCode Marketplace

**Success Criteria:**
- Smooth performance with 20+ task workflows
- All features keyboard accessible
- Comprehensive documentation
- Published extension available

---

## 11. Example Implementation

### 11.1 Extension Entry Point (Unified)

```typescript
// vscode-extension/src/extension.ts (COMBINED CHAT + STUDIO)

import * as vscode from 'vscode';
import { PreambleManager } from './preambleManager';
import { StudioPanel } from './studioPanel';
import { WorkflowEditorProvider } from './workflowEditor';

let preambleManager: PreambleManager;

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 Mimir Extension activating (Chat + Studio)...');

  // Get initial configuration
  const config = getConfig();
  preambleManager = new PreambleManager(config.apiUrl);

  // ========================================
  // FEATURE 1: CHAT PARTICIPANT (EXISTING)
  // ========================================
  
  // Register chat participant (@mimir)
  const participant = vscode.chat.createChatParticipant('mimir.chat', async (request, context, response, token) => {
    try {
      await handleChatRequest(request, context, response, token);
    } catch (error: any) {
      response.markdown(`❌ Error: ${error.message}`);
      console.error('Chat request error:', error);
    }
  });

  // Set participant icon
  const iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
  try {
    await vscode.workspace.fs.stat(iconPath);
    participant.iconPath = iconPath;
  } catch {
    console.log('ℹ️  No icon.png found, using default icon');
  }

  context.subscriptions.push(participant);

  // ========================================
  // FEATURE 2: STUDIO UI (NEW)
  // ========================================
  
  // Register command to open Studio
  context.subscriptions.push(
    vscode.commands.registerCommand('mimir.openStudio', () => {
      StudioPanel.createOrShow(context.extensionUri, config.apiUrl);
    })
  );
  
  // Register custom editor for .mimir-workflow files
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'mimir.workflow',
      new WorkflowEditorProvider(context, config.apiUrl),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    )
  );
  
  // Register webview serializer for persistence
  vscode.window.registerWebviewPanelSerializer('mimirStudio', {
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
      StudioPanel.revive(webviewPanel, context.extensionUri, state, config.apiUrl);
    }
  });

  // ========================================
  // SHARED CONFIGURATION
  // ========================================
  
  // Listen for configuration changes (affects both features)
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('mimir')) {
        const newConfig = getConfig();
        
        // Update chat preambles
        preambleManager.updateBaseUrl(newConfig.apiUrl);
        preambleManager.loadAvailablePreambles().then(preambles => {
          console.log(`🔄 Configuration updated, reloaded ${preambles.length} preambles`);
        });
        
        // Notify open Studio panels of config change
        StudioPanel.updateAllPanels(newConfig);
      }
    })
  );

  console.log('✅ Mimir Extension activated (Chat + Studio)!');
}

// Shared config getter (used by both features)
function getConfig() {
  const config = vscode.workspace.getConfiguration('mimir');
  return {
    apiUrl: config.get('apiUrl', 'http://localhost:3000'),
    defaultPreamble: config.get('defaultPreamble', 'mimir-v2'),
    model: config.get('model', 'gpt-4.1'),
    vectorSearchDepth: config.get('vectorSearch.depth', 1),
    vectorSearchLimit: config.get('vectorSearch.limit', 10),
    vectorSearchMinSimilarity: config.get('vectorSearch.minSimilarity', 0.8),
    enableTools: config.get('enableTools', true),
    maxToolCalls: config.get('maxToolCalls', 3),
    customPreamble: config.get('customPreamble', '')
  };
}

// Chat handler (existing, unchanged)
async function handleChatRequest(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  response: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) {
  // ... existing chat logic ...
}

export function deactivate() {
  console.log('👋 Mimir Extension deactivated (Chat + Studio)');
}
```

**Key Integration Points:**

1. **Shared Configuration**: Both chat and Studio use `getConfig()`
2. **Shared API URL**: Both features connect to same backend
3. **Independent Activation**: Chat and Studio activate separately but in one extension
4. **Unified Settings**: User configures once for both features
5. **Single Package**: One `package.json`, one marketplace listing

### 11.2 Studio Panel Manager

```typescript
// vscode-extension/src/studioPanel.ts

export class StudioPanel {
  public static currentPanel: StudioPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (StudioPanel.currentPanel) {
      StudioPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'mimirStudio',
      'Mimir Studio',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );

    StudioPanel.currentPanel = new StudioPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'saveWorkflow':
            await this._saveWorkflow(message.workflow);
            break;
          case 'loadWorkflow':
            await this._loadWorkflow(message.path);
            break;
          case 'pickFiles':
            await this._pickFiles();
            break;
          case 'executeWorkflow':
            await this._executeWorkflow(message.workflow);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'studio.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'studio.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link href="${styleUri}" rel="stylesheet">
        <title>Mimir Studio</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  private async _saveWorkflow(workflow: any) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const workflowDir = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      '.vscode',
      'mimir-workflows'
    );

    // Create directory if it doesn't exist
    await vscode.workspace.fs.createDirectory(workflowDir);

    // Save workflow
    const workflowPath = vscode.Uri.joinPath(
      workflowDir,
      `${workflow.name || 'workflow'}.mimir-workflow`
    );

    const content = JSON.stringify(workflow, null, 2);
    await vscode.workspace.fs.writeFile(workflowPath, Buffer.from(content));

    vscode.window.showInformationMessage('Workflow saved!');
  }

  public dispose() {
    StudioPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
```

### 11.3 Webview React Entry

```tsx
// vscode-extension/webview-src/studio/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Studio } from './Studio';
import './index.css';

// VSCode API singleton
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

// Make vscode API available to components
(window as any).vscode = vscode;

// Render Studio
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DndProvider backend={HTML5Backend}>
        <Studio />
      </DndProvider>
    </React.StrictMode>
  );
}
```

### 11.4 Studio Component Adapter

```tsx
// vscode-extension/webview-src/studio/Studio.tsx

import React, { useEffect } from 'react';
import { TaskCanvas } from './components/TaskCanvas';
import { AgentPalette } from './components/AgentPalette';
import { TaskEditor } from './components/TaskEditor';
import { usePlanStore } from './store/planStore';

declare const vscode: any;

export function Studio() {
  const { tasks, parallelGroups } = usePlanStore();

  // Auto-save on state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      vscode.postMessage({
        command: 'saveWorkflow',
        workflow: {
          tasks,
          parallelGroups,
          name: 'Current Workflow',
          timestamp: new Date().toISOString()
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [tasks, parallelGroups]);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.command) {
        case 'loadWorkflow':
          // Load workflow into store
          usePlanStore.setState({
            tasks: message.workflow.tasks,
            parallelGroups: message.workflow.parallelGroups
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExecute = () => {
    vscode.postMessage({
      command: 'executeWorkflow',
      workflow: { tasks, parallelGroups }
    });
  };

  return (
    <div className="studio-container">
      <div className="studio-header">
        <h1>Mimir Studio</h1>
        <button onClick={handleExecute}>Execute Workflow</button>
      </div>
      
      <div className="studio-body">
        <AgentPalette />
        <TaskCanvas />
        <TaskEditor />
      </div>
    </div>
  );
}
```

---

## 12. Comparison with Existing Solutions

### Direktiv VSCode Plugin

**Source:** [Medium Article](https://medium.com/nerd-for-tech/direktiv-new-dev-environment-vscode-plugin-ab047b7a8266)

**Key Features:**
- Workflow linting
- Remote execution
- Workflow revisioning
- Logs streaming

**Similarities to Mimir:**
- Workflow creation in IDE
- Execution integration
- Real-time feedback

**Differences:**
- Direktiv: Text-based YAML editing
- Mimir: Visual drag-and-drop interface

**Lesson Learned:**
- ✅ Tight Git integration valuable
- ✅ Real-time validation important
- ✅ Remote execution model proven

### Control-M VSCode Extension

**Source:** [GitHub Repository](https://github.com/controlm/ctm-vscode-extension)

**Key Features:**
- Visual job browser
- Job creation and management
- Code-first approach

**Similarities:**
- Job orchestration
- Visual interface in VSCode

**Lessons Learned:**
- ✅ Tree view for job hierarchy works well
- ✅ Command palette integration improves UX
- ⚠️ Need good error handling for API failures

---

## 13. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| React DnD incompatibility | Low | High | Early POC testing verified compatibility |
| Performance issues with large workflows | Medium | Medium | Virtualization, lazy loading, optimize re-renders |
| File system race conditions | Medium | Medium | File locking, change detection, conflict resolution |
| VSCode API breaking changes | Low | High | Pin VSCode engine version, test updates before adopting |
| Webview CSP restrictions | Medium | Low | Use nonce-based CSP, load all resources from extension |
| User confusion with two UIs | Low | Medium | Clear documentation, consistent behavior across UIs |

---

## 14. Success Metrics

### Technical Metrics
- [ ] POC: Can drag-drop and save workflow (1 week)
- [ ] Alpha: Full Studio ported to VSCode (6 weeks)
- [ ] Beta: Execution integration working (9 weeks)
- [ ] Release: Published to marketplace (11 weeks)

### User Metrics (Post-Launch)
- Adoption rate: % of Mimir users installing extension
- Engagement: Workflows created per user
- Satisfaction: VSCode Marketplace ratings > 4.0
- Performance: Extension host activation time < 2s

### Quality Metrics
- Zero P0 bugs in production
- Test coverage > 80%
- Load time for 50-task workflow < 1s
- Auto-save latency < 100ms

---

## 15. Conclusion & Next Steps

### Key Takeaways

1. **Technically Feasible**: VSCode Webview API fully supports React + React DnD
2. **Architecture Proven**: Similar extensions (Direktiv, Control-M) validate approach
3. **Clear Path**: Phased implementation from POC to production
4. **Manageable Risks**: All identified risks have viable mitigations
5. **High Value**: Brings Studio to where developers already work

### Immediate Next Steps

1. **Start POC** (This Week):
   - Create basic webview with Studio header
   - Test React DnD in webview environment
   - Implement single-agent drag-drop
   - Document any unexpected blockers

2. **Architecture Review** (Next Week):
   - Review this document with team
   - Decide on state persistence strategy
   - Define file format for `.mimir-workflow`
   - Approve technology choices

3. **Resource Planning** (Next Week):
   - Assign developer(s) to project
   - Set up project tracking (Jira/GitHub Issues)
   - Define sprint goals for Phase 1

4. **Stakeholder Buy-In** (Next 2 Weeks):
   - Demo POC to stakeholders
   - Gather feedback on UX approach
   - Confirm go/no-go for full implementation

### Recommended Decision

**PROCEED** with phased implementation:
- Low technical risk (verified compatibility)
- High user value (IDE-native experience)
- Manageable scope (11-week timeline)
- Reuses existing codebase (Studio components)

---

## Appendices

### A. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Extension Host | TypeScript + VSCode API | Extension logic, file I/O |
| Webview UI | React 18 + TypeScript | Studio interface |
| Drag-and-Drop | react-dnd + HTML5Backend | Workflow creation |
| State Management | Zustand | Component state |
| Styling | TailwindCSS | UI styling |
| Build System | Webpack | Bundle webview assets |
| Testing | Vitest + VSCode Test API | Unit + integration tests |

### B. Unified Extension Manifest

```json
{
  "name": "mimir",
  "displayName": "Mimir - AI Assistant & Workflow Studio",
  "description": "Graph-RAG AI chat assistant with drag-and-drop multi-agent workflow builder",
  "version": "1.1.0",
  "publisher": "mimir",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "AI",
    "Chat",
    "Visualization",
    "Other"
  ],
  "activationEvents": [
    "onLanguage:*",
    "onCommand:mimir.openStudio",
    "onCustomEditor:mimir.workflow"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "chatParticipants": [
      {
        "id": "mimir.chat",
        "name": "mimir",
        "description": "AI assistant with Graph-RAG memory and MCP tool access",
        "isSticky": true
      }
    ],
    "commands": [
      {
        "command": "mimir.openStudio",
        "title": "Mimir: Open Workflow Studio",
        "icon": "$(graph)"
      },
      {
        "command": "mimir.createWorkflow",
        "title": "Mimir: Create New Workflow",
        "icon": "$(add)"
      }
    ],
    "customEditors": [
      {
        "viewType": "mimir.workflow",
        "displayName": "Mimir Workflow Designer",
        "selector": [
          {
            "filenamePattern": "*.mimir-workflow"
          }
        ],
        "priority": "default"
      }
    ],
    "configuration": {
      "title": "Mimir",
      "properties": {
        "mimir.apiUrl": {
          "type": "string",
          "default": "http://localhost:3000",
          "description": "Mimir backend API URL (used by both chat and Studio)"
        },
        "mimir.defaultPreamble": {
          "type": "string",
          "default": "mimir-v2",
          "description": "Default chat preamble/agent mode"
        },
        "mimir.model": {
          "type": "string",
          "default": "gpt-4.1",
          "description": "Default LLM model for chat"
        },
        "mimir.vectorSearch.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable vector search for chat"
        },
        "mimir.vectorSearch.limit": {
          "type": "number",
          "default": 10,
          "description": "Max vector search results"
        },
        "mimir.vectorSearch.minSimilarity": {
          "type": "number",
          "default": 0.8,
          "description": "Minimum similarity threshold (0-1)"
        },
        "mimir.vectorSearch.depth": {
          "type": "number",
          "default": 1,
          "description": "Graph traversal depth (1-3)"
        },
        "mimir.studio.autoSave": {
          "type": "boolean",
          "default": true,
          "description": "Auto-save workflows while editing"
        },
        "mimir.studio.autoSaveDelay": {
          "type": "number",
          "default": 2000,
          "description": "Auto-save delay in milliseconds"
        }
      }
    },
    "menus": {
      "commandPalette": [
        {
          "command": "mimir.openStudio",
          "when": "true"
        },
        {
          "command": "mimir.createWorkflow",
          "when": "true"
        }
      ],
      "editor/title": [
        {
          "command": "mimir.openStudio",
          "when": "resourceExtname == .mimir-workflow",
          "group": "navigation"
        }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run build",
    "build": "webpack --mode production",
    "watch": "webpack --mode development --watch",
    "test": "node ./out/test/runTest.js"
  },
  "dependencies": {
    "@vscode/webview-ui-toolkit": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dnd": "^16.0.1",
    "react-dnd-html5-backend": "^16.0.1",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "webpack": "^5.89.0",
    "ts-loader": "^9.5.0",
    "css-loader": "^6.8.0",
    "postcss-loader": "^7.3.0",
    "style-loader": "^3.3.0"
  }
}
```

**Key Points:**
1. **Single Extension**: One `package.json` with both features
2. **Dual Activation**: Activates for chat participant AND custom editor
3. **Shared Configuration**: All settings under `mimir.*` namespace
4. **Command Palette**: Both chat and Studio accessible via commands
5. **File Association**: `.mimir-workflow` files open in custom editor

### C. Unified File Structure

```
vscode-extension/
├── src/                          # Extension host code (BOTH FEATURES)
│   ├── extension.ts             # ✨ Entry point (chat + studio)
│   ├── preambleManager.ts       # 💬 Chat: preamble loading
│   ├── types.ts                 # 💬 Chat: type definitions
│   ├── studioPanel.ts           # 🎨 Studio: webview manager
│   ├── workflowEditor.ts        # 🎨 Studio: custom editor provider
│   ├── workflowManager.ts       # 🎨 Studio: file I/O operations
│   └── executionManager.ts      # 🎨 Studio: workflow execution
│
├── webview-src/                  # Webview code (STUDIO ONLY)
│   ├── studio/
│   │   ├── main.tsx             # React entry point
│   │   ├── Studio.tsx           # Main Studio component
│   │   ├── components/          # UI components (from frontend/)
│   │   │   ├── TaskCanvas.tsx
│   │   │   ├── AgentPalette.tsx
│   │   │   ├── TaskEditor.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── ParallelGroupContainer.tsx
│   │   │   └── AgentDragPreview.tsx
│   │   ├── store/
│   │   │   └── planStore.ts     # Zustand store (from frontend/)
│   │   └── utils/
│   │       └── vscode.ts        # VSCode API wrapper
│   └── styles/
│       ├── index.css            # Global styles
│       └── tailwind.css         # TailwindCSS (adapted for VSCode)
│
├── dist/                         # Built extension
│   ├── extension.js             # Compiled extension host (chat + studio)
│   ├── studio.js                # Bundled webview (studio UI)
│   └── studio.css               # Webview styles
│
├── icon.png                      # Extension icon
├── package.json                  # ✨ Unified manifest (both features)
├── webpack.config.js             # Build configuration (dual output)
├── tsconfig.json                 # TypeScript config
└── README.md                     # Documentation (chat + studio)
```

**Key Differences from Separate Extensions:**

1. **Single `extension.ts`**: Activates both chat participant and Studio
2. **Shared Types**: Common types/interfaces used by both features
3. **Shared Config**: Single `getConfig()` function for both
4. **Dual Output**: Webpack builds both extension.js (host) and studio.js (webview)
5. **One Package**: Single npm package, single marketplace listing

### D. References

1. **VSCode Extension API**
   - [Official Documentation](https://code.visualstudio.com/api)
   - [Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)
   - [Custom Editor Guide](https://code.visualstudio.com/api/extension-guides/custom-editors)

2. **React DnD**
   - [Official Documentation](https://react-dnd.github.io/react-dnd/)
   - [HTML5Backend API](https://react-dnd.github.io/react-dnd/docs/backends/html5)

3. **VSCode Webview UI Toolkit**
   - [GitHub Repository](https://github.com/microsoft/vscode-webview-ui-toolkit)
   - [Component Storybook](https://microsoft.github.io/vscode-webview-ui-toolkit/)

4. **Example Extensions**
   - [Direktiv VSCode Plugin](https://medium.com/nerd-for-tech/direktiv-new-dev-environment-vscode-plugin-ab047b7a8266)
   - [Control-M Extension](https://github.com/controlm/ctm-vscode-extension)
   - [VSCode Extension Samples](https://github.com/microsoft/vscode-extension-samples)

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-11-19  
**Author:** Mimir Development Team  
**Status:** ✅ Complete Research - Ready for Implementation
