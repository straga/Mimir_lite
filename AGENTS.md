# AI Agent Instructions for This Repository

This repository includes an MCP (Model Context Protocol) server for TODO and knowledge graph management, with automatic discovery in VS Code, Cursor, and Windsurf.

---

## 🚀 Quick Start

**The MCP server is automatically configured!** Just:
1. Run `npm install && npm run build`
2. Open this workspace in VS Code/Cursor/Windsurf
3. MCP tools will be automatically available

---

## 📚 Documentation Structure

### 🎯 Executive Documents (`docs/`)
- **[MULTI_AGENT_EXECUTIVE_SUMMARY.md](docs/MULTI_AGENT_EXECUTIVE_SUMMARY.md)** - **Strategic overview** for stakeholders

### 📖 User Guides (`docs/guides/`)
- **[MEMORY_GUIDE.md](docs/architecture/MEMORY_GUIDE.md)** - **START HERE:** External memory system guide
- **[KNOWLEDGE_GRAPH_GUIDE.md](docs/architecture/knowledge-graph.md)** - Associative memory networks guide
- **[TESTING_GUIDE.md](docs/guides/TESTING_GUIDE.md)** - Test suite guide
- **[DOCKER_DEPLOYMENT_GUIDE.md](docs/guides/DOCKER_DEPLOYMENT_GUIDE.md)** - Docker deployment

### 🏗️ Architecture (`docs/architecture/`)
- **[MULTI_AGENT_GRAPH_RAG.md](docs/architecture/MULTI_AGENT_GRAPH_RAG.md)** - Complete architecture spec (v3.1)
- **[MULTI_AGENT_ROADMAP.md](docs/architecture/MULTI_AGENT_ROADMAP.md)** - Implementation plan (Q4 2025-Q1 2026)
- **[AGENT_CHAINING.md](docs/architecture/AGENT_CHAINING.md)** - PM → Ecko → Worker flow
- **[PARALLEL_EXECUTION_SUMMARY.md](docs/PARALLEL_EXECUTION_SUMMARY.md)** - ⚡ **NEW:** Parallel task execution
- **[PROMPTING_SPECIALIST_ARCHITECTURE.md](docs/architecture/PROMPTING_SPECIALIST_ARCHITECTURE.md)** - Ecko agent design
- **[NEO4J_MIGRATION_PLAN.md](docs/architecture/NEO4J_MIGRATION_PLAN.md)** - Neo4j migration plan (in-memory → persistent)
- **[FILE_INDEXING_SYSTEM.md](docs/architecture/FILE_INDEXING_SYSTEM.md)** - Automatic file indexing & RAG enrichment
- **[PERSISTENCE.md](docs/architecture/PERSISTENCE.md)** - Memory persistence & decay
- **[VALIDATION_TOOL_DESIGN.md](docs/architecture/VALIDATION_TOOL_DESIGN.md)** - Agent validation system
- **[HTTP_TRANSPORT_REQUIREMENTS.md](docs/architecture/HTTP_TRANSPORT_REQUIREMENTS.md)** - HTTP transport layer
- **[DOCKER_VOLUME_STRATEGY.md](docs/architecture/DOCKER_VOLUME_STRATEGY.md)** - Docker volumes

### 🔬 Research (`docs/research/`)
- **[SWE_GREP_COMPARISON.md](docs/research/SWE_GREP_COMPARISON.md)** - Cognition AI SWE-grep analysis
- **[CONVERSATION_ANALYSIS.md](docs/research/CONVERSATION_ANALYSIS.md)** - Architecture validation
- **[GRAPH_RAG_RESEARCH.md](docs/research/GRAPH_RAG_RESEARCH.md)** - Foundational Graph-RAG research
- **[AASHARI_FRAMEWORK_ANALYSIS.md](docs/research/AASHARI_FRAMEWORK_ANALYSIS.md)** - External framework comparison
- **[EXTENSIVEMODE_BEASTMODE_ANALYSIS.md](docs/research/EXTENSIVEMODE_BEASTMODE_ANALYSIS.md)** - Agent benchmarking

