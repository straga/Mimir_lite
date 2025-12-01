# Cross-Encoder Reranking

**Two-Stage Retrieval for Higher Accuracy**

## Overview

Cross-encoder reranking is an optional Stage 2 retrieval step that improves search quality by re-scoring candidates with a more accurate (but slower) model.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     Two-Stage Retrieval                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stage 1 (Fast)          Stage 2 (Accurate)                     │
│  ─────────────           ─────────────────                      │
│                                                                 │
│  ┌─────────────┐         ┌─────────────────┐                   │
│  │ Vector+BM25 │  ──→    │ Cross-Encoder   │  ──→  Top 10     │
│  │ RRF Fusion  │         │ Reranking       │       Results     │
│  └─────────────┘         └─────────────────┘                   │
│        ↓                        ↓                               │
│   100 candidates           Re-scored                            │
│   (fast lookup)            (query+doc together)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why Cross-Encoder?

**Bi-encoders** (embeddings) encode query and document separately:

```
query_embedding  = model.encode(query)
doc_embedding    = model.encode(document)  // Pre-computed!
score            = cosine(query_embedding, doc_embedding)
```

**Cross-encoders** encode them together:

```
score = model.cross_encode(query, document)  // Sees interaction!
```

The cross-encoder can capture fine-grained semantic relationships that bi-encoders miss, but it's O(N) vs O(log N).

### ELI12

Imagine finding a book in a library:

- **Stage 1 (Bi-encoder)**: Using the card catalog to find 100 potentially relevant books. Fast, but might miss nuances.
- **Stage 2 (Cross-encoder)**: Actually reading each book's summary to pick the best 10. More accurate, but takes longer.

## Quick Start

### Enable via Search Options

```go
opts := search.DefaultSearchOptions()
opts.RerankEnabled = true
opts.RerankTopK = 100     // Rerank top 100 candidates
opts.RerankMinScore = 0.3 // Filter low-confidence results

results, err := svc.Search(ctx, query, embedding, opts)
```

### Configure the Cross-Encoder

```go
// Configure cross-encoder service
svc.SetCrossEncoder(search.NewCrossEncoder(&search.CrossEncoderConfig{
    Enabled:  true,
    APIURL:   "http://localhost:8081/rerank",
    Model:    "cross-encoder/ms-marco-MiniLM-L-6-v2",
    TopK:     100,
    Timeout:  30 * time.Second,
    MinScore: 0.0,
}))
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `Enabled` | `false` | Enable cross-encoder reranking |
| `APIURL` | `http://localhost:8081/rerank` | Reranking service endpoint |
| `APIKey` | `""` | Authentication token (if required) |
| `Model` | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Model name |
| `TopK` | `100` | How many candidates to rerank |
| `Timeout` | `30s` | Request timeout |
| `MinScore` | `0.0` | Minimum score threshold |

## Supported Reranking Services

### Cohere Rerank API

```go
ce := search.NewCrossEncoder(&search.CrossEncoderConfig{
    Enabled: true,
    APIURL:  "https://api.cohere.ai/v1/rerank",
    APIKey:  "your-api-key",
    Model:   "rerank-english-v3.0",
})
```

### HuggingFace Text Embeddings Inference (TEI)

```bash
# Start TEI with reranking model
docker run -p 8081:80 ghcr.io/huggingface/text-embeddings-inference:latest \
    --model-id cross-encoder/ms-marco-MiniLM-L-6-v2
```

```go
ce := search.NewCrossEncoder(&search.CrossEncoderConfig{
    Enabled: true,
    APIURL:  "http://localhost:8081/rerank",
    Model:   "cross-encoder/ms-marco-MiniLM-L-6-v2",
})
```

### Local Models (llama.cpp with reranking)

```go
ce := search.NewCrossEncoder(&search.CrossEncoderConfig{
    Enabled: true,
    APIURL:  "http://localhost:8081/rerank",
    Model:   "bge-reranker-base",
})
```

## Response Format

The cross-encoder integration supports multiple response formats:

### Cohere Format

```json
{
  "results": [
    {"index": 0, "relevance_score": 0.95},
    {"index": 2, "relevance_score": 0.82},
    {"index": 1, "relevance_score": 0.71}
  ]
}
```

### HuggingFace TEI Format

```json
{
  "scores": [0.95, 0.71, 0.82]
}
```

### Simple Format

```json
{
  "rankings": [
    {"index": 0, "score": 0.95},
    {"index": 2, "score": 0.82}
  ]
}
```

## Performance Considerations

### Latency Trade-offs

| Method | Latency | Accuracy |
|--------|---------|----------|
| Vector only | ~5ms | Good |
| RRF Hybrid | ~10ms | Better |
| RRF + Cross-Encoder | ~50-200ms | Best |

### When to Use

✅ **Use cross-encoder when:**
- Accuracy is more important than latency
- Users are willing to wait for better results
- Search volume is low to moderate
- High-stakes decisions based on search

❌ **Skip cross-encoder when:**
- Low latency is critical (<50ms)
- High query volume (>1000 QPS)
- Results are "good enough" with bi-encoders
- Cost is a concern (API calls)

### Optimization Tips

1. **Limit TopK**: Rerank fewer candidates for faster response

   ```go
   opts.RerankTopK = 50  // Instead of 100
   ```

2. **Use MinScore**: Filter low-confidence results early

   ```go
   opts.RerankMinScore = 0.5  // Skip weak matches
   ```

3. **Batch Requests**: Cross-encoder processes all candidates in one call

4. **Cache Results**: For repeated queries, cache the reranked results

## Combining with MMR

Cross-encoder reranking can be combined with MMR diversification:

```go
opts := search.DefaultSearchOptions()
opts.MMREnabled = true
opts.MMRLambda = 0.7
opts.RerankEnabled = true

// Pipeline: Vector+BM25 → RRF → MMR → Cross-Encoder → Results
```

The search method will show: `rrf_hybrid+mmr+rerank`

## Monitoring

Check if cross-encoder is available:

```go
if svc.CrossEncoderAvailable(ctx) {
    log.Println("Cross-encoder ready")
}
```

The search response includes the method used:

```json
{
  "search_method": "rrf_hybrid+rerank",
  "message": "RRF + Cross-Encoder Reranking"
}
```

## Error Handling

The cross-encoder gracefully falls back to original rankings on errors:

- API timeout → Use original RRF scores
- Server unavailable → Use original RRF scores
- Invalid response → Use original RRF scores

No error is returned to the caller - the search continues with best-effort results.

## Popular Cross-Encoder Models

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| `cross-encoder/ms-marco-MiniLM-L-6-v2` | 22M | Good | Fast |
| `cross-encoder/ms-marco-TinyBERT-L-6` | 14M | Good | Fastest |
| `BAAI/bge-reranker-base` | 278M | Better | Medium |
| `BAAI/bge-reranker-large` | 560M | Best | Slow |
| `Cohere rerank-english-v3.0` | - | Best | API |

## Related Documentation

- [Vector Search Guide](VECTOR_SEARCH.md)
- [RRF Search Implementation](../RRF_SEARCH_IMPLEMENTATION.md)
- [MMR Diversification](../RRF_SEARCH_IMPLEMENTATION.md#mmr)
- [Eval Harness](EVAL_HARNESS.md)

---

_Cross-Encoder Reranking v1.0 - December 2025_
