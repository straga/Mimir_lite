# Workflow Management in VSCode Extension

## Overview

The Mimir VSCode extension provides seamless workflow management with automatic saving, import/export capabilities, and **real-time execution status tracking** via Server-Sent Events (SSE). Workflows are stored as JSON files in a `.mimir/workflows/` directory within your workspace.

## 📁 Directory Structure

```
your-project/
├── .mimir/
│   └── workflows/
│       ├── feature-implementation.json
│       ├── bug-fix-workflow.json
│       └── refactoring.json
├── src/
├── package.json
└── .gitignore
```

## ✨ Features

### 1. **Save Workflow** (💾 Save button)
- Prompts for a workflow name
- Automatically saves to `.mimir/workflows/`
- Creates the directory if it doesn't exist
- Opens the saved file for review
- Shows success message with file path

**Example:**
```
Workflow file name: feature-auth-implementation.json
✅ Workflow saved to .mimir/workflows/feature-auth-implementation.json
```

### 2. **Import Workflow** (📁 Import button)
- Shows a quick pick menu with all available workflows
- Lists workflows sorted alphabetically
- Displays count of available workflows
- Loads selected workflow onto canvas
- Shows success message with task count

**Example:**
```
Load Workflow (3 available)
  ▸ bug-fix-workflow.json
  ▸ feature-auth-implementation.json
  ▸ refactoring.json

✅ Loaded workflow: feature-auth-implementation.json (5 tasks)
```

### 3. **Execute Workflow** (▶️ Execute button)
- Sends workflow to Mimir server for execution
- Locks UI during execution
- Shows real-time SSE notifications (worker/QC phases)
- Tracks deliverables generated during execution
- Enables download button when complete

### 4. **Download Deliverables** (📥 Download button)
- Appears after workflow execution completes
- Shows count of available deliverables
- Prompts for save location (defaults to `deliverables/` in workspace)
- Downloads all deliverable files from execution
- Creates subdirectories as needed
- Shows success message with download location

**Example:**
```
📥 Download Deliverables (3)
  ├── README_zh.md (12.4 KB)
  ├── CHANGELOG.md (5.8 KB)
  └── api-docs.html (28.1 KB)

✅ Downloaded 3 deliverables to /workspace/deliverables
```

**Button States:**
- **Disabled**: No deliverables available (grayed out, shows count: 0)
- **Enabled**: Deliverables available (highlighted, shows count)

### 5. **No Workflows Message**
If no workflows exist yet:
```
No workflows found in .mimir/workflows/. Save a workflow first.
```

## 🔄 Workflow File Format

Workflows are stored as JSON with the following structure:

```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Implement authentication",
      "workerAgent": {
        "id": "auth-specialist",
        "name": "Authentication Specialist",
        "role": "Security & Auth Implementation",
        "type": "worker",
        "preamble": "auth-specialist"
      },
      "qcAgent": {
        "id": "security-qc",
        "name": "Security QC",
        "role": "Security Review",
        "type": "qc",
        "preamble": "security-qc"
      },
      "parallelGroup": 0,
      "dependencies": [],
      "estimatedDuration": "2h",
      "estimatedToolCalls": 10
    }
  ]
}
```

## 🎯 Best Practices

### Version Control

**Option 1: Commit workflows (Recommended for team projects)**
```gitignore
# .gitignore
# (Keep .mimir/workflows/ tracked)
.mimir/logs/
.mimir/cache/
```

**Option 2: Keep workflows local (Personal development)**
```gitignore
# .gitignore
.mimir/
```

### Workflow Naming

Use descriptive names that indicate the workflow's purpose:
- ✅ `feature-user-authentication.json`
- ✅ `bugfix-memory-leak.json`
- ✅ `refactor-api-layer.json`
- ❌ `workflow1.json`
- ❌ `test.json`

### Workflow Organization

For large projects with many workflows, consider subdirectories:
```
.mimir/workflows/
├── features/
│   ├── auth.json
│   └── payments.json
├── bugs/
│   └── memory-leak.json
└── maintenance/
    └── dependency-updates.json
```

