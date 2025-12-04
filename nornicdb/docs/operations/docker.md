# Docker Deployment

**Run NornicDB in Docker containers.**

## Available Images

| Image | Platform | Features |
|-------|----------|----------|
| `nornicdb-arm64-metal` | ARM64 (M1/M2) | Metal GPU acceleration |
| `nornicdb-amd64-cpu` | x86_64 | CPU only |
| `nornicdb-amd64-cuda` | x86_64 + NVIDIA | CUDA GPU acceleration |

## Quick Start

```bash
# ARM64 (Apple Silicon)
docker run -d \
  --name nornicdb \
  -p 7474:7474 \
  -p 7687:7687 \
  -v nornicdb-data:/data \
  -e NORNICDB_ADDRESS=0.0.0.0 \
  timothyswt/nornicdb-arm64-metal:latest
```

## Docker Compose

### Basic Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  nornicdb:
    image: timothyswt/nornicdb-arm64-metal:latest
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - nornicdb-data:/data
    environment:
      NORNICDB_ADDRESS: "0.0.0.0"
      NORNICDB_NO_AUTH: "true"
    restart: unless-stopped

volumes:
  nornicdb-data:
```

### With Ollama (Embeddings)

```yaml
version: '3.8'
services:
  nornicdb:
    image: timothyswt/nornicdb-arm64-metal:latest
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - nornicdb-data:/data
    environment:
      NORNICDB_ADDRESS: "0.0.0.0"
      NORNICDB_EMBEDDING_URL: "http://ollama:11434"
      NORNICDB_EMBEDDING_MODEL: "mxbai-embed-large"
    depends_on:
      - ollama
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped

volumes:
  nornicdb-data:
  ollama-data:
```

### Production Configuration

```yaml
version: '3.8'
services:
  nornicdb:
    image: timothyswt/nornicdb-arm64-metal:latest
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - /opt/nornicdb/data:/data
      - /opt/nornicdb/logs:/var/log/nornicdb
    environment:
      NORNICDB_ADDRESS: "0.0.0.0"
      NORNICDB_JWT_SECRET: "${JWT_SECRET}"
      NORNICDB_ENCRYPTION_PASSWORD: "${ENCRYPTION_PASSWORD}"
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7474/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"

volumes:
  nornicdb-data:
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NORNICDB_ADDRESS` | Bind address | `0.0.0.0` (Docker) |
| `NORNICDB_HTTP_PORT` | HTTP API port | `7474` |
| `NORNICDB_BOLT_PORT` | Bolt protocol port | `7687` |
| `NORNICDB_DATA_DIR` | Data directory | `/data` |
| `NORNICDB_NO_AUTH` | Disable authentication | `false` |
| `NORNICDB_EMBEDDING_URL` | Embedding API URL | `http://localhost:11434` |
| `NORNICDB_EMBEDDING_MODEL` | Embedding model | `mxbai-embed-large` |

## Volume Mounts

### Data Persistence

```bash
# Named volume (recommended)
-v nornicdb-data:/data

# Host directory
-v /path/on/host:/data
```

### Configuration

```bash
# Mount config file
-v /path/to/nornicdb.yaml:/config/nornicdb.yaml
```

### Models (for local embeddings)

```bash
# Mount GGUF models
-v /path/to/models:/app/models
```

## Building Custom Images

### From Dockerfile

```dockerfile
# Dockerfile
FROM timothyswt/nornicdb-arm64-metal:latest

# Add custom configuration
COPY nornicdb.yaml /config/nornicdb.yaml

# Add custom models
COPY models/ /app/models/
```

### Build

```bash
docker build -t my-nornicdb:latest .
```

## GPU Acceleration

### NVIDIA (CUDA)

```yaml
services:
  nornicdb:
    image: timothyswt/nornicdb-amd64-cuda:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Apple Silicon (Metal)

Metal GPU acceleration is automatic in the `arm64-metal` image.

## Health Checks

### Docker Health Check

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:7474/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Manual Check

```bash
docker exec nornicdb curl http://localhost:7474/health
```

## Logs

### View Logs

```bash
# Follow logs
docker logs -f nornicdb

# Last 100 lines
docker logs --tail 100 nornicdb
```

### Log Driver

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "3"
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs nornicdb

# Check resources
docker stats nornicdb
```

### Connection Refused

Ensure `NORNICDB_ADDRESS=0.0.0.0` is set for Docker.

### Permission Denied

```bash
# Fix volume permissions
docker run --rm -v nornicdb-data:/data busybox chown -R 1000:1000 /data
```

## See Also

- **[Deployment](deployment.md)** - General deployment guide
- **[Monitoring](monitoring.md)** - Container monitoring
- **[Backup & Restore](backup-restore.md)** - Data backup

