# Mimir Chat Assistant for VSCode

Graph-RAG powered AI assistant with configurable chatmodes and multi-hop knowledge traversal.

## Features

- **Chat Participant API**: Native VSCode chat integration (`@mimir`)
- **Configurable Chatmodes**: Use flags to specify AI personalities per message
- **Graph-RAG Search**: Multi-hop knowledge graph traversal with configurable depth
- **Tool Calling**: Full MCP tool support for memory, files, and vector search
- **Custom Preambles**: Define your own system prompts in settings
- **Per-Message Overrides**: Override model, depth, and other settings per request

## Requirements

- VSCode 1.95.0 or higher
- Mimir server running (default: `http://localhost:9042`)

## Configuration

### Setting Up the Mimir Endpoint

The extension needs to connect to your Mimir server. Configure the endpoint in VSCode settings:

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

The extension will automatically reload when you change this setting.

## Usage

### Basic Usage

Type `@mimir` followed by your question:

```
@mimir what is Neo4j?
```

### Using Flags

Override settings per-message with flags:

**Chatmode (Preamble)**:
- `@mimir -u research what is Neo4j?`
- `@mimir --use hackerman analyze this code`

**Model Selection**:
- `@mimir -m gpt-4o-mini quick question`
- `@mimir --model claude-3-opus-20240229 complex analysis`

**Vector Search Depth**:
- `@mimir -d 3 deep question about X`
- `@mimir --depth 2 how does X relate to Y?`

**Combining Flags**:
- `@mimir -u research -m gpt-4.1 -d 3 comprehensive research question`
- `@mimir --use pm --model gpt-4 --depth 2 --limit 20 project planning`

### Available Flags

| Flag | Short | Type | Description | Example |
|------|-------|------|-------------|---------|
| `--use` | `-u` | string | Preamble/chatmode name | `-u research` |
| `--model` | `-m` | string | Model name | `-m gpt-4.1` |
| `--depth` | `-d` | number | Vector search depth (1-3) | `-d 3` |
| `--limit` | `-l` | number | Max search results | `-l 20` |
| `--similarity` | `-s` | number | Similarity threshold (0-1) | `-s 0.7` |
| `--max-tools` | `-t` | number | Max tool calls | `-t 5` |
| `--no-tools` | | boolean | Disable tools | `--no-tools` |

## Configuration

Access settings via `Preferences > Settings > Mimir`:

- `mimir.apiUrl`: Mimir server URL (default: `http://localhost:9042`)
- `mimir.defaultPreamble`: Default chatmode (default: `mimir-v2`)
- `mimir.model`: LLM model to use (default: `gpt-4.1`)
  - Examples: `gpt-4.1`, `claude-3-opus-20240229`, `llama3.1:70b`
- `mimir.vectorSearch.depth`: Graph traversal depth 1-3 (default: `1`)
- `mimir.vectorSearch.limit`: Max search results (default: `10`)
- `mimir.vectorSearch.minSimilarity`: Similarity threshold 0-1 (default: `0.5`)
- `mimir.enableTools`: Enable MCP tools (default: `true`)
- `mimir.maxToolCalls`: Max tool calls per response (default: `3`)
- `mimir.customPreamble`: Custom system prompt (overrides defaults)

## Development

```bash
npm install
npm run compile
# Press F5 in VSCode to launch extension development host
```

## License

MIT
