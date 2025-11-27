# File-WatchConfig Bidirectional Relationships Implementation

## Overview
Implemented bidirectional relationships between `WatchConfig` and `File` nodes to track which files belong to which watch configurations.

## Relationships Created

### WatchConfig → File
- **Relationship**: `[:WATCHES]`
- **Direction**: `(WatchConfig)-[:WATCHES]->(File)`
- **Meaning**: A WatchConfig monitors this File

### File → WatchConfig  
- **Relationship**: `[:WATCHED_BY]`
- **Direction**: `(File)-[:WATCHED_BY]->(WatchConfig)`
- **Meaning**: This File is monitored by a WatchConfig

## Implementation Details

### 1. File Creation (FileIndexer.ts)
- Modified `indexFile()` to accept optional `watchConfigId` parameter
- When `watchConfigId` is provided, creates both relationships:
  ```cypher
  MATCH (wc:WatchConfig {id: $watchConfigId})
  MERGE (wc)-[:WATCHES]->(f)
  MERGE (f)-[:WATCHED_BY]->(wc)
  ```

### 2. File Indexing (FileWatchManager.ts)
- Updated `indexFolder()` to pass `config.id` when indexing files
- Updated `handleFileAdded()` to pass `config.id` for new files
- Both methods now create relationships automatically

### 3. File Deletion
- **Individual file deletion**: `DETACH DELETE` in `deleteFile()` automatically removes all relationships
- **Folder removal**: `DETACH DELETE` in `handleRemoveFolder()` removes all files and their relationships

## Benefits

1. **Orphan Detection**: Easy to find files without watch configs
   ```cypher
   MATCH (f:File)
   WHERE NOT EXISTS {
     MATCH (f)<-[:WATCHES]-(wc:WatchConfig)
   }
   RETURN f
   ```

2. **Watch Cleanup**: When removing a watch, can find all associated files
   ```cypher
   MATCH (wc:WatchConfig {id: $id})-[:WATCHES]->(f:File)
   RETURN f
   ```

3. **File Provenance**: Can trace which watch config indexed a file
   ```cypher
   MATCH (f:File {path: $path})-[:WATCHED_BY]->(wc:WatchConfig)
   RETURN wc
   ```

## Testing

### Verify Relationships After Indexing
```cypher
MATCH (wc:WatchConfig)-[:WATCHES]->(f:File)
RETURN wc.path, count(f) as file_count
```

### Check for Orphaned Files
```cypher
MATCH (f:File)
WHERE NOT EXISTS {
  MATCH (f)<-[:WATCHES]-(wc:WatchConfig)
}
RETURN count(f) as orphaned_count
```

### Verify Bidirectional Relationships
```cypher
MATCH (wc:WatchConfig)-[:WATCHES]->(f:File)-[:WATCHED_BY]->(wc2:WatchConfig)
WHERE wc <> wc2
RETURN count(*) as mismatched_relationships
// Should return 0
```

## Migration

Existing files without relationships will remain orphaned until:
1. The file is modified (triggers re-indexing with relationship)
2. The folder is re-indexed manually
3. A cleanup script is run to remove orphaned files

## Files Modified

1. `src/indexing/FileIndexer.ts`
   - Added `watchConfigId` parameter to `indexFile()`
   - Added relationship creation in File node query

2. `src/indexing/FileWatchManager.ts`
   - Pass `config.id` in `indexFolder()`
   - Pass `config.id` in `handleFileAdded()`

3. No changes needed for deletion (already handled by `DETACH DELETE`)

## Update: Fixed WatchConfig Creation

### Issue Found
The WatchConfig nodes were being created with only the `path` (container path) but not the `host_path`. This is needed for proper path translation and user-facing displays.

### Fix Applied
Updated `handleIndexFolder()` in `fileIndexing.tools.ts` to include `host_path` when creating WatchConfig:

```typescript
const input: WatchConfigInput = {
  path: containerPath,       // Container path for internal use
  host_path: resolvedPath,   // Host path for user display
  recursive: params.recursive ?? true,
  // ... other properties
};
```

### Why This Matters
- **Container path** (`/workspace/...`): Used internally for file matching
- **Host path** (`/Users/...`): Shown to users, used for path translation
- Both paths are now stored in WatchConfig for complete path tracking

### Complete Flow
1. User provides host path: `/Users/c815719/src/project`
2. Translated to container path: `/workspace/project`  
3. WatchConfig created with BOTH paths
4. Files indexed with container paths
5. Relationships created: `(WatchConfig)-[:WATCHES]->(File)`
6. File paths match WatchConfig container path ✅

