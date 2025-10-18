# TODO Tracker + External Memory System for AI Agents

A Model Context Protocol (MCP) server combining **TODO tracking** with **external memory** for AI agents. Track tasks hierarchically while storing rich context in structured memories (TODOs) and associative memory networks (Knowledge Graph). Manage complex projects with full task tracking, context offloading, and intelligent recall—preventing context window overload while maintaining complete visibility into work progress.

## Core Features: TODO Tracking + Memory System

### 🎯 TODO Tracking with Rich Context
- **Task Management**: Create, update, and track TODOs with status/priority
- **Hierarchical Organization**: Parent-child relationships for project/phase/task breakdown
- **Progress Tracking**: Move tasks through pending → in_progress → completed → blocked
- **Rich Context Storage**: Every TODO stores detailed context (files, errors, decisions, dependencies)
- **Timestamped Notes**: Add observations as work progresses without overwriting
- **Incremental Updates**: Append new findings to existing TODO context

**Think:** Traditional TODO tracker + rich context storage for every task

### 🕸️ Associative Memories (Knowledge Graph)
- **Entity Networks**: Model files, concepts, people, projects as connected memories
- **Relationship Mapping**: Build associative networks like human memory connections
- **Multi-Hop Reasoning**: Traverse memory clusters with subgraph extraction
- **Associative Recall**: Find memories by relationship, not just ID

**Think:** Associative memory network—like how your brain links related concepts

### 🔍 Memory Operations
- **Store & Recall**: Offload context to external memory, retrieve on-demand
- **Search & Filter**: Find memories by content, type, status, or relationships
- **Intelligent Ranking**: Get best matches first (relevance, recency, trust, importance)
- **Batch Operations**: Bulk memory storage and linking for efficiency

### 🔄 Context Management
- **Pull → Prune → Pull**: Research-backed context cycling
- **Memory Hierarchy**: Project/Phase/Task context tiers (hot/warm/cold)
- **Context Verification**: Trust scoring and provenance tracking
- **Time-based Decay**: Natural memory decay (24h/7d/permanent)
- **Persistent Storage**: Memories survive restarts with atomic writes

**Think:** Your working memory stays clean, long-term memory persists through restarts

## Documentation

### 🎯 Executive Documents
- 📊 **[Multi-Agent Executive Summary](docs/MULTI_AGENT_EXECUTIVE_SUMMARY.md)** - **Strategic overview** for stakeholders

### 📚 User Guides
- 🧠 **[Memory Guide](docs/architecture/MEMORY_GUIDE.md)** - **START HERE:** External memory system guide
- 🕸️ **[Knowledge Graph Guide](docs/architecture/knowledge-graph.md)** - Associative memory networks
- 🧪 **[Testing Guide](docs/guides/TESTING_GUIDE.md)** - Test suite overview
- 🐳 **[Docker Deployment Guide](docs/guides/DOCKER_DEPLOYMENT_GUIDE.md)** - Container deployment

### 🏗️ Architecture
- 🏗️ **[Multi-Agent Architecture](docs/architecture/MULTI_AGENT_GRAPH_RAG.md)** - Complete architecture spec (v3.1)
- 🗺️ **[Implementation Roadmap](docs/architecture/MULTI_AGENT_ROADMAP.md)** - Phase-by-phase plan (Q4 2025-Q1 2026)
- 🔗 **[Agent Chaining](docs/architecture/AGENT_CHAINING.md)** - PM → Ecko → Worker flow
- ⚡ **[Parallel Task Execution](docs/PARALLEL_EXECUTION_SUMMARY.md)** - Dependency-based parallel execution
- 🎨 **[Prompting Specialist Architecture](docs/architecture/PROMPTING_SPECIALIST_ARCHITECTURE.md)** - Ecko agent design
- 🗄️ **[Neo4j Migration Plan](docs/architecture/NEO4J_MIGRATION_PLAN.md)** - Graph database migration (in-memory → persistent)
- 📂 **[File Indexing System](docs/architecture/FILE_INDEXING_SYSTEM.md)** - Automatic file indexing & RAG enrichment
- 💾 **[Persistence Architecture](docs/architecture/PERSISTENCE.md)** - Memory persistence & decay
- 🛠️ **[Validation Tool Design](docs/architecture/VALIDATION_TOOL_DESIGN.md)** - Agent validation system
- 🌐 **[HTTP Transport Requirements](docs/architecture/HTTP_TRANSPORT_REQUIREMENTS.md)** - HTTP transport layer
- 🐳 **[Docker Volume Strategy](docs/architecture/DOCKER_VOLUME_STRATEGY.md)** - Docker volumes

