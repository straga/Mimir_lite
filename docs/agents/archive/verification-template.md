# Verification Pattern Template

**Purpose:** Standard verification loop for all agents  
**Usage:** Include in execution pattern to ensure tool-based verification

---

## Standard Verification Loop

After every action, verify success:

```markdown
<verification>
## Action Taken
[What you just did]

## Verification Method
[How you will verify - which tool]

## Verification Command
[Actual command/tool call]

## Verification Result
[Output from tool - copy/paste]

## Status
✅ VERIFIED - [Specific evidence]
❌ FAILED - [Specific error]

## Next Action
[If verified: next step]
[If failed: correction needed]
</verification>
```

---

## Examples

### Example 1: File Creation

```markdown
<verification>
## Action Taken
Created `src/cache-service.ts` with TTL logic

## Verification Method
Read file to confirm content

## Verification Command
`read_file('src/cache-service.ts')`

## Verification Result
File exists, contains:
- CacheService class
- TTL constants (5 minutes)
- get/set/clear methods
- Timestamp tracking

## Status
✅ VERIFIED - File created with all required methods

## Next Action
Proceed to create tests
</verification>
```

### Example 2: Test Execution

```markdown
<verification>
## Action Taken
Added unit tests for cache service

## Verification Method
Run test suite

## Verification Command
`run_terminal_cmd('npm test cache-service.spec.ts')`

## Verification Result
```
PASS src/cache-service.spec.ts
  ✓ should cache data with TTL (12ms)
  ✓ should return null for expired cache (8ms)
  ✓ should clear cache (5ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

## Status
✅ VERIFIED - All 3 tests passing

## Next Action
Proceed to integration
</verification>
```

### Example 3: Configuration Change

```markdown
<verification>
## Action Taken
Updated jest.config.js to include src/app

## Verification Method
Validate config syntax and test file discovery

## Verification Command
`run_terminal_cmd('npm test -- --listTests | grep src/app')`

## Verification Result
```
src/app/components/example.spec.ts
src/app/services/cache.spec.ts
```

## Status
✅ VERIFIED - Jest now discovers src/app tests

## Next Action
Run full test suite
</verification>
```

### Example 4: Failed Verification

```markdown
<verification>
## Action Taken
Modified API service to use cache

## Verification Method
Run linter to check syntax

## Verification Command
`run_terminal_cmd('npm run lint')`

## Verification Result
```
ERROR: src/api.service.ts:42:5
  'cacheService' is not defined
```

## Status
❌ FAILED - Missing import statement

## Next Action
Add import: `import { CacheService } from './cache-service'`
Then re-verify with linter
</verification>
```

---

## Verification Checklist

Before claiming completion:
- [ ] Did you execute a verification tool/command?
- [ ] Did you capture the actual output?
- [ ] Did you confirm success (not assume)?
- [ ] If failed, did you identify the fix?
- [ ] Did you re-verify after corrections?

---

**Version:** 2.0.0  
**Status:** ✅ Complete
