# Fix V2: Hybrid Cleanup Strategy (Relationship + Path Fallback)

## Problem Discovered
After implementing relationship-based cleanup, testing revealed that files indexed **before** the relationship implementation had NO `[:WATCHES]` relationships, so they couldn't be cleaned up by the new code.

### Timeline
1. Files indexed at 21:41-21:42 (before relationship implementation)
2. WatchConfig created but then deleted when user removed watch
3. Files remained orphaned because they had no `[:WATCHES]` relationships
4. New cleanup code only looked for relationships, so it found 0 files

## Root Cause
**Backward compatibility issue**: The new relationship-based cleanup assumes all files have `[:WATCHES]` relationships, but files indexed with old code don't have them.

## Solution: Hybrid Cleanup Strategy

Implemented a **two-step cleanup** in `remove_folder`:

### Step 1: Relationship-Based Deletion (Preferred)
```cypher
MATCH (wc:WatchConfig {id: $watchConfigId})-[:WATCHES]->(f:File)
OPTIONAL MATCH (f)-[:HAS_CHUNK]->(c:FileChunk)
WITH f, collect(c) AS chunks, count(c) AS chunk_count
FOREACH (chunk IN chunks | DETACH DELETE chunk)
DETACH DELETE f
```
- ✅ Uses relationships (best practice)
- ✅ Works for all files indexed with new code
- ✅ No path string matching

### Step 2: Path-Based Fallback (Backward Compatibility)
```cypher
MATCH (f:File)
WHERE (f.path STARTS WITH $folderPathWithSep OR f.path = $exactPath)
  AND NOT EXISTS { MATCH (f)<-[:WATCHES]-(:WatchConfig) }
OPTIONAL MATCH (f)-[:HAS_CHUNK]->(c:FileChunk)
WITH f, collect(c) AS chunks, count(c) AS chunk_count
FOREACH (chunk IN chunks | DETACH DELETE chunk)
DETACH DELETE f
```
- ✅ Catches orphaned files from old code
- ✅ Only runs if file has NO relationships (safety check)
- ✅ Logs when fallback is used

### Step 3: Delete WatchConfig
```typescript
await manager.delete(config.id);
```

## Why This Works

**For new files** (with relationships):
- Step 1 finds and deletes them ✅
- Step 2 finds nothing (they already have relationships) ✅

**For old files** (no relationships):
- Step 1 finds nothing (no relationships) ✅
- Step 2 catches them via path matching ✅

**Safety**: Step 2 explicitly checks `NOT EXISTS { MATCH (f)<-[:WATCHES]-(:WatchConfig) }` to avoid double-deletion.

## Testing
Cleaned up 3 orphaned playground files:
```
✅ Deleted 3 orphaned playground files
✅ Deleted 74 associated chunks
```

## Future State
As old files are re-indexed or naturally cleaned up, the fallback path will be used less and less. Eventually, all files will have relationships and Step 2 will always return 0.

## Rebuild Required
The server needs to be rebuilt to pick up this change:
```bash
npm run build
docker-compose restart mimir-server
```

Then test by:
1. Adding a watch
2. Killing it mid-indexing
3. Removing the watch
4. Verify all files are cleaned up