### 🔬 Research
- 🔍 **[SWE-grep Comparison](docs/research/SWE_GREP_COMPARISON.md)** - Cognition AI SWE-grep analysis
- 📈 **[Conversation Analysis](docs/research/CONVERSATION_ANALYSIS.md)** - Architecture validation
- 📊 **[Graph-RAG Research](docs/research/GRAPH_RAG_RESEARCH.md)** - Foundational research
- 🔬 **[Aashari Framework Analysis](docs/research/AASHARI_FRAMEWORK_ANALYSIS.md)** - External framework comparison
- 🧪 **[ExtensiveMode/BeastMode Analysis](docs/research/EXTENSIVEMODE_BEASTMODE_ANALYSIS.md)** - Agent benchmarking

### ⚙️ Configuration
- 🔧 **[Configuration Guide](docs/configuration/CONFIGURATION.md)** - Setup for VSCode, Cursor, Claude Desktop

### 🤖 Agent Configurations
- 🤖 **[AGENTS.md](AGENTS.md)** - AI agent workflows and best practices
- 🔧 **[Claudette Auto](docs/agents/claudette-auto.md)** - Autonomous execution mode (v5.2.1)
- 📋 **[Claudette PM](docs/agents/claudette-pm.md)** - PM agent for planning
- 🎨 **[Claudette Ecko](docs/agents/claudette-ecko.md)** - Prompt architect (v3.0)
- 🏭 **[Claudette Agentinator](docs/agents/claudette-agentinator.md)** - Agent preamble generator
- 📐 **[Agentic Prompting Framework](docs/agents/AGENTIC_PROMPTING_FRAMEWORK.md)** - Core framework (v1.2)

### 📊 Benchmarks & Results
- 📊 **[BeastMode Benchmark Report](docs/results/BEASTMODE_BENCHMARK_REPORT.md)** - BeastMode analysis
- 📈 **[Claudette vs BeastMode](docs/results/CLAUDETTE_VS_BEASTMODE.md)** - Comparison
- 🐳 **[Docker Migration Prompts](docs/results/DOCKER_MIGRATION_PROMPTS.md)** - Migration example

## 🚀 Future Roadmap

### Phase 4: Deployment Infrastructure (v3.1 - Q1 2026)
- **Remote Centralized Server**: Deploy as centralized memory service
- **Multi-tenancy**: Support for distributed agent teams
- **Database Persistence**: PostgreSQL/Redis backend
- **Docker & Kubernetes**: Production-ready deployments
- **Authentication & Authorization**: JWT-based security

### Phase 5: Enterprise Features (v3.2 - Q2 2026)
- **Complete Audit Trail**: Enterprise-level compliance tracking
- **Agent Activity Monitoring**: Real-time agent behavior analysis
- **Validation Chain**: End-to-end validation with provenance
- **Compliance Reporting**: Automated compliance reports (GDPR/SOC2)
- **Rate Limiting & Quotas**: Resource management per team

**📋 Full roadmap:** See [Implementation Roadmap](docs/architecture/MULTI_AGENT_ROADMAP.md) for detailed implementation plans

## 🐳 Docker Deployment (Production-Ready)

The MCP server is available as a Docker container for easy deployment:

### Quick Start

```bash
# Clone and navigate
git clone <repository-url>
cd GRAPH-RAG-TODO-main

# Create environment configuration
cp .env.example .env

# Build and start
docker-compose up -d

# Verify health
curl http://localhost:3000/health
```

