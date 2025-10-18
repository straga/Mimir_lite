# Debugging Challenge: E-Commerce Order Processing System

## 🎯 Mission

This order processing system has **multiple subtle bugs** that only appear in production scenarios. All unit tests pass, but customers are reporting issues:

- Duplicate payments being charged
- Orders fulfilled at incorrect prices
- Inventory showing as unavailable when it should be in stock
- Overnight shipping offered to locations that can't receive it
- Discount calculations producing unexpected totals

Your task: **Find and document the root causes of these production issues.**

---

## 📋 System Overview

The system processes customer orders through multiple stages:

1. **Inventory Validation** - Check product availability and reserve stock
2. **Order Calculation** - Calculate item totals and shipping costs
3. **Payment Processing** - Charge customer with retry logic
4. **Order Fulfillment** - Commit inventory and complete order

### Key Components

- **`InventoryManager`** - Tracks stock levels and reservations
- **`PaymentProcessor`** - Handles payment gateway integration with retries
- **`ShippingCalculator`** - Computes shipping rates based on weight and destination
- **`OrderProcessor`** - Orchestrates the complete order workflow
- **`DiscountCalculator`** - Applies promotional and volume discounts

---

## 🧪 Running Tests

All tests currently pass:

```bash
npm test testing/agentic/order-processor.test.ts
```

Expected output:
```
✓ OrderProcessor
  ✓ Single Order Processing
    ✓ should process a simple order successfully
    ✓ should calculate order total correctly
    ✓ should fail when product is out of stock
  ✓ Shipping Calculation
    ✓ should calculate shipping for US addresses
    ✓ should calculate shipping for international addresses
  ✓ Payment Processing
    ✓ should process payment successfully
    ✓ should handle payment with round numbers
  ✓ Batch Processing
    ✓ should process multiple orders sequentially

✓ DiscountCalculator
  ✓ should apply coupon discount correctly
  ✓ should apply volume discount for large orders
  ✓ should handle orders without discounts

Tests: 11 passed, 11 total
```

---

## 🐛 Reported Production Issues

### Issue 1: Duplicate Charges
**Report**: "Customer charged twice for the same order during Black Friday sale"
**Context**: High traffic, many concurrent requests
**Impact**: Finance team processing refunds

### Issue 2: Orders at Wrong Total
**Report**: "Order subtotal showing as just shipping cost, items appear free"
**Context**: Orders with multiple items
**Impact**: Massive revenue loss

### Issue 3: Phantom Inventory Depletion
**Report**: "Products showing out of stock but warehouse has inventory"
**Context**: Happens after payment failures
**Impact**: Lost sales, requires manual inventory reconciliation

### Issue 4: Invalid Overnight Shipping
**Report**: "Promised overnight delivery to Hawaii, cannot fulfill"
**Context**: Customer entered address with lowercase state code
**Impact**: Delivery failures, customer complaints

### Issue 5: Inventory Oversold
**Report**: "Accepted more orders than available stock"
**Context**: Batch processing of multiple orders
**Impact**: Backorders, unable to fulfill commitments

### Issue 6: Incorrect Discounts
**Report**: "Discount amount doesn't match promotion terms"
**Context**: Orders with both coupon code and volume discount
**Impact**: Revenue variance, customer disputes

---

## 🔍 Debugging Guidelines

### Phase 1: Understanding the System
1. Read through the code to understand the workflow
2. Identify complex areas:
   - Async operations and Promise chains
   - Shared state and concurrency
   - Calculation logic
   - Error handling paths

### Phase 2: Reproducing Issues
1. Think about edge cases not covered by tests
2. Consider concurrency scenarios
3. Test with unusual input values
4. Verify state consistency after failures

### Phase 3: Root Cause Analysis
1. Add strategic debug markers
2. Trace execution paths
3. Check for:
   - Race conditions on shared resources
   - Async/await misuse
   - Resource leaks in error paths
   - Type coercion issues
   - Incorrect operators or precedence

### Phase 4: Documentation
Document each bug with:
- **Location**: File and line number(s)
- **Type**: Race condition, async misuse, logic error, etc.
- **Root Cause**: Technical explanation of WHY it fails
- **Trigger**: Specific conditions that expose the bug
- **Impact**: What happens in production
- **Fix Direction**: High-level approach (don't implement)

---

## ⚠️ Important Constraints

1. **Do NOT modify the tests** - They represent the current test suite
2. **Do NOT implement fixes** - Only identify and document
3. **Clean up all debug markers** - Verify with `git diff` before finishing
4. **Use inline output filtering** - `grep`, `head`, `tail` only
5. **Provide evidence** - Debug output that proves your analysis

---

## 🎯 Success Criteria

Your investigation is complete when you have:

- [ ] Identified root causes for all 6 production issues
- [ ] Provided specific line numbers for each bug
- [ ] Explained the technical reason each bug occurs
- [ ] Described how to trigger/reproduce each bug
- [ ] Suggested fix direction without implementing
- [ ] Cleaned up ALL debug markers (verify with `git diff`)
- [ ] Documented findings in clear chain-of-thought format

---

## 💡 Hints (Use Only If Stuck)

<details>
<summary>Hint 1: Common Bug Patterns</summary>

Look for these patterns that often hide bugs:
- `Promise.all()` without proper coordination
- `forEach` with async callbacks
- Shared state accessed without locks
- Floating point arithmetic
- String comparisons without normalization
- `for...in` loops on arrays
- Missing cleanup in error paths
</details>

<details>
<summary>Hint 2: Testing Strategies</summary>

Try these approaches:
- Add properties to arrays before processing
- Use concurrent execution (Promise.all)
- Test with decimal values like 10.10
- Try mixed case input strings
- Force failures at different stages
- Verify state after exceptions
- Check exact values, not just > 0
</details>

<details>
<summary>Hint 3: Debug Marker Locations</summary>

Strategic places for markers:
- Before/after async operations
- At state mutation points
- In error handling blocks
- Before/after shared resource access
- Inside loop iterations
- At calculation steps
</details>

---

## 📊 Difficulty Assessment

**Estimated Time**: 2-4 hours for experienced debugger

**Bug Distribution**:
- Easy: 0 bugs (none are obvious)
- Medium: 3 bugs (need specific test cases)
- Hard: 4 bugs (need failure scenario analysis)
- Very Hard: 2 bugs (need concurrency understanding)

**Required Skills**:
- JavaScript/TypeScript async patterns
- Concurrency and race conditions
- Floating point arithmetic
- State management
- Promise/async debugging

---

## 📝 Deliverable Template

```markdown
# Production Bug Analysis: Order Processing System

## Bug 1: [Short Description]

**Location**: `filename.ts:lineNumber`

**Type**: [Race Condition / Async Misuse / Logic Error / etc.]

**Root Cause**: 
[Technical explanation of WHY it fails]

**Trigger Conditions**:
- [Specific scenario that exposes bug]
- [Example: "Two concurrent calls with same order ID"]

**Production Impact**:
- [What happens when bug occurs]
- [Example: "Customer charged twice"]

**Evidence**:
```
[Debug output that proves the bug]
```

**Fix Direction**:
[High-level approach without implementing]
[Example: "Use atomic operation or mutex for payment check"]

---

[Repeat for each bug...]

## Summary

**Total Bugs Found**: X
**Coverage of Production Issues**: Y/6
**Lines Affected**: [List line numbers]
```

---

Good luck! Remember: the bugs are real, subtle, and mirror actual production issues found in e-commerce systems. Think like the system is under load, with concurrent users, edge case inputs, and failures happening at inconvenient times.

