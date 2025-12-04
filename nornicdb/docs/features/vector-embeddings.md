# Vector Embeddings

**Automatic embedding generation for semantic search.**

## Overview

NornicDB automatically generates vector embeddings for nodes, enabling:
- Semantic similarity search
- Hybrid search (vector + text)
- Automatic relationship inference
- Clustering and categorization

## Embedding Providers

| Provider | Latency | Cost | Quality |
|----------|---------|------|---------|
| Ollama (local) | 50-100ms | Free | High |
| OpenAI | 100-200ms | $$$ | Highest |
| Local GGUF | 30-80ms | Free | High |

## Configuration

### Ollama (Recommended)

```bash
# Start Ollama
ollama serve

# Pull embedding model
ollama pull mxbai-embed-large

# Configure NornicDB
export NORNICDB_EMBEDDING_URL=http://localhost:11434
export NORNICDB_EMBEDDING_MODEL=mxbai-embed-large
```

### OpenAI

```bash
export NORNICDB_EMBEDDING_PROVIDER=openai
export NORNICDB_EMBEDDING_API_KEY=sk-...
export NORNICDB_EMBEDDING_MODEL=text-embedding-3-small
```

### Local GGUF

```bash
export NORNICDB_EMBEDDING_PROVIDER=local
export NORNICDB_EMBEDDING_MODEL_PATH=/models/mxbai-embed-large.gguf
export NORNICDB_EMBEDDING_GPU_LAYERS=-1  # Auto-detect
```

## Automatic Embedding

### On Node Creation

When a node is created, embeddings are generated automatically:

```go
node, err := db.CreateNode(ctx, []string{"Document"}, map[string]any{
    "title":   "Machine Learning Basics",
    "content": "An introduction to ML concepts...",
})
// Embedding is generated asynchronously
```

### On Memory Storage

```go
memory := &Memory{
    Content: "User prefers dark mode for coding",
    Title:   "Preference",
}
stored, err := db.Store(ctx, memory)
// Embedding is generated from content + title
```

## Embedding Queue

Embeddings are processed asynchronously for performance:

```go
// Check queue status
status, _ := db.EmbeddingQueueStatus(ctx)
fmt.Printf("Pending: %d\n", status.Pending)
fmt.Printf("Processing: %d\n", status.Processing)
```

### Monitor Queue

```bash
curl http://localhost:7474/status | jq .embeddings
```

```json
{
  "enabled": true,
  "provider": "ollama",
  "model": "mxbai-embed-large",
  "pending": 42,
  "processed_total": 15234,
  "errors": 0
}
```

### Trigger Regeneration

```bash
# Regenerate all embeddings
curl -X POST http://localhost:7474/nornicdb/embed/trigger?regenerate=true \
  -H "Authorization: Bearer $TOKEN"
```

## Manual Embedding

### Embed Query

```go
// Generate embedding for search query
embedding, err := db.EmbedQuery(ctx, "What are the ML basics?")
if err != nil {
    return err
}

// Use for vector search
results, err := db.HybridSearch(ctx, "", embedding, nil, 10)
```

### Pre-computed Embeddings

```go
// Store with pre-computed embedding
memory := &Memory{
    Content:   "Important information",
    Embedding: precomputedVector, // []float32
}
db.Store(ctx, memory)
```

## Embedding Dimensions

| Model | Dimensions | Memory/Vector |
|-------|------------|---------------|
| mxbai-embed-large | 1024 | 4KB |
| text-embedding-3-small | 1536 | 6KB |
| text-embedding-3-large | 3072 | 12KB |

### Configuration

```bash
export NORNICDB_EMBEDDING_DIMENSIONS=1024
```

## Caching

### Embedding Cache

```bash
# Cache 10,000 embeddings in memory
export NORNICDB_EMBEDDING_CACHE_SIZE=10000
```

### Cache Behavior

- Identical text returns cached embedding
- Cache is LRU (Least Recently Used)
- Cache is not persisted across restarts

## Search with Embeddings

### Vector Search

```go
// Pure vector similarity search
results, err := db.FindSimilar(ctx, nodeID, 10)
```

### Hybrid Search

```go
// Combine vector + text search
results, err := db.HybridSearch(ctx, 
    "machine learning",    // Text query
    queryEmbedding,        // Vector query
    []string{"Document"},  // Labels
    10,                    // Limit
)
```

### RRF Fusion

Results are combined using Reciprocal Rank Fusion:

```
RRF_score = Σ 1/(k + rank_i)
```

Where `k` is typically 60.

## Indexing

### HNSW Index

Embeddings are indexed using HNSW for O(log N) search:

```go
// Index is built automatically
// Parameters are tuned for quality/speed balance
// M: 16 (connections per node)
// efConstruction: 200 (build-time accuracy)
// efSearch: 50 (query-time accuracy)
```

### Rebuild Index

```bash
curl -X POST http://localhost:7474/admin/rebuild-index \
  -H "Authorization: Bearer $TOKEN"
```

## Best Practices

### Content Preparation

```go
// Good: Combine relevant fields
content := fmt.Sprintf("%s\n%s", title, description)
memory := &Memory{Content: content}

// Bad: Too little context
memory := &Memory{Content: "yes"}
```

### Batch Processing

```go
// Process in batches for efficiency
for batch := range batches(nodes, 100) {
    db.CreateNodes(ctx, batch)
    // Wait for embeddings
    time.Sleep(time.Second)
}
```

### Monitor Quality

```go
// Check embedding coverage
result, _ := db.ExecuteCypher(ctx, `
    MATCH (n)
    WHERE n.embedding IS NOT NULL
    RETURN count(n) as with_embedding
`, nil)
```

## Troubleshooting

### Embeddings Not Generating

1. Check embedding service:
   ```bash
   curl http://localhost:11434/api/embed \
     -d '{"model":"mxbai-embed-large","input":"test"}'
   ```

2. Check queue:
   ```bash
   curl http://localhost:7474/status | jq .embeddings
   ```

3. Check logs:
   ```bash
   docker logs nornicdb | grep -i embed
   ```

### Slow Embedding

1. Use GPU acceleration
2. Increase batch size
3. Use embedding cache
4. Consider local GGUF models

## See Also

- **[Vector Search](../user-guides/vector-search.md)** - Search guide
- **[Hybrid Search](../user-guides/hybrid-search.md)** - RRF fusion
- **[GPU Acceleration](gpu-acceleration.md)** - Speed up embeddings

