# Mimir Performance Benchmarks

Comprehensive benchmark suite for measuring Mimir's performance across three core areas:

1. **File Indexing Pipeline** - Chunking, embedding generation, and Neo4j writes
2. **Vector Search** - Semantic search latency and accuracy
3. **Neo4j Graph Queries** - Relationship traversal and graph operations

## Quick Start

```bash
# Run all benchmarks
npm run bench

# Run specific benchmark suite
npm run bench -- mimir-performance

# Run with custom iterations
npm run bench -- --iterations 1000

# Generate JSON output for analysis
npm run bench -- --reporter=json > results/benchmark-$(date +%Y%m%d).json
```

## Prerequisites

- **Neo4j running** on `localhost:7687` (or set `NEO4J_URI`)
- **Neo4j credentials** set in environment:
  ```bash
  export NEO4J_USER=neo4j
  export NEO4J_PASSWORD=password
  ```
- **Sufficient memory** for test data (creates 1000 nodes + relationships)

## Benchmark Categories

### 1. File Indexing Pipeline

Measures end-to-end file indexing performance:

| Benchmark | File Size | Iterations | What It Tests |
|-----------|-----------|------------|---------------|
| Small file | 5 KB | 50 | Fast indexing of small files |
| Medium file | 50 KB | 20 | Typical source file indexing |
| Large file | 500 KB | 10 | Large documentation/data files |
| Batch 100 files | 5 KB each | 5 | Concurrent indexing throughput |

**Metrics:**
- Total indexing time (ms)
- Chunking overhead
- Embedding generation time (mocked)
- Neo4j write latency

### 2. Vector Search Performance

Tests semantic search across different result sizes:

| Benchmark | Top-K | Iterations | What It Tests |
|-----------|-------|------------|---------------|
| Vector search | 10 | 100 | Fast retrieval for small result sets |
| Vector search | 25 | 100 | Standard search result size |
| Vector search | 50 | 100 | Large result set performance |
| Hybrid search | 25 | 50 | Combined vector + full-text (RRF) |

**Metrics:**
- Query latency (ms)
- Cosine similarity computation time
- Full-text search overhead (hybrid)
- Reciprocal Rank Fusion time

### 3. Neo4j Graph Query Performance

Benchmarks common graph operations:

| Benchmark | Query Type | Iterations | What It Tests |
|-----------|------------|------------|---------------|
| Node lookup by ID | Point query | 1000 | Index performance |
| Node lookup by property | Filtered scan | 500 | Property index efficiency |
| Traversal depth 1 | Single hop | 200 | Direct relationship queries |
| Traversal depth 2 | Two hops | 100 | Multi-hop traversal |
| Traversal depth 3 | Three hops | 50 | Deep graph exploration |
| Subgraph extraction | APOC path | 50 | Complex subgraph queries |
| Batch create 100 nodes | Write batch | 50 | Write throughput |
| Batch create 1000 nodes | Large write | 10 | Large batch performance |
| Batch create 100 edges | Relationship writes | 50 | Edge creation speed |
| Complex aggregation | Analytics | 100 | Aggregation performance |

## Interpreting Results

### Vitest Benchmark Output

```
✓ testing/benchmarks/mimir-performance.bench.ts (3) 45231ms
  ✓ File Indexing Pipeline (4) 12453ms
    name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
  · Index small file (5KB)    8.2341  115.32  128.45  121.47  123.12  127.89  128.21  128.45  ±1.23%       50
  · Index medium file (50KB)  2.1234  465.23  489.12  471.02  475.34  487.23  488.45  489.12  ±2.11%       20
```

**Key Metrics:**
- **hz (ops/sec)**: Higher is better - operations per second
- **mean (ms)**: Average latency - lower is better
- **p99 (ms)**: 99th percentile latency - lower is better
- **rme (%)**: Relative margin of error - lower is better (<5% ideal)

### Performance Targets (M1 Max, 32GB RAM)

| Category | Operation | Target | Good | Needs Improvement |
|----------|-----------|--------|------|-------------------|
| Indexing | Small file (5KB) | <150ms | <200ms | >300ms |
| Indexing | Medium file (50KB) | <500ms | <800ms | >1200ms |
| Vector Search | Top 10 | <50ms | <100ms | >200ms |
| Vector Search | Top 50 | <150ms | <250ms | >500ms |
| Graph Query | Depth 1 | <10ms | <25ms | >50ms |
| Graph Query | Depth 3 | <100ms | <200ms | >500ms |
| Batch Write | 100 nodes | <50ms | <100ms | >200ms |

