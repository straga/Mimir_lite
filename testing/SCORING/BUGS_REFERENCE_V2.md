# Bug Reference - Order Processing System v2.0

**⚠️ CONFIDENTIAL - For Validation Only**

This document catalogs all intentional bugs in the v2 order processing system. **Do not share with debugging agents** - they must discover these independently.

---

## 📊 Bug Summary

- **Total Bugs**: 24
- **Cache Configuration**: 7 bugs
- **Product Repository**: 4 bugs
- **Pricing Service**: 6 bugs
- **Order Processor**: 7 bugs

---

## 🐛 Cache Configuration Bugs (cache-config.ts)

### Bug 10: Product Cache useClones Disabled
- **Line**: 18
- **Code**: `useClones: false`
- **Root Cause**: Cache returns direct reference to cached object, not a clone
- **Impact**: Mutations to returned products affect the cache
- **Trigger**: Get product, modify it, get same product again → sees modifications
- **Test Strategy**:
  ```typescript
  const prod1 = await getProduct('PROD-1');
  prod1.price = 999; // Mutate
  const prod2 = await getProduct('PROD-1'); // Same product
  expect(prod2.price).toBe(999); // BUG: Modified cache
  ```
- **Severity**: High (data corruption)

### Bug 11: Price Cache Max Keys Too Small
- **Line**: 32
- **Code**: `maxKeys: 1000`
- **Root Cause**: During high traffic (flash sales), cache fills quickly and evicts entries prematurely
- **Impact**: Cache thrashing, poor hit rate, increased load
- **Trigger**: Create 1001 unique order combinations → cache evictions
- **Test Strategy**: Create >1000 different orders, verify cache misses
- **Severity**: Medium (performance)

### Bug 12: Payment Cache useClones Disabled
- **Line**: 51
- **Code**: `useClones: false`
- **Root Cause**: Payment results stored by reference
- **Impact**: Security issue - mutating result object affects cache
- **Trigger**: Process payment, mutate result, retrieve from cache → modified
- **Test Strategy**:
  ```typescript
  const result1 = await processPayment('ORD-1', 100);
  result1.paymentId = 'HACKED';
  const result2 = paymentCache.get('payment:ORD-1');
  expect(result2.paymentId).toBe('HACKED'); // BUG
  ```
- **Severity**: High (security)

### Bug 13: Shipping Cache Missing TTL
- **Line**: 56-61
- **Code**: No `stdTTL` property set
- **Root Cause**: Cache never expires even when shipping rates change
- **Impact**: Stale shipping costs forever, customers overcharged/undercharged
- **Trigger**: Calculate shipping, update rates in system, recalculate → old rate
- **Test Strategy**:
  ```typescript
  // Calculate shipping
  const cost1 = await calculateShipping(items, address);
  // Wait for TTL (none set!)
  // Rates change in backend
  const cost2 = await calculateShipping(items, address);
  expect(cost1).toBe(cost2); // BUG: Should be different
  ```
- **Severity**: High (financial)

### Bug 14: Cache Key Generation No Sanitization
- **Line**: 69
- **Code**: `return parts.join(':');`
- **Root Cause**: Special characters in key parts can cause collisions
- **Impact**: `generateCacheKey('AB', 'CD')` and `generateCacheKey('A', 'BCD')` both produce `'A:BCD'`
- **Trigger**: Product ID contains colon: `'PROD:1'`
- **Test Strategy**:
  ```typescript
  const key1 = generateCacheKey('PROD', '1:2');
  const key2 = generateCacheKey('PROD:1', '2');
  expect(key1).toBe(key2); // BUG: collision
  ```
- **Severity**: Medium (data corruption)

### Bug 15: getOrSet No Error Handling
- **Line**: 80
- **Code**: `cache.set(key, value);` after `fetchFn()`
- **Root Cause**: If `fetchFn()` throws, cache state inconsistent
- **Impact**: Partial data cached, subsequent calls return undefined or stale data
- **Trigger**: fetchFn throws error
- **Test Strategy**: Mock fetchFn to throw, verify cache not polluted
- **Severity**: Medium (reliability)

### Bug 16: warmCaches No Await
- **Line**: 90
- **Code**: `productCache.flushAll();` (not awaited)
- **Root Cause**: Async operations not awaited, race condition on startup
- **Impact**: Server starts before caches flushed, stale data from previous run
- **Trigger**: Restart server quickly, old cache entries remain
- **Test Strategy**: Add async work in flushAll, verify completion
- **Severity**: Low (startup only)

---

## 🐛 Product Repository Bugs (product-repository.ts)

