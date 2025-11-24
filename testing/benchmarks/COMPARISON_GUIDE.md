# Mimir Performance Comparison Guide

This guide explains how to run and compare performance benchmarks across two layers:

1. **Direct Neo4j** - Baseline database performance
2. **Mimir API** - Performance through Mimir's abstraction layer

## Quick Start

```bash
# 1. Run Neo4j direct benchmarks (baseline)
npm run bench

# 2. Run Mimir API benchmarks (requires Mimir server running)
npm run bench:api

# 3. Run all and save results
npm run bench:all
npm run bench:compare
```

## What Each Benchmark Tests

### 1. Neo4j Direct (`mimir-performance.bench.ts`)

**Tests:** Raw Neo4j performance via `neo4j-driver`

**Benchmarks:**
- Vector similarity search (top 10, 25, 50)
- Graph traversal (depth 1-3, bidirectional, shortest path)
- Batch operations (100/1000 nodes, relationships)
- Complex queries (aggregations, subgraphs, pattern matching)

**Purpose:** Establish baseline - this is the fastest possible performance

**Run:** `npm run bench`

### 2. Mimir API (`mimir-api.bench.ts`)

**Tests:** Same operations through Mimir's MCP tools and HTTP API

**Benchmarks:**
- Vector search via `vector_search_nodes` MCP tool
- Node operations via `memory_node` MCP tool
- Graph traversal via `memory_edge` MCP tool
- Batch operations via `memory_batch` MCP tool
- HTTP API endpoints (`/api/nodes`, etc.)

**Purpose:** Measure API overhead - how much does Mimir's abstraction cost?

**Prerequisites:**
```bash
# Start Mimir server
npm run start

# Verify it's running
curl http://localhost:9042/health
```

**Run:** `npm run bench:api`



## Understanding Results

### Sample Output

```
✓ Vector Search Performance (Mimir API)
    name                                    hz     min     max    mean     p75     p99
  · Vector search via MCP tool (top 10)  45.23  20.12  25.89  22.11  22.45  24.12
  · Vector search via MCP tool (top 25)  42.15  21.34  27.12  23.73  24.01  26.45
```

**Key Metrics:**
- **hz (ops/sec)**: Higher is better - throughput
- **mean (ms)**: Average latency - lower is better
- **p99 (ms)**: 99th percentile - tail latency (lower is better)

### Expected Performance Ratios

Based on typical overhead:

| Layer | Relative Speed | Overhead | Use Case |
|-------|---------------|----------|----------|
| **Neo4j Direct** | 1.0x (baseline) | 0% | Internal operations |
| **Mimir API** | 0.7-0.9x | 10-30% | Production API |

**Example:**
- Neo4j direct: 100 ops/sec
- Mimir API: 70-90 ops/sec (acceptable overhead)

### What's Acceptable?

**Mimir API Overhead:**
- ✅ **<20% slower**: Excellent - minimal API overhead
- ✅ **20-40% slower**: Good - typical for REST APIs
- ⚠️ **40-60% slower**: Acceptable - consider optimization
- ❌ **>60% slower**: Poor - investigate bottlenecks

**vs Zep:**
- ✅ **Faster**: Competitive advantage
- ✅ **Within 20%**: Feature parity
- ⚠️ **20-40% slower**: Acceptable if more features
- ❌ **>40% slower**: Needs optimization

## Comparing Results

### Side-by-Side Comparison

```bash
# Save all results with timestamps
npm run bench:json > results/neo4j-$(date +%Y%m%d).json
npm run bench:api -- --reporter=json > results/api-$(date +%Y%m%d).json
npm run bench:zep -- --reporter=json > results/zep-$(date +%Y%m%d).json
```

### Manual Comparison

Create a comparison table:

| Operation | Neo4j Direct | Mimir API | Zep API | Mimir Overhead | vs Zep |
|-----------|--------------|-----------|---------|----------------|--------|
| Vector search (top 10) | 7.58 ops/sec | 5.23 ops/sec | 4.12 ops/sec | +31% | +27% faster |
| Node lookup | 670 ops/sec | 450 ops/sec | 380 ops/sec | +33% | +18% faster |
| Batch create (100) | 20 ops/sec | 15 ops/sec | 12 ops/sec | +25% | +25% faster |

### Automated Comparison (Future)

```bash
# Generate comparison report
node scripts/compare-benchmarks.js \
  results/neo4j-latest.json \
  results/api-latest.json \
  results/zep-latest.json \
  --output results/comparison-report.md
```

## Optimization Targets

### If Mimir API is >40% slower than Neo4j:

**Check:**
1. **Network overhead** - Are you testing localhost?
2. **JSON serialization** - Large payloads?
3. **MCP tool overhead** - Too many tool calls?
4. **Database connection pooling** - Connection limits?

**Optimize:**
- Enable connection pooling
- Reduce JSON payload size
- Batch operations where possible
- Add caching layer

### If Mimir is slower than Zep:

**Investigate:**
1. **Query optimization** - Are Cypher queries efficient?
2. **Index usage** - Are indexes being used?
3. **Batch size** - Are we batching effectively?
4. **Embedding generation** - Is this a bottleneck?

**Optimize:**
- Add database indexes
- Optimize Cypher queries
- Increase batch sizes
- Cache embeddings

## Running in CI/CD

### GitHub Actions

```yaml
- name: Run benchmarks
  run: |
    # Start services
    docker-compose up -d neo4j
    npm run start &
    
    # Wait for services
    sleep 10
    
    # Run benchmarks
    npm run bench:all
    
    # Save results
    npm run bench:compare
```

### Performance Regression Detection

```bash
# Compare against baseline
if [ $(jq '.hz' current.json) -lt $(jq '.hz * 0.8' baseline.json) ]; then
  echo "❌ Performance regression detected!"
  exit 1
fi
```

## Best Practices

1. **Run multiple times** - Take median of 3-5 runs
2. **Consistent environment** - Same hardware, same load
3. **Warm up** - First run is always slower (JIT compilation)
4. **Document changes** - Note any config or code changes
5. **Track over time** - Save results with timestamps

## Troubleshooting

### Mimir API benchmarks fail

```bash
# Check if server is running
curl http://localhost:9042/health

# Check logs
docker logs mimir-server

# Restart server
npm run restart
```

### Zep benchmarks fail

```bash
# Check if Zep is running
curl http://localhost:8000/healthz

# Check Zep logs
docker logs zep

# Restart Zep
docker restart zep
```

### Inconsistent results

```bash
# Close other applications
# Disable CPU throttling
# Run with more iterations
npm run bench -- --iterations 500
```

## Publishing Results

### Format for Documentation

```bash
# Generate markdown report
npm run bench -- --reporter=verbose > docs/benchmarks/results-$(date +%Y%m%d).md
```

### Commit to Repository

```bash
git add testing/benchmarks/results/*.json
git add docs/benchmarks/results-*.md
git commit -m "benchmarks: add performance results for $(date +%Y-%m-%d)"
```

---

**Last Updated:** 2025-01-15  
**Maintainer:** Mimir Development Team
