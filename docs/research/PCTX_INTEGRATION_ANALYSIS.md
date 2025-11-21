# PCTX Integration Analysis for Mimir

**Date:** November 21, 2025  
**Analyzed Repository:** https://github.com/portofcontext/pctx  
**Status:** Research & Recommendation

---

## Executive Summary

**PCTX** is an MCP proxy server that enables "Code Mode" - allowing AI agents to write TypeScript code that executes in a sandboxed environment instead of sequential tool calls. It aggregates multiple upstream MCP servers into a single interface.

**Recommendation:** **COMPLEMENTARY - High Value Integration Opportunity**

PCTX and Mimir serve different but complementary purposes. Integration would significantly enhance both systems.

---

## What is PCTX?

### Core Concept: Code Mode

Instead of this (traditional MCP):
```
Agent: Call getSheet(id)
Server: Returns 1000 rows → agent context (150K tokens)
Agent: Call filterRows(criteria)  
Server: Returns 50 rows → agent context
```

PCTX enables this:
```typescript
const sheet = await gdrive.getSheet({ sheetId: "abc" });
const orders = sheet.filter(row => row.status === "pending");
console.log(`Found ${orders.length} orders`);
```

**Result:** 98.7% token reduction (150K → 2K tokens)

### Architecture

```
AI Agent (Claude, ChatGPT, etc.)
    ↓ MCP Protocol
PCTX (Rust + Deno Sandbox)
    ├─ TypeScript Type Checker
    ├─ Sandboxed Execution (Deno)
    └─ MCP Client Connections
        ├→ Google Drive MCP
        ├→ Slack MCP  
        ├→ GitHub MCP
        └→ Mimir MCP ← Integration Point!
```

### Key Features

1. **Code Mode Interface**
   - AI writes TypeScript instead of sequential tool calls
   - Type checking before execution (<100ms feedback)
   - Sandboxed execution (10s timeout, no filesystem/env access)

2. **MCP Server Aggregation**
   - Single endpoint for multiple MCP servers
   - Each server becomes a TypeScript namespace
   - Unified authentication management

3. **Security**
   - Deno sandbox with strict permissions
   - No network access except configured hosts
   - Pre-authenticated MCP clients (AI never sees credentials)

4. **Three MCP Tools**
   - `list_functions()` - Discover available functions
   - `get_function_details([...])` - Get TypeScript signatures
   - `execute({ code })` - Run TypeScript with type checking

---

## Mimir's Current MCP Capabilities

Mimir is already an MCP server with 13 tools:

### Graph Memory Tools (6)
- `memory_node` - CRUD operations on knowledge nodes
- `memory_edge` - Create/query relationships
- `memory_batch` - Bulk operations
- `memory_lock` - Multi-agent coordination
- `get_task_context` - Agent-scoped context
- `memory_clear` - Clear graph data

### Vector Search Tools (2)
- `vector_search_nodes` - Semantic search across all nodes
- `get_embedding_stats` - Embedding statistics

### File Indexing Tools (3)
- `index_folder` - Index codebase with auto-watch
- `remove_folder` - Stop watching folder
- `list_folders` - List active watchers

### TODO Management Tools (2)
- `todo` - Task CRUD operations
- `todo_list` - List management

---

## Integration Opportunities

### Option 1: Mimir as Upstream MCP Server (RECOMMENDED)

**Implementation:** Add Mimir to PCTX's upstream servers

**Configuration:**
```json
{
  "name": "mimir-proxy",
  "version": "1.0.0",
  "servers": [
    {
      "name": "mimir",
      "url": "http://localhost:3000/mcp",
      "auth": {
        "type": "bearer",
        "token": "${env:MIMIR_API_KEY}"
      }
    },
    {
      "name": "github",
      "url": "https://mcp.github.com"
    },
    {
      "name": "slack",
      "url": "https://mcp.slack.com"
    }
  ]
}
```

**Usage in AI Agents:**
```typescript
// Traditional: Sequential tool calls (high token usage)
// 1. Search for related tasks
// 2. Get task details
// 3. Update each task
// 4. Create new relationships

// With PCTX Code Mode: Single execution block
const relatedTasks = await mimir.vector_search_nodes({
  query: "authentication implementation",
  types: ["todo"],
  limit: 10
});

const pendingTasks = relatedTasks.results
  .filter(t => t.properties.status === "pending")
  .sort((a, b) => b.similarity - a.similarity);

for (const task of pendingTasks.slice(0, 3)) {
  await mimir.memory_node({
    operation: "update",
    id: task.id,
    properties: {
      status: "in_progress",
      assigned_to: "current_agent"
    }
  });
}

console.log(`Updated ${pendingTasks.length} related tasks`);
```

