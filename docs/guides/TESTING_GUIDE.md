# Testing Guide

**Repository:** MCP TODO + Memory System  
**Test Framework:** Vitest  
**Last Updated:** 2025-10-13

---

## 🎯 Overview

This repository uses **Vitest** for unit and integration testing. All test files are located in the `testing/` directory and follow the `*.test.ts` naming convention.

**Current Test Coverage:**
- 15 test suites
- 159+ individual tests
- Coverage includes: TODO operations, Knowledge Graph CRUD, Memory persistence, Context management

---

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- testing/memory-persistence.test.ts

# Run tests in watch mode (re-run on file changes)
npm test -- --watch

# Run tests with verbose output
npm test -- --reporter=verbose
```

### Test Output

```
 ✓ testing/memory-persistence.test.ts (30 tests) 38ms
   ✓ Memory Persistence - File Operations (6 tests)
   ✓ Memory Persistence - Decay Logic (9 tests)
   ✓ Memory Persistence - Health Checks (2 tests)
   
 Test Files  14 passed (14)
      Tests  130 passed (130)
   Start at  10:22:13
   Duration  2.4s
```

---

## 📁 Test Suite Structure

### Core Functionality Tests

#### `memory-persistence.test.ts` ✅ 30 tests
**What it tests:**
- File I/O operations (save/load)
- Memory decay (24h/7d/permanent TTL)
- Corruption handling and recovery
- Health checks
- Atomic writes
- Configuration options

**Key scenarios:**
- Server restart with memory decay
- Large memory stores (100 TODOs + 100 nodes)
- Rapid successive saves

#### `api-surface-validation.test.ts`
**What it tests:**
- All 17+ MCP tool definitions
- Input schema validation
- Tool registration
- API contract compliance

#### `mcp-interface.test.ts`
**What it tests:**
- MCP protocol integration
- Tool invocation
- Request/response handling
- Error handling

### TODO Management Tests

#### `status-mirror.test.ts`
**What it tests:**
- TODO-Task status synchronization
- Bidirectional updates
- Status propagation

#### `status-propagation-fix.test.ts`
**What it tests:**
- Status update edge cases
- Fix validation for known issues

### Knowledge Graph Tests

#### `adaptive-depth.test.ts`
**What it tests:**
- Adaptive subgraph depth calculation
- 5-factor heuristics
- Query complexity handling

#### `context-ranking.test.ts`
**What it tests:**
- 7-factor relevance scoring
- Query-specific optimization
- Ranking algorithms

#### `context-verification.test.ts`
**What it tests:**
- Trust scoring
- Provenance tracking
- Context validation

#### `batch-operations.test.ts`
**What it tests:**
- Bulk TODO creation
- Bulk node creation
- Bulk edge creation
- Performance under load

### Utility Tests

#### `compact-logging.test.ts`
**What it tests:**
- Token-efficient logging
- Log format validation

#### `summary-generator.test.ts`
**What it tests:**
- Auto-summary generation
- Content summarization

#### `timing-utility.test.ts`
**What it tests:**
- Performance measurement
- Timing utilities

#### `diagnostic-persistence.test.ts`
**What it tests:**
- Diagnostic result storage
- TTL and cleanup
- Audit trail functionality

#### `diagnostic-improvements.test.ts`
**What it tests:**
- Diagnostic feature enhancements
- Validation improvements

---

## 🧪 Writing Tests

### Test File Structure

```typescript
// testing/my-feature.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyFeature } from '../src/features/MyFeature.js';

describe('My Feature', () => {
  let feature: MyFeature;

  beforeEach(() => {
    // Setup before each test
    feature = new MyFeature();
  });

  afterEach(() => {
    // Cleanup after each test
    feature.cleanup();
  });

  it('should do something expected', () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = feature.doSomething(input);

    // Assert
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(feature.doSomething('')).toBe('');
    expect(feature.doSomething(null)).toBeNull();
  });
});
```

### Assertions

Vitest provides standard Jest-compatible assertions:

```typescript
// Equality
expect(value).toBe('exact match');
expect(value).toEqual({ complex: 'object' });

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(3.14, 2);

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/pattern/);

// Arrays/Objects
expect(array).toHaveLength(5);
expect(array).toContain(item);
expect(object).toHaveProperty('key', 'value');

// Async
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

it('should handle promises', async () => {
  await expect(asyncFunction()).resolves.toBe('expected');
});

