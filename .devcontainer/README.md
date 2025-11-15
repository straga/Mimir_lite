# VS Code Dev Container for Mimir

## 🎯 Benefits of Using Dev Containers

### 1. **Consistent Development Environment**
- Everyone on the team gets the exact same setup
- No "works on my machine" issues
- All dependencies pre-installed and configured
- Same Node.js version, same tools, same extensions

### 2. **Zero Setup Time for New Developers**
- Clone repo → Open in VS Code → Start coding (in ~5 minutes)
- No manual installation of Node.js, npm, TypeScript, etc.
- No Docker setup headaches
- Pre-configured VS Code extensions automatically installed

### 3. **Isolation & Safety**
- Project dependencies don't pollute your host machine
- Multiple projects with different Node versions? No problem
- Test breaking changes without affecting your system
- Clean teardown: delete container, start fresh

### 4. **Full Stack Development**
- Neo4j database running and accessible
- Ollama for embeddings
- Copilot API for LLM access
- All services networked together
- Hot reload for both backend and frontend

### 5. **Pre-configured Tooling**
- ESLint, Prettier, TypeScript IntelliSense all working
- Neo4j extension with database connections configured
- Docker extension to manage services
- GitLens for enhanced Git workflows
- Tailwind CSS IntelliSense for frontend work

### 6. **Performance**
- Faster file watching (no cross-platform issues)
- Direct container networking (no localhost complications)
- Optimized Docker volume mounts
- Better resource allocation

### 7. **Reproducible Debugging**
- Everyone debugs the same environment
- Network issues? Same across all machines
- Port conflicts? Handled automatically
- Consistent paths and permissions

## 🚀 Quick Start

### Prerequisites
- VS Code with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- Docker Desktop running

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/orneryd/Mimir.git
   cd Mimir
   ```

2. **Open in Dev Container**
   - Open folder in VS Code
   - Click "Reopen in Container" notification, OR
   - Press `F1` → "Dev Containers: Reopen in Container"

3. **Wait for setup** (~3-5 minutes first time)
   - Container builds
   - Dependencies install
   - Services start (Neo4j, Ollama, Copilot API)
   - Extensions install

4. **Start developing!**
   ```bash
   # Backend development
   npm run dev
   
   # Frontend development
   cd frontend
   npm run dev
   
   # Build everything
   npm run build:all
   ```

## 📦 What's Included

### Pre-installed VS Code Extensions
- **TypeScript/JavaScript**: ESLint, Prettier, TypeScript language features
- **Docker**: Docker extension for managing containers
- **Neo4j**: Database client and query tools
- **Git**: GitLens, GitHub PR integration
- **React**: React snippets, Tailwind CSS IntelliSense
- **Utilities**: Path IntelliSense, Error Lens, TODO Highlight

### Services Running
- **Neo4j** (ports 7474, 7687) - Graph database
- **Copilot API** (port 4141) - LLM access
- **Ollama** (port 11434) - Local embeddings
- **Mimir Server** (ports 3000, 9042) - Main application

### Development Tools
- Node.js 22
- TypeScript, ts-node
- nodemon for auto-restart
- npm-check-updates
- Git, GitHub CLI
- Docker-in-Docker support

## 🔧 Configuration

### Environment Variables
Edit `.devcontainer/devcontainer.json` to customize:
```json
"remoteEnv": {
  "NODE_ENV": "development",
  "NEO4J_PASSWORD": "your-password"
}
```

### Neo4j Connection
Pre-configured profile in VS Code:
- Host: `neo4j`
- Port: `7687`
- Username: `neo4j`
- Password: `password`

### Port Forwarding
All ports automatically forwarded to your host:
- `localhost:7474` - Neo4j Browser
- `localhost:9042` - Mimir MCP Server
- `localhost:5173` - Frontend Dev Server

## 🛠️ Common Tasks

### Rebuild Container
```bash
# In VS Code
F1 → "Dev Containers: Rebuild Container"
```

### View Logs
```bash
# Inside container
docker compose logs -f neo4j
docker compose logs -f ollama
```

### Run Tests
```bash
npm test
npm run test:unit
npm run test:e2e
```

### Access Neo4j Browser
Open `http://localhost:7474` in your browser

### Frontend Development
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

## 🎓 Learning Resources

- [VS Code Dev Containers Docs](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container Specification](https://containers.dev/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

## 🐛 Troubleshooting

### "Cannot connect to Neo4j"
```bash
# Check if Neo4j is healthy
docker compose ps
docker compose logs neo4j
```

### "Port already in use"
Edit `.devcontainer/devcontainer.json` and change port mappings

### "Out of memory"
Increase Docker Desktop memory allocation:
- Docker Desktop → Settings → Resources → Memory

### "Extensions not installing"
Rebuild container: `F1 → Dev Containers: Rebuild Container`

## 📊 Performance Comparison

| Scenario | Local Setup | Dev Container |
|----------|-------------|---------------|
| Initial Setup | 30-60 min | 5 min |
| New Developer Onboarding | 2-4 hours | 10 min |
| Environment Consistency | Variable | 100% |
| Service Management | Manual | Automatic |
| Cleanup/Reset | Difficult | 1 command |
| Cross-platform Issues | Common | Rare |

## 🎯 Use Cases

### Perfect For:
- ✅ New team members joining
- ✅ Contributing to open source
- ✅ Testing on clean environment
- ✅ Teaching/workshops
- ✅ Multiple projects with different Node versions
- ✅ Developing on Windows with Linux tools

### Maybe Not For:
- ❌ Very simple single-file scripts
- ❌ Projects without Docker Desktop access
- ❌ Extremely resource-constrained machines

## 🚦 Next Steps

1. Try opening this repo in a Dev Container
2. Make a change to `src/index.ts`
3. See hot reload in action
4. Query Neo4j database
5. Test the full stack together

**Welcome to containerized development! 🎉**
