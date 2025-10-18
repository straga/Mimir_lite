# Docker volume mount strategy for MCP server

This document defines the recommended Docker volume and permission strategy to persist the MCP memory store file, logs, and configuration files safely and portably.

- **App data path (in container)**: `/app/data`
- **Default memory store path**: `/app/data/.mcp-memory-store.json`
- **Config path (in container)**: `/app/config`
- **Logs path (in container)**: `/app/logs`

Design goals
- Keep runtime data persistent and recoverable across container restarts.
- Minimize attack surface by using least privilege (non-root user) and read-only mounts for static config.
- Ensure atomic writes for the memory store to avoid corruption.
- Make strategy work for Docker Compose and Kubernetes (or single-container Docker).

Recommended mounts

1) Persistent memory store (required)
- Host mapping (developer/local): `./data:/app/data:rw`
- Named volume (recommended for production): `mcp_data:/app/data`
- Mount options: keep read-write and ensure container process user has ownership.
- Behavior: container writes a single JSON file at `/app/data/.mcp-memory-store.json` (atomic-write: write to temp file then rename).

2) Configuration files (recommended read-only)
- Host mapping: `./config:/app/config:ro`
- Purpose: keep config files (YAML/JSON) outside the image so ops can change settings without rebuilding.
- Mount as read-only so the running process cannot mutate configuration.

3) Logs (optional but recommended)
- Host mapping: `./logs:/app/logs:rw` or `mcp_logs:/app/logs`
- If the app writes logs to files, mount a writable volume. Consider log rotation outside the container.
- Alternatively, prefer writing logs to stdout/stderr and using the container runtime to collect them (preferred for 12-factor apps).

Dockerfile guidance (create non-root user and set permissions)

```dockerfile
FROM node:20-slim
# create non-root user
RUN groupadd -g 1000 mcp && useradd -r -u 1000 -g mcp mcp
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY build ./build
# ensure persistent directories exist and are owned by non-root user
RUN mkdir -p /app/data /app/config /app/logs \
    && chown -R mcp:mcp /app/data /app/config /app/logs \
    && chmod 750 /app/data /app/config /app/logs
USER mcp
ENV NODE_ENV=production
CMD ["node","build/index.js"]
```

Docker Compose example

```yaml
services:
  mcp-server:
    image: myorg/mcp-server:latest
    user: "1000:1000"
    volumes:
      - ./data:/app/data:rw
      - ./config:/app/config:ro
      - ./logs:/app/logs:rw
    environment:
      - MCP_MEMORY_STORE_PATH=/app/data/.mcp-memory-store.json
      - MCP_MEMORY_SAVE_INTERVAL=60
      - MCP_MEMORY_TODO_TTL=2592000
```

Kubernetes hints
- Use `emptyDir` for ephemeral storage or a `PersistentVolumeClaim` for durable storage.
- Set `securityContext.runAsUser` and `fsGroup` to the UID/GID used in the image so mounted volumes are writable by the process.

Security & permissions
- Run the process as a non-root user inside the container and avoid mounting volumes as root-owned writeable folders without adjusting ownership.
- Set restrictive file permissions on the memory store file (owner read/write only, e.g., `0600`). If using an init script, ensure it `chown`/`chmod` the file before the app starts.
- Mount configuration directories read-only where possible.
- For SELinux hosts, use `:z` or `:Z` flags on mounts as appropriate (e.g., `./data:/app/data:rw,z`).
- Limit container capabilities; use runtime security profiles (AppArmor/SELinux) if available.

Atomic writes and corruption avoidance
- The application should write the memory store atomically: write to `/app/data/.mcp-memory-store.json.tmp` then rename to `.mcp-memory-store.json`.
- Flush to disk (fsync) on critical write paths if durability is required.

Backups and retention
- Backup the host `./data` directory or the PVC regularly.
- Consider externalizing long-term storage (S3, database) for large or long-lived histories.

Environment variables (recommended)
- `MCP_MEMORY_STORE_PATH` — path to the memory store file inside container. Default: `/app/data/.mcp-memory-store.json`
- `MCP_MEMORY_SAVE_INTERVAL` — how often the server persists memory to disk (seconds). Default: `60` (every 60s)
- `MCP_MEMORY_TODO_TTL` — default time-to-live for TODO items (seconds). Default: `2592000` (30 days)
- `MCP_LOG_DIR` — directory where logs are stored. Default: `/app/logs` (optional)
- `MCP_CONFIG_DIR` — directory where config files are read. Default: `/app/config`
- `MCP_RUN_AS_UID` — UID to run as or to chown files to (optional, helpful in orchestrators)
- `MCP_RUN_AS_GID` — GID to run as (optional)
- `MCP_MEMORY_FILE_MODE` — file mode for created memory file (e.g., `600`)

Operational notes
- Prefer stdout/stderr for logs and use the container runtime's log driver. File-based logging requires rotation and monitoring.
- Test mount ownership in CI by running a container that prints `id` and `ls -l /app` to verify permissions.
- When upgrading the container image, keep the data volume mounted to preserve state.

Troubleshooting
- If the app cannot write to `/app/data` check the container UID, host filesystem permissions, and SELinux context.
- For Kubernetes, if files appear root-owned, set `securityContext.fsGroup` to the group the process uses.

Appendix — minimal docker run example

```bash
mkdir -p ./data ./config ./logs
docker run --rm \
  -v "$(pwd)/data:/app/data:rw" \
  -v "$(pwd)/config:/app/config:ro" \
  -e MCP_MEMORY_STORE_PATH=/app/data/.mcp-memory-store.json \
  -e MCP_MEMORY_SAVE_INTERVAL=60 \
  myorg/mcp-server:latest
```