### Bug 17: updateStock Doesn't Invalidate Product Cache
- **Line**: 74
- **Code**: Only updates `inventoryCache`, not `productCache`
- **Root Cause**: Product objects cached separately include stock level
- **Impact**: `getProduct()` returns stale stock even after `updateStock()`
- **Trigger**:
  ```typescript
  const prod1 = await getProduct('PROD-1'); // stock: 100
  await updateStock('PROD-1', 50);
  const prod2 = await getProduct('PROD-1'); // stock: 100 (BUG: stale)
  ```
- **Test Strategy**: Update stock, fetch product, verify stock matches
- **Severity**: High (inventory corruption)

### Bug 18: getProductsByCategory Cache Never Invalidates
- **Line**: 106
- **Code**: Category cache key doesn't version
- **Root Cause**: Cached category list not invalidated when products change
- **Impact**: Add product to category → doesn't appear in list
- **Trigger**: Update product price/stock → category list shows old data
- **Test Strategy**:
  ```typescript
  const list1 = await getProductsByCategory('widgets');
  await updateStock('PROD-1', 0); // Out of stock
  const list2 = await getProductsByCategory('widgets');
  expect(list1[0].stock).toBe(list2[0].stock); // BUG: same
  ```
- **Severity**: Medium (stale data)

### Bug 19: getProducts Sequential Not Parallel
- **Line**: 123
- **Code**: `for (const id of productIds) { await getProduct(id); }`
- **Root Cause**: Sequential async calls, not parallelized
- **Impact**: Performance - N products = N * latency instead of 1 * latency
- **Trigger**: Bulk fetch 10 products → 10x slower than necessary
- **Test Strategy**: Time bulk fetch, compare to parallel version
- **Severity**: Low (performance)

### Bug 10 Impact: getProduct Returns Mutable Reference
- **Line**: 36
- **Code**: `return cached;` (cached from productCache with useClones: false)
- **Root Cause**: Same as Bug 10
- **Impact**: Caller can mutate cached product
- **Trigger**: Same as Bug 10
- **Severity**: High (shared with Bug 10)

---

## 🐛 Pricing Service Bugs (pricing-service.ts)

### Bug 20: Order Total Cache Key Missing Address & Coupon
- **Line**: 28-31
- **Code**: Cache key only includes items, not `address` or `couponCode`
- **Root Cause**: Different addresses/coupons get same cached total
- **Impact**: Customer A with coupon gets same price as Customer B without
- **Trigger**:
  ```typescript
  const total1 = await calculateOrderTotal(items, addressUS, 'SAVE20');
  const total2 = await calculateOrderTotal(items, addressCA, undefined);
  expect(total1).toBe(total2); // BUG: Different should be different
  ```
- **Test Strategy**: Same items, different address/coupon → verify different totals
- **Severity**: Critical (financial)

### Bug 21: Discount Logic Inconsistent
- **Line**: 56
- **Code**: `const total = subtotal - discount + shipping;`
- **Root Cause**: Discount applied to subtotal, but shipping added after
- **Impact**: Ambiguity - should shipping be discounted? Implementation unclear
- **Trigger**: Large discount makes math confusing
- **Test Strategy**: Verify business rule - is shipping discounted or not?
- **Severity**: Medium (business logic)

### Bug 22: Volume Discount Operator Precedence
- **Line**: 78
- **Code**: `const volumeDiscount = subtotal * 0.05 + discount;`
- **Root Cause**: Should be `(subtotal * 0.05) + discount` but precedence makes it `subtotal * (0.05 + discount)`
- **Impact**: Wrong discount amount calculated
- **Trigger**: Subtotal $100, existing discount 10 → expects $15, gets wrong amount
- **Test Strategy**:
  ```typescript
  // With $100 subtotal, 10% coupon, volume discount
  // Expected: $10 coupon + $5 volume = $15
  // Actual: Math wrong due to precedence
  ```
- **Severity**: High (financial)

### Bug 23: Shipping Cache Key Missing Country
- **Line**: 92
- **Code**: `generateCacheKey('shipping', address.state, items.length)`
- **Root Cause**: Cache key doesn't include `address.country`
- **Impact**: US:CA and Canada:CA get same cached rate
- **Trigger**:
  ```typescript
  const us = await calculateShipping(items, { country: 'US', state: 'CA' });
  const ca = await calculateShipping(items, { country: 'CA', state: 'CA' });
  expect(us).toBe(ca); // BUG: Should be different (international)
  ```
- **Test Strategy**: Same state, different country → verify different rates
- **Severity**: High (financial)