### Features
- ✅ **175MB Alpine-based image** (multi-stage build)
- ✅ **Volume persistence** for data and logs
- ✅ **Health check endpoint** for monitoring
- ✅ **Configurable via environment variables**
- ✅ **Non-root user** for security
- ✅ **Auto-restart policy** for reliability

### Documentation
- 📘 **[Complete Deployment Guide](docs/guides/DOCKER_DEPLOYMENT_GUIDE.md)** - Prerequisites, configuration, troubleshooting
- 🔧 **[Configuration Options](docs/configuration/CONFIGURATION.md)** - Environment variables explained
- 🏭 **[Production Best Practices](docs/guides/DOCKER_DEPLOYMENT_GUIDE.md#production-deployment)** - Security, monitoring, backups

### HTTP API

The Docker container exposes an HTTP API for MCP tool calls:

```bash
# Initialize session
SESSION=$(curl -s -i -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}' \
  | sed -n "s/^Mcp-Session-Id: //p" | tr -d '\r')

# Call any MCP tool
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_todo",
      "arguments": {"title": "My TODO", "description": "Docker test"}
    },
    "id": 2
  }' | jq '.'
```

**See [Docker Deployment Guide](docs/guides/DOCKER_DEPLOYMENT_GUIDE.md) for complete HTTP API examples.**

## Features

### Core TODO Management
- ✅ **In-Memory TODO Management**: Create, read, update, and delete TODO items
- 🔗 **Linked Context**: Associate file paths, line numbers, API endpoints, and other contextual data with each TODO
- 📝 **Timestamped Notes**: Add observations and notes to TODO items as work progresses
- 🏷️ **Tagging & Filtering**: Organize TODOs with tags and filter by status, priority, or tags
- 🌳 **Hierarchical Tasks**: Support for parent-child relationships (subtasks)
- 🎯 **Priority Management**: Set priority levels (low, medium, high, critical)
- 📊 **Status Tracking**: Track progress through pending, in_progress, completed, blocked, cancelled states

### ⭐ Knowledge Graph Enhancement (Optional)
- 🕸️ **Rich Entity Modeling**: Create nodes for people, files, concepts, projects
- 🔗 **Relationship Tracking**: Link entities with typed relationships (depends_on, assigned_to, references)
- 🔍 **Graph Querying**: Find neighbors, query by type/properties, get statistics
- 🔎 **🆕 Full-Text Search**: Search all nodes when you lose track - autonomous context recovery
- 🏆 **🆕 Intelligent Ranking**: 7-factor relevance scoring with query-specific optimization
- 📈 **Visualization Ready**: Export graph structure for visualization tools
- 🔄 **Auto-Integration**: TODOs automatically integrate with the knowledge graph
- 🚀 **Migration Path**: Easy migration to Neo4j for persistent storage

### 🔬 Research-Backed Enhancements (v2.1+)

**✅ Implemented:**
- **Automatic Context Enrichment**: TODOs are auto-enriched with temporal, hierarchical, file, and error context for 49-67% better search accuracy (Anthropic Contextual Retrieval research)
- **Subgraph Extraction (`graph_get_subgraph`)**: Extract connected relationship graphs for multi-hop reasoning with optional natural language linearization (Graph-RAG methodology)
- **Event-Driven Context Management**: Pull→Prune→Pull pattern validated by "Lost in the Middle" research for 90%+ context retention

**🚀 In Development (v3.0+):**
- **Multi-Agent Orchestration**: PM/Worker/QC agent pattern with ephemeral workers for natural context pruning
- **Adversarial Validation**: QC agents verify worker output before storage to prevent hallucination propagation
- **Context Deduplication**: Active deduplication engine with hash-based fingerprinting for >80% reduction
- **Concurrent Access Control**: Optimistic locking with version-based conflict resolution

**[Read the research analysis →](docs/research/GRAPH_RAG_RESEARCH.md)** | **[Multi-agent architecture →](docs/architecture/MULTI_AGENT_GRAPH_RAG.md)** | **[Conversation analysis →](docs/research/CONVERSATION_ANALYSIS.md)** | **[Implementation roadmap →](docs/architecture/MULTI_AGENT_ROADMAP.md)**

## ⚡ Multi-Agent Features (v3.1)

### Task Locking System
Prevent race conditions in multi-agent scenarios with optimistic locking:

```typescript
// Worker claims task
const locked = await graph_lock_node(taskId, 'worker-1', 300000);
if (locked) {
  // Execute task...
  await graph_unlock_node(taskId, 'worker-1');
}
```

**Features:**
- ✅ Optimistic locking with version tracking
- ✅ Configurable timeout (default 5min)
- ✅ Automatic lock expiration
- ✅ Query available (unlocked) nodes
- ✅ Batch cleanup of expired locks

### Parallel Task Execution
Automatically execute independent tasks in parallel based on dependencies:

```typescript
// PM generates plan with dependencies
const tasks = [
  { id: 'task-1', dependencies: [] },
  { id: 'task-2', dependencies: ['task-1'] },
  { id: 'task-3', dependencies: ['task-1'] },  // Runs parallel with task-2
  { id: 'task-4', dependencies: ['task-2', 'task-3'] }
];

await executeChainOutput('chain-output.md');

// Output:
// Batch 1: [task-1]
// Batch 2: [task-2, task-3]  ← Parallel execution!
// Batch 3: [task-4]
```

**Features:**
- ✅ Automatic dependency-based batching
- ✅ Parallel execution within batches (`Promise.all`)
- ✅ Diamond dependency pattern support
- ✅ Circular dependency detection
- ✅ PM can override with explicit parallel groups

**[Full documentation →](docs/PARALLEL_EXECUTION_SUMMARY.md)**

### Testing
- ✅ **123 tests** total across all features
- ✅ **107 product tests** in main suite (`npm test`)
- ✅ **16 benchmark tests** for debugging exercises (`npm run test:benchmark`)
- ✅ Multi-agent locking: 20 integration tests
- ✅ Parallel execution: 18 unit + integration tests
- ✅ Full test isolation with vitest forks

## Available Tools (25 Total)

### 1. `create_todo`
Create a new TODO item with optional metadata.

**Parameters:**
- `title` (required): Brief title of the TODO
- `description` (optional): Detailed description
- `status` (optional): pending | in_progress | completed | blocked | cancelled (default: pending)
- `priority` (optional): low | medium | high | critical (default: medium)
- `context` (optional): Object containing linked context (file paths, URLs, etc.)
- `parentId` (optional): ID of parent TODO if this is a subtask
- `tags` (optional): Array of tags for categorization

**Example:**
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "status": "in_progress",
  "priority": "high",
  "context": {
    "files": ["src/auth/jwt.ts", "src/middleware/auth.ts"],
    "apiEndpoint": "/api/auth/login"
  },
  "tags": ["backend", "security"]
}
```

### 2. `get_todo`
Retrieve a specific TODO item by ID.

**Parameters:**
- `id` (required): The TODO item ID

### 3. `list_todos`
List all TODO items with optional filtering.

**Parameters (all optional):**
- `status`: Filter by status
- `priority`: Filter by priority
- `parentId`: Filter by parent ID (use "null" for top-level items)
- `tags`: Array of tags (returns items matching any tag)

### 4. `update_todo`
Update an existing TODO item.

**Parameters:**
- `id` (required): The TODO item ID
- `title` (optional): New title
- `description` (optional): New description
- `status` (optional): New status
- `priority` (optional): New priority
- `tags` (optional): New tags (replaces existing)

### 5. `delete_todo`
Delete a TODO item.

**Parameters:**
- `id` (required): The TODO item ID to delete

### 6. `add_todo_note`
Add a timestamped note to a TODO item.

**Parameters:**
- `id` (required): The TODO item ID
- `note` (required): The note text

**Example use case:** Document why a task is blocked or record progress observations.

### 7. `update_todo_context`
Update or add context data for a TODO item. Context is merged with existing context.

**Parameters:**
- `id` (required): The TODO item ID
- `context` (required): Object with context data to merge

**Example:**
```json
{
  "id": "todo-1-1234567890",
  "context": {
    "testFile": "tests/auth.test.ts",
    "relatedIssue": "https://github.com/user/repo/issues/42"
  }
}
```

### 8. `clear_all_todos`
Clear all TODO items from memory. **Use with caution!**

**Parameters:**
- `confirm` (required): Must be `true` to confirm deletion

## VS Code Setup Instructions

### Step 1: Build the MCP Server

```bash
cd /Users/timothysweet/src/my-mcp-server
npm run build
```

### Step 2: Configure VS Code Settings

Open your VS Code settings (`settings.json`) and add the MCP server configuration:

**On macOS/Linux:**

```json
{
  "mcpServers": {
    "knowledge-graph-todo": {
      "command": "node",
      "args": ["/Users/timothysweet/src/my-mcp-server/build/index.js"],
      "env": {}
    }
  }
}
```

**On Windows:**

```json
{
  "mcpServers": {
    "knowledge-graph-todo": {
      "command": "node",
      "args": ["C:\\Users\\YourUsername\\src\\my-mcp-server\\build\\index.js"],
      "env": {}
    }
  }
}
```

### Step 3: Configure Your Agent (Optional)

If you're using a custom agent configuration file (like `claudette.chatmode.md`), add the TODO manager tools to the tools list:

```yaml
---
description: Your Agent Description
tools: ['knowledge-graph-todo', 'other-tools', ...]
---
```

### Step 4: Restart VS Code

After adding the configuration, restart VS Code for the changes to take effect.

### Step 5: Verify Installation

In VS Code with an AI assistant (Claude, etc.), try using the TODO tools:

```
"Create a TODO for implementing the login feature"
```

The assistant should be able to use the `create_todo` tool to create a new TODO item.

## Alternative: Using with Cline or Other MCP Clients

### Cline Configuration

If you're using Cline, add the server to your MCP settings file (usually `~/.config/cline/mcp_settings.json` or similar):

```json
{
  "mcpServers": {
    "knowledge-graph-todo": {
      "command": "node",
      "args": ["/Users/timothysweet/src/my-mcp-server/build/index.js"]
    }
  }
}
```

### Claude Desktop Configuration

For Claude Desktop app, edit the configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "knowledge-graph-todo": {
      "command": "node",
      "args": ["/Users/timothysweet/src/my-mcp-server/build/index.js"]
    }
  }
}
```

