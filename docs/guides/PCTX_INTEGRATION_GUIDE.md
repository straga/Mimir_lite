# PCTX Integration Guide for Mimir

**Status:** ✅ **WORKING** - SSE support implemented  
**Date:** November 21, 2025  
**Version:** 1.0.0

---

## Overview

PCTX is now fully integrated with Mimir, enabling **Code Mode** for AI agents. Instead of sequential tool calls, agents can write TypeScript code that executes in a sandboxed environment, reducing token usage by up to 98%.

---

## Prerequisites

- Mimir running with SSE support (v4.1+)
- PCTX installed: `brew install portofcontext/tap/pctx`
- Docker containers running: `docker compose up -d`

---

## Quick Start

### 1. Configuration

Mimir includes a pre-configured `pctx.json`:

```json
{
  "name": "Mimir",
  "version": "0.1.0",
  "description": "PCTX proxy for Mimir Graph-RAG MCP server",
  "servers": [
    {
      "name": "mimir",
      "url": "http://localhost:9042/mcp"
    }
  ]
}
```

### 2. Start PCTX

```bash
cd /path/to/Mimir
pctx start
```

PCTX will start on `http://localhost:8080/mcp`

### 3. Connect Your AI Agent

Configure your AI agent (Claude, ChatGPT, etc.) to connect to:
```
http://localhost:8080/mcp
```

---

## How It Works

### Traditional MCP (Sequential)

```
Agent: Call vector_search_nodes({query: "auth"})
Server: Returns 10 results → agent context (50K tokens)
Agent: Call memory_node({operation: "get", id: "..."})
Server: Returns node → agent context (5K tokens)
Agent: Call memory_node({operation: "update", ...})
Total: 3 round-trips, 55K tokens
```

### With PCTX Code Mode

```typescript
async function run() {
  // All in one execution block
  const results = await Mimir.vectorSearchNodes({
    query: "authentication",
    types: ["todo"],
    limit: 10
  });
  
  const pending = results.results.filter(r => r.properties.status === "pending");
  
  for (const task of pending.slice(0, 3)) {
    await Mimir.memoryNode({
      operation: "update",
      id: task.id,
      properties: { status: "in_progress" }
    });
  }
  
  return { updated: pending.length };
}
```

**Result:** Single execution, ~2K tokens (96% reduction)

---

## Available Functions

All 13 Mimir tools are available in the `Mimir` namespace:

### Memory Operations
- `Mimir.memoryNode()` - CRUD operations on nodes
- `Mimir.memoryEdge()` - Manage relationships
- `Mimir.memoryBatch()` - Bulk operations
- `Mimir.memoryLock()` - Multi-agent locking
- `Mimir.getTaskContext()` - Agent-scoped context
- `Mimir.memoryClear()` - Clear graph data

### Vector Search
- `Mimir.vectorSearchNodes()` - Semantic search
- `Mimir.getEmbeddingStats()` - Embedding statistics

### File Indexing
- `Mimir.indexFolder()` - Index and watch folder
- `Mimir.removeFolder()` - Stop watching folder
- `Mimir.listFolders()` - List active watchers

### TODO Management
- `Mimir.todo()` - Manage individual todos
- `Mimir.todoList()` - Manage todo lists

---

## Example Workflows

### 1. Complex Task Management

```typescript
async function run() {
  // Find all blocked tasks
  const blocked = await Mimir.memoryNode({
    operation: "query",
    type: "todo",
    filters: { status: "blocked" }
  });
  
  let unblocked = 0;
  
  for (const task of blocked) {
    // Check dependencies
    const deps = await Mimir.memoryEdge({
      operation: "neighbors",
      node_id: task.id,
      edge_type: "depends_on"
    });
    
    // If all dependencies completed, unblock
    const allComplete = deps.every(d => d.properties.status === "completed");
    
    if (allComplete) {
      await Mimir.memoryNode({
        operation: "update",
        id: task.id,
        properties: { status: "ready" }
      });
      unblocked++;
    }
  }
  
  return { 
    checked: blocked.length, 
    unblocked 
  };
}
```