### ⚙️ Configuration (`docs/configuration/`)
- **[CONFIGURATION.md](docs/configuration/CONFIGURATION.md)** - Setup for VSCode, Cursor, Claude Desktop

### 🤖 Agent Configurations (`docs/agents/`)
- **[claudette-auto.md](docs/agents/claudette-auto.md)** - Autonomous execution mode (v5.2.1)
- **[claudette-pm.md](docs/agents/claudette-pm.md)** - PM agent for planning
- **[claudette-ecko.md](docs/agents/claudette-ecko.md)** - Prompt architect (v3.0)
- **[claudette-agentinator.md](docs/agents/claudette-agentinator.md)** - Agent preamble generator
- **[AGENTIC_PROMPTING_FRAMEWORK.md](docs/agents/AGENTIC_PROMPTING_FRAMEWORK.md)** - Core framework (v1.2)

### 📊 Benchmarks & Results (`docs/results/`)
- **[BEASTMODE_BENCHMARK_REPORT.md](docs/results/BEASTMODE_BENCHMARK_REPORT.md)** - BeastMode analysis
- **[CLAUDETTE_VS_BEASTMODE.md](docs/results/CLAUDETTE_VS_BEASTMODE.md)** - Comparison
- **[DOCKER_MIGRATION_PROMPTS.md](docs/results/DOCKER_MIGRATION_PROMPTS.md)** - Migration example

---

## �� Context Management Protocol

### This System is Two Things:

**1. TODO Tracker** - Manage tasks, track progress, organize work hierarchically  
**2. Memory System** - Store context, recall on-demand, build associative knowledge networks

**Core Paradigm:** Your conversation is **working memory** (7±2 items, temporary). This MCP server is your **long-term memory** (unlimited, persistent, associative). Store TODO tasks with rich context, track them through completion, and build knowledge graphs of relationships.

**📘 See [MEMORY_GUIDE.md](docs/architecture/MEMORY_GUIDE.md) for comprehensive memory strategies**

### When to Use MCP Tools

**ALWAYS use for:**
- ✅ Multi-file projects (>3 files) → track tasks + store file context
- ✅ Complex tasks with multiple phases → hierarchical TODO structure + memory network
- ✅ Long conversations (>50 messages) → prevent context overflow via TODO/memory offloading
- ✅ Team collaboration and handoffs → shared TODO list + knowledge base
- ✅ Any work requiring audit trails → timestamped TODO notes + provenance tracking
- ✅ Multi-agent orchestration scenarios → agent-scoped TODO assignment + context isolation

### Standard Workflow (Single Agent)

**For TODO Tracking:**
1. **Create TODOs**: `create_todo` for tasks/phases with rich context
2. **Track Progress**: Update status (`pending` → `in_progress` → `completed`)
3. **Add Notes**: `add_todo_note` for timestamped observations as work progresses
4. **Organize**: Use parent-child relationships for hierarchical task breakdown

**For Memory Management:**
1. **Store Context**: `create_todo` + `context` field to offload file paths, errors, decisions
2. **Reference by ID**: Use "Working on todo-1-xxx" instead of repeating details in every message
3. **Recall On-Demand**: `get_todo(id)` to retrieve stored context when actively working
4. **Search When Lost**: `graph_search_nodes('keyword')` to find forgotten TODO context
5. **Build Knowledge Graph**: `graph_add_node` for entities, `graph_add_edge` for relationships

**Combined Approach:** Store TODOs with rich context, track them to completion, link them to knowledge graph entities (files, concepts, dependencies)

### Multi-Agent Orchestration (NEW - v3.0+)

**🎯 Goal:** Agent-scoped context management with ephemeral workers and adversarial validation

**Architecture Pattern:**

```
PM Agent (Long-lived)          Worker Agents (Ephemeral)        QC Agent (Validator)
┌─────────────┐                ┌──────────┐                    ┌─────────────┐
│ Research    │                │ Task 1   │                    │ Verify      │
│ Planning    │ ──creates──→   │ (clean   │ ──output──→       │ Against     │
│ Task Graph  │                │ context) │                    │ Requirements│
└─────────────┘                └──────────┘                    └─────────────┘
                               ┌──────────┐                           │
                               │ Task 2   │                    ✅ Pass │ ❌ Fail
                               │ (clean   │                           ↓
                               │ context) │                    Generate
                               └──────────┘                    Correction
```

