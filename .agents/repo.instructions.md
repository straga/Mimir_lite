---
applyTo: '**'
---

# Repository Management Instructions for AI Agents

**Repository:** MCP TODO + Memory System (Graph-RAG Server)  
**Version:** 3.0.0  
**Last Updated:** 2025-10-13

---

## 🎯 What This Repository Is

This is the **development repository** for an MCP (Model Context Protocol) server that provides:
1. **TODO tracking** with rich context storage
2. **External memory system** (Graph-RAG) for AI agents
3. **Multi-agent orchestration** architecture (PM/Worker/QC pattern)

**Your role:** Maintain, develop, and evolve this codebase—NOT consume it as a user.

---

## 📁 Repository Structure

### Root Files
```
/
├── README.md                    # Main documentation entry point
├── AGENTS.md                    # Instructions for agents USING the server
├── package.json                 # Node.js dependencies and scripts
├── tsconfig.json                # TypeScript compiler configuration
└── .gitignore                   # Git ignore patterns
```

### Source Code (`src/`)
```
src/
├── index.ts                     # MCP server entry point (stdio transport)
├── managers/
│   ├── TodoManager.ts           # TODO CRUD operations
│   ├── KnowledgeGraphManager.ts # Graph operations
│   └── index.ts                 # Manager exports
├── tools/
│   ├── todo.tools.ts            # MCP tool definitions for TODOs
│   ├── kg.tools.ts              # MCP tool definitions for KG
│   ├── performance.tools.ts     # Performance measurement tools
│   ├── utility.tools.ts         # Utility tools (clear_all)
│   └── index.ts                 # Tool registration
├── types/
│   ├── todo.types.ts            # TODO TypeScript types
│   ├── graph.types.ts           # Knowledge Graph types
│   └── index.ts                 # Type exports
└── utils/
    ├── persistence.ts           # Memory persistence with decay
    ├── statusMirror.ts          # TODO-Task status synchronization
    ├── summaryGenerator.ts      # Auto-summary generation
    ├── compactLogging.ts        # Token-efficient logging
    └── timing.ts                # Performance timing utilities
```

### Documentation (`docs/`)
```
docs/
├── README.md                    # Documentation index
├── guides/
│   ├── MEMORY_GUIDE.md          # How to use as external memory
│   ├── knowledge-graph.md       # KG operations guide
│   └── PERSISTENCE.md           # Memory persistence guide
├── configuration/
│   └── CONFIGURATION.md         # Environment variable configuration
├── architecture/
│   ├── MULTI_AGENT_EXECUTIVE_SUMMARY.md   # Strategic overview
│   ├── MULTI_AGENT_GRAPH_RAG.md           # Technical architecture
│   ├── MULTI_AGENT_ROADMAP.md             # Implementation roadmap (with deployment/enterprise features)
│   ├── CONVERSATION_ANALYSIS.md           # Architecture validation
│   ├── GRAPH_RAG_RESEARCH.md              # Research backing
│   ├── ANALYSIS_MCP_MEMORY.md             # Memory patterns
│   └── MEMORY_VS_KG.md                    # Architecture comparison
├── testing/
│   ├── TESTING_GUIDE.md                   # Test suite overview
│   └── MEMORY_PERSISTENCE_TEST_SUMMARY.md # Test results
└── agents/
    ├── claudette-todo.md        # Claudette agent config
    └── claudette-auto.md        # Autonomous mode config
```

### Testing (`testing/`)
```
testing/
├── *.test.ts                    # Unit/integration tests (Vitest)
└── [test documentation in docs/testing/]
```

### Build Output (`build/`)
```
build/
├── index.js                     # Compiled MCP server
├── managers/                    # Compiled managers
├── tools/                       # Compiled tools
└── [other compiled artifacts]
```

---

## 🛠️ Technology Stack

### Core Technologies
- **Language:** TypeScript 5.x
- **Runtime:** Node.js 18+
- **Build Tool:** TypeScript Compiler (`tsc`)
- **Test Framework:** Vitest
- **MCP SDK:** `@modelcontextprotocol/sdk`