### Bug 24: Overnight Shipping Case Sensitive
- **Line**: 113
- **Code**: `address.state !== 'HI' && address.state !== 'AK'`
- **Root Cause**: Case-sensitive comparison
- **Impact**: `state: 'hi'` or `state: 'Hi'` incorrectly gets overnight
- **Trigger**: Use lowercase or mixed case state code
- **Test Strategy**:
  ```typescript
  const addressUpper = { country: 'US', state: 'HI' };
  const addressLower = { country: 'US', state: 'hi' };
  const rate1 = await calculateShipping(items, addressUpper);
  const rate2 = await calculateShipping(items, addressLower);
  // BUG: rate2 incorrectly includes overnight option
  ```
- **Severity**: Medium (business logic)

### Bug 25: Bundle Price Cache Never Invalidates
- **Line**: 134
- **Code**: Bundle price cached but not invalidated when product prices change
- **Root Cause**: No cache invalidation on product updates
- **Impact**: Product price changes don't update bundle price
- **Trigger**:
  ```typescript
  const bundle1 = await calculateBundlePrice(['PROD-1', 'PROD-2']);
  // Update PROD-1 price
  const bundle2 = await calculateBundlePrice(['PROD-1', 'PROD-2']);
  expect(bundle1).toBe(bundle2); // BUG: Should be different
  ```
- **Test Strategy**: Update component price, verify bundle updates
- **Severity**: Medium (stale pricing)

---

## 🐛 Order Processor Bugs (order-processor-v2.ts)

### Bug 26: No Reservation Cleanup on Failure
- **Line**: 76
- **Code**: `catch { order.status = FAILED; return order; }`
- **Root Cause**: Reservations not released when payment/fulfillment fails
- **Impact**: Inventory permanently locked until manual intervention
- **Trigger**: Order fails after inventory reserved → stock unavailable
- **Test Strategy**:
  ```typescript
  const initialStock = await getStockLevel('PROD-1');
  const order = { /* will fail payment */ };
  await processor.processOrder(order);
  const finalStock = await getStockLevel('PROD-1');
  expect(finalStock).toBe(initialStock); // BUG: Stock reserved but not released
  ```
- **Severity**: Critical (inventory leak)

### Bug 27: Payment Cache Missing Amount
- **Line**: 95
- **Code**: `generateCacheKey('payment', orderId)` (no amount)
- **Root Cause**: Cache key doesn't include payment amount
- **Impact**: Can return "successful" payment for wrong amount
- **Trigger**:
  ```typescript
  await processPayment('ORD-1', 100); // Cache hit
  const result = await processPayment('ORD-1', 200); // Different amount!
  // BUG: Returns cached $100 success for $200 charge
  ```
- **Test Strategy**: Process payment, retry with different amount → verify rejected
- **Severity**: Critical (financial security)

### Bug 28: Payment Race Condition (Original Bug 1)
- **Line**: 111
- **Code**: Check `processedPayments.has()` then `add()` (not atomic)
- **Root Cause**: Race window between check and add
- **Impact**: Duplicate charges during concurrent calls
- **Trigger**: Concurrent `processPayment` calls for same order
- **Test Strategy**:
  ```typescript
  const [r1, r2] = await Promise.all([
    processor.processPayment('ORD-1', 100),
    processor.processPayment('ORD-1', 100)
  ]);
  expect([r1.success, r2.success].filter(Boolean).length).toBe(1);
  // BUG: Both succeed
  ```
- **Severity**: Critical (duplicate charges)

### Bug 29: Payment Cache useClones False Mutation (Bug 12 Impact)
- **Line**: 117
- **Code**: `paymentCache.set(cacheKey, result);`
- **Root Cause**: paymentCache has `useClones: false`
- **Impact**: Mutating returned result affects cache
- **Trigger**: Same as Bug 12
- **Severity**: High (shared with Bug 12)

### Bug 30: Floating Point Payment Amount
- **Line**: 142
- **Code**: `if (amount < 0)` but no rounding
- **Root Cause**: JavaScript floating point: `10.10 * 10 = 100.99999999999999`
- **Impact**: Payment amount comparisons fail for non-round numbers
- **Trigger**:
  ```typescript
  const order = { items: [{ productId: 'PROD-X', quantity: 10 }] };
  // If PROD-X price is $10.10:
  // Expected: $101.00
  // Actual: $100.99999999999999 → validation/comparison issues
  ```
- **Test Strategy**: Use price $10.10, quantity 10 → verify correct total
- **Severity**: Medium (edge case)

### Bug 31: Batch Processing No Concurrency Control (Original Bug 8)
- **Line**: 165
- **Code**: `Promise.all(orders.map(...))`
- **Root Cause**: Parallel execution without inventory locking
- **Impact**: Multiple orders can reserve same stock
- **Trigger**: Batch with 2 orders for same product, limited stock
- **Test Strategy**:
  ```typescript
  await updateStock('PROD-1', 10); // Only 10 available
  const orders = [
    { items: [{ productId: 'PROD-1', quantity: 8 }] },
    { items: [{ productId: 'PROD-1', quantity: 8 }] }
  ]; // Total: 16 > 10
  const results = await processor.processBatch(orders);
  const successCount = results.filter(r => r.status === 'completed').length;
  expect(successCount).toBe(1); // BUG: Both succeed
  ```
