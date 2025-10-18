# Order Processing System - Bug Reference

**⚠️ DO NOT SHARE THIS WITH THE DEBUG AGENT ⚠️**

This document catalogs all intentional bugs in the order processing system for benchmark validation.

---

## Bug Catalog

### Bug 1: Race Condition in Payment Processing
**Location**: `PaymentProcessor.processPayment()` (lines 117-119)

**Type**: Concurrency/Race Condition

**Description**: The check for duplicate payment and the addition to the set are not atomic. If two concurrent calls process the same order ID, both can pass the check before either adds to the set.

```typescript
// Bug: Not atomic
if (this.processedPayments.has(orderId)) {
  return { success: false, error: 'Payment already processed' };
}
// ... payment processing ...
this.processedPayments.add(orderId); // Both threads can reach here
```

**Trigger**: Call `processPayment()` concurrently with the same `orderId`

**Expected Symptom**: Duplicate payments charged

**Real-world Impact**: Customer charged twice, requires refund processing

---

### Bug 2: Floating Point Comparison
**Location**: `PaymentProcessor.simulatePaymentGateway()` (line 146)

**Type**: Floating Point Arithmetic

**Description**: Direct comparison of floating point numbers can fail due to precision issues. Values like 10.10 stored as 10.099999999999 will pass validation when they shouldn't if compared with exact values.

```typescript
// Bug: Floating point comparison
if (amount < 0.01) {
  throw new Error('Invalid amount');
}
```

**Trigger**: Pass amount like `10.10` that gets represented as `10.099999999999`

**Expected Symptom**: Some valid amounts rejected, some invalid amounts accepted

**Real-world Impact**: Edge cases with cents calculations fail inconsistently

---

### Bug 3: Case-Sensitive State Comparison
**Location**: `ShippingCalculator.calculateShipping()` (line 187)

**Type**: String Comparison

**Description**: State abbreviation check is case-sensitive. If someone passes 'hi' or 'Hi' instead of 'HI', overnight shipping will incorrectly be offered to Hawaii.

```typescript
// Bug: Case-sensitive comparison
if (address.country === 'US' && address.state !== 'HI' && address.state !== 'AK') {
  // Overnight shipping available
}
```

**Trigger**: Pass address with `state: 'hi'` (lowercase) or `state: 'Hi'` (mixed case)

**Expected Symptom**: Overnight shipping offered to Hawaii/Alaska despite physical impossibility

**Real-world Impact**: Cannot fulfill overnight promise, customer dissatisfaction

---

### Bug 4: for...in Loop on Array
**Location**: `ShippingCalculator.calculateTotalWeight()` (line 198)

**Type**: Loop Misuse

**Description**: Using `for...in` on array iterates over indices as strings and includes any enumerable properties. Should use `for...of` or traditional for loop.

```typescript
// Bug: for...in on array
for (const item in items) {
  const product = productCatalog.get(items[item].productId);
  // item is string index, not the actual item
}
```

**Trigger**: Add any property to the items array (e.g., `items.metadata = {...}`)

**Expected Symptom**: Incorrect weight calculation, potential undefined access

**Real-world Impact**: Shipping cost calculated incorrectly, or runtime errors

---

### Bug 5: Missing Reservation Release on Failure
**Location**: `OrderProcessor.processOrder()` (line 234)

**Type**: Resource Leak

**Description**: When order processing fails after inventory reservation but before commitment, the reservation is never released, causing inventory to be permanently locked.

```typescript
// Bug: Reservation not released on all failure paths
try {
  order = await this.validateInventory(order); // Reserves inventory
  order = await this.calculateOrderTotal(order);
  order = await this.processPayment(order); // Can fail here
  // ...
} catch (error) {
  order.status = OrderStatus.FAILED;
  return order; // Reservation never released!
}
```

**Trigger**: Make payment fail after successful inventory reservation

**Expected Symptom**: Inventory appears unavailable even though orders failed

**Real-world Impact**: Phantom inventory depletion, lost sales

---

### Bug 6: Async Operations in forEach
**Location**: `OrderProcessor.calculateOrderTotal()` (line 267)

**Type**: Async/Await Misuse

**Description**: Using `async` callback in `forEach` doesn't wait for promises. The `itemsTotal` calculation completes before any products are fetched, resulting in 0 or incorrect totals.

```typescript
// Bug: async in forEach doesn't wait
order.items.forEach(async (item) => {
  const product = productCatalog.get(item.productId);
  if (product) {
    itemsTotal += product.price * item.quantity;
  }
});
// itemsTotal is still 0 here!
```

**Trigger**: Process any order with multiple items

**Expected Symptom**: Order total is just shipping cost (items total = 0)

**Real-world Impact**: Massive revenue loss, orders fulfilled at shipping cost only

---

### Bug 7: Inventory Not Released on Payment Failure
**Location**: `OrderProcessor.processPayment()` (line 294)

**Type**: Resource Leak

**Description**: Similar to Bug 5, but specifically in the payment failure path. Inventory reservation should be released when payment fails.

```typescript
// Bug: Should release inventory on payment failure
if (!result.success) {
  throw new Error(result.error || 'Payment failed');
  // Should call: await this.releaseReservations(order)
}
```

**Trigger**: Make payment fail with valid inventory reservation

**Expected Symptom**: Reserved inventory never becomes available again

**Real-world Impact**: Inventory locked permanently, requires manual intervention

---

### Bug 8: No Concurrency Control in Batch Processing
**Location**: `OrderProcessor.processBatch()` (line 318)

**Type**: Race Condition

**Description**: Processing multiple orders in parallel without locks allows race conditions on shared inventory. Two orders can check availability simultaneously, both see stock available, both reserve, causing over-commitment.

