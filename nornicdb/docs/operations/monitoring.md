# Monitoring

**Monitor NornicDB health, performance, and security.**

## Endpoints

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `/health` | No | Basic health check |
| `/status` | Yes | Detailed status |
| `/metrics` | Yes | Prometheus metrics |

## Health Check

### Basic Health

```bash
curl http://localhost:7474/health
```

Response:
```json
{
  "status": "healthy"
}
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 7474
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 7474
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Status Endpoint

### Detailed Status

```bash
curl http://localhost:7474/status \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "status": "healthy",
  "server": {
    "version": "0.1.4",
    "uptime": "24h15m30s",
    "started_at": "2024-12-01T00:00:00Z"
  },
  "database": {
    "nodes": 150000,
    "edges": 450000,
    "data_size": "2.5GB"
  },
  "embeddings": {
    "enabled": true,
    "provider": "ollama",
    "model": "mxbai-embed-large",
    "pending": 0
  }
}
```

## Prometheus Metrics

### Enable Metrics

Metrics are available at `/metrics` (requires authentication).

```bash
curl http://localhost:7474/metrics \
  -H "Authorization: Bearer $TOKEN"
```

### Available Metrics

```prometheus
# Request metrics
nornicdb_http_requests_total{method="GET",path="/health",status="200"} 1234
nornicdb_http_request_duration_seconds{method="POST",path="/db/neo4j/tx/commit"} 0.045

# Database metrics
nornicdb_nodes_total 150000
nornicdb_edges_total 450000
nornicdb_storage_bytes 2684354560

# Query metrics
nornicdb_query_duration_seconds{type="cypher"} 0.023
nornicdb_queries_total{type="cypher",status="success"} 5678

# Embedding metrics
nornicdb_embeddings_pending 0
nornicdb_embeddings_processed_total 10000
nornicdb_embedding_duration_seconds 0.15

# Rate limiting
nornicdb_rate_limit_hits_total 42
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nornicdb'
    static_configs:
      - targets: ['localhost:7474']
    bearer_token: 'your-auth-token'
    metrics_path: '/metrics'
```

## Grafana Dashboard

### Example Dashboard JSON

```json
{
  "title": "NornicDB",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(nornicdb_http_requests_total[5m])"
        }
      ]
    },
    {
      "title": "Query Duration",
      "type": "graph",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, nornicdb_query_duration_seconds)"
        }
      ]
    },
    {
      "title": "Node Count",
      "type": "stat",
      "targets": [
        {
          "expr": "nornicdb_nodes_total"
        }
      ]
    }
  ]
}
```

## Alerting

### Prometheus Alerts

```yaml
# alerts.yml
groups:
  - name: nornicdb
    rules:
      - alert: NornicDBDown
        expr: up{job="nornicdb"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "NornicDB is down"

      - alert: HighErrorRate
        expr: rate(nornicdb_http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"

      - alert: SlowQueries
        expr: histogram_quantile(0.95, nornicdb_query_duration_seconds) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow queries detected"

      - alert: RateLimitHits
        expr: rate(nornicdb_rate_limit_hits_total[5m]) > 10
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Rate limiting active"
```

## Logging

### Log Levels

```bash
# Set log level
export NORNICDB_LOG_LEVEL=info  # debug, info, warn, error
```

### Log Format

```json
{
  "time": "2024-12-01T10:30:00.123Z",
  "level": "info",
  "msg": "Query executed",
  "query_type": "cypher",
  "duration_ms": 23,
  "rows": 100
}
```

### Log Aggregation

```yaml
# Docker logging
logging:
  driver: "fluentd"
  options:
    fluentd-address: "localhost:24224"
    tag: "nornicdb"
```

## Performance Monitoring

### Query Performance

```bash
# Enable query logging
nornicdb serve --log-queries
```

### Slow Query Log

```json
{
  "level": "warn",
  "msg": "Slow query",
  "query": "MATCH (n)-[r*1..5]->(m) RETURN n, r, m",
  "duration_ms": 1500,
  "threshold_ms": 1000
}
```

## Security Monitoring

### Failed Login Alerts

Failed logins are logged and can trigger alerts:

```json
{
  "level": "warn",
  "msg": "Login failed",
  "username": "admin",
  "ip": "192.168.1.100",
  "reason": "invalid_password"
}
```

### Audit Log Monitoring

```bash
# Monitor audit log for security events
tail -f /var/log/nornicdb/audit.log | jq 'select(.type == "LOGIN_FAILED")'
```

## Health Check Script

```bash
#!/bin/bash
# health-check.sh

HEALTH=$(curl -s http://localhost:7474/health)
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  echo "NornicDB unhealthy: $HEALTH"
  exit 1
fi

echo "NornicDB healthy"
exit 0
```

## See Also

- **[Deployment](deployment.md)** - Deployment guide
- **[Troubleshooting](troubleshooting.md)** - Common issues
- **[Audit Logging](../compliance/audit-logging.md)** - Security monitoring

