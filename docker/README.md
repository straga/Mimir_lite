# Docker Setup

Two deployment options for mimir-lite.

## Option 1: Neo4j Only (Hybrid Mode)

Neo4j in Docker, mimir-lite runs on host. Best for development on Mac/Windows.

```bash
cd docker
docker compose -f docker-compose.neo4j.yml up -d
```

Then run mimir-lite on host:
```bash
# From mimir-lite root
npm run dev
# or
bun run build/http-server.js
```

## Option 2: Full Stack

Both Neo4j and mimir-lite in Docker. Best for Ubuntu server deployment.

```bash
cd docker
docker compose up -d
```

## Files

- `Dockerfile` - mimir-lite image
- `docker-compose.yml` - Full stack (Neo4j + mimir-lite)
- `docker-compose.neo4j.yml` - Neo4j only

## Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f
docker compose logs -f mimir
docker compose logs -f neo4j

# Rebuild after code changes
docker compose up -d --build

# Check status
docker compose ps
```

## Data Persistence

Data is stored in `docker/data/`:
- `data/neo4j/` - Neo4j database
- `data/mimir/` - mimir-lite data (if any)

## Configuration

Edit `docker-compose.yml` environment variables:

```yaml
environment:
  # Neo4j connection
  - NEO4J_URI=bolt://neo4j:7687
  - NEO4J_USER=neo4j
  - NEO4J_PASSWORD=password

  # Embeddings
  - MIMIR_EMBEDDINGS_PROVIDER=ollama
  - MIMIR_EMBEDDINGS_API=http://172.17.0.1:11434  # Host Ollama from Docker
  - MIMIR_EMBEDDINGS_MODEL=mxbai-embed-large

  # Search
  - MIMIR_MIN_SIMILARITY=0.5
```

## Mounting Project Folders

To index files, mount them as volumes in `docker-compose.yml`:

```yaml
volumes:
  - /home/user/projects:/workspace/projects:ro
  - /home/user/docs:/workspace/docs:ro
```

## Path Mapping (X-Mimir-Path-Map)

When server paths differ from client paths, use the `X-Mimir-Path-Map` header.
Array format recommended for readability:

```json
{
  "mcpServers": {
    "mimir_server": {
      "type": "http",
      "url": "http://server:3000/mcp",
      "headers": {
        "X-Mimir-Path-Map": "[\"/workspace/project=/home/user/project\", \"/workspace/docs=/home/user/docs\"]"
      }
    }
  }
}
```

Format: JSON array as string `["server_path=client_path", ...]`

## Ollama Access from Docker

- **Linux**: `http://172.17.0.1:11434` (Docker bridge IP)
- **Mac/Windows**: `http://host.docker.internal:11434`
