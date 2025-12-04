# Troubleshooting

**Common issues and solutions.**

## Quick Diagnostics

```bash
# Check if server is running
curl http://localhost:7474/health

# Check logs
docker logs nornicdb
# or
journalctl -u nornicdb -n 100

# Check resources
docker stats nornicdb
# or
htop
```

## Connection Issues

### Cannot Connect to Server

**Symptoms:**
- Connection refused
- Timeout

**Solutions:**

1. **Check if server is running:**
   ```bash
   curl http://localhost:7474/health
   ```

2. **Check bind address:**
   ```bash
   # Docker requires 0.0.0.0
   NORNICDB_ADDRESS=0.0.0.0
   ```

3. **Check ports:**
   ```bash
   netstat -tlnp | grep 7474
   ```

4. **Check firewall:**
   ```bash
   sudo ufw status
   sudo firewall-cmd --list-ports
   ```

### Connection Reset

**Symptoms:**
- Intermittent disconnects
- "Connection reset by peer"

**Solutions:**

1. **Check rate limiting:**
   ```bash
   # View rate limit hits
   curl http://localhost:7474/metrics | grep rate_limit
   ```

2. **Increase limits:**
   ```yaml
   rate_limiting:
     per_minute: 200
     per_hour: 6000
   ```

## Authentication Issues

### 401 Unauthorized

**Symptoms:**
- All requests return 401

**Solutions:**

1. **Check token:**
   ```bash
   # Get new token
   curl -X POST http://localhost:7474/auth/token \
     -d "grant_type=password&username=admin&password=admin"
   ```

2. **Check auth is disabled (dev only):**
   ```bash
   NORNICDB_NO_AUTH=true
   ```

3. **Check JWT secret:**
   ```bash
   # Must be at least 32 characters
   NORNICDB_JWT_SECRET="your-32-character-secret-key-here"
   ```

### 403 Forbidden

**Symptoms:**
- Authenticated but access denied

**Solutions:**

1. **Check user role:**
   ```bash
   # User needs appropriate permissions
   nornicdb user update alice --role editor
   ```

2. **Check endpoint permissions:**
   - `/status` requires `read` permission
   - `/metrics` requires `read` permission
   - Admin endpoints require `admin` permission

## Performance Issues

### Slow Queries

**Symptoms:**
- High latency
- Timeouts

**Solutions:**

1. **Enable query caching:**
   ```bash
   nornicdb serve --query-cache-size=5000
   ```

2. **Check query complexity:**
   ```cypher
   // Bad: Unbounded traversal
   MATCH (n)-[*]->(m) RETURN n, m
   
   // Good: Limited depth
   MATCH (n)-[*1..3]->(m) RETURN n, m LIMIT 100
   ```

3. **Add indexes:**
   ```cypher
   CREATE INDEX FOR (n:Person) ON (n.email)
   ```

4. **Enable parallel execution:**
   ```bash
   nornicdb serve --parallel=true
   ```

### High Memory Usage

**Symptoms:**
- OOM errors
- Slow performance

**Solutions:**

1. **Set memory limit:**
   ```bash
   nornicdb serve --memory-limit=2GB
   ```

2. **Increase GC frequency:**
   ```bash
   nornicdb serve --gc-percent=50
   ```

3. **Enable object pooling:**
   ```bash
   nornicdb serve --pool-enabled=true
   ```

4. **Docker memory limit:**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 4G
   ```

### High CPU Usage

**Symptoms:**
- CPU at 100%
- Slow responses

**Solutions:**

1. **Limit parallel workers:**
   ```bash
   nornicdb serve --parallel-workers=2
   ```

2. **Check for expensive queries:**
   ```bash
   # Enable query logging
   nornicdb serve --log-queries
   ```

3. **Check embedding queue:**
   ```bash
   curl http://localhost:7474/status | jq .embeddings
   ```

## Data Issues

### Data Not Persisting

**Symptoms:**
- Data lost on restart

**Solutions:**

1. **Check volume mount:**
   ```bash
   docker inspect nornicdb | grep Mounts
   ```

2. **Check data directory:**
   ```bash
   ls -la /data
   ```

3. **Check disk space:**
   ```bash
   df -h
   ```

### Corrupted Data

**Symptoms:**
- Read errors
- Inconsistent results

**Solutions:**

1. **Verify data:**
   ```bash
   nornicdb verify --check-all
   ```

2. **Restore from backup:**
   ```bash
   nornicdb restore --input backup.tar.gz
   ```

3. **Rebuild indexes:**
   ```bash
   nornicdb admin rebuild-indexes
   ```

## Embedding Issues

### Embeddings Not Generating

**Symptoms:**
- Nodes without embeddings
- Search not working

**Solutions:**

1. **Check embedding service:**
   ```bash
   curl http://localhost:11434/api/embed \
     -d '{"model":"mxbai-embed-large","input":"test"}'
   ```

2. **Check configuration:**
   ```bash
   NORNICDB_EMBEDDING_URL=http://ollama:11434
   NORNICDB_EMBEDDING_MODEL=mxbai-embed-large
   ```

3. **Check pending queue:**
   ```bash
   curl http://localhost:7474/status | jq .embeddings.pending
   ```

4. **Trigger regeneration:**
   ```bash
   curl -X POST http://localhost:7474/nornicdb/embed/trigger?regenerate=true
   ```

## Docker Issues

### Container Won't Start

**Solutions:**

1. **Check logs:**
   ```bash
   docker logs nornicdb
   ```

2. **Check image:**
   ```bash
   docker pull timothyswt/nornicdb-arm64-metal:latest
   ```

3. **Check resources:**
   ```bash
   docker system df
   ```

### Permission Denied

**Solutions:**

1. **Fix volume permissions:**
   ```bash
   docker run --rm -v nornicdb-data:/data busybox chown -R 1000:1000 /data
   ```

2. **Run as root (not recommended):**
   ```yaml
   security_opt:
     - no-new-privileges:false
   ```

## Getting Help

### Collect Diagnostics

```bash
# System info
uname -a
docker version
go version

# NornicDB info
curl http://localhost:7474/status

# Logs
docker logs nornicdb > nornicdb.log 2>&1
```

### Log Locations

| Deployment | Location |
|------------|----------|
| Docker | `docker logs nornicdb` |
| Systemd | `journalctl -u nornicdb` |
| Binary | `./nornicdb.log` |

## See Also

- **[Monitoring](monitoring.md)** - Health monitoring
- **[Deployment](deployment.md)** - Deployment guide
- **[Scaling](scaling.md)** - Performance tuning