## Usage Workflow Example

Here's how an LLM agent might use this system:

1. **Start a complex task:**
   ```json
   create_todo({
     "title": "Build user management system",
     "priority": "high",
     "tags": ["feature", "backend"]
   })
   ```

2. **Break it down into subtasks:**
   ```json
   create_todo({
     "title": "Create user model",
     "parentId": "todo-1-...",
     "status": "in_progress",
     "context": {
       "file": "src/models/user.ts"
     }
   })
   ```

3. **Add notes as work progresses:**
   ```json
   add_todo_note({
     "id": "todo-2-...",
     "note": "Decided to use bcrypt for password hashing"
   })
   ```

4. **Update context with relevant files:**
   ```json
   update_todo_context({
     "id": "todo-2-...",
     "context": {
       "testFile": "tests/models/user.test.ts",
       "relatedDocs": "docs/security.md"
     }
   })
   ```

5. **Mark as complete:**
   ```json
   update_todo({
     "id": "todo-2-...",
     "status": "completed"
   })
   ```

6. **Check remaining tasks:**
   ```json
   list_todos({
     "status": "pending"
   })
   ```

## Development

### Building
```bash
npm run build
```

### Development Mode (with auto-rebuild)
```bash
npm run watch
```

### Testing the Server Directly
```bash
npm start
# Server will start on stdio - use MCP inspector or client to interact
```

