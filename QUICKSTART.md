# Mimir Quick Start Guide

Get Mimir running in 5 minutes.

## Step 1: Install Prerequisites

Install these if you don't have them:

- **Docker Desktop** → https://www.docker.com/products/docker-desktop/
- **Node.js 18+** → https://nodejs.org/
- **Git** → https://git-scm.com/

## Step 2: Clone and Configure

```bash
# Clone the repository
git clone https://github.com/orneryd/Mimir.git
cd Mimir

# Create your config file
cp env.example .env

# (Optional) Edit .env to change password or workspace path
# Default password is "password" - change it for production!
```

## Step 3: Start Services

```bash
# Start everything with Docker
docker compose up -d

# Wait 30 seconds for services to start
# Check status
docker compose ps
```

You should see:
- ✅ `neo4j_db` - Running
- ✅ `copilot_api_server` - Running  
- ✅ `mcp_server` - Running

## Step 4: Verify It's Working

Open these URLs in your browser:

1. **Neo4j Browser**: http://localhost:7474
   - Username: `neo4j`
   - Password: `password` (or what you set in .env)

2. **MCP Server Health**: http://localhost:9042/health
   - Should show: `{"status":"ok"}`

## Step 5: Use With Your AI Assistant

### For Claude Desktop

Edit your Claude config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this:

```json
{
  "mcpServers": {
    "mimir": {
      "command": "node",
      "args": ["C:\\path\\to\\Mimir\\build\\index.js"]
    }
  }
}
```

### For VS Code / Cursor

Add to your `settings.json`:

```json
{
  "mcpServers": {
    "mimir": {
      "command": "node",
      "args": ["/path/to/Mimir/build/index.js"]
    }
  }
}
```

## Done! 🎉

Now your AI assistant can:
- Create and manage tasks
- Store context permanently
- Build knowledge graphs
- Remember across conversations

## Quick Commands

```bash
# View logs
docker compose logs mcp-server

# Restart everything
docker compose restart

# Stop everything
docker compose down

# Start with Ollama (for local embeddings)
docker compose --profile ollama up -d
```

## Troubleshooting

**Services won't start?**
```bash
docker compose down
docker compose up -d
docker compose logs
```

**Neo4j won't open?**
- Wait 60 seconds after starting (it takes time)
- Check logs: `docker compose logs neo4j`

**Port conflicts?**
- Change ports in `docker-compose.yml`
- Edit the `ports:` section (change first number only)

## Next Steps

- Read the [full README](README.md) for detailed documentation
- Check [AGENTS.md](AGENTS.md) for AI agent patterns
- Explore Neo4j Browser to see your knowledge graph

## Need Help?

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/orneryd/Mimir/issues)
- 💬 [Discussions](https://github.com/orneryd/Mimir/discussions)
