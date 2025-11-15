# Mimir Orchestration Studio - Complete Guide

**Version:** 1.0.0  
**Status:** ✅ Fully Implemented  
**Frontend Port:** `5173` (Vite)  
**Backend API:** `9042` (MCP Server)

---

## 🎯 Overview

**Mimir Orchestration Studio** is a visual drag-and-drop interface for composing multi-agent task orchestration plans. It provides an intuitive way to build complex agent workflows, organize tasks into parallel execution groups, and export production-ready `chain-output.md` files.

### Key Features

- **🎨 Drag-and-Drop Interface**: Intuitive task creation and organization
- **📦 Parallel Execution Groups**: Visual grouping of tasks that can run simultaneously
- **✏️ Rich Task Editing**: Inline editing of prompts, dependencies, criteria, and metadata
- **🤖 PM Agent Integration**: AI-assisted task breakdown from project prompts
- **📥 Export to chain-output.md**: Generate deployment-ready markdown format
- **💾 Mimir Integration**: Save plans to the Mimir knowledge graph
- **🔍 Visual Dependency Management**: Clear visualization of task relationships

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /Users/c815719/src/Mimir/frontend
npm install
```

### 2. Start Backend (MCP Server)

```bash
cd /Users/c815719/src/Mimir
npm run build
npm run start:http
```

Backend will be available at `http://localhost:9042`

### 3. Start Frontend

```bash
cd /Users/c815719/src/Mimir/frontend
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## 📐 Architecture

### Component Structure

```
Mimir Orchestration Studio
├── PromptInput (Top Bar)
│   └── Project goal & PM agent generation
├── AgentPalette (Left Sidebar)
│   └── Draggable agent templates
├── TaskCanvas (Center)
│   ├── Parallel Groups (colored containers)
│   └── Ungrouped Tasks (grid layout)
├── TaskEditor (Right Sidebar)
│   └── Detailed task configuration
└── ExportButton (Header)
    └── Download chain-output.md
```

### State Management

Uses **Zustand** for reactive state:

```typescript
interface PlanState {
  projectPrompt: string;
  projectPlan: ProjectPlan | null;
  tasks: Task[];
  parallelGroups: ParallelGroup[];
  selectedTask: Task | null;
  agentTemplates: AgentTemplate[];
  // ... actions
}
```

### Drag-and-Drop System

Powered by **react-dnd**:

1. **Agent Palette → Canvas**: Creates new task from template
2. **Task → Parallel Group**: Assigns task to execution group
3. **Task → Ungrouped Area**: Removes from parallel group

---

## 🎨 Usage Workflow

### Step 1: Enter Project Prompt

At the top of the UI, enter your project goal and requirements:

```
Example: "Create a comprehensive comparison report for vector databases 
(Pinecone, Weaviate, Qdrant) including pricing, performance, and 
integration complexity for a mid-size team."
```

Click **"Generate with PM Agent"** to auto-generate task breakdown (future feature).

### Step 2: Build Task Plan

**Option A: Drag from Agent Palette**
- Browse agent templates in left sidebar
- Drag agents to canvas to create tasks
- Each dragged agent becomes a new task

**Option B: Manual Creation**
- Use PM agent to generate initial plan
- Manually organize generated tasks

### Step 3: Organize into Parallel Groups

1. Click **"Add Parallel Group"** to create execution groups
2. Drag tasks into colored group containers
3. Tasks in same group execute simultaneously
4. Ungrouped tasks execute sequentially

### Step 4: Edit Task Details

Click any task to open the editor (right sidebar):

- **Task ID**: Unique identifier (e.g., `task-1.1`)
- **Title**: Brief task description
- **Agent Role**: Role description for the agent
- **Recommended Model**: LLM model (gpt-4.1, claude-3.5-sonnet, etc.)
- **Prompt**: Detailed task instructions
- **Success Criteria**: Checklist of completion requirements
- **Dependencies**: Tasks that must complete first
- **Estimated Duration**: Time estimate (e.g., "30 minutes")
- **Estimated Tool Calls**: Expected API calls (e.g., 20)
- **Max Retries**: QC retry limit (default: 3)

### Step 5: Set Dependencies

In the Task Editor:
1. Select **Dependencies** dropdown
2. Hold Cmd/Ctrl and click multiple task IDs
3. Selected tasks must complete before this task starts

### Step 6: Export Plan

Click **"Export chain-output.md"** in the header to download:
- Project overview with metadata
- Reasoning section (requirements, decomposition)
- Complete task graph with all details
- Dependency summary with parallel groups
- Mermaid diagram (future enhancement)

---

## 📦 Built-in Agent Templates

### DevOps & Infrastructure
- **🔧 DevOps Validator**: System validation and dependency checking

### Research & Analysis
- **🔬 AI Researcher**: Vector databases, ML systems, technical synthesis
- **📊 Data Analyst**: Comparison tables, data visualization
- **💰 Cloud Economist**: SaaS pricing, TCO modeling

### Development & Architecture
- **🏗️ Solution Architect**: System integration, trade-off analysis
- **✍️ Technical Writer**: Documentation, API guides, tutorials
- **🎯 AI Consultant**: Decision briefs, implementation planning

---

## 🔌 Backend API Integration

The frontend communicates with Mimir via REST API:

### POST `/api/generate-plan`

Generate task plan using PM agent:

```typescript
Request:
{
  "prompt": "Your project description..."
}