### Running Integration Tests

See **[TESTING_README.md](TESTING_README.md)** for complete testing guide.

**Quick test:**
```bash
# Use the test prompts with ChatGPT
# Full test suite: TEST_PROMPT.md
# Quick test: TEST_PROMPT_QUICK.md
# Track results: TEST_RESULTS_TEMPLATE.md
```

## Architecture

The server uses:
- **MCP SDK**: For Model Context Protocol implementation
- **TypeScript**: For type safety
- **In-Memory Storage**: TODOs are stored in memory (not persisted between sessions)
- **Stdio Transport**: Communicates via standard input/output

## Limitations

- **No Persistence**: TODO items are lost when the server restarts
- **Single Session**: Each VS Code instance gets its own TODO list
- **Memory Only**: Not suitable for long-term storage

## Development Status

See **[research/](./research/)** for technical details and **[benchmarks/](./benchmarks/)** for performance analysis.


### ✅ Core Features (October 2025)

**Production Ready:**
- ✅ TODO Management with Rich Context
- ✅ Knowledge Graph Integration
- ✅ Context Enrichment & Search
- ✅ Graph-based Memory System
- ✅ Context Verification, Trust, Provenance, and Validation Chain (fully enforced in core logic and tested)
- ✅ **Hierarchical Memory Tiers** - Project/Phase/Task memory hierarchy with automatic decay
- ✅ **Modular Architecture** - Clean separation with 80-test validation suite
- ✅ **Memory Lifecycle Management** - Time-based pruning with configurable retention policies
- ✅ **Adaptive Subgraph Depth** - Intelligent depth calculation with 5-factor heuristics
- ✅ **Context Re-ranking** - 7-factor relevance scoring with query-specific optimization