**Benefits:**
- ✅ **98% token reduction** for complex Mimir operations
- ✅ **Faster execution** - process results in sandbox, not through LLM context
- ✅ **Type safety** - Catch errors before execution
- ✅ **Multi-server workflows** - Combine Mimir with GitHub, Slack, etc.
- ✅ **Better error handling** - Try/catch, loops, conditionals in code
- ✅ **No Mimir code changes** - Works with existing MCP interface

**Example Multi-Server Workflow:**
```typescript
// Find related tasks in Mimir
const tasks = await mimir.vector_search_nodes({
  query: "API endpoint implementation",
  types: ["todo"]
});

// Create GitHub issues for each
for (const task of tasks.results.slice(0, 5)) {
  const issue = await github.createIssue({
    title: task.properties.title,
    body: task.properties.description,
    labels: ["from-mimir"]
  });
  
  // Link back in Mimir
  await mimir.memory_edge({
    operation: "add",
    source: task.id,
    target: `github-issue-${issue.number}`,
    type: "references"
  });
  
  // Notify team
  await slack.sendMessage({
    channel: "#dev",
    text: `Created issue #${issue.number} for task: ${task.properties.title}`
  });
}
```

---

### Option 2: PCTX-Style Code Mode in Mimir (NOT RECOMMENDED)

**Implementation:** Add code execution capabilities directly to Mimir

**Why NOT Recommended:**
- ❌ **Redundant** - PCTX already does this excellently
- ❌ **Scope creep** - Mimir's focus is graph memory, not code execution
- ❌ **Maintenance burden** - Rust + Deno sandbox is complex
- ❌ **Security concerns** - Sandboxing is hard to get right
- ❌ **Reinventing the wheel** - PCTX is battle-tested

**Better Approach:** Use PCTX as designed (Option 1)

---

### Option 3: Hybrid - Mimir-Specific Code Mode Tools

**Implementation:** Add a few high-level "code mode" tools to Mimir that internally use batching

**Example:**
```typescript
// New Mimir tool: execute_graph_query
{
  "operation": "execute_graph_query",
  "code": `
    const tasks = await searchNodes({ query: "auth", type: "todo" });
    return tasks.filter(t => t.status === "pending").length;
  `
}
```

**Pros:**
- ✅ Simpler than full PCTX integration
- ✅ Optimized for Mimir-specific workflows

**Cons:**
- ❌ Limited to Mimir operations only
- ❌ Can't combine with other services
- ❌ Still requires sandboxing implementation
- ❌ Doesn't solve the multi-server aggregation problem

**Verdict:** Only useful if PCTX integration is not feasible

---

## Redundancy Analysis

### What PCTX Provides That Mimir Doesn't

1. **Code Mode Interface** - Execute TypeScript instead of sequential calls
2. **Multi-Server Aggregation** - Single endpoint for multiple MCP servers
3. **Type Checking** - Instant feedback before execution
4. **Sandboxed Execution** - Secure code execution environment
5. **Token Optimization** - 98% reduction for complex workflows

### What Mimir Provides That PCTX Doesn't

1. **Graph Database** - Neo4j-powered knowledge graph
2. **Vector Search** - Semantic search with embeddings
3. **File Indexing** - Automatic codebase indexing with RAG
4. **Task Orchestration** - Multi-agent coordination
5. **Persistent Memory** - Long-term context storage
6. **Relationship Tracking** - Automatic relationship discovery

### Overlap

**Minimal** - They operate at different layers:
- **PCTX:** Execution layer (how AI interacts with tools)
- **Mimir:** Data layer (what AI remembers and retrieves)

---

## Implementation Roadmap

### Phase 1: Basic Integration (1-2 hours)

1. **Configure PCTX**
   ```bash
   cd ~/src/pctx
   cargo build --release
   pctx init
   pctx add mimir http://localhost:9042/mcp
   pctx dev
   ```

2. **Test Integration**
   - Connect Claude/ChatGPT to PCTX
   - Verify Mimir tools are accessible
   - Test simple operations

3. **Document Usage**
   - Create examples for common workflows
   - Update Mimir docs with PCTX integration guide

### Phase 2: Optimization (1 week)

1. **Create PCTX Presets**
   - Common Mimir + GitHub workflows
   - Mimir + Slack notification patterns
   - Multi-agent coordination templates

2. **Performance Testing**
   - Measure token reduction
   - Benchmark execution speed
   - Identify bottlenecks

3. **Security Hardening**
   - Configure network restrictions
   - Set up authentication
   - Test sandbox isolation

### Phase 3: Advanced Features (2-4 weeks)

1. **Custom Type Definitions**
   - Generate TypeScript types from Mimir's schema
   - Provide autocomplete for Mimir operations
   - Better error messages

2. **Workflow Templates**
   - Pre-built code snippets for common tasks
   - Integration with Mimir's orchestration system
   - Multi-agent coordination patterns

3. **Monitoring & Telemetry**
   - Track PCTX execution metrics
   - Monitor Mimir query performance
   - Optimize based on usage patterns

---

## Use Cases Enabled by Integration

### 1. Complex Task Management
```typescript
// Find all blocked tasks, update dependencies, notify team
const blocked = await mimir.memory_node({
  operation: "query",
  type: "todo",
  filters: { status: "blocked" }
});

