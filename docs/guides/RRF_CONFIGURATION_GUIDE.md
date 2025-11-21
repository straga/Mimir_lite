# RRF Hybrid Search Configuration Guide

## Overview

Mimir's hybrid search uses **Reciprocal Rank Fusion (RRF)** to combine vector search (semantic understanding via cosine similarity) with BM25 (keyword matching). This is the industry-standard approach used by Azure AI Search, Google Cloud, Weaviate, and Elasticsearch.

## How RRF Works

RRF combines **rankings** (not scores) from multiple search methods:

```
RRF_score(doc) = (vectorWeight / (k + vectorRank)) + (bm25Weight / (k + bm25Rank))
```

Where:
- `k` = constant (default: 60) - controls rank normalization
- `vectorRank` = position in vector search results (1-indexed)
- `bm25Rank` = position in BM25 keyword results (1-indexed)
- `vectorWeight` = importance of vector search (default: 1.0)
- `bm25Weight` = importance of BM25 search (default: 1.0)

## API Parameters

### Basic Usage

```bash
# Standard vector search only
GET /api/nodes/vector-search?query=accessibility&limit=10

# RRF hybrid search (vector + BM25)
GET /api/nodes/vector-search?query=accessibility&limit=10&
```

### RRF Configuration Parameters

All parameters are optional. If not provided, adaptive configuration based on query length is used.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rrf_k` | number | 60 | RRF constant (higher = less emphasis on top ranks) |
| `rrf_vector_weight` | number | 1.0 | Weight for vector search ranking |
| `rrf_bm25_weight` | number | 1.0 | Weight for BM25 keyword ranking |
| `rrf_min_score` | number | 0.01 | Minimum RRF score to include result |

### Examples

#### 1. Default Adaptive Configuration

```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessibility&limit=5&"
```

**Behavior:**
- Short queries (1-2 words): Emphasizes BM25 (keywords)
- Long queries (6+ words): Emphasizes vector (semantic)
- Medium queries (3-5 words): Balanced

#### 2. Emphasize Semantic Understanding

```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessibility&limit=5&&rrf_vector_weight=2.0&rrf_bm25_weight=0.5"
```

**Use when:**
- Query is conceptual or abstract
- Looking for semantic similarity
- Exact keywords less important

#### 3. Emphasize Keyword Matching

```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessibility&limit=5&&rrf_vector_weight=0.5&rrf_bm25_weight=2.0"
```

**Use when:**
- Looking for exact terms
- Query contains specific technical terms
- Keyword presence is critical

#### 4. Adjust Rank Sensitivity

**Smaller k (more emphasis on top ranks):**
```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessibility&limit=5&&rrf_k=30"
```

**Larger k (less emphasis on top ranks):**
```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessibility&limit=5&&rrf_k=100"
```

**Effect of k:**
- `k=30`: Top-ranked items dominate (rank 1 vs rank 10 matters more)
- `k=60`: Standard (research-backed default)
- `k=100`: Flatter distribution (rank 1 vs rank 10 matters less)

#### 5. Stricter Filtering

```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessibility&limit=5&&rrf_min_score=0.02"
```

**Effect:**
- Higher `rrf_min_score` = fewer, higher-quality results
- Lower `rrf_min_score` = more results, potentially lower quality

## Understanding RRF Scores

RRF scores are typically **0.01 to 0.05** (much smaller than cosine similarity 0-1 range).

**Example calculation:**
```
Document appears at:
- Vector rank: 2
- BM25 rank: 3

RRF score = 1/(60+2) + 1/(60+3) = 0.0161 + 0.0159 = 0.0320
```

**What matters:** Relative ranking, not absolute score values.

## Adaptive Profiles

When no custom parameters are provided, RRF uses adaptive configuration:

| Query Length | vectorWeight | bm25Weight | Rationale |
|--------------|--------------|------------|-----------|
| 1-2 words | 0.5 | 1.5 | Short queries benefit from exact keyword matching |
| 3-5 words | 1.0 | 1.0 | Balanced approach |
| 6+ words | 1.5 | 0.5 | Long queries provide semantic context |

## Best Practices

### 1. Start with Defaults
```bash

# Let adaptive configuration handle the rest
```

### 2. Tune for Your Use Case

**Code search:**
```bash
rrf_vector_weight=0.7
rrf_bm25_weight=1.3
# Favor exact identifier matches
```

**Conceptual search:**
```bash
rrf_vector_weight=1.5
rrf_bm25_weight=0.5
# Favor semantic understanding
```

**Balanced:**
```bash
rrf_vector_weight=1.0
rrf_bm25_weight=1.0
# Equal importance
```

### 3. Experiment with k

- **k=30-40**: When top results are highly reliable
- **k=60**: Standard (recommended starting point)
- **k=80-100**: When you want more diversity in results

### 4. Filter by Quality

```bash
rrf_min_score=0.015  # More selective
rrf_min_score=0.005  # More inclusive
```

## Comparison: Vector vs RRF

### Standard Vector Search
```bash
GET /api/nodes/vector-search?query=accessibility&limit=5
```

**Returns:**
- Purely semantic matches
- Scores: 0.85-0.90 (cosine similarity)
- May miss exact keyword matches

### RRF Hybrid Search
```bash
GET /api/nodes/vector-search?query=accessibility&limit=5&
```

**Returns:**
- Combined semantic + keyword matches
- Scores: 0.02-0.03 (RRF scores)
- Finds both semantic and exact matches
- Better recall and precision

## Response Format

```json
{
  "search_method": "rrf_hybrid",
  "count": 5,
  "results": [
    {
      "id": "concept-4",
      "title": "LLM-Powered Accessibility Auditing",
      "type": "concept",
      "similarity": 0.031874,  // RRF score
      "vectorRank": 2,          // Position in vector results
      "bm25Rank": 3,            // Position in BM25 results
      "content_preview": "..."
    }
  ]
}
```

## Troubleshooting

### No results with RRF but vector search works

**Cause:** `rrf_min_score` too high or no BM25 matches

**Solution:**
```bash
# Lower the minimum score
rrf_min_score=0.005

# Or check if BM25 is finding anything
# (look for results with bm25Rank populated)
```

### Results too similar to vector-only search

**Cause:** BM25 weight too low

**Solution:**
```bash
# Increase BM25 weight
rrf_bm25_weight=1.5
```

### Results dominated by keyword matches

**Cause:** Vector weight too low

**Solution:**
```bash
# Increase vector weight
rrf_vector_weight=1.5
```

## References

- [Original RRF Paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Azure AI Search - Hybrid Ranking](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking)
- [Google Cloud - Hybrid Search](https://cloud.google.com/vertex-ai/docs/vector-search/about-hybrid-search)