it('should handle errors', async () => {
  await expect(failingFunction()).rejects.toThrow('error message');
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock functions
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

// Mock modules
vi.mock('../src/module', () => ({
  functionName: vi.fn(() => 'mocked')
}));
```

---

## 🎨 Testing Best Practices

### 1. Test Isolation
✅ **Do:** Each test should be independent
```typescript
beforeEach(() => {
  // Fresh state for each test
  manager = new TodoManager();
});

afterEach(() => {
  // Clean up after each test
  manager.clear();
});
```

❌ **Don't:** Rely on test execution order
```typescript
// Bad: Test 2 depends on Test 1 running first
it('test 1', () => { /* creates data */ });
it('test 2', () => { /* uses data from test 1 */ });
```

### 2. Clear Test Names
✅ **Do:** Describe expected behavior
```typescript
it('should return empty array when no todos exist', () => {
  // ...
});

it('should filter todos by status correctly', () => {
  // ...
});
```

❌ **Don't:** Use vague names
```typescript
it('test 1', () => { /* what does this test? */ });
it('works', () => { /* what works? */ });
```

### 3. Arrange-Act-Assert Pattern
✅ **Do:** Structure tests clearly
```typescript
it('should update todo status', () => {
  // Arrange
  const todo = createTodo({ status: 'pending' });
  
  // Act
  const updated = updateTodo(todo.id, { status: 'completed' });
  
  // Assert
  expect(updated.status).toBe('completed');
});
```

### 4. Test Both Happy Path and Edge Cases
✅ **Do:** Cover success and failure scenarios
```typescript
describe('getTodo', () => {
  it('should return todo when it exists', () => {
    // Happy path
  });

  it('should return null when todo does not exist', () => {
    // Edge case
  });

  it('should handle invalid id format', () => {
    // Error case
  });
});
```

### 5. Keep Tests Fast
✅ **Do:** Mock expensive operations
```typescript
// Mock file system operations
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => '{"data": "mock"}')
}));
```

❌ **Don't:** Make real network calls or slow I/O
```typescript
// Bad: Actual API call in tests
const data = await fetch('https://api.example.com/data');
```

---

## 📊 Test Coverage Goals

| Area | Current Coverage | Goal |
|------|-----------------|------|
| TODO Operations | ~90% | >90% |
| Knowledge Graph | ~85% | >90% |
| Memory Persistence | 100% | 100% |
| MCP Interface | ~80% | >85% |
| Utilities | ~75% | >80% |

**Overall Target:** >85% code coverage for production code

---

## 🐛 Debugging Tests

### Running Single Test
```bash
# Run one test file
npm test -- testing/memory-persistence.test.ts

# Run one test suite within a file
npm test -- testing/memory-persistence.test.ts -t "Decay Logic"

# Run one specific test
npm test -- testing/memory-persistence.test.ts -t "should decay TODOs past TTL"
```

### Verbose Output
```bash
# More detailed output
npm test -- --reporter=verbose

# Show console.log output
npm test -- --reporter=verbose --silent=false
```

### Debug Mode
```typescript
// Add debug logging in tests
it('should do something', () => {
  console.log('Debug:', someValue);
  expect(someValue).toBe('expected');
});
```

### Watch Mode for Development
```bash
# Re-run tests on file changes
npm test -- --watch

# Watch specific files
npm test -- --watch testing/memory-persistence.test.ts
```

---

## 🚀 Continuous Integration

Tests run automatically on:
- Every commit to feature branches
- Pull requests to main
- Before merges to main

**CI Requirements:**
- All tests must pass
- No skipped tests (`.skip()`)
- No focused tests (`.only()`)

---

## 📝 Testing Checklist

Before committing changes, ensure:

- [ ] All existing tests pass (`npm test`)
- [ ] New features have tests
- [ ] Tests cover happy path and edge cases
- [ ] Tests are isolated (no dependencies on other tests)
- [ ] No `.only()` or `.skip()` in committed code
- [ ] Test names clearly describe what they test
- [ ] Tests use Arrange-Act-Assert pattern
- [ ] Async tests use async/await properly
- [ ] Cleanup happens in `afterEach` hooks

---

## 📚 Additional Resources

**Vitest Documentation:**
- Official Docs: https://vitest.dev/
- API Reference: https://vitest.dev/api/
- Configuration: https://vitest.dev/config/

**Test Examples:**
- See `testing/memory-persistence.test.ts` for comprehensive examples
- See `testing/api-surface-validation.test.ts` for MCP tool testing
- See `testing/batch-operations.test.ts` for performance testing

**Related Documentation:**
- [Memory Persistence Test Summary](./MEMORY_PERSISTENCE_TEST_SUMMARY.md) - Detailed test results
- [Repository Instructions](../../.agents/repo.instructions.md) - Development workflow
- [README](../../README.md) - Project overview

---

**Last Updated:** 2025-10-13  
**Maintained by:** Repository development team

