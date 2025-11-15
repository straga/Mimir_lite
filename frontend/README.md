# Mimir Orchestration Studio - Frontend

**Visual drag-and-drop UI for Mimir agent orchestration**

## 🎨 Norse Mythology Dark Theme

The UI features a custom dark theme inspired by Norse mythology:

### Color Palette

- **Norse Night** (`#0a0e1a`) - Deep night sky background
- **Norse Shadow** (`#141824`) - Yggdrasil shadows for cards/panels
- **Norse Stone** (`#1e2433`) - Mountain stone for inputs
- **Norse Rune** (`#2a3247`) - Carved runes for borders
- **Valhalla Gold** (`#d4af37`) - Golden hall for primary actions
- **Valhalla Amber** (`#e8b84a`) - Amber light for hover states
- **Frost Ice** (`#4a9eff`) - Ice blue accents
- **Magic Rune** (`#8b5cf6`) - Mystic purple for special elements

### Design Elements

- **Background Pattern**: Subtle dot grid resembling ancient runes
- **Custom Scrollbars**: Dark-themed with golden hover states
- **Card Styling**: Shadow-layered cards with golden borders on hover
- **Selection**: Golden highlights with dark text

## 🚀 Features

### 1. Dynamic Agent Library (Left Sidebar)

- **Semantic Search**: Search agents by role, type, or keywords
- **Infinite Scroll**: Lazy-load agents as you scroll
- **Create New Agents**: Click `+` button to generate preambles with Agentinator
- **Agent Types**: Visual badges for Worker vs QC agents
- **Drag & Drop**: Drag agents onto canvas to create tasks

### 2. Task Canvas (Center)

- **Visual Task Organization**: Arrange tasks in parallel execution groups
- **Drag & Drop Tasks**: Move tasks between groups or leave ungrouped
- **Parallel Groups**: Create execution groups for concurrent task processing
- **Color-Coded Groups**: Each parallel group has a distinct color

### 3. Task Editor (Right Sidebar)

- **Full Task Configuration**: Edit all task properties
- **Worker Preamble Selection**: Link tasks to saved worker preambles
- **QC Agent Configuration**: Assign QC preambles for validation
- **Dependencies**: Define task dependencies with dropdowns
- **Success Criteria**: Add multiple verification criteria

### 4. Agentinator Integration

#### Backend API (`/api/agents`)

**GET /api/agents**
- List agent preambles with pagination
- Semantic search support
- Filter by agent type (worker/qc)

**POST /api/agents**
- Create new agent preambles
- `useAgentinator: true` - Generate with Agentinator AI
- `useAgentinator: false` - Create minimal template
- Stores in Neo4j as `preamble` nodes

**GET /api/agents/:id**
- Retrieve specific preamble by ID

#### Agentinator Generation Process

1. Loads Agentinator preamble (`docs/agents/v2/02-agentinator-preamble.md`)
2. Loads appropriate template (worker or QC)
3. Creates `CopilotAgentClient` with GPT-4.1
4. Generates customized preamble from role description
5. Stores in Neo4j with embeddings for semantic search

## 🔧 Development

```bash
# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 API Integration

Frontend proxies `/api/*` requests to backend server at `http://localhost:9042`

Configure in `vite.config.ts`:
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:9042',
      changeOrigin: true,
    },
  },
}
```

## 📋 Current Status

### ✅ Completed

- [x] Norse mythology dark theme
- [x] Dynamic agent library with DB integration
- [x] Semantic search for agents
- [x] Infinite scroll pagination
- [x] Create agent modal
- [x] Agentinator backend integration
- [x] Worker and QC preamble types
- [x] Task editor with preamble selection
- [x] Drag & drop agent composition
- [x] Parallel execution groups
- [x] Export to chain-output.md format

### 🔄 In Progress

- [ ] Generate Plan with PM Agent integration
- [ ] Real-time Agentinator feedback in UI
- [ ] Agent preview/edit functionality
- [ ] Task execution visualization
- [ ] Progress tracking for long-running generations

### 📝 TODO

- [ ] Save/load plans from Neo4j
- [ ] Agent version management
- [ ] Preamble diff viewer
- [ ] Bulk agent operations
- [ ] Agent testing/validation UI
- [ ] Execution history timeline

## 🎯 Usage Flow

1. **Enter Project Goal**: Type your objective in the prompt input
2. **Browse Agent Library**: Search or scroll through available agents
3. **Create Custom Agents**: Click `+` to generate new preambles with Agentinator
4. **Compose Tasks**: Drag agents onto canvas to create tasks
5. **Configure Tasks**: Click tasks to edit details, assign preambles, set dependencies
6. **Organize Groups**: Group tasks for parallel execution
7. **Export Plan**: Click export button to generate `chain-output.md`

## 🔑 Key Files

- `src/App.tsx` - Main application with Norse theme
- `src/components/AgentPalette.tsx` - Dynamic agent library
- `src/components/CreateAgentModal.tsx` - Agentinator UI
- `src/components/TaskEditor.tsx` - Task configuration panel
- `src/components/TaskCanvas.tsx` - Drag & drop canvas
- `src/store/planStore.ts` - Zustand state management
- `src/types/task.ts` - TypeScript interfaces
- `tailwind.config.js` - Norse theme colors
- `src/index.css` - Global styles and scrollbars

## 🎨 Customizing the Theme

Edit `tailwind.config.js` to modify colors:

```javascript
colors: {
  'norse': {
    'night': '#0a0e1a',
    'shadow': '#141824',
    // ... more colors
  },
  'valhalla': {
    'gold': '#d4af37',
    // ... gold variants
  }
}
```

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-13  
**Norse Theme**: Enabled ⚡