**PM Agent Workflow:**
1. **Research Phase**: Gather requirements with full context
2. **Task Breakdown**: Create `graph_add_node(type: 'todo', ...)` for each subtask
3. **Dependency Mapping**: Link tasks with `graph_add_edge(task_1, depends_on, task_2)`
4. **Context Handoff**: Store ALL necessary context in task node properties
5. **Sleep**: PM exits or monitors, doesn't execute tasks

**Worker Agent Workflow:**
1. **Claim Task**: Atomically lock task (prevents duplicate work)
   ```javascript
   graph_lock_node({taskId: 'task-id', agentId: 'worker-1', timeoutMs: 300000})
   ```
2. **Pull Filtered Context**: Use `get_task_context` for automatic 90%+ context reduction
   ```javascript
   get_task_context({taskId: 'task-id', agentType: 'worker'})
   ```
   - Returns ONLY: title, requirements, description, workerRole, files (max 10), dependencies (max 5)
   - Strips 90%+ of PM research, planningNotes, alternatives, full subgraph
3. **Execute**: Complete task with focused context (zero prior conversation history)
4. **Store Output**: `graph_update_node({id: 'task-id', properties: {workerOutput, status: 'awaiting_qc'}})`
5. **Release Lock**: `graph_unlock_node({taskId: 'task-id', agentId: 'worker-1'})`
6. **Terminate**: Worker exits immediately (context naturally pruned)

**QC Agent Workflow:**
1. **Pull QC Context**: Get requirements + worker output for verification
   ```javascript
   get_task_context({taskId: 'task-id', agentType: 'qc'})
   graph_get_subgraph({nodeId: 'task-id', depth: 2})  // For dependencies
   ```
   - QC context includes: requirements, workerOutput, verificationCriteria
   - No unnecessary PM research or worker implementation details
2. **Verify Requirements**: Compare output against verification criteria from graph
3. **Decision**:
   - ✅ **Pass**: `graph_update_node({id: 'task-id', properties: {qcVerification: {passed: true, score, feedback}, status: 'completed'}})`
   - ❌ **Fail**: `graph_update_node({id: 'task-id', properties: {status: 'pending', attemptNumber: ++, errorContext: {qcFeedback, issues, requiredFixes}}})`
4. **Feedback Loop**: Failed tasks go back to worker (if attemptNumber ≤ maxRetries) with errorContext

**Key Benefits:**
- 🧹 **Natural Context Pruning**: Worker termination = automatic cleanup
- 🎯 **Focused Execution**: Each worker has single-task context only
- 🔒 **Race Condition Prevention**: Optimistic locking prevents conflicts
- 🛡️ **Hallucination Prevention**: QC catches errors before graph storage
- 📊 **Audit Trail**: Complete task history in graph

**Concurrency Control (Critical):**
```javascript
// Optimistic Locking Pattern
try {
  lock_todo({
    id: 'task-id',
    agent_id: 'worker-1',
    version: current_version + 1,
    timeout: 300 // 5 min auto-expiry
  })
} catch (VersionConflictError) {
  // Another worker claimed task - retry with different task
}
```

### Anti-Patterns (Don't Do This)