### 🔨 Recently Completed

**Recently Completed (October 2025):**
- ✅ **Modular Architecture Refactoring** - Clean separation into types/, managers/, tools/, handlers/
- ✅ **Comprehensive API Surface Validation** - 80 tests covering all 17 MCP tools
- ✅ **Hierarchical Memory Architecture** - Complete implementation of tiered memory system
- ✅ **Memory Decay & Pruning** - Automatic context lifecycle management
- ✅ **Adaptive Subgraph Depth** - Dynamic depth based on query complexity with 5-factor heuristics
- ✅ **Context Re-ranking** - Intelligent result ordering with 7-factor relevance scoring

**Active Development:**
- No major features in active development. All core systems are production-ready.

### 🚀 Future: Multi-Agent Graph-RAG Orchestration

**🎯 NEW DIRECTION: Multi-Agent Architecture (v3.0+)**

The next evolution focuses on **agent-scoped context management** with ephemeral worker agents and adversarial validation:

**Phase 1: Multi-Agent Foundation (v3.0)**
- [ ] **PM Agent Pattern**: Long-lived research/planning agent with task graph creation
- [ ] **Ephemeral Worker Agents**: Clean-context execution with automatic termination
- [ ] **Concurrent Access Control**: Optimistic locking with version-based conflict resolution
- [ ] **Task Allocation System**: Atomic task claiming with mutex/lock mechanisms
- [ ] **Agent Context Lifecycle**: Automatic context pruning via process boundaries

**Phase 2: Adversarial Validation (v3.1)**
- [ ] **QC Agent Architecture**: Separate verification agent for worker output validation
- [ ] **Correction Prompt Generation**: Auto-generate feedback while preserving context
- [ ] **Subgraph Verification**: Multi-hop reasoning for requirement validation
- [ ] **Error Propagation Prevention**: Catch hallucinations before graph storage
- [ ] **Audit Trail System**: Complete tracking for compliance and debugging

**Phase 3: Context Deduplication (v3.2)**
- [ ] **Active Deduplication Engine**: Detect and eliminate duplicate context across agents
- [ ] **Context Fingerprinting**: Hash-based duplicate detection system
- [ ] **Smart Context Merging**: Consolidate redundant information automatically
- [ ] **Deduplication Metrics**: Track unique vs. total context ratios

