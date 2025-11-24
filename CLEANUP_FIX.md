# Fix: Consistent File Cleanup on Watch Removal

## Problem
When a watch was removed (especially if indexing was interrupted), files remained orphaned in the database because the cleanup logic was using **path-based matching** instead of **relationship-based deletion**.

### What Happened
1. User adds watch: `/Users/c815719/src/playground/playground`
2. Indexing starts, creates 2 files with relationships:
   - `(WatchConfig)-[:WATCHES]->(File)`
3. User kills indexing mid-process
4. User removes watch
5. **BUG**: Files remained in database because:
   - Cleanup query used path matching: `WHERE f.path STARTS WITH '/workspace/playground/playground/'`
   - But this didn't leverage the relationships we created!

## Root Cause
The `remove_folder` function was using path-based file deletion:

```cypher
MATCH (f:File)
WHERE f.path STARTS WITH $folderPathWithSep OR f.path = $exactPath
```

This approach:
- ❌ Doesn't use the relationships we carefully created
- ❌ Can miss files if path formats don't match exactly
- ❌ Requires path string manipulation and edge cases

## Solution
Changed to **relationship-based deletion**:

```cypher
MATCH (wc:WatchConfig {id: $watchConfigId})-[:WATCHES]->(f:File)
OPTIONAL MATCH (f)-[:HAS_CHUNK]->(c:FileChunk)
WITH f, collect(c) AS chunks, count(c) AS chunk_count
FOREACH (chunk IN chunks | DETACH DELETE chunk)
DETACH DELETE f
```

### Why This Is Better
✅ **Uses the relationships** we created for exactly this purpose  
✅ **No path matching** - finds ALL files associated with the watch  
✅ **Works regardless of path format** (host vs container paths)  
✅ **Simpler and more reliable** - follows the graph structure  
✅ **Consistent with Neo4j best practices** - traverse relationships, don't match strings

## Execution Order
1. Stop the file watcher (no new files added)
2. **Delete files and chunks** using `[:WATCHES]` relationship
3. **Delete WatchConfig** node (after files are gone)

This ensures:
- No orphaned files
- Clean removal even if indexing was interrupted
- Relationships are the source of truth

## Testing
Cleaned up 2 orphaned files from interrupted indexing:
```
✅ Deleted 2 orphaned files
✅ Deleted 60 associated chunks
```

Future removals will now be consistent and complete.