### 2. Semantic Search + Batch Update

```typescript
async function run() {
  // Find related tasks
  const results = await Mimir.vectorSearchNodes({
    query: "API endpoint implementation",
    types: ["todo"],
    limit: 20
  });
  
  // Filter by similarity threshold
  const relevant = results.results.filter(r => r.similarity > 0.8);
  
  // Batch update priorities
  await Mimir.memoryBatch({
    operation: "update_nodes",
    updates: relevant.map(r => ({
      id: r.id,
      properties: { priority: "high", sprint: "current" }
    }))
  });
  
  return { 
    found: results.results.length,
    updated: relevant.length 
  };
}
```

### 3. Knowledge Graph Exploration

```typescript
async function run() {
  // Start from a concept
  const concept = await Mimir.memoryNode({
    operation: "query",
    type: "concept",
    filters: { title: "Authentication" }
  });
  
  if (concept.length === 0) {
    return { error: "Concept not found" };
  }
  
  // Get full subgraph (2 hops)
  const subgraph = await Mimir.memoryEdge({
    operation: "subgraph",
    node_id: concept[0].id,
    depth: 2
  });
  
  // Analyze connections
  const stats = {
    total_nodes: subgraph.nodes.length,
    total_edges: subgraph.edges.length,
    node_types: {}
  };
  
  for (const node of subgraph.nodes) {
    const type = node.properties.type;
    stats.node_types[type] = (stats.node_types[type] || 0) + 1;
  }
  
  return stats;
}
```

---

## PCTX Tools

PCTX exposes 3 tools to AI agents:

### 1. `list_functions`

Discover available functions in the Mimir namespace.

**Usage:** Call this first to see what's available.

### 2. `get_function_details`

Get TypeScript signatures and documentation for specific functions.

**Example:**
```json
{
  "functions": [
    "Mimir.vectorSearchNodes",
    "Mimir.memoryNode"
  ]
}
```

### 3. `execute`

Run TypeScript code that calls Mimir functions.

**Required format:**
```typescript
async function run() {
  // Your code here
  return result;
}
```

---

## Best Practices

### 1. Filter Data in Code

❌ **Bad** - Returns huge response:
```typescript
const results = await Mimir.vectorSearchNodes({query: "auth", limit: 100});
return results; // 50K tokens!
```

✅ **Good** - Process in sandbox:
```typescript
const results = await Mimir.vectorSearchNodes({query: "auth", limit: 100});
const summary = {
  total: results.results.length,
  pending: results.results.filter(r => r.properties.status === "pending").length,
  top_3: results.results.slice(0, 3).map(r => r.properties.title)
};
return summary; // 500 tokens
```

### 2. Use Batch Operations

❌ **Bad** - Multiple round-trips:
```typescript
for (const id of ids) {
  await Mimir.memoryNode({operation: "update", id, properties: {...}});
}
```

✅ **Good** - Single batch call:
```typescript
await Mimir.memoryBatch({
  operation: "update_nodes",
  updates: ids.map(id => ({id, properties: {...}}))
});
```

### 3. Add Console Logs

```typescript
async function run() {
  console.log("Starting search...");
  const results = await Mimir.vectorSearchNodes({...});
  console.log(`Found ${results.results.length} results`);
  
  console.log("Filtering...");
  const filtered = results.results.filter(...);
  console.log(`Filtered to ${filtered.length} items`);
  
  return filtered;
}
```

Logs appear in STDOUT for debugging.

### 4. Error Handling

```typescript
async function run() {
  try {
    const node = await Mimir.memoryNode({
      operation: "get",
      id: "unknown-id"
    });
    return node;
  } catch (error) {
    console.error("Failed to get node:", error.message);
    return { error: error.message };
  }
}
```