**Phase 4: Scale & Performance (v3.3)**
- [ ] **Distributed Locking**: Scale beyond optimistic locking for high concurrency
- [ ] **Agent Pool Management**: Dynamic worker spawning and lifecycle control
- [ ] **Context Streaming**: Incremental context loading for large graphs
- [ ] **Performance Monitoring**: Agent-specific metrics and observability

### 📋 General Enhancements (Ongoing)

**Infrastructure:**
- [ ] Persistence to file system or database
- [ ] Shared TODO lists across sessions
- [ ] Export/import functionality

**Usability:**
- [ ] Rich text formatting in descriptions
- [ ] Attachments and file references
- [ ] Graph visualization UI

### 📊 Research & Validation

All roadmap items are informed by:
- **Anthropic Contextual Retrieval** - Context enrichment methodology
- **iKala AI Context Engineering** - Graph-RAG and multi-hop reasoning
- **"Lost in the Middle" Research** - Long-context failure modes
- **HippoRAG** - Neurobiologically-inspired memory hierarchies

**[Full research analysis →](docs/research/GRAPH_RAG_RESEARCH.md)**

### 🎯 Success Metrics

**v2.1 Achievements:**
- ✅ 49-67% improvement in retrieval accuracy (measured via search quality)
- ✅ 80%+ improvement in complex query handling (Graph-RAG validation)
- ✅ 90%+ context retention (vs. baseline context stuffing)
- ✅ Zero breaking changes (100% backward compatibility)
- ✅ Trust, provenance, and validation chain invariants fully enforced and tested

**v2.2 Achievements (October 2025):**
- ✅ **Hierarchical Memory System** - Complete 3-tier implementation (hot/warm/cold)
- ✅ **Automatic Memory Decay** - Time-based pruning (24h todo, 7d phase, ∞ project)
- ✅ **Modular Architecture** - Clean separation with 80-test validation suite
- ✅ **API Surface Validation** - Comprehensive testing of all 21 MCP tools
- ✅ **Memory Lifecycle Management** - Configurable retention policies

**v2.3 Achievements (October 2025):**
- ✅ **Adaptive Subgraph Depth** - Intelligent depth calculation with 5-factor heuristics
- ✅ **Context Re-ranking** - 7-factor relevance scoring with query-specific optimization
- ✅ **Advanced Query Features** - Complete implementation of intelligent result ordering
- ✅ **Performance Optimization** - All ranking operations under 50ms for typical graphs
- ✅ **Enhanced MCP Tools** - 4 new ranked variants with 100% backward compatibility

**v2.4 Targets (Current Foundation):**
- 🎯 95%+ trust score for verified context
- 🎯 <10ms overhead for verification checks
- 🎯 Complete audit trail for compliance
- 🎯 Configurable memory retention policies

**v3.0 Targets (Multi-Agent Architecture):**
- 🎯 **Context Deduplication Rate**: >80% deduplication across agent fleet
- 🎯 **Agent Context Lifespan**: <5 minutes for workers, <60 minutes for PM
- 🎯 **Task Allocation Efficiency**: >95% successful task claims (low lock contention)
- 🎯 **Cross-Agent Error Propagation**: <5% error storage rate (QC catches 95%+)
- 🎯 **Subgraph Retrieval Precision**: >90% relevance in PM task graph creation
- 🎯 **PM → Worker Handoff Completeness**: <10% clarification rate
- 🎯 **Worker Retry Rate**: <20% (workers succeed mostly first try)

**v3.3+ Targets (Scale & Performance):**
- 🎯 60% reduction in irrelevant context via deduplication
- 🎯 Support 10+ concurrent worker agents with <1% lock conflicts
- 🎯 Natural memory decay curves matching cognitive science
- 🎯 Automatic tier promotion/demotion based on access patterns
- 🎯 Persistent storage with migration utilities

## License

ISC

## Contributing

Feel free to submit issues or pull requests to improve this MCP server!

