# Mimir Performance Benchmarking Guide

This guide explains how to run and interpret performance benchmarks for Mimir.

## Quick Links

- **Benchmark Suite:** [`testing/benchmarks/`](../../testing/benchmarks/)
- **Detailed README:** [`testing/benchmarks/README.md`](../../testing/benchmarks/README.md)
- **Benchmark Code:** [`testing/benchmarks/mimir-performance.bench.ts`](../../testing/benchmarks/mimir-performance.bench.ts)
- **GitHub Actions:** [`.github/workflows/benchmarks.yml`](../../.github/workflows/benchmarks.yml)

## What We Benchmark

Mimir's performance is measured across three critical areas:

### 1. File Indexing Pipeline (Throughput)
- **Small files (5KB):** Fast indexing of configuration files, small scripts
- **Medium files (50KB):** Typical source code files
- **Large files (500KB):** Documentation, large data files
- **Batch operations:** Concurrent indexing of 100+ files

**Key Metrics:**
- Total indexing time
- Chunks created per second
- Embedding generation latency
- Neo4j write throughput

### 2. Vector Search (Latency)
- **Top-10 results:** Fast retrieval for quick queries
- **Top-25 results:** Standard search result size
- **Top-50 results:** Comprehensive search
- **Hybrid search:** Combined vector + full-text with RRF

**Key Metrics:**
- Query latency (mean, p99)
- Cosine similarity computation time
- Full-text search overhead
- Reciprocal Rank Fusion time

### 3. Neo4j Graph Queries (Latency & Throughput)
- **Point queries:** Node lookup by ID
- **Filtered scans:** Property-based searches
- **Relationship traversal:** 1-3 hop graph exploration
- **Subgraph extraction:** Complex multi-hop queries
- **Batch writes:** Node and edge creation throughput
- **Aggregations:** Analytics queries

**Key Metrics:**
- Query latency (mean, p90, p99)
- Transaction commit time
- Traversal depth impact
- Write throughput (nodes/sec, edges/sec)

## Running Benchmarks Locally

### Prerequisites

```bash
# Ensure Neo4j is running
docker-compose up -d neo4j

# Verify connection
cypher-shell -u neo4j -p password "RETURN 1"
```

### Run All Benchmarks

```bash
# Full benchmark suite (~5-10 minutes)
npm run bench

# Quick smoke test (~1 minute)
npm run bench:quick

# Generate JSON output for analysis
npm run bench:json > results/bench-$(date +%Y%m%d).json
```

### Interpreting Results

```
✓ testing/benchmarks/mimir-performance.bench.ts (3) 45231ms
  ✓ File Indexing Pipeline (4) 12453ms
    name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
  · Index small file (5KB)    8.2341  115.32  128.45  121.47  123.12  127.89  128.21  128.45  ±1.23%       50
```

- **hz (ops/sec):** Operations per second - **higher is better**
- **mean (ms):** Average latency - **lower is better**
- **p99 (ms):** 99th percentile latency - **lower is better** (tail latency)
- **rme (%):** Relative margin of error - **<5% is ideal** (consistency)

## Performance Targets

### M1 Max (32GB RAM) - Local Development

| Category | Operation | Target | Good | Needs Work |
|----------|-----------|--------|------|------------|
| **Indexing** | Small file (5KB) | <150ms | <200ms | >300ms |
| **Indexing** | Medium file (50KB) | <500ms | <800ms | >1200ms |
| **Indexing** | Large file (500KB) | <5s | <8s | >12s |
| **Vector Search** | Top 10 | <50ms | <100ms | >200ms |
| **Vector Search** | Top 50 | <150ms | <250ms | >500ms |
| **Graph Query** | Depth 1 | <10ms | <25ms | >50ms |
| **Graph Query** | Depth 3 | <100ms | <200ms | >500ms |
| **Batch Write** | 100 nodes | <50ms | <100ms | >200ms |
| **Batch Write** | 1000 nodes | <400ms | <800ms | >1500ms |

### GitHub Actions (Ubuntu) - CI/CD

Expect ~20-30% slower performance than M1 Max due to:
- Shared CPU resources
- Docker networking overhead
- GitHub Actions runner specs

## Continuous Integration

Benchmarks run automatically on:
- **Pull Requests:** Compare against baseline
- **Main branch pushes:** Track performance over time
- **Manual dispatch:** On-demand benchmark runs

Results are:
- Posted as PR comments
- Uploaded as workflow artifacts (30-day retention)
- Added to GitHub Actions summary

## Tracking Performance Over Time

### Save Baseline

```bash
# Run benchmarks and save baseline
npm run bench:json > docs/benchmarks/baseline-m1-max.json

# Document your system specs
echo "Platform: $(uname -s) $(uname -r)" >> docs/benchmarks/baseline-m1-max.md
echo "CPU: $(sysctl -n machdep.cpu.brand_string)" >> docs/benchmarks/baseline-m1-max.md
echo "RAM: $(sysctl -n hw.memsize | awk '{print $0/1024/1024/1024 " GB"}')" >> docs/benchmarks/baseline-m1-max.md
```

### Compare Runs

```bash
# Compare current run against baseline
npm run bench:json > current.json
node scripts/compare-benchmarks.js docs/benchmarks/baseline-m1-max.json current.json
```

## Regression Detection

Set performance thresholds to catch regressions:

```bash
# Fail CI if any benchmark regresses by >20%
npm run bench:check-regression -- --threshold 0.20
```

## Publishing Results

### Format for Documentation

```bash
# Generate markdown report
npm run bench -- --reporter=verbose > docs/benchmarks/results-$(date +%Y%m%d).md
```

### Commit Results

```bash
git add docs/benchmarks/results-*.md
git commit -m "docs: add benchmark results for $(date +%Y-%m-%d)"
```

## Best Practices

1. **Close other applications** - Minimize background processes
2. **Run multiple times** - Take median of 3-5 runs
3. **Consistent environment** - Same hardware, same load
4. **Document changes** - Note any config or code changes
5. **Warm up** - First few iterations are slower (JIT)

## Troubleshooting

### Neo4j Connection Failed

```bash
# Check Neo4j is running
docker ps | grep neo4j

# Check logs
docker logs mimir-neo4j

# Restart Neo4j
docker-compose restart neo4j
```

### Out of Memory

```bash
# Increase Node.js heap
NODE_OPTIONS="--max-old-space-size=8192" npm run bench
```

### Benchmarks Too Slow

```bash
# Reduce iterations for quick test
npm run bench:quick

# Or manually set iterations
npm run bench -- --iterations 10
```

## Resources

- [Vitest Benchmark API](https://vitest.dev/api/bench.html)
- [Neo4j Performance Tuning](https://neo4j.com/docs/operations-manual/current/performance/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)

## Contributing

To add new benchmarks:

1. Edit `testing/benchmarks/mimir-performance.bench.ts`
2. Add your benchmark in the appropriate `describe()` block
3. Document expected performance targets
4. Run locally to verify
5. Submit PR with benchmark results

---

**Last Updated:** 2025-01-15  
**Maintainer:** Mimir Development Team
