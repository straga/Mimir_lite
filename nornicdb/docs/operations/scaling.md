# Scaling

**Scale NornicDB for high availability and performance.**

## Scaling Options

| Strategy | Use Case | Complexity |
|----------|----------|------------|
| Vertical | Quick wins | Low |
| Read Replicas | Read-heavy workloads | Medium |
| Sharding | Large datasets | High |

## Vertical Scaling

### Increase Resources

```yaml
# Docker Compose
services:
  nornicdb:
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: '4'
```

### Memory Optimization

```bash
nornicdb serve \
  --memory-limit=4GB \
  --gc-percent=50 \
  --pool-enabled=true
```

### Query Optimization

```bash
nornicdb serve \
  --query-cache-size=5000 \
  --query-cache-ttl=10m \
  --parallel=true \
  --parallel-workers=4
```

## Read Replicas

### Hot Standby Architecture

```
┌─────────────┐     ┌─────────────┐
│   Primary   │────▶│   Replica   │
│   (Write)   │     │   (Read)    │
└─────────────┘     └─────────────┘
        │                  │
        ▼                  ▼
   Write Requests    Read Requests
```

### Configuration

```yaml
# Primary server
replication:
  role: primary
  replicas:
    - host: replica-1.nornicdb.local
      port: 7687
    - host: replica-2.nornicdb.local
      port: 7687

# Replica server
replication:
  role: replica
  primary:
    host: primary.nornicdb.local
    port: 7687
```

### Load Balancing

```nginx
# nginx.conf
upstream nornicdb_read {
    server replica-1:7474;
    server replica-2:7474;
}

upstream nornicdb_write {
    server primary:7474;
}

server {
    location /db/neo4j/tx/commit {
        # Route writes to primary
        proxy_pass http://nornicdb_write;
    }
    
    location /nornicdb/search {
        # Route reads to replicas
        proxy_pass http://nornicdb_read;
    }
}
```

## High Availability

### Raft Consensus

For automatic failover:

```yaml
cluster:
  enabled: true
  mode: raft
  nodes:
    - id: node-1
      host: node-1.nornicdb.local
      port: 7687
    - id: node-2
      host: node-2.nornicdb.local
      port: 7687
    - id: node-3
      host: node-3.nornicdb.local
      port: 7687
```

### Kubernetes StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nornicdb
spec:
  serviceName: nornicdb
  replicas: 3
  selector:
    matchLabels:
      app: nornicdb
  template:
    metadata:
      labels:
        app: nornicdb
    spec:
      containers:
      - name: nornicdb
        image: timothyswt/nornicdb-arm64-metal:latest
        env:
        - name: NORNICDB_CLUSTER_MODE
          value: "raft"
        - name: NORNICDB_NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        ports:
        - containerPort: 7474
        - containerPort: 7687
        - containerPort: 7688  # Raft port
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Caching

### Query Cache

```yaml
cache:
  query:
    enabled: true
    size: 5000
    ttl: 5m
  
  embedding:
    enabled: true
    size: 10000
```

### External Cache (Redis)

```yaml
cache:
  external:
    enabled: true
    type: redis
    address: redis:6379
```

## Performance Tuning

### Parallel Query Execution

```bash
nornicdb serve \
  --parallel=true \
  --parallel-workers=0 \  # Auto-detect CPUs
  --parallel-batch-size=1000
```

### Connection Pooling

```yaml
pool:
  enabled: true
  max_connections: 100
  idle_timeout: 5m
```

### Object Pooling

```bash
# Reduce memory allocations
nornicdb serve --pool-enabled=true
```

## Monitoring at Scale

### Key Metrics

- Request rate per node
- Replication lag
- Query latency percentiles
- Memory usage per node
- Disk I/O

### Prometheus Alerts

```yaml
groups:
  - name: nornicdb-scaling
    rules:
      - alert: HighLoad
        expr: nornicdb_http_requests_total > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High request rate - consider scaling"
      
      - alert: ReplicationLag
        expr: nornicdb_replication_lag_seconds > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Replication lag detected"
```

## Capacity Planning

### Sizing Guidelines

| Nodes | Edges | RAM | Storage |
|-------|-------|-----|---------|
| 1M | 5M | 4GB | 10GB |
| 10M | 50M | 16GB | 100GB |
| 100M | 500M | 64GB | 1TB |

### Growth Projections

```bash
# Monitor growth
curl http://localhost:7474/metrics | grep nornicdb_nodes_total
curl http://localhost:7474/metrics | grep nornicdb_storage_bytes
```

## See Also

- **[Deployment](deployment.md)** - Deployment guide
- **[Monitoring](monitoring.md)** - Performance monitoring
- **[Clustering](../user-guides/clustering.md)** - HA clustering guide
- **[Cluster Security](cluster-security.md)** - Authentication for clusters
- **[Clustering Roadmap](../architecture/clustering-roadmap.md)** - Future sharding plans