### Key Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^0.6.2",  // MCP protocol implementation
  "typescript": "^5.7.2",                  // TypeScript compiler
  "vitest": "^3.2.4"                       // Testing framework
}
```

### Architecture Patterns
- **In-Memory Storage:** Maps for fast access (TODO: database in v3.1)
- **File Persistence:** JSON file with atomic writes
- **Memory Decay:** Time-based TTL (24h/7d/permanent)
- **Graph Structure:** Nodes + Edges with typed relationships
- **MCP Protocol:** stdio transport for IDE integration

---

## 🔧 Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Build TypeScript → JavaScript
npm run build

# Run tests
npm test

# Watch mode (rebuild on change)
npm run watch
```

### Making Changes

**1. Modify TypeScript source** (`src/`)
- Follow existing patterns in managers/tools
- Update types in `src/types/` if needed
- Add tests in `testing/`

**2. Build**
```bash
npm run build
```

**3. Test**
```bash
# Run all tests
npm test

# Run specific test file
npm test -- testing/memory-persistence.test.ts

# Watch mode
npm test -- --watch
```

**4. Document**
- Update relevant docs in `docs/`
- Update README.md if user-facing changes
- Update AGENTS.md if usage patterns change

### Adding New MCP Tools

**Step 1: Define tool in `src/tools/`**
```typescript
// src/tools/my-new.tools.ts
export const myNewTool = {
  name: 'my_new_tool',
  description: 'Does something useful',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  }
};
```

**Step 2: Implement handler in manager**
```typescript
// src/managers/MyManager.ts
export class MyManager {
  doSomething(input: string): Result {
    // Implementation
  }
}
```

**Step 3: Register tool in `src/index.ts`**
```typescript
case 'my_new_tool':
  result = myManager.doSomething(args.input);
  break;
```

**Step 4: Add tests**
```typescript
// testing/my-new-tool.test.ts
describe('My New Tool', () => {
  it('should do something', () => {
    // Test implementation
  });
});
```

---

## 📚 Where to Learn More

### Development Topics

**Want to understand the MCP protocol?**
→ Read: https://modelcontextprotocol.io/docs

**Want to understand the multi-agent architecture?**
→ Read: `docs/architecture/MULTI_AGENT_GRAPH_RAG.md`
→ Read: `docs/architecture/CONVERSATION_ANALYSIS.md`

**Want to understand memory persistence?**
→ Read: `src/utils/persistence.ts` (implementation)
→ Read: `docs/guides/PERSISTENCE.md` (user guide)
→ Read: `testing/memory-persistence.test.ts` (test examples)

**Want to understand the knowledge graph?**
→ Read: `src/managers/KnowledgeGraphManager.ts`
→ Read: `docs/guides/knowledge-graph.md`

**Want to understand the testing strategy?**
→ Read: `docs/testing/TESTING_GUIDE.md`
→ Run: `npm test` to see current test suite

**Want to understand the roadmap?**
→ Read: `docs/architecture/MULTI_AGENT_ROADMAP.md`
→ Includes: Deployment plans, enterprise features, timelines

### Code Patterns

**Where are TODOs stored?**
- In-memory: `TodoManager.todos` (Map)
- Persistent: `.mcp-memory-store.json` (file)
- Future: PostgreSQL (v3.1 - see roadmap)

**How does memory decay work?**
- Implemented in: `src/utils/persistence.ts`
- TTL tiers: 24h (TODO), 7d (Phase), permanent (Project)
- Applied on: Server startup via `load()`
- Configurable via: Environment variables

**How are graph relationships stored?**
- Nodes: `KnowledgeGraphManager.nodes` (Map<id, Node>)
- Edges: `KnowledgeGraphManager.edges` (Map<id, Edge>)
- Types: Defined in `src/types/graph.types.ts`

---

## 🚀 Future Development (See Roadmap)

### Phase 4: Deployment (v3.1 - Q1 2026)
When implementing remote deployment:
- **New files:** `src/server/http-server.ts`, `src/server/middleware/auth.ts`
- **Dependencies:** `express`, `jsonwebtoken`, `pg`, `redis`
- **Configuration:** Docker Compose, Kubernetes manifests
- **Testing:** Integration tests for HTTP endpoints

### Phase 5: Enterprise (v3.2 - Q2 2026)
When implementing enterprise features:
- **New files:** `src/managers/AuditManager.ts`, `src/managers/AgentTracker.ts`
- **New types:** `src/types/audit.types.ts`, `src/types/compliance.types.ts`
- **Database:** Audit trail tables, compliance report schemas
- **Testing:** Compliance validation tests