```typescript
// Bug: No concurrency control
const results = await Promise.all(
  orders.map(order => this.processOrder(order))
);
// Multiple orders can race on same inventory
```

**Trigger**: Process multiple orders for the same product simultaneously

**Expected Symptom**: Inventory goes negative, over-commitment of stock

**Real-world Impact**: Unable to fulfill orders, backorders, customer complaints

---

### Bug 9: Incorrect Discount Calculation Order
**Location**: `DiscountCalculator.applyDiscount()` (line 365)

**Type**: Logic Error

**Description**: Volume discount calculation has wrong operator precedence/logic. Should calculate volume discount on original total, but instead adds it to coupon discount incorrectly.

```typescript
// Bug: Wrong calculation order
if (totalItems > 10) {
  // Current: discount = (order.total * 0.05) + discount
  // Should be: discount += (order.total * 0.05)
  // But the way it's written, order matters
  discount = order.total * 0.05 + discount;
}
```

**Trigger**: Apply both coupon and volume discount

**Expected Symptom**: Discount amount calculated incorrectly when both discounts apply

**Real-world Impact**: Revenue loss or customer overcharged depending on values

---

## Bug Difficulty Classification

### Easy (Would be caught by code review)
- None - all bugs are subtle

### Medium (Requires testing to find)
- Bug 3: Case-sensitive state check (would need test with lowercase)
- Bug 4: for...in on array (would need test with array properties)
- Bug 9: Discount calculation (would need test with exact total verification)

### Hard (Requires specific conditions)
- Bug 2: Floating point (only appears with specific decimal values)
- Bug 5: Resource leak (need failure scenario testing)
- Bug 6: Async forEach (need to verify exact total, not just > 0)
- Bug 7: Payment failure path (need to test inventory state after failure)

### Very Hard (Requires concurrency testing)
- Bug 1: Payment race condition (need concurrent execution)
- Bug 8: Batch processing races (need concurrent multi-order testing)

---

## Why Tests Don't Catch These

1. **Bug 1 & 8**: Tests run sequentially, no concurrent execution
2. **Bug 2**: Tests use round numbers (10.00 not 10.10)
3. **Bug 3**: Tests use uppercase state codes ('CA', 'NY')
4. **Bug 4**: Tests never add properties to arrays
5. **Bug 5 & 7**: Tests don't verify reservation state after failures
6. **Bug 6**: Tests check `total > 0` not exact values
7. **Bug 9**: Tests don't verify exact discount calculations

---

## Testing Strategy to Expose Bugs

### Bug 1: Race Condition in Payment
```typescript
// Call processPayment twice simultaneously
const [result1, result2] = await Promise.all([
  payment.processPayment('ORD-123', 100.00),
  payment.processPayment('ORD-123', 100.00)
]);
// Both should not succeed
```

### Bug 2: Floating Point
```typescript
// Use problematic decimal values
await payment.processPayment('ORD-123', 10.10);
// May fail due to floating point representation
```

### Bug 3: Case Sensitivity
```typescript
const order = {
  shippingAddress: { country: 'US', state: 'hi', zipCode: '96801' }
};
const rates = await calculateShipping(order);
// Should not include overnight, but does
```

### Bug 4: for...in
```typescript
const items = [{ productId: 'P1', quantity: 1 }];
items.metadata = { source: 'test' }; // Add property
const weight = await calculateWeight(items);
// May fail or calculate wrong weight
```

### Bug 5 & 7: Reservation Leaks
```typescript
// Force payment to fail
const order = await processOrder(orderData);
// Check inventory.reservations.get(productId)
// Should be released but isn't
```

### Bug 6: Async forEach
```typescript
const order = {
  items: [
    { productId: 'P1', quantity: 2 },
    { productId: 'P2', quantity: 3 }
  ]
};
await processOrder(order);
// order.total should be (P1*2 + P2*3 + shipping)
// But actually is just shipping cost
```

### Bug 8: Batch Race Condition
```typescript
// Process multiple orders for same product
const orders = [
  { items: [{ productId: 'P1', quantity: 5 }] },
  { items: [{ productId: 'P1', quantity: 5 }] }
];
// If only 8 in stock, both should not succeed
await processBatch(orders);
```

### Bug 9: Discount Calculation
```typescript
calculator.addCoupon('SAVE20', 20);
const order = { total: 100, items: [{ quantity: 15 }] };
const result = await applyDiscount(order, 'SAVE20');
// Should be: 100 - 20 (coupon) - 5 (volume) = 75
// Actually might be wrong
```

---

## Success Criteria for Debug Agent

Agent should:
1. **Identify** at least 6/9 bugs
2. **Provide** specific line numbers for each bug
3. **Explain** the root cause (race condition, async misuse, etc.)
4. **Suggest** fix approach without implementing
5. **Use** strategic debug markers and filtered output
6. **Complete** full cleanup (no debug markers left)

---

## Production Impact Scenarios

### Scenario 1: Black Friday Sale
- High concurrency triggers Bugs 1 & 8
- Multiple duplicate payments
- Inventory oversold
- Customer service overwhelmed

### Scenario 2: International Expansion
- Bug 3 hits when addresses use mixed case
- Overnight shipping promised to Alaska/Hawaii
- Cannot fulfill, delivery failures

### Scenario 3: Discount Campaign
- Bug 9 causes incorrect discount calculations
- Revenue loss or customer complaints
- Finance team notices discrepancies

### Scenario 4: Inventory Audit
- Bugs 5 & 7 cause phantom inventory depletion
- Physical stock doesn't match system
- Requires manual reconciliation

---

**Last Updated**: 2025-10-14
**Total Bugs**: 9
**Difficulty Distribution**: Medium (3), Hard (4), Very Hard (2)

