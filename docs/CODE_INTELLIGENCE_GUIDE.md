# 🧠 Mimir Code Intelligence Guide

## Overview

The **Code Intelligence** view provides centralized management of file indexing, chunking, and vector embeddings for your workspace. It allows you to:

- **Add/Remove folders** for automatic indexing
- **View statistics** about indexed files, chunks, and embeddings
- **Monitor folder status** in real-time
- **Analyze file types** and distribution across your codebase

This feature integrates with Mimir's Graph-RAG system to provide semantic search capabilities across your entire codebase.

---

## Table of Contents

1. [Accessing Code Intelligence](#accessing-code-intelligence)
2. [Understanding the Interface](#understanding-the-interface)
3. [Adding Folders to Index](#adding-folders-to-index)
4. [Path Validation & Docker Integration](#path-validation--docker-integration)
5. [Viewing Statistics](#viewing-statistics)
6. [Removing Folders](#removing-folders)
7. [File Type Breakdown](#file-type-breakdown)
8. [API Endpoints](#api-endpoints)
9. [Troubleshooting](#troubleshooting)

---

## Accessing Code Intelligence

### Via Command Palette

1. Open Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
2. Type: `Mimir: Open Code Intelligence`
3. Press `Enter`

The Code Intelligence panel will open in a new tab.

### Via VSCode Interface

- Look for the database icon (🗄️) in the Command Palette
- Search for "Code Intelligence" commands

---

## Understanding the Interface

### Header Section

```
🧠 Mimir Code Intelligence
File indexing, chunking, and embedding management
```

### Statistics Dashboard

Four key metrics displayed as cards:

| Metric | Icon | Description |
|--------|------|-------------|
| **Folders Watched** | 📁 | Number of directories currently being monitored |
| **Files Indexed** | 📄 | Total number of files in the knowledge graph |
| **Chunks Created** | 🧩 | Number of file chunks (for semantic search) |
| **Embeddings Generated** | 🎯 | Number of vector embeddings created |

### Indexed Folders List

Each folder displays:

- **Status indicator** (✅ active / ⏸️ stopped / ❌ error)
- **Folder path** (in monospace font)
- **File count** (📄)
- **Chunk count** (🧩)
- **Embedding count** (🎯)
- **Last synced timestamp** (⏰)
- **Remove button** (🗑️)

### File Type Breakdown

Visual breakdown of the top 10 file types in your indexed content:

- File extension (e.g., `.ts`, `.md`, `.py`)
- File count and percentage
- Progress bar showing relative distribution

---

## Adding Folders to Index

### Step-by-Step Process

1. **Click "Add Folder" button**
   - Located in the top-right of the "Indexed Folders" section

2. **Select a folder**
   - A native folder picker dialog will appear
   - Navigate to the folder you want to index
   - Click "Select Folder to Index"

3. **Path validation**
   - Mimir validates the path is within your mounted workspace
   - For Docker users: Only folders within `HOST_WORKSPACE_ROOT` can be indexed
   - For local users: Any workspace folder can be indexed

4. **Progress notification**
   - "📁 Indexing Folder: Sending request to Mimir server..."
   - Success: "✅ Folder added to indexing: [path]"
   - Error: Displays specific error message

5. **Automatic indexing**
   - Files are automatically indexed in the background
   - Chunks are created for each file
   - Embeddings are generated (if enabled)

### What Gets Indexed

By default:
- **All files** in the folder
- **Recursively** through subdirectories
- **Excludes** files in `.gitignore`
- **Generates embeddings** for semantic search

---

## Path Validation & Docker Integration

### Docker Path Translation

If you're running Mimir in Docker (with `HOST_WORKSPACE_ROOT` set):

#### Valid Paths

```
✅ VALID: /Users/you/src/Mimir/frontend
   (within /Users/you/src/Mimir - mounted to /workspace)

✅ VALID: /Users/you/src/Mimir/docs
   (child of mounted workspace)
```

#### Invalid Paths

```
❌ INVALID: /Users/you/other-project
   (outside mounted workspace)

❌ INVALID: /Users/you/Documents/notes
   (not within HOST_WORKSPACE_ROOT)
```

### Error Messages

**Folder Outside Workspace:**
```
❌ Cannot index folder: Folder is outside the mounted workspace.

Mounted workspace: /Users/you/src/Mimir
Selected folder: /Users/you/other-project

Only folders within the mounted workspace can be indexed.
```

**Not Within VSCode Workspace:**
```
❌ Cannot index folder: Selected folder is not within the current workspace

Only folders within your open VSCode workspace can be indexed.
```

### How Path Translation Works

1. **Host Path**: VSCode provides the path on your local machine
   - Example: `/Users/you/src/Mimir/frontend`

2. **Path Validation**: Extension checks if path is within workspace
   - Compares against `HOST_WORKSPACE_ROOT` environment variable

3. **Path Translation**: Converts host path to container path
   - Host: `/Users/you/src/Mimir/frontend`
   - Container: `/workspace/frontend`

4. **Server Indexing**: Mimir server indexes using container path
   - Server runs inside Docker container
   - Sees files at `/workspace/*`

---

## Viewing Statistics

### Aggregate Statistics

**Location**: Top of the page, displayed as cards

**Metrics**:

- **Total Folders**: How many directories are being watched
- **Total Files**: Sum of all indexed files
- **Total Chunks**: Sum of all file chunks created
- **Total Embeddings**: Sum of all vector embeddings

**Use Cases**:
- Monitor indexing progress
- Understand codebase size
- Track embedding coverage

### Per-Folder Statistics

**Location**: Each folder in the "Indexed Folders" list

**Metrics** (per folder):

- **File Count**: Files in this specific folder
- **Chunk Count**: Chunks created from these files
- **Embedding Count**: Embeddings generated for these files
- **Last Sync**: When this folder was last indexed

**Use Cases**:
- Compare indexing across different folders
- Identify folders with low embedding coverage
- Debug indexing issues

---

## Removing Folders

### Removal Process

1. **Click "Remove" button** (🗑️) next to the folder
2. **Confirmation dialog** appears:
   ```
   Remove folder from indexing?
   
   /workspace/docs
   
   This will delete all indexed chunks and embeddings for this folder.
   ```
3. **Click "OK"** to confirm
4. **What happens**:
   - Folder is removed from watch list
   - All indexed `File` nodes are deleted
   - All `FileChunk` nodes are deleted
   - All embeddings are deleted
   - Statistics are updated

### Important Notes

⚠️ **Data Loss Warning**: Removing a folder deletes all its indexed data from Neo4j. You'll need to re-add and re-index if you want it back.

✅ **Safe Operation**: The actual files on your filesystem are not touched. Only the indexed metadata is removed.

---

## File Type Breakdown

### What It Shows

The **File Type Breakdown** section displays:

- **Top 10 file extensions** by count
- **Number of files** per extension
- **Percentage** of total files
- **Visual progress bar** for each type

### Example

```
📋 File Type Breakdown

.ts                    1,234 files (45.2%)
████████████████████████████████████████

.tsx                   678 files (24.8%)
████████████████████████

.md                    456 files (16.7%)
████████████████

.json                  234 files (8.6%)
████████

.js                    128 files (4.7%)
████

...
```

### Use Cases

- **Identify dominant languages** in your codebase
- **Understand code distribution** across file types
- **Spot unexpected file types** (e.g., compiled artifacts)
- **Verify indexing coverage** by file type

---

## API Endpoints

The Code Intelligence view communicates with these backend endpoints:

### `GET /api/indexed-folders`

**Returns**: List of all watched folders with statistics

**Response**:
```json
{
  "folders": [
    {
      "path": "/workspace/src",
      "fileCount": 234,
      "chunkCount": 1456,
      "embeddingCount": 1456,
      "status": "active",
      "lastSync": "2025-11-19T10:30:00Z",
      "patterns": null
    }
  ]
}
```

### `POST /api/index-folder`

**Adds a folder to the watch/index system**

**Request Body**:
```json
{
  "path": "/workspace/docs",
  "hostPath": "/Users/you/src/Mimir/docs",
  "recursive": true,
  "generate_embeddings": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Folder added to indexing: /workspace/docs",
  "path": "/workspace/docs",
  "hostPath": "/Users/you/src/Mimir/docs",
  "config": {
    "id": "watch-1234567890",
    "path": "/workspace/docs",
    "recursive": true,
    "generate_embeddings": true
  }
}
```

### `DELETE /api/indexed-folders`

**Removes a folder and deletes its indexed data**

**Request Body**:
```json
{
  "path": "/workspace/docs"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Folder removed from indexing: /workspace/docs",
  "path": "/workspace/docs"
}
```

### `GET /api/index-stats`

**Returns aggregate statistics**

**Response**:
```json
{
  "totalFolders": 3,
  "totalFiles": 1456,
  "totalChunks": 8923,
  "totalEmbeddings": 8923,
  "byType": {
    "SourceFile": 1234,
    "DocumentFile": 222
  },
  "byExtension": {
    ".ts": 678,
    ".tsx": 345,
    ".md": 234,
    ".json": 199
  }
}
```

---

## Troubleshooting

### Folder Not Appearing in List

**Problem**: Added a folder but it doesn't show up

**Solutions**:

1. **Click Refresh** (🔄) button
2. **Check server logs** for errors:
   ```bash
   docker logs mimir-server
   ```
3. **Verify path** is within workspace:
   ```bash
   echo $HOST_WORKSPACE_ROOT
   ```

### "Folder is outside the mounted workspace" Error

**Problem**: Cannot add folder due to path restrictions

**Solutions**:

1. **Check Docker mount**:
   ```bash
   docker inspect mimir-server | grep Mounts -A 20
   ```

2. **Verify environment variables**:
   ```bash
   docker exec mimir-server env | grep WORKSPACE
   ```

3. **Only add folders within mounted workspace**:
   - If `~/src` is mounted, only folders within `~/src` can be indexed
   - Open a workspace within the mounted directory

### Indexing Taking Too Long

**Problem**: Files are being indexed very slowly

**Solutions**:

1. **Check if embeddings are enabled**:
   - Embeddings add significant time (100ms delay per file by default)
   - Monitor with: `docker logs -f mimir-server`

2. **Adjust embedding delay**:
   ```bash
   # In .env or docker-compose.yml
   MIMIR_EMBEDDINGS_DELAY_MS=50  # Faster, but may overwhelm Ollama
   ```

3. **Check Ollama service**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Statistics Not Updating

**Problem**: Numbers seem outdated or incorrect

**Solutions**:

1. **Click Refresh** button
2. **Check Neo4j connection**:
   ```bash
   docker logs mimir-server | grep Neo4j
   ```
3. **Verify files were actually indexed**:
   ```cypher
   MATCH (f:File) RETURN count(f)
   ```

### Files Not Being Found in Search

**Problem**: Files are indexed but not appearing in vector search

**Solutions**:

1. **Verify embeddings were generated**:
   - Check "Embeddings Generated" count
   - Should match "Chunks Created" count

2. **Check embedding model**:
   ```bash
   # Ollama must be running with mxbai-embed-large
   docker exec ollama ollama list | grep mxbai
   ```

3. **Manually trigger re-indexing**:
   - Remove folder
   - Re-add folder with `generate_embeddings: true`

---

## Best Practices

### 1. Start Small

- **Don't index entire codebase at once**
- Add one folder at a time
- Monitor performance and storage

### 2. Organize by Purpose

- Index source code separately from documentation
- Create focused knowledge bases
- Use multiple folders for different subsystems

### 3. Monitor Storage

- Each file creates multiple chunks
- Embeddings consume Neo4j storage
- Watch for Neo4j disk usage

### 4. Use File Patterns

- Filter to specific file types
- Exclude build artifacts
- Respect `.gitignore` patterns

### 5. Regular Maintenance

- Remove old/archived folders
- Re-index after major changes
- Monitor "Last Sync" timestamps

---

## Integration with Other Features

### Portal Chat

- Uses indexed files for **RAG (Retrieval Augmented Generation)**
- Semantic search retrieves relevant code chunks
- Attaches context to LLM queries

### Workflow Studio

- PM Agent can reference indexed documentation
- Worker agents can search codebase
- QC agents can verify against indexed standards

### Command Palette

- "Ask a Question" uses indexed knowledge
- Quick queries benefit from indexing
- Faster, more accurate responses

---

## Architecture

### Data Flow

```
VSCode Folder Selection
  ↓
IntelligencePanel (path validation)
  ↓
Path Translation (host → container)
  ↓
POST /api/index-folder
  ↓
FileWatchManager (start watch)
  ↓
FileIndexer (chunk files)
  ↓
EmbeddingsService (generate vectors)
  ↓
Neo4j (store nodes/edges)
```

### Neo4j Schema

```cypher
(:WatchConfig {
  id: String,
  path: String,
  status: String,
  files_indexed: Integer
})

(:File {
  path: String,
  extension: String,
  size: Integer
})
  -[:HAS_CHUNK]->
(:FileChunk {
  content: String,
  index: Integer
})
  -[:HAS_EMBEDDING]->
(:Embedding {
  vector: Float[]
})
```

---

## Performance Considerations

### Indexing Speed

- **Without embeddings**: ~100 files/second
- **With embeddings**: ~1-10 files/second (depends on Ollama)
- **Large codebases**: Consider indexing in batches

### Storage Requirements

- **Per file**: ~2-5 KB metadata
- **Per chunk**: ~1-2 KB content
- **Per embedding**: ~3 KB vector (768 dimensions)
- **Example**: 1000 files ≈ 20 MB Neo4j storage

### Memory Usage

- **Ollama**: 2-4 GB RAM for embedding model
- **Neo4j**: 512 MB - 2 GB for graph storage
- **VSCode Extension**: <100 MB for UI

---

## Future Enhancements

### Planned Features

- **Real-time file watching** (currently manual)
- **Incremental indexing** (only changed files)
- **Custom file patterns** per folder
- **Embedding model selection** (different models for different folders)
- **Index health monitoring** (detect stale/broken indices)
- **Bulk operations** (add/remove multiple folders)

### Under Consideration

- **Diff-based re-indexing** (only re-index changed chunks)
- **Scheduled indexing** (cron-style triggers)
- **Index snapshots** (save/restore index state)
- **Cross-workspace indexing** (share indices between workspaces)

---

## Related Documentation

- [VSCode Workspace Integration Guide](./VSCODE_WORKSPACE_INTEGRATION.md)
- [Portal Chat Integration Guide](./PORTAL_INTEGRATION_COMPLETE.md)
- [Workflow Management Guide](../vscode-extension/WORKFLOW_MANAGEMENT.md)
- [Vector Search Settings Guide](./VECTOR_SEARCH_UI_SETTINGS.md)

---

## Support

For issues or questions:

1. **Check logs**:
   ```bash
   docker logs mimir-server
   ```

2. **Verify setup**:
   ```bash
   curl http://localhost:9042/health
   ```

3. **Neo4j Browser**:
   ```
   http://localhost:7474
   ```

4. **GitHub Issues**:
   https://github.com/orneryd/Mimir/issues

---

**Last Updated**: 2025-11-19  
**Version**: 1.0.0  
**Author**: Mimir Development Team