---

## Troubleshooting

### PCTX Can't Connect

**Error:** `fail to get common stream: 404 Not Found`

**Solution:** Ensure Mimir is running with SSE support (v4.1+):
```bash
docker compose restart mimir-server
```

### Port Already in Use

**Error:** `Address already in use (os error 48)`

**Solution:** Kill existing PCTX:
```bash
pkill pctx
pctx start
```

### Type Errors

**Error:** `Type 'X' is not assignable to type 'Y'`

**Solution:** Check function signatures with `get_function_details`:
```json
{
  "functions": ["Mimir.memoryNode"]
}
```

### Empty Results

**Issue:** Functions return empty or unexpected data

**Solution:** 
1. Test function directly via Mimir's API first
2. Add console.log() to inspect actual values
3. Check if embeddings are enabled: `Mimir.getEmbeddingStats({})`

---

## Performance

### Token Reduction

| Workflow | Traditional MCP | PCTX Code Mode | Reduction |
|----------|----------------|----------------|-----------|
| Simple search | 5K tokens | 500 tokens | 90% |
| Complex multi-step | 50K tokens | 2K tokens | 96% |
| Batch operations | 100K tokens | 3K tokens | 97% |

### Execution Speed

- **Type checking:** ~50-100ms
- **Sandbox startup:** ~50-100ms  
- **Mimir calls:** Same as direct MCP
- **Total overhead:** ~100-200ms

### Limits

- **Execution timeout:** 10 seconds
- **Network access:** Only to configured MCP servers
- **No filesystem access**
- **No environment variables**

---

## Advanced Configuration

### Custom Port

```bash
pctx start --port 8081
```

### Multiple Upstream Servers

Edit `pctx.json`:
```json
{
  "servers": [
    {
      "name": "mimir",
      "url": "http://localhost:9042/mcp"
    },
    {
      "name": "github",
      "url": "https://mcp.github.com",
      "auth": {
        "type": "bearer",
        "token": "${env:GITHUB_TOKEN}"
      }
    }
  ]
}
```

Then use both in code:
```typescript
async function run() {
  // Search Mimir
  const tasks = await Mimir.vectorSearchNodes({...});
  
  // Create GitHub issues
  for (const task of tasks.results) {
    await Github.createIssue({
      title: task.properties.title,
      body: task.properties.description
    });
  }
}
```

### Logging

Edit `pctx.json`:
```json
{
  "logger": {
    "level": "debug",
    "format": "pretty"
  }
}
```

---

## Security

### Sandbox Restrictions

- ✅ No filesystem access
- ✅ No environment variable access
- ✅ Network restricted to configured hosts
- ✅ 10-second execution timeout
- ✅ No system calls

### Authentication

PCTX handles authentication - AI never sees credentials:
```json
{
  "servers": [
    {
      "name": "mimir",
      "url": "http://localhost:9042/mcp",
      "auth": {
        "type": "bearer",
        "token": "${env:MIMIR_API_KEY}"
      }
    }
  ]
}
```

---

## See Also

- [PCTX Integration Analysis](../research/PCTX_INTEGRATION_ANALYSIS.md) - Full analysis and rationale
- [Nodes API Reference](./NODES_API_REFERENCE.md) - Direct API access
- [RRF Configuration Guide](./RRF_CONFIGURATION_GUIDE.md) - Search configuration
- [PCTX Documentation](https://github.com/portofcontext/pctx) - Official PCTX docs

---

## Summary

**PCTX + Mimir = Powerful Combination**

- ✅ 90-98% token reduction
- ✅ 2-5x faster execution
- ✅ Type-safe TypeScript
- ✅ Full access to all 13 Mimir tools
- ✅ Secure sandboxed execution
- ✅ Multi-server workflows

**Next Steps:**
1. Start PCTX: `pctx start`
2. Connect your AI agent to `http://localhost:8080/mcp`
3. Start writing code-mode workflows!