- **Severity**: Critical (overselling)

### Bug 32: getCustomerOrders No Caching
- **Line**: 175
- **Code**: Scans entire `orderHistory` map every call
- **Root Cause**: No caching on expensive query
- **Impact**: Performance degrades as order count grows
- **Trigger**: 10,000 orders, query for customer → scans all 10k
- **Test Strategy**: Time query with 1k orders, 10k orders → O(n) performance
- **Severity**: Low (performance)

### Bug 33: Retry Doesn't Clear Payment Dedup
- **Line**: 188
- **Code**: `retryOrder` doesn't remove from `processedPayments`
- **Root Cause**: Payment succeeded but fulfillment failed, retry thinks paid
- **Impact**: Can't retry failed orders - "payment already processed"
- **Trigger**:
  ```typescript
  // Order fails at fulfillment (after payment)
  const order = await processor.processOrder(failingOrder);
  expect(order.status).toBe('failed');
  const retry = await processor.retryOrder(order.id);
  // BUG: Can't retry, thinks payment already processed
  ```
- **Test Strategy**: Fail order after payment, retry → should succeed
- **Severity**: Medium (operations)

---

## 🧪 Why Tests Don't Catch These Bugs

### Test Design Flaws

1. **Clean Numbers Only**
   - Tests use round dollar amounts ($10, $25, $50)
   - Miss Bug 30 (floating point: $10.10)

2. **Sequential Execution**
   - Tests run operations one after another
   - Miss Bug 28 (payment race), Bug 31 (batch race)

3. **Lowercase State Codes**
   - Tests use `state: 'ca'` (lowercase)
   - Matches Bug 24 (case sensitivity), so test passes

4. **No Cache Invalidation Testing**
   - Tests never update data then re-query
   - Miss Bug 17, 18, 25 (stale cache)

5. **No Cache Verification**
   - Tests check results, not whether cache was hit
   - Miss Bug 20, 23, 27 (wrong cache keys)

6. **No Edge Cases**
   - No special characters in IDs (Bug 14)
   - No cache overflow scenarios (Bug 11)
   - No retry scenarios (Bug 33)

7. **Existence Checks, Not Correctness**
   - `expect(result.total).toBeGreaterThan(0)` ← exists
   - Doesn't verify calculation is correct

8. **Different Products in Concurrent Tests**
   - Batch test uses PROD-1 and PROD-2
   - Doesn't trigger inventory race (Bug 31)

---

## 📊 Bug Severity Distribution

| Severity | Count | Bugs |
|----------|-------|------|
| Critical | 4 | 20, 26, 27, 28, 31 |
| High | 7 | 10, 12, 13, 17, 22, 23 |
| Medium | 10 | 11, 14, 15, 18, 21, 24, 25, 30, 32, 33 |
| Low | 2 | 16, 19 |

---

## 🎯 Testing Strategy for Each Bug

### Reproduction Test Requirements

**Concurrency Bugs (28, 31)**:
```typescript
await Promise.all([/* concurrent calls */]);
```

**Cache Invalidation Bugs (17, 18, 25)**:
```typescript
const before = await get();
await update();
const after = await get();
expect(after).not.toEqual(before);
```

**Floating Point Bug (30)**:
```typescript
const price = 10.10;
const quantity = 10;
const total = price * quantity;
expect(total).toBe(101.00); // Not 100.999999
```

**Cache Key Bugs (20, 23, 27)**:
```typescript
// Same items, different context → different results
const result1 = await calculate(items, contextA);
const result2 = await calculate(items, contextB);
expect(result1).not.toBe(result2);
```

**Case Sensitivity Bug (24)**:
```typescript
const upper = { state: 'HI' };
const lower = { state: 'hi' };
// Should behave the same
```

---

## 📈 Expected Agent Discovery Rate

| Tier | Bugs Found | % | Notes |
|------|-----------|---|-------|
| D (<45 pts) | 0-5 | 0-20% | Read bug comments only |
| C (45-59) | 6-12 | 25-50% | Code analysis, no testing |
| B (60-74) | 13-18 | 54-75% | Some reproduction tests |
| A (75-89) | 19-22 | 79-91% | Good testing, missing edge cases |
| S (90-100) | 23-24 | 95-100% | Comprehensive evidence |

---

**Last Updated**: 2025-10-14  
**Version**: 2.0  
**Status**: Complete - 24 bugs documented

