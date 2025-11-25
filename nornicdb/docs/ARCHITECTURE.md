# NornicDB Architecture

## Overview

NornicDB is a **drop-in replacement for Neo4j** designed for LLM agent memory systems. It maintains full compatibility with Mimir's existing API while providing potential performance improvements through GPU acceleration.

## Design Philosophy

**Keep it simple - verify the concept first, then enhance.**

NornicDB does NOT:
- Generate embeddings (Mimir handles this via Ollama/OpenAI)
- Read source files (Mimir handles file indexing)
- Require any changes to Mimir's API calls

NornicDB DOES:
- Receive pre-embedded nodes from Mimir
- Store nodes and relationships
- Provide vector similarity search using existing embeddings
- Provide BM25 full-text search
- Offer GPU acceleration for vector operations (future)

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                              MIMIR                                   │
│                                                                      │
│  ┌──────────────┐    ┌─────────────────┐    ┌───────────────────┐  │
│  │ File Indexer │───►│ Embedding Service│───►│ Graph Operations  │  │
│  │              │    │ (Ollama/OpenAI)  │    │                   │  │
│  │ • Discovery  │    │                  │    │ • CreateNode      │  │
│  │ • .gitignore │    │ • Generate       │    │ • CreateEdge      │  │
│  │ • Filtering  │    │   embeddings     │    │ • Search          │  │
│  │ • Reading    │    │ • 1024 dims      │    │ • Query           │  │
│  └──────────────┘    └─────────────────┘    └─────────┬─────────┘  │
│                                                        │            │
└────────────────────────────────────────────────────────┼────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            NORNICDB                                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Bolt Protocol (Port 7687)                   │ │
│  │                     HTTP API (Port 7474)                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                               │                                      │
│                               ▼                                      │
│  ┌───────────────┐   ┌────────────────┐   ┌─────────────────────┐  │
│  │  Storage      │   │ Search Service │   │ Cypher Executor     │  │
│  │               │   │                │   │                     │  │
│  │ • Nodes       │◄──│ • Vector Index │   │ • Parse queries     │  │
│  │ • Edges       │   │ • BM25 Index   │   │ • Execute against   │  │
│  │ • Embeddings  │   │ • RRF Fusion   │   │   storage           │  │
│  │ • Properties  │   │                │   │                     │  │
│  └───────────────┘   └────────────────┘   └─────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## API Compatibility

### Mimir → NornicDB (Same as Mimir → Neo4j)

| Operation | Protocol | Port | Compatible |
|-----------|----------|------|------------|
| Cypher queries | Bolt | 7687 | ✅ |
| HTTP/REST | HTTP | 7474 | ✅ |
| Authentication | Basic Auth | Both | ✅ |
| Vector search | Cypher | 7687 | ✅ |
| Full-text search | Cypher | 7687 | ✅ |

### Search Methods

```go
// Full-text search only (BM25)
Search(ctx, query, labels, limit) -> []SearchResult

// Hybrid search (Vector + BM25 with RRF)
// queryEmbedding from Mimir's embedding service
HybridSearch(ctx, query, queryEmbedding, labels, limit) -> []SearchResult
```

## Search Implementation

### Full-Text (BM25)
- Properties indexed: `content`, `text`, `title`, `name`, `description`, `path`, `workerRole`, `requirements`
- Tokenization: Lowercase, split on non-alphanumeric
- Prefix matching: "search" matches "searchable"
- Stop words filtered

### Vector Search
- Cosine similarity
- Uses pre-computed embeddings from Mimir
- Currently brute-force (HNSW planned)

### RRF Hybrid Search
- Combines BM25 and vector rankings
- `RRF_score = Σ 1/(k + rank)`
- Adaptive weights based on query length
- Falls back to text-only if no embedding provided

## Configuration

```yaml
# nornicdb.example.yaml
server:
  bolt_port: 7687
  http_port: 7474
  data_dir: ./data
  auth: "neo4j:password"

search:
  rrf:
    k: 60
    vector_weight: 0.6
    bm25_weight: 0.4
    adaptive: true
  fulltext_properties:
    - content
    - text
    - title
    - name
    - description
    - path
    - workerRole
    - requirements
```

## Future Enhancements

1. **GPU Acceleration** (Phase 2)
   - Metal for Apple Silicon
   - CUDA for NVIDIA
   - OpenCL for AMD

2. **HNSW Index** (Phase 2)
   - O(log n) vector search
   - Currently O(n) brute-force

3. **Memory Decay** (Phase 3)
   - Episodic, Semantic, Procedural tiers
   - Configurable decay rates

4. **Auto-Relationships** (Phase 3)
   - Automatic edge creation based on similarity
   - Co-access patterns
   - Temporal proximity

## Testing

```bash
# Run all tests
cd nornicdb && go test ./... -count=1

# Run with verbose output
go test ./... -v

# Run specific package
go test ./pkg/search/... -v

# Benchmark
go test ./pkg/search/... -bench=.
```

## Usage with Mimir Export

```bash
# 1. Export from Neo4j
node scripts/export-neo4j-to-json.mjs

# 2. Start NornicDB with exported data
./nornicdb serve --load-export=./data/nornicdb

# 3. Or import separately
./nornicdb import --data-dir=./data/nornicdb
```

## Files Structure

```
nornicdb/
├── cmd/nornicdb/          # CLI entry point
├── pkg/
│   ├── nornicdb/          # Main DB API
│   ├── storage/           # Node/Edge storage
│   ├── search/            # Vector + BM25 search
│   ├── bolt/              # Bolt protocol server
│   ├── server/            # HTTP server
│   ├── cypher/            # Query parser/executor
│   ├── auth/              # Authentication
│   └── ...
├── data/                  # Persistence directory
└── nornicdb.example.yaml  # Configuration template
```
