# macOS Service Setup

Run mimir-lite as a background service using launchd.

## Prerequisites

### Neo4j

```bash
# Start Neo4j in Docker
cd /path/to/mimir-lite/docker
docker compose -f docker-compose.neo4j.yml up -d
```

### Ollama (local embeddings)

```bash
# Install Ollama
brew install ollama

# Start Ollama service
brew services start ollama

# Download embedding model
ollama pull mxbai-embed-large
```

Verify Ollama is running:
```bash
curl http://localhost:11434/api/tags
# Should list available models including mxbai-embed-large
```

## Quick Start

```bash
# 1. Build mimir-lite (if not done)
cd /path/to/mimir-lite
npm install
npm run build

# 2. Install service
cd macos
chmod +x install.sh uninstall.sh
cd ..
```

## Monitoring

### Check if service is running

```bash
# Shows PID if running, "-" or nothing if not
launchctl list | grep mimir

# Example output when running:
# 12345   0   com.mimir-lite
#   ^     ^
#   PID   exit code (0 = ok)
```

### Health check

```bash
curl http://localhost:3000/health
# Returns: {"status":"ok"} if working
```

### View logs

Logs are stored in `mimir-lite/logs/` directory:

```bash
# Watch live logs (stdout)
tail -f /path/to/mimir-lite/logs/mimir.log

# Watch errors (stderr)
tail -f /path/to/mimir-lite/logs/mimir-error.log

# View last 50 lines
tail -50 /path/to/mimir-lite/logs/mimir.log

# Search for errors
grep -i error /path/to/mimir-lite/logs/mimir*.log
```

## Service Commands

```bash
# Stop service
launchctl unload ~/Library/LaunchAgents/com.mimir-lite.plist

# Start service
launchctl load ~/Library/LaunchAgents/com.mimir-lite.plist

# Restart (stop + start)
launchctl unload ~/Library/LaunchAgents/com.mimir-lite.plist && \
launchctl load ~/Library/LaunchAgents/com.mimir-lite.plist

# Uninstall completely
./uninstall.sh
```

## Configuration

Edit `~/Library/LaunchAgents/com.mimir-lite.plist` after installation to change:
- Port (default: 3000)
- Neo4j connection
- Embeddings settings

After editing, restart the service:
```bash
launchctl unload ~/Library/LaunchAgents/com.mimir-lite.plist
launchctl load ~/Library/LaunchAgents/com.mimir-lite.plist
```

## Claude Code MCP Config

Since mimir-lite runs as a service, configure MCP with URL only (no command):

```json
{
  "mcpServers": {
    "mimir_local": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### With Path Mapping (remote server)

When connecting to a remote mimir-lite server, use `X-Mimir-Path-Map` to translate paths:

```json
{
  "mcpServers": {
    "mimir_server": {
      "type": "http",
      "url": "http://server:3000/mcp",
      "headers": {
        "X-Mimir-Path-Map": "[\"/workspace/project=/home/user/project\"]"
      }
    }
  }
}
```

Format: `server_path=client_path` for each mapping.

## Troubleshooting

### Service won't start

```bash
# Check if port 3000 is already in use
lsof -i :3000

# Check error logs
cat /path/to/mimir-lite/logs/mimir-error.log

# Check Neo4j is running
curl http://localhost:7474
# or
docker ps | grep neo4j
```

### Service starts but crashes

```bash
# Check exit code
launchctl list | grep mimir
# Second column is exit code:
#   0 = running ok
#   non-zero = crashed with that exit code

# Check what happened
tail -100 /path/to/mimir-lite/logs/mimir-error.log
```

### "bun not found" error

The install script auto-detects bun path. If it fails:
```bash
# Find bun path
which bun

# Manually edit the installed plist
nano ~/Library/LaunchAgents/com.mimir-lite.plist
# Replace BUN_PATH with actual path like /opt/homebrew/bin/bun
```

### Clear logs

```bash
# Truncate log files (keeps files, removes content)
> /path/to/mimir-lite/logs/mimir.log
> /path/to/mimir-lite/logs/mimir-error.log
```