### Baseline Results (Example)

```
Platform: macOS 14.6.0, M1 Max, 32GB RAM
Neo4j: 5.x Community Edition
Node.js: v20.x

File Indexing:
- Small (5KB):   121ms avg (8.2 ops/sec)
- Medium (50KB): 471ms avg (2.1 ops/sec)
- Large (500KB): 4.2s avg (0.24 ops/sec)

Vector Search:
- Top 10:  45ms avg (22 ops/sec)
- Top 25:  89ms avg (11 ops/sec)
- Top 50:  142ms avg (7 ops/sec)

Graph Queries:
- Depth 1: 8ms avg (125 ops/sec)
- Depth 2: 34ms avg (29 ops/sec)
- Depth 3: 98ms avg (10 ops/sec)
```

## Running in CI/CD

### GitHub Actions Example

```yaml
name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    
    services:
      neo4j:
        image: neo4j:5-community
        env:
          NEO4J_AUTH: neo4j/password
        ports:
          - 7687:7687
        options: >-
          --health-cmd "cypher-shell -u neo4j -p password 'RETURN 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run benchmarks
        env:
          NEO4J_URI: neo4j://localhost:7687
          NEO4J_USER: neo4j
          NEO4J_PASSWORD: password
        run: |
          npm run bench -- --reporter=json > benchmark-results.json
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: benchmark-results.json
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('benchmark-results.json', 'utf8'));
            // Format and post results as PR comment
```

## Comparing Results

### Track Performance Over Time

```bash
# Run benchmarks and save with timestamp
npm run bench -- --reporter=json > results/bench-$(date +%Y%m%d-%H%M%S).json

# Compare two runs
node scripts/compare-benchmarks.js results/bench-20250101.json results/bench-20250115.json
```

### Regression Detection

Set performance thresholds in CI:

```bash
# Fail if any benchmark regresses by >20%
npm run bench:check-regression -- --threshold 0.20
```

## Troubleshooting

### Neo4j Connection Issues

```bash
# Check Neo4j is running
docker ps | grep neo4j

# Test connection
cypher-shell -u neo4j -p password "RETURN 1"

# Check environment variables
echo $NEO4J_URI
echo $NEO4J_USER
```

### Out of Memory

If benchmarks fail with OOM:

```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=8192" npm run bench

# Reduce test data size (edit mimir-performance.bench.ts)
# Change: UNWIND range(1, 1000) -> UNWIND range(1, 100)
```

### Slow Benchmarks

Reduce iterations for faster runs:

```bash
# Quick smoke test (10 iterations each)
npm run bench -- --iterations 10

# Skip slow benchmarks
npm run bench -- --exclude "Batch index 100 files"
```

## Adding New Benchmarks

```typescript
// In mimir-performance.bench.ts

describe('My New Benchmark Category', () => {
  bench('My specific test', async () => {
    // Your benchmark code here
    const result = await myFunction();
    return result;
  }, { 
    iterations: 100,  // Number of times to run
    warmup: 10        // Warmup iterations (not counted)
  });
});
```

## Best Practices

1. **Isolate benchmarks** - Each should be independent
2. **Use realistic data** - Match production workloads
3. **Warm up** - First few iterations are slower (JIT compilation)
4. **Consistent environment** - Close other apps, use same hardware
5. **Multiple runs** - Run 3-5 times, take median
6. **Document changes** - Note any config/hardware changes

## Publishing Results

### Generate Markdown Report

```bash
npm run bench:report
```

Creates `results/BENCHMARK_REPORT.md` with formatted tables.

### Share Results

Commit results to `docs/benchmarks/`:

```
docs/benchmarks/
├── 2025-01-15-m1-max.md
├── 2025-01-15-intel-i9.md
└── baseline-results.md
```

## Resources

- [Vitest Benchmark API](https://vitest.dev/api/bench.html)
- [Neo4j Performance Tuning](https://neo4j.com/docs/operations-manual/current/performance/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**Last Updated:** 2025-01-15  
**Maintainer:** Mimir Development Team
