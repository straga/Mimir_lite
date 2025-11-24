# Final Fix: API Endpoint Using Wrong Cleanup Code

## Problem
The UI removal button was calling the API endpoint (`DELETE /api/indexed-folders/:id`) which had its own **old cleanup code** instead of using the new `handleRemoveFolder()` function with the hybrid cleanup strategy.

### What Was Happening
1. User clicks "Cancel & Remove" in UI
2. UI calls `DELETE /api/indexed-folders/:id`
3. API endpoint (`index-api.ts`) used old simple cleanup:
   ```cypher
   MATCH (f:File)
   WHERE f.path STARTS WITH $folderPathWithSep OR f.path = $exactPath
   DETACH DELETE f, c
   ```
4. This old code:
   - ❌ Didn't use `[:WATCHES]` relationships
   - ❌ Didn't have fallback for orphaned files
   - ❌ Deleted WatchConfig BEFORE files (wrong order)

### Result
- Files with relationships: Not deleted (no relationship-based query)
- Orphaned files: Not deleted (no fallback)
- **0 files deleted** ❌

## Root Cause
**Code duplication**: The removal logic existed in TWO places:
1. `handleRemoveFolder()` in `fileIndexing.tools.ts` - **NEW** hybrid cleanup ✅
2. API endpoint in `index-api.ts` - **OLD** simple cleanup ❌

The UI was calling the API endpoint, not the MCP tool.

## Solution
Changed the API endpoint to **delegate to `handleRemoveFolder()`**:

```typescript
// OLD CODE (index-api.ts):
await watchManager.stopWatch(containerPath);
await configManager.delete(config.id);
const fileResult = await session.run(`MATCH (f:File) WHERE f.path STARTS WITH...`);

// NEW CODE (index-api.ts):
const result = await handleRemoveFolder(
  { path: hostPath },
  driver,
  watchManager,
  configManager
);
```

### Benefits
✅ **Single source of truth** - one cleanup implementation  
✅ **Hybrid cleanup** - relationships + path fallback  
✅ **Correct order** - files deleted before WatchConfig  
✅ **Consistent behavior** - UI and MCP use same code  

## Files Changed
- `src/api/index-api.ts`:
  - Added import: `handleRemoveFolder`
  - Replaced custom cleanup with `handleRemoveFolder()` call
  - Renamed `resolvedPath` to `hostPath` for clarity

## Testing
After rebuild:
1. Add `/Users/c815719/src/playground/playground`
2. Let it index a few files
3. Click "Cancel & Remove"
4. **Expected**: All files and chunks deleted (relationship-based + orphaned fallback)
5. **Log should show**: `🧹 Cleaned up N orphaned files (no relationships) via path matching`

## Why This Matters
This bug would have affected ANY folder removal via the UI, not just playground. All removals would have left orphaned files in the database.

Now both UI and MCP tools use the same robust cleanup logic.
