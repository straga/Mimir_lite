# Mimir Lite

Lightweight fork of Mimir MCP server. Only essential features: memory, vector search, file indexing.

## What's Removed (vs full Mimir)

- **Orchestration** - PM/Worker/QC agents, workflow execution, agentinator
- **LLM Integration** - chat completions, model selection, LLMConfigLoader
- **Auth/RBAC** - JWT, permissions, api-keys
- **Frontend** - React UI
- **NornicDB support** - only Neo4j
- **VL/Image processing** - no vision-language model, no image embeddings

## What's Kept

12 MCP tools:
- `memory_node` - CRUD for graph nodes
- `memory_edge` - relationships between nodes
- `memory_batch` - bulk operations
- `memory_lock` - multi-agent locking
- `memory_clear` - clear graph data
- `index_folder` - index files with embeddings
- `remove_folder` - stop watching folder
- `list_folders` - list watched folders
- `vector_search_nodes` - semantic search
- `get_embedding_stats` - embedding statistics
- `todo` - task management
- `todo_list` - task lists

## Performance Optimizations

| Optimization | Before | After | Speedup |
|--------------|--------|-------|---------|
| Two-phase indexing | sequential scan | Phase 1: parallel fast-skip (50), Phase 2: parallel index (3) | ~50x on restart |
| Batch embeddings (`/api/embed`) | 5 chunks × 80ms = 400ms | 1 batch × 60ms | ~7x |
| Removed 50ms delay | 5 × 50ms = 250ms | 0ms | +250ms/file |
| Fast path (size+mtime check) | read file + Neo4j | stat + Neo4j | ~10x |
| Content hash | mtime (unreliable) | SHA256 | no false reindex |
| Smart ignore | index junk | skip caches | fewer files |

**Total speedup:** ~50x on restart (41000 files in ~10 seconds), ~20-30x for new indexing

## Deployment Options

### Option 1: Docker (Ubuntu server)

Full stack in Docker - best for remote servers.

See [docker/README.md](docker/README.md)

### Option 2: macOS Service (launchd)

Run as background service on Mac with Neo4j in Docker.

See [macos/README.md](macos/README.md)

### Option 3: Manual

```bash
# 1. Start Neo4j
cd docker && docker compose -f docker-compose.neo4j.yml up -d

# 2. Build and run
bun install && bun run build
cp .env.example .env  # configure
bun run build/http-server.js
```

## Configuration

Environment variables (`.env` or docker-compose):

```bash
# Embeddings
MIMIR_EMBEDDINGS_PROVIDER=ollama
MIMIR_EMBEDDINGS_API=http://localhost:11434
MIMIR_EMBEDDINGS_MODEL=mxbai-embed-large
MIMIR_EMBEDDINGS_DIMENSIONS=1024
MIMIR_EMBEDDINGS_ENABLED=true
MIMIR_EMBEDDINGS_CHUNK_SIZE=768  # Characters per chunk (reduce if "input too large" errors)

# Performance
MIMIR_SCAN_CONCURRENCY=50    # Parallel fast-skip checks (stat + Neo4j SELECT)
MIMIR_INDEX_CONCURRENCY=3    # Parallel file indexing (limited by Ollama)

# Search
MIMIR_MIN_SIMILARITY=0.5  # cosine similarity threshold (0.0-1.0)

# Exclusions
MIMIR_SENSITIVE_FILES=*.po,*.pot,*.lock,*.log

# Document parsing
MIMIR_DISABLE_PDF=true  # Disable PDF parsing (for old CPUs without AVX)
```

## Claude Code MCP Config

```json
{
  "mcpServers": {
    "mimir_local": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Path Mapping (remote server)

When server paths differ from client paths, use `X-Mimir-Path-Map` header.

**Format:** JSON array as string: `["server_path=client_path", ...]`

```json
{
  "mcpServers": {
    "mimir_server": {
      "type": "http",
      "url": "http://192.168.1.100:3000/mcp",
      "headers": {
        "X-Mimir-Path-Map": "[\"/workspace/project=/home/user/project\"]"
      }
    }
  }
}
```

Multiple mappings:
```json
"X-Mimir-Path-Map": "[\"/workspace/src=/home/user/src\", \"/workspace/docs=/home/user/docs\"]"
```

## Adding Folders to Index

Via MCP tool:
```
index_folder(path="/home/user/my-project", generate_embeddings=true)
```

Via REST API:
```bash
curl -X POST http://localhost:3000/api/index-folder \
  -H "Content-Type: application/json" \
  -d '{"path": "/home/user/my-project", "generate_embeddings": true}'
```

## Troubleshooting

### "input is too large to process" errors

If you see this error during indexing, the embedding server needs larger batch size.

**For llama.cpp (llama-server):**
```bash
llama-server -m bge-m3.gguf --embeddings -b 8192 -ub 8192
```

Add `-b 8192 -ub 8192` to increase batch size.

**Alternative:** Reduce chunk size in mimir:
```bash
MIMIR_EMBEDDINGS_CHUNK_SIZE=512  # Default: 768
```

## Known Limitations

- **SynologyDrive/Dropbox/network mounts**: File watcher may not detect changes (use local folders)
- **Docker on macOS**: No filesystem events (use hybrid setup or macos service)

## Architecture

```
MCP Server (HTTP :3000)
    |
    +-- 12 MCP Tools
    |
    +-- GraphManager (Neo4j CRUD, embeddings)
    |
    +-- FileWatchManager (chokidar, parallel indexing)
    |
    +-- EmbeddingsService (Ollama batch API)
            |
            +-- Neo4j (graph + vector index)
            |
            +-- Ollama (mxbai-embed-large)
```

## Files Structure

```
mimir-lite/
├── docker/               # Docker deployment
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md
├── macos/                # macOS launchd service
│   ├── install.sh
│   └── README.md
├── src/
│   ├── index.ts              # MCP server entry (stdio)
│   ├── http-server.ts        # Express HTTP server
│   ├── config/
│   ├── managers/
│   ├── indexing/
│   ├── tools/
│   └── api/
└── build/                # Compiled JS
```