Response:
{
  "overview": {
    "goal": string,
    "complexity": "Simple" | "Medium" | "Complex",
    "totalTasks": number,
    "estimatedDuration": string,
    "estimatedToolCalls": number
  },
  "reasoning": {...},
  "tasks": Task[],
  "parallelGroups": ParallelGroup[]
}
```

### POST `/api/save-plan`

Save plan to Mimir knowledge graph:

```typescript
Request:
{
  "plan": ProjectPlan
}

Response:
{
  "success": true,
  "projectId": string,
  "taskIds": string[]
}
```

### GET `/api/plans`

Retrieve all saved plans:

```typescript
Response:
{
  "plans": [
    {
      "id": string,
      "overview": {...},
      "taskCount": number,
      "created": string
    }
  ]
}
```

---

## 🗂️ File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── PromptInput.tsx          # Project prompt input
│   │   ├── AgentPalette.tsx         # Draggable agent library
│   │   ├── TaskCanvas.tsx           # Main canvas area
│   │   ├── ParallelGroupContainer.tsx  # Colored group containers
│   │   ├── TaskCard.tsx             # Draggable task cards
│   │   ├── TaskEditor.tsx           # Detailed editor sidebar
│   │   └── ExportButton.tsx         # Export to markdown
│   ├── store/
│   │   └── planStore.ts             # Zustand state management
│   ├── types/
│   │   └── task.ts                  # TypeScript interfaces
│   ├── App.tsx                      # Main app component
│   ├── main.tsx                     # React entry point
│   └── index.css                    # Tailwind CSS
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json

backend/
└── src/
    └── api/
        └── orchestration-api.ts     # Express router for UI
```

---

## 🎯 chain-output.md Format

The exported format matches Mimir's execution standard:

```markdown
# Task Decomposition Plan

## Project Overview
**Goal:** [Project description]
**Complexity:** Simple | Medium | Complex
**Total Tasks:** [N]
**Estimated Duration:** [Time]
**Estimated Tool Calls:** [Count]

<reasoning>
## Requirements Analysis
[Analysis content]

## Complexity Assessment
[Assessment content]

## Repository Context
[Context content]

## Decomposition Strategy
[Strategy content]

## Task Breakdown
[Breakdown content]
</reasoning>

---

## Task Graph

**Task ID:** task-1.1

**Title:** [Task title]

**Agent Role Description:** [Role description]

**Recommended Model:** gpt-4.1

**Prompt:**
[Detailed prompt with instructions]

**Success Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Dependencies:** task-0

**Estimated Duration:** 30 minutes

**Estimated Tool Calls:** 20

**Parallel Group:** 1

**QC Agent Role Description:** [QC role]

**Verification Criteria:**
- [ ] Verification 1
- [ ] Verification 2

**Max Retries:** 3

---

## Dependency Summary

**Parallel Groups:**
- Group 1: task-1.1
- Group 2: task-1.2, task-1.3, task-1.4
```

---

## 🔧 Customization

### Adding Custom Agent Templates

Edit `frontend/src/store/planStore.ts`:

```typescript
const defaultAgentTemplates: AgentTemplate[] = [
  // ... existing templates
  {
    id: 'custom-agent',
    name: 'Custom Agent Name',
    roleDescription: 'Description of agent role and expertise',
    defaultModel: 'gpt-4.1',
    icon: '🎯',
    category: 'custom',
  },
];
```

### Changing Port

Edit `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 5173, // Change this
    proxy: {
      '/api': {
        target: 'http://localhost:9042', // Backend URL
        changeOrigin: true,
      },
    },
  },
});
```

---

## 🐛 Troubleshooting

### Frontend won't start

**Error:** `Port 5173 already in use`

**Solution:**
```bash
# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use a different port in vite.config.ts
```

### API calls fail

**Error:** `Failed to fetch from /api/generate-plan`

**Solution:**
1. Check MCP server is running: `curl http://localhost:9042/health`
2. Verify proxy configuration in `vite.config.ts`
3. Check browser console for CORS errors

### Backend build fails

**Error:** TypeScript compilation errors

**Solution:**
```bash
cd /Users/c815719/src/Mimir
npm run build
# Fix any TypeScript errors in src/api/orchestration-api.ts
```

---

## 📊 Port Allocation Summary

| Service | Port | Description |
|---------|------|-------------|
| **Frontend UI** | 5173 | Vite dev server |
| **MCP Server** | 9042 | Backend API |
| **Open-WebUI** | 3000 | Existing service |
| **Copilot API** | 4141 | LLM proxy |
| **Neo4j HTTP** | 7474 | Graph database |
| **Neo4j Bolt** | 7687 | Graph protocol |
| **Ollama** | 11434 | Local LLM |

---

## 🎓 Next Steps

1. **PM Agent Integration**: Connect real PM agent for automated plan generation
2. **Visual Dependency Graph**: Add React Flow for visual dependency visualization
3. **Real-time Collaboration**: Multi-user editing with WebSocket sync
4. **Plan Templates**: Save and reuse common task patterns
5. **Execution Integration**: Direct execution from UI via `mimir-execute`
6. **Progress Tracking**: Real-time status updates during execution

---

## 📝 License

MIT

---

**Last Updated:** 2025-11-13  
**Contributors:** Mimir Development Team
