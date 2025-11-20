# Mimir - AI Platform for Code Intelligence

Complete AI-powered development platform bringing advanced chat, visual workflow orchestration, and intelligent code indexing directly to your editor.

## 🚀 Features

### 💬 Portal - Advanced AI Chat
- **Graph-RAG Search**: Multi-hop knowledge graph traversal through your codebase
- **File Attachments**: Upload and reference files in your conversations
- **Vector Search Configuration**: Fine-tune similarity thresholds, search depth, and result limits
- **Persistent Context**: Conversation history maintained across sessions
- **Native Chat Participant**: Use `@mimir` in VSCode's native chat panel

### 🎨 Studio - Multi-Agent Workflow Orchestration
- **Visual Workflow Builder**: Drag-and-drop interface for designing complex agent workflows
- **Multi-Agent Coordination**: Define specialized agents with custom roles and responsibilities
- **Parallel Execution**: Run independent tasks simultaneously for faster completion
- **Quality Control Agents**: Automated verification and iteration on task outputs
- **Deliverables Management**: Download markdown reports and artifacts from completed workflows
- **Real-time Progress**: Watch workflows execute with live status updates

### 🔍 Code Intelligence - Smart Indexing & Analysis
- **Folder Watching**: Automatically index and track changes in your workspace folders
- **Statistics Dashboard**: View file counts, chunks, and embeddings across your codebase
- **File Type Breakdown**: Analyze your project composition by file extensions
- **Selective Indexing**: Choose which folders to index with custom patterns
- **Docker-Aware Paths**: Seamless path translation for containerized environments
- **Embedding Generation**: Automatic vector embeddings for semantic code search

## 📋 Requirements

- VSCode 1.95.0 or higher (or compatible forks like Cursor, Windsurf)
- Mimir server running (default: `http://localhost:9042`)
- Docker Desktop (if using containerized Mimir)

## ⚙️ Quick Start

### 1. Configure the Mimir Server Endpoint

**Via Settings UI**:
1. Open Settings: `CMD+,` (Mac) or `CTRL+,` (Windows/Linux)
2. Search for "Mimir API URL"
3. Set to your server endpoint:
   - Docker: `http://localhost:9042` (default)
   - Local dev: `http://localhost:3000`
   - Remote: `http://your-server:port`

**Via settings.json**:
```json
{
  "mimir.apiUrl": "http://localhost:9042"
}
```

### 2. Access Mimir Features

**Command Palette** (`CMD/CTRL + Shift + P`):
- `Mimir: Open Chat` - Launch the Portal chat interface
- `Mimir: Open Code Intelligence` - View indexing statistics and manage folders
- `Mimir: Open Studio` - Create and manage multi-agent workflows
- `Mimir: Ask a Question` - Quick query without opening full UI

**Native Chat**: Type `@mimir` in VSCode's chat panel

## 💡 Usage Examples

### Portal - AI Chat

1. **Ask questions with file context**:
   - Click the attachment button to upload files
   - Configure vector search settings via the ⚙️ button
   - Get intelligent responses based on your codebase

2. **Adjust search parameters**:
   - **Similarity Threshold**: How closely results must match (0.0-1.0)
   - **Max Results**: Number of search results to retrieve
   - **Search Depth**: How many graph hops to traverse (1-3)

### Studio - Workflow Orchestration

1. **Create a workflow**:
   - Click "New Workflow" in the Studio
   - Drag task nodes onto the canvas
   - Connect dependencies between tasks
   - Assign specialized agent roles and QC reviewers

2. **Execute workflows**:
   - Click "Execute Workflow" to start
   - Watch real-time progress for each task
   - Review quality control feedback
   - Download deliverables when complete

### Code Intelligence

1. **Index your codebase**:
   - Click "Add Folder" in Code Intelligence
   - Select a workspace folder to index
   - Watch as files are chunked and embedded

2. **Monitor statistics**:
   - View total files, chunks, and embeddings
   - See file type distribution
   - Track last sync times for each folder

### Native Chat Participant (`@mimir`)

For quick questions in VSCode's chat panel, use `@mimir`:

```
@mimir what is Neo4j?
@mimir -u research analyze this architecture
@mimir -m gpt-4.1 -d 3 comprehensive analysis
```

**Available Flags**:
- `--use` / `-u`: Preamble/chatmode name
- `--model` / `-m`: Model selection
- `--depth` / `-d`: Vector search depth (1-3)
- `--limit` / `-l`: Max search results
- `--similarity` / `-s`: Similarity threshold (0-1)

## 🎛️ Configuration

Access settings via `Preferences > Settings > Mimir`:

### Core Settings
- **`mimir.apiUrl`**: Mimir server URL (default: `http://localhost:9042`)
- **`mimir.model`**: Default LLM model (e.g., `gpt-4.1`, `claude-3-opus-20240229`)
- **`mimir.defaultPreamble`**: Default system prompt/chatmode

### Vector Search
- **`mimir.vectorSearch.depth`**: Graph traversal depth 1-3 (default: `1`)
- **`mimir.vectorSearch.limit`**: Max search results (default: `10`)
- **`mimir.vectorSearch.minSimilarity`**: Similarity threshold 0-1 (default: `0.5`)

### Advanced
- **`mimir.enableTools`**: Enable MCP tool calling (default: `true`)
- **`mimir.maxToolCalls`**: Max tool calls per response (default: `3`)

## 🏗️ Architecture

Mimir uses a graph-based RAG architecture combining:
- **Neo4j**: Graph database for relationships and context
- **Vector Embeddings**: Semantic search across your codebase
- **Multi-Agent System**: Coordinated AI agents with specialized roles
- **Real-time Indexing**: File watchers that track code changes
- **Docker Integration**: Seamless containerized deployment

## 📚 Documentation

For comprehensive documentation:
- [Getting Started Guide](../docs/getting-started/)
- [Configuration Guide](../docs/configuration/)
- [Architecture Overview](../docs/architecture/)
- [API Documentation](../docs/)

## 🤝 Contributing

Contributions welcome! Please see the main repository for guidelines.

## 🔧 Development

### Building the Extension

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Build webviews
npm run build

# Package extension
npm run package
```

### Development Mode

1. Open the `vscode-extension` folder in VSCode
2. Press `F5` to launch Extension Development Host
3. Test features in the development window
4. Changes to TypeScript require recompiling
5. Changes to webviews require rebuilding

### Testing

```bash
npm test
```

## 📄 License

MIT - See LICENSE file for details

## 🔗 Links

- [Main Repository](https://github.com/orneryd/Mimir)
- [Issues & Feature Requests](https://github.com/orneryd/Mimir/issues)
- [Documentation](../docs/)

---

**Made with ⚡ by the Mimir team**
