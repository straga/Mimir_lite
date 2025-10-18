# Agent: Order Processing Debugging Exercise (Enhanced)

This mini-project is a debugging exercise. Your objective is to analyze the order processing system, reproduce reported issues when possible, and produce a clear technical report describing root causes, locations in code, reproduction steps, and high-level fix directions.

## Project Structure

### Version 2 (Enhanced - Multi-file with Caching)
- `order-processor-v2.ts` — Main order orchestrator
- `product-repository.ts` — Product data access with caching
- `pricing-service.ts` — Pricing, discounts, shipping calculations
- `cache-config.ts` — Cache configuration (node-cache)
- `order-processor-v2.test.ts` — Unit tests (20 tests, all pass)

**Start with Version 2** (enhanced) - it's more representative of production systems.

## Customer Complaints (Production Issues)

### New Cache-Related Issues (v2)
7. Customers see stale pricing after sales/price updates
8. Inventory shows as available but orders fail (cache out of sync)
9. Same shipping cost charged for different countries
10. Price calculations fail for orders with $10.10 items
11. High-frequency cache evictions during flash sales
12. Bundle prices don't update when component prices change
13. Customer order history queries slow down over time
14. Retrying failed orders shows "payment already processed"

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