(Note: Current version saves to flat structure; subdirectory support coming soon)

## 🚀 Usage

### Creating a New Workflow

1. Open Studio: `Cmd+Shift+P` → "Mimir: Open Workflow Studio"
2. Drag agents to canvas to create tasks
3. Configure task details (edit icon ✏️)
4. Click "💾 Save"
5. Enter workflow name
6. Workflow saved to `.mimir/workflows/`

### Loading an Existing Workflow

1. Open Studio: `Cmd+Shift+P` → "Mimir: Open Workflow Studio"
2. Click "📁 Import"
3. Select workflow from list
4. Workflow loads onto canvas

### Editing and Re-saving

1. Load existing workflow
2. Make changes (add/remove tasks, edit agents, etc.)
3. Click "💾 Save"
4. Choose:
   - **Same name**: Overwrites existing workflow
   - **New name**: Creates new workflow file

## 🔍 Troubleshooting

### "No workspace folder open"
- You must have a folder open in VSCode
- Use `File → Open Folder...` to open a project

### "No workflows found"
- No `.json` workflow files exist yet in `.mimir/workflows/`
- Create your first workflow and save it

### Workflow not loading
- Check file format (must be valid JSON)
- Ensure file extension is `.json`
- Ensure file is in `.mimir/workflows/` directory
- Check console for error details

## 📝 Notes

- Workflows are workspace-specific
- The `.mimir` directory is automatically created
- Workflows are human-readable JSON
- You can manually edit workflow files if needed
- Changes to workflow files are immediately reflected

## 🔮 Future Enhancements

Coming soon:
- [ ] Workflow templates
- [ ] Subdirectory support
- [ ] Workflow validation
- [ ] Import from URL
- [ ] Export to shareable format
- [ ] Workflow versioning
- [ ] Duplicate workflow command
- [ ] Rename workflow command
- [ ] Delete workflow command

## Real-Time Execution Status (SSE Tracking)

When you execute a workflow, the extension connects to the Mimir server's SSE stream to receive real-time updates about task execution progress. Each task displays a colored border and glow effect based on its current status:

### Status Indicators

| Status | Border Color | Glow Effect | Animation | Description |
|--------|-------------|-------------|-----------|-------------|
| **Pending** | Gray | None | None | Task waiting to execute |
| **Executing** | 🟡 Valhalla Gold (#FFD700) | Gold glow (25px) | Pulsing | Task currently running |
| **Completed** | 🟢 Vibrant Green (#22c55e) | Green glow (20px) | None | Task finished successfully |
| **Failed** | 🔴 Red (#ef4444) | Red glow (20px) | None | Task encountered an error |

### How It Works

1. **Execute Workflow**: Click "▶️ Execute Workflow" button
2. **SSE Connection**: Extension connects to `/api/execution-stream/:executionId`
3. **Real-Time Updates**: Server broadcasts task status changes as they happen
4. **Visual Feedback**: Task borders and glows update instantly
5. **Completion**: All tasks show final status (completed/failed)

### SSE Events

The extension listens for the following Server-Sent Events:

- **`init`**: Initial state when connecting (includes all current task statuses)
- **`task-start`**: Task execution begins → Border turns gold and pulses
- **`task-complete`**: Task finishes → Border turns green or red based on success/failure
- **`execution-complete`**: Entire workflow finishes → UI re-enables
- **`error`**: Critical error occurred → Shows error message

### Example Flow

```
1. Click Execute → UI locks, SSE connection established
2. Task 1 starts → Gold pulsing border appears
3. Task 1 completes → Green border appears
4. Task 2 starts → Gold pulsing border appears
5. Task 2 fails → Red border appears
6. Workflow complete → UI unlocks
```

### Benefits

- **No Polling**: Efficient server-push model, no repeated HTTP requests
- **Instant Feedback**: See task progress in real-time as agents work
- **Visual Clarity**: Color-coded status makes it easy to track execution at a glance
- **Long-Running Workflows**: Track multi-hour workflows without timeouts
