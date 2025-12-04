# Clustering Architecture & Roadmap

> **Current Features + Future Plans**  
> This document covers current clustering capabilities and planned sharding features.

## Current Capabilities (v1.x)

- **Standalone Mode** - Single node, embedded or server
- **Hot Standby** - 2-node primary/standby with WAL replication
- **Raft Cluster** - 3-5 node strong consistency cluster
- **Multi-Region** - Per-region Raft clusters with async cross-region replication

## Deployment Tiers

| Tier | Nodes | Capacity | Status |
|------|-------|----------|--------|
| Embedded | 1 | ~10K nodes | ✅ Available |
| Standalone | 1-2 | ~1M nodes | ✅ Available |
| Raft Cluster | 3-5 | ~10M nodes | ✅ Available |
| Multi-Region | 6+ | ~100M nodes | ✅ Available |
| **Sharded** | 10+ | ~10B+ nodes | 🔮 Planned |

## Planned: Horizontal Sharding

### Architecture Vision

```
┌───────────────────────────────────────────────────────────┐
│                    Coordinator Layer                       │
│   (Query routing, metadata management)                     │
└─────────────────────────┬─────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐       ┌─────────┐       ┌─────────┐
   │ Shard A │       │ Shard B │       │ Shard C │
   │ (Raft)  │       │ (Raft)  │       │ (Raft)  │
   └─────────┘       └─────────┘       └─────────┘
```

### Planned Sharding Strategies

- **Label-based** - Co-locate nodes with same labels
- **Hash-based** - Consistent hashing for even distribution
- **Analytics-driven** - Use k-means/Louvain for intelligent placement

### Planned Features

1. **Query Routing** - Automatic routing to relevant shards
2. **Cross-shard Queries** - Scatter-gather for distributed queries
3. **Vector Index Distribution** - Per-shard HNSW indexes
4. **Live Rebalancing** - Zero-downtime shard migration

## Planned: Heterogeneous Clusters

Support for mixed-capability nodes:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Raspberry Pi│    │ Desktop PC  │    │ GPU Server  │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ ✅ BM25     │    │ ✅ BM25     │    │ ✅ BM25     │
│ ✅ Graph    │    │ ✅ Graph    │    │ ✅ Graph    │
│ ❌ Vector   │    │ ✅ Vector   │    │ ✅ Vector   │
│ ❌ Embed    │    │ ⚠️ Embed    │    │ ✅ GPU      │
└─────────────┘    └─────────────┘    └─────────────┘
```

- **Capability-based routing** - Route queries to capable nodes
- **Workload-based balancing** - Dynamic load distribution
- **Data locality** - Keep related data together

## Available: Multi-Region

Geographic distribution with async cross-region replication:

- ✅ Per-region Raft clusters (strong local consistency)
- ✅ Cross-region WAL streaming (async replication)  
- ✅ Conflict resolution strategies (`last_write_wins`, `manual`)
- ✅ Configurable cross-region sync modes (`async`, `semi_sync`)
- ✅ Region failover and promotion

### Chaos Testing

Extensively tested for real-world network conditions:

- **Extreme latency**: 2000-3000ms spikes (cross-region scenarios)
- **Packet loss**: Up to 20% packet loss handling
- **Data corruption**: Detection and recovery
- **Connection drops**: Automatic reconnection
- **Byzantine failures**: Malicious data, replay attacks
- **Reordering**: Out-of-order packet handling

See **[Clustering Guide](../user-guides/clustering.md#mode-3-multi-region)** for setup instructions.

## Implementation Timeline

| Phase | Target | Features |
|-------|--------|----------|
| Phase 1 | ✅ Done | Hot Standby, Raft Cluster |
| Phase 2 | ✅ Done | Multi-Region with async replication |
| Phase 3 | 2025 H2 | Sharding coordinator |
| Phase 4 | 2026 | Full sharding, heterogeneous clusters |

## Technical References

- [Cassandra Architecture](https://cassandra.apache.org/doc/latest/cassandra/architecture/)
- [Dgraph Sharding](https://dgraph.io/docs/design-concepts/)
- [Raft Consensus](https://raft.github.io/)

## See Also

- **[Clustering Guide](../user-guides/clustering.md)** - Current clustering features
- **[Replication Architecture](replication.md)** - Technical details
- **[Scaling](../operations/scaling.md)** - Current scaling options