for (const task of blocked) {
  const deps = await mimir.memory_edge({
    operation: "neighbors",
    node_id: task.id,
    edge_type: "depends_on"
  });
  
  const completedDeps = deps.filter(d => d.status === "completed");
  
  if (completedDeps.length === deps.length) {
    await mimir.memory_node({
      operation: "update",
      id: task.id,
      properties: { status: "ready" }
    });
    
    await slack.sendMessage({
      channel: "#dev",
      text: `Task unblocked: ${task.title}`
    });
  }
}
```

### 2. Intelligent Code Review
```typescript
// Find related documentation, create review checklist
const pr = await github.getPullRequest({ number: 123 });
const relatedDocs = await mimir.vector_search_nodes({
  query: pr.title + " " + pr.description,
  types: ["file"],
  limit: 5
});

const checklist = relatedDocs.results.map(doc => ({
  item: `Review against: ${doc.properties.path}`,
  link: doc.properties.url
}));

await github.addComment({
  issue_number: 123,
  body: "## Review Checklist\n" + checklist.map(c => `- [ ] ${c.item}`).join("\n")
});
```

### 3. Knowledge Graph Building
```typescript
// Index new files, extract concepts, create relationships
const newFiles = await github.getCommitFiles({ sha: "abc123" });

for (const file of newFiles) {
  const content = await github.getFileContent({ path: file.path });
  
  // Index in Mimir
  await mimir.index_folder({
    path: `/repo/${file.path}`,
    generate_embeddings: true
  });
  
  // Find related concepts
  const concepts = await mimir.vector_search_nodes({
    query: content.substring(0, 500),
    types: ["concept"],
    limit: 3
  });
  
  // Create relationships
  for (const concept of concepts.results) {
    await mimir.memory_edge({
      operation: "add",
      source: `file-${file.path}`,
      target: concept.id,
      type: "implements"
    });
  }
}
```

---

## Technical Considerations

### Performance

**Expected Improvements:**
- **Token usage:** 90-98% reduction for complex operations
- **Execution speed:** 2-5x faster (no LLM round-trips)
- **Cost:** Proportional to token reduction

**Potential Bottlenecks:**
- Network latency between PCTX and Mimir
- Deno sandbox startup time (~50-100ms)
- Type checking overhead (~50-100ms)

**Mitigation:**
- Run PCTX and Mimir on same machine/network
- Use connection pooling
- Cache type definitions

### Security

**PCTX Sandbox:**
- ✅ No filesystem access
- ✅ No environment variable access
- ✅ Network restricted to configured hosts
- ✅ 10-second execution timeout
- ✅ Pre-authenticated MCP clients

**Mimir Security:**
- ✅ Already has authentication (bearer tokens)
- ✅ Rate limiting configured
- ✅ Input validation on all endpoints

**Integration Security:**
- ✅ PCTX handles auth, AI never sees credentials
- ✅ Sandbox prevents malicious code execution
- ✅ Network isolation between services

### Scalability

**PCTX:**
- Rust-based (high performance)
- Stateless (easy to scale horizontally)
- Deno isolates are lightweight

**Mimir:**
- Already handles concurrent requests
- Neo4j scales well
- Vector search is optimized

**Combined:**
- No architectural conflicts
- Can scale independently
- Shared nothing architecture

---

## Comparison to Alternatives

### vs. Direct MCP Integration

| Aspect | Direct MCP | PCTX + MCP |
|--------|-----------|------------|
| Token Usage | High (sequential) | Low (code mode) |
| Execution Speed | Slow (many round-trips) | Fast (single execution) |
| Error Handling | Limited | Full try/catch |
| Multi-Server | Complex | Native |
| Type Safety | None | TypeScript |
| Learning Curve | Low | Medium |

### vs. Custom Code Execution in Mimir

| Aspect | Custom Implementation | PCTX Integration |
|--------|----------------------|------------------|
| Development Time | 4-8 weeks | 1-2 hours |
| Maintenance | High | Low (upstream) |
| Security | DIY | Battle-tested |
| Multi-Server | Need to build | Included |
| Type Checking | Need to build | Included |
| Community Support | None | Growing |

---

## Risks & Mitigations

### Risk 1: PCTX Maturity
**Risk:** PCTX is relatively new (early stage)  
**Mitigation:** 
- Keep direct MCP as fallback
- Monitor PCTX development
- Contribute fixes upstream

### Risk 2: Added Complexity
**Risk:** Another service to manage  
**Mitigation:**
- Optional integration (not required)
- Document clearly
- Provide docker-compose setup

### Risk 3: Performance Overhead
**Risk:** Extra hop through PCTX  
**Mitigation:**
- Run on same machine/network
- Benchmark and optimize
- Use for complex operations only

### Risk 4: Breaking Changes
**Risk:** PCTX API changes  
**Mitigation:**
- Pin PCTX version
- Test before upgrades
- Maintain compatibility layer

---

## Recommendations

### ✅ DO: Option 1 - Mimir as Upstream MCP Server

**Why:**
- Minimal effort (1-2 hours)
- Maximum benefit (98% token reduction)
- No Mimir code changes
- Enables powerful multi-server workflows
- Complementary, not redundant

**Implementation Steps:**
1. Add PCTX to Mimir's docker-compose
2. Create pctx.json configuration
3. Document integration in Mimir docs
4. Provide example workflows
5. Update IDE integration guides

### ❌ DON'T: Option 2 - Build Code Mode in Mimir

**Why:**
- Reinventing the wheel
- Significant development time
- Ongoing maintenance burden
- PCTX already does this well

### 🤔 MAYBE: Option 3 - Hybrid Approach

**Only if:**
- PCTX integration proves problematic
- Need Mimir-specific optimizations
- Want tighter integration

**But first try Option 1**

---

## Next Steps

1. **Immediate (Today)**
   - Install PCTX: `brew install portofcontext/tap/pctx`
   - Test basic integration
   - Create proof-of-concept workflow

2. **Short-term (This Week)**
   - Add PCTX to docker-compose
   - Create configuration template
   - Write integration guide
   - Test with Claude/ChatGPT

3. **Medium-term (This Month)**
   - Create workflow templates
   - Performance benchmarking
   - Security audit
   - Community feedback

4. **Long-term (Next Quarter)**
   - Advanced features (custom types, etc.)
   - Monitoring & telemetry
   - Case studies & examples
   - Contribute to PCTX upstream

---

## Conclusion

**PCTX is a HIGHLY VALUABLE complement to Mimir**, not a replacement or redundant system.

**Key Insights:**
- **Different layers:** PCTX = execution, Mimir = data
- **Multiplicative value:** Together they're more powerful than separate
- **Low effort, high reward:** 1-2 hours for 98% token reduction
- **Future-proof:** Code mode is the future of AI-tool interaction

**Recommendation:** **Proceed with Option 1 integration immediately.**

The combination of Mimir's graph memory + PCTX's code mode execution creates a uniquely powerful system for AI agents that can:
- Remember everything (Mimir)
- Process efficiently (PCTX)
- Coordinate across services (both)
- Scale to complex workflows (both)

This is a **no-brainer integration** that significantly enhances Mimir's capabilities with minimal effort.
