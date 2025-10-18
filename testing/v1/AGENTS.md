# Agent: Order Processing Debugging Exercise (Enhanced)

This mini-project is a debugging exercise. Your objective is to analyze the order processing system, reproduce reported issues when possible, and produce a clear technical report describing root causes, locations in code, reproduction steps, and high-level fix directions.

## Project Structure 

### Version 1 (Original - Single file)
- `order-processor.ts` — Original single-file implementation
- `order-processor.test.ts` — Original tests (11 tests, all pass)

**Start with Version 2** (enhanced) - it's more representative of production systems.

## Customer Complaints (Production Issues)

### Core Issues (from v1)
1. Duplicate charges for the same order during high-traffic events
2. Orders processed with incorrect totals; item costs sometimes appear omitted
3. Inventory showing as unavailable after failed orders
4. Overnight shipping offered for addresses that cannot receive it
5. Multiple orders accepted that together exceed available stock
6. Discount totals that do not match promotion terms

## Running Tests

```bash
# Version 2 (enhanced, recommended)
npm test testing/agentic/order-processor-v2.test.ts

# Version 1 (original)
npm test testing/agentic/order-processor.test.ts

# View test output
npm test testing/agentic/order-processor-v2.test.ts 2>&1 | tail -50

# Filter for specific patterns
npm test testing/agentic/ 2>&1 | grep -A 5 "FAIL"
```

## Where to Start

1. **Run baseline tests** - Both test suites pass (v1: 11 tests, v2: 20 tests)
2. **Understand the architecture**:
   - `cache-config.ts` — Multiple cache instances with different TTLs
   - `product-repository.ts` — Data layer with cache-aside pattern
   - `pricing-service.ts` — Business logic with caching
   - `order-processor-v2.ts` — Orchestration layer
3. **Map complaints to modules**:
   - Pricing issues → `pricing-service.ts`
   - Inventory issues → `product-repository.ts`
   - Cache config → `cache-config.ts`
   - Payment/concurrency → `order-processor-v2.ts`
4. **Focus on**:
   - Cache configuration (useClones, TTL, maxKeys)
   - Cache key generation (missing parameters?)
   - Cache invalidation (or lack thereof)
   - Concurrent access to shared cache state
   - Floating point arithmetic in pricing
   - Case sensitivity in lookups
5. **Create reproduction tests** that expose:
   - Cache invalidation bugs
   - Concurrent cache access
   - Stale data scenarios
   - Edge cases the current tests miss

## Key Challenges

**The tests pass because they don't test:**
- Cache invalidation after updates
- Concurrent orders for same product
- Mixed-case state codes
- Non-round dollar amounts
- Cache key collisions
- TTL expiration behavior
- Maximum cache size limits
- Payment retry after partial failure

**Your task**: Find bugs the existing tests miss.