**Single Agent:**
❌ Not tracking tasks with TODOs (losing sight of what's pending/in-progress/completed)  
❌ Repeating file lists in every message (store in TODO context once, recall by ID)  
❌ Restating error messages already stored in TODOs (memory duplication)  
❌ Asking user "what were we working on?" (check `list_todos(status='in_progress')` first)  
❌ Abandoning TODO tracker after 20+ messages (exactly when task tracking is most valuable!)  
❌ Not using parent-child TODOs for complex projects (flat lists instead of hierarchical structure)

**Multi-Agent:**
❌ Workers accessing PM's full research context (context bloat)  
❌ No locking mechanism (race conditions)  
❌ Storing unverified worker output (hallucination propagation)  
❌ QC agent without subgraph access (can't verify requirements)  
❌ Workers retrying with different context (breaks correction loop)  

---

## 🔧 Available MCP Tools

This workspace provides **26 MCP tools** automatically:

**Graph Operations - Single (12 tools):**
- `graph_add_node` - Create entity (file/person/concept/project/todo)
- `graph_get_node` - Retrieve entity by ID
- `graph_update_node` - Update entity properties
- `graph_delete_node` - Delete entity (cascades to edges)
- `graph_add_edge` - Link entities with relationships
- `graph_delete_edge` - Remove relationship between entities
- `graph_query_nodes` - Filter by type/properties
- `graph_search_nodes` - Full-text search across all nodes
- `graph_get_edges` - Get all edges connected to a node
- `graph_get_neighbors` - Find nodes connected to a given node
- `graph_get_subgraph` - Extract connected subgraph (multi-hop traversal)
- `graph_clear` - Clear data from graph (by type or ALL)

**Graph Operations - Batch (5 tools):**
- `graph_add_nodes` - Bulk create multiple nodes
- `graph_update_nodes` - Bulk update multiple nodes
- `graph_delete_nodes` - Bulk delete multiple nodes
- `graph_add_edges` - Bulk create multiple relationships
- `graph_delete_edges` - Bulk delete multiple relationships

**Graph Operations - Multi-Agent Locking (4 tools):**
- ⚡ `graph_lock_node` - Acquire exclusive lock on node (optimistic locking)
- ⚡ `graph_unlock_node` - Release lock on node
- ⚡ `graph_query_available_nodes` - Query unlocked nodes (filter by lock status)
- ⚡ `graph_cleanup_locks` - Clean up expired locks

**File Indexing (4 tools):**
- `watch_folder` - Start watching directories for file changes
- `unwatch_folder` - Stop watching directories
- `index_folder` - Manual bulk indexing of directory
- `list_watched_folders` - View active file watchers

**Context Isolation (1 tool):**
- ⚡ `get_task_context` - Get filtered context by agent type (PM/worker/QC) - implements 90%+ context reduction for workers

---

## 📋 Quick Checklist for Agents

Before starting work:

- [ ] Read [CVS Health Instructions](./.agents/cvs.instructions.md) for enterprise policies
- [ ] Verify MCP server is built (`npm run build`)
- [ ] Understand context offloading workflow (see above)
- [ ] Know when to use TODOs vs. knowledge graph
- [ ] Set up periodic refresh (every 15 messages: `list_todos()`)

---

## 🚨 Critical Reminders

### Context Drift Prevention

**Every 15 messages, you MUST:**
1. Call `list_todos(status='in_progress')` to sync
2. Review progress on current TODO
3. Update TODO status if completed
4. Add progress note via `add_todo_note`

### After Context Summarization

**IMMEDIATELY:**
1. Call `list_todos(status='in_progress')`
2. Call `get_todo(id)` for each active TODO
3. Call `graph_get_stats()` to verify graph state
4. Use `graph_search_nodes('keyword')` if details are missing
5. **NEVER** ask user "what were we working on?"

---

## 💡 Pro Tips

1. **Store, don't repeat**: 90% context reduction by using MCP tools
2. **Query on-demand**: Only retrieve context when actively working on it
3. **Use the graph**: Model relationships instead of flat lists
4. **Search when lost**: `graph_search_nodes` is your recovery tool
5. **Periodic refresh**: Don't abandon tools over time

---

## 📞 Support & Questions

- **Technical Issues**: See [REPOSITORY_MCP_SETUP.md](./REPOSITORY_MCP_SETUP.md) troubleshooting section
- **Enterprise Policies**: Contact `ai-governance@cvshealth.com`
- **Feature Requests**: GitHub Issues or `ai-support@cvshealth.com`

---

**Last Updated:** 2025-10-07  
**Version:** 2.0.0  
**Maintainer:** CVS Health Enterprise AI Team

---

*This file is automatically discovered by GitHub Copilot and other AI agents when working in this repository.*