**📋 Full details:** See `docs/architecture/MULTI_AGENT_ROADMAP.md`

---

## 🧪 Testing Guidelines

### Test File Naming
- Unit tests: `*.test.ts` (e.g., `memory-persistence.test.ts`)
- Integration tests: `*-integration.test.ts`
- Located in: `testing/` directory

### Running Tests
```bash
# All tests
npm test

# Specific test file
npm test -- testing/memory-persistence.test.ts

# Watch mode
npm test -- --watch

# With coverage (not configured yet)
npm test -- --coverage
```

### Test Standards
- **Coverage goal:** >80% for new code
- **Framework:** Vitest
- **Assertions:** `expect()` from Vitest
- **Cleanup:** Use `beforeEach`/`afterEach` hooks
- **Isolation:** Each test should be independent

**Example test structure:**
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do expected behavior', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = doSomething(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

---

## 🔐 Important Conventions

### TypeScript
- **Strict mode:** Enabled in `tsconfig.json`
- **No implicit any:** All types must be explicit
- **Interfaces:** Prefer interfaces over types for objects
- **Exports:** Named exports (not default exports)

### Code Style
- **Formatting:** 2 spaces indentation
- **Naming:** camelCase for variables/functions, PascalCase for classes/types
- **Comments:** Use JSDoc for public APIs
- **Async:** Use async/await (not callbacks or raw promises)

### Git Workflow
- **Main branch:** `main` (protected)
- **Feature branches:** `feature/name-of-feature`
- **Commits:** Descriptive messages (not "fix" or "update")
- **Testing:** All tests must pass before merge

### File Organization
- **Managers:** Business logic, no I/O
- **Tools:** MCP tool definitions and schemas
- **Utils:** Shared utilities (persistence, logging, etc.)
- **Types:** Shared TypeScript types/interfaces

---

## 🚨 Critical Reminders

### Do NOT:
- ❌ Commit `build/` to git (it's gitignored)
- ❌ Commit `node_modules/` to git
- ❌ Commit `.mcp-memory-store.json` (test data)
- ❌ Break existing MCP tool APIs (backward compatibility)
- ❌ Skip tests for new features

### DO:
- ✅ Run `npm run build` before testing changes
- ✅ Run `npm test` before committing
- ✅ Update docs when changing behavior
- ✅ Add tests for new features
- ✅ Follow TypeScript strict mode

---

## 📞 Getting Help

### For Repository Issues
- **Build failures:** Check `tsconfig.json`, run `npm install`
- **Test failures:** Check test output, review recent changes
- **Type errors:** Check `src/types/`, ensure strict mode compliance
- **MCP protocol issues:** Review MCP SDK docs

### For Architecture Questions
- **Multi-agent design:** `docs/architecture/MULTI_AGENT_GRAPH_RAG.md`
- **Memory system:** `docs/architecture/ANALYSIS_MCP_MEMORY.md`
- **Graph-RAG research:** `docs/architecture/GRAPH_RAG_RESEARCH.md`
- **Roadmap:** `docs/architecture/MULTI_AGENT_ROADMAP.md`

### For Implementation Questions
- **Check existing code:** Similar features likely exist
- **Check tests:** `testing/` has working examples
- **Check docs:** `docs/` has detailed guides
- **Check roadmap:** Future features are planned in detail

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Build TypeScript | `npm run build` |
| Run tests | `npm test` |
| Watch mode (rebuild) | `npm run watch` |
| Test specific file | `npm test -- testing/file.test.ts` |
| Start MCP server | `npm start` |

| Need to understand... | Read this file |
|----------------------|----------------|
| MCP tool usage | `AGENTS.md` |
| User documentation | `README.md`, `docs/guides/` |
| Architecture | `docs/architecture/` |
| Testing | `docs/testing/TESTING_GUIDE.md` |
| Configuration | `docs/configuration/CONFIGURATION.md` |
| Future plans | `docs/architecture/MULTI_AGENT_ROADMAP.md` |

---

**Last Updated:** 2025-10-13  
**Version:** 3.0.0  
**Maintainer:** Repository development team

---

**Remember:** This is the development repository. For using the MCP server as a tool, see `AGENTS.md`.
