# Debugging Benchmark - Scoring Rubric

## Overview

This rubric evaluates an AI agent's debugging capabilities on a realistic e-commerce system with 9 intentional bugs of varying difficulty.

---

## Scoring Categories

### 1. Bug Discovery (40 points)

**Points per bug identified:**
- Medium difficulty (Bugs 3, 4, 9): 3 points each = 9 points
- Hard difficulty (Bugs 2, 5, 6, 7): 5 points each = 20 points  
- Very Hard difficulty (Bugs 1, 8): 7 points each = 14 points

**Partial Credit:**
- Correct location but wrong root cause: 50% of points
- Correct root cause but wrong location: 25% of points
- Identified symptom but not bug: 10% of points

**Bug List:**
1. **Bug 1** (7pts): Race condition in payment processing (PaymentProcessor:117-119)
2. **Bug 2** (5pts): Floating point comparison (PaymentProcessor:146)
3. **Bug 3** (3pts): Case-sensitive state check (ShippingCalculator:187)
4. **Bug 4** (3pts): for...in loop on array (ShippingCalculator:198)
5. **Bug 5** (5pts): Missing reservation release on failure (OrderProcessor:234)
6. **Bug 6** (5pts): Async forEach (OrderProcessor:267)
7. **Bug 7** (5pts): Inventory not released on payment failure (OrderProcessor:294)
8. **Bug 8** (7pts): No concurrency control in batch (OrderProcessor:318)
9. **Bug 9** (3pts): Incorrect discount calculation (DiscountCalculator:365)

---

### 2. Root Cause Analysis Quality (25 points)

**For each bug found, evaluate explanation:**

| Quality Level | Points per Bug | Criteria |
|--------------|----------------|----------|
| Excellent | Full points | • Precise technical explanation<br>• Identifies exact code pattern<br>• Explains why it fails<br>• Mentions affected data structures/state |
| Good | 75% | • Correct general explanation<br>• Identifies problem area<br>• May lack some technical precision |
| Adequate | 50% | • Basic understanding shown<br>• Identifies symptom correctly<br>• Missing some technical depth |
| Poor | 25% | • Vague or partially incorrect<br>• Symptom identified but not cause |
| Missing | 0% | • No explanation provided |

**Maximum**: 25 points (distributed across bugs found)

**Examples:**

**Excellent (Bug 6):**
> "The `forEach` method with an async callback doesn't wait for promises to complete. When `order.items.forEach(async (item) => ...)` runs, the forEach doesn't await the async function, so execution continues immediately. The `itemsTotal` calculation completes before any products are fetched from the catalog, resulting in a total of 0. Should use `for...of` loop or `Promise.all(items.map(...))`"

**Good:**
> "Using async inside forEach doesn't wait for the promises. The total is calculated before items are processed."

**Adequate:**
> "The forEach loop isn't waiting for the async operations."

---

### 3. Debugging Methodology (20 points)

**Strategic Instrumentation (10 points)**
- [ ] Added debug markers at critical decision points (3pts)
- [ ] Used progressive hypothesis refinement (3pts)
- [ ] Tested edge cases and failure scenarios (2pts)
- [ ] Traced execution flow systematically (2pts)

**Output Filtering (5 points)**
- [ ] Used inline pipes (grep, head, tail) effectively (2pts)
- [ ] Progressive filtering to narrow results (2pts)
- [ ] No use of tee/file output (1pt)

**Evidence-Based Analysis (5 points)**
- [ ] Provided debug output as proof (2pts)
- [ ] Cited specific line numbers (2pts)
- [ ] Showed state at critical points (1pt)

---

### 4. Production Impact Understanding (10 points)

For bugs found, evaluate understanding of real-world impact:

- **Excellent (2pts per bug)**: Describes specific production scenario, customer impact, business consequence
- **Good (1pt)**: Mentions general impact or severity
- **Adequate (0.5pts)**: Acknowledges it's a problem
- **None (0pts)**: No impact discussion

**Maximum**: 10 points (distributed across bugs found)

**Example Excellent:**
> "In a Black Friday scenario with high concurrency, multiple payment processors could simultaneously check the same order ID, both pass the duplicate check, and charge the customer twice. This requires finance team intervention, refund processing, and damages customer trust."

---

### 5. Process Quality (5 points)

**Cleanup (3 points)**
- [ ] All debug markers removed (2pts)
- [ ] Verified with git diff (1pt)
- [ ] Code compiles without errors (required, 0pts if fails)

**Communication (2 points)**
- [ ] Clear, concise documentation (1pt)
- [ ] Well-organized findings (1pt)

---

## Total Score: 100 Points

| Category | Points | Weight |
|----------|--------|--------|
| Bug Discovery | 40 | 40% |
| Root Cause Analysis | 25 | 25% |
| Debugging Methodology | 20 | 20% |
| Production Impact | 10 | 10% |
| Process Quality | 5 | 5% |
| **TOTAL** | **100** | **100%** |

---

## Performance Tiers

### Tier S: Expert Debugger (90-100 points)
- Found 8-9 bugs with precise root causes
- Excellent methodology and evidence
- Deep production impact understanding
- Clean, well-documented analysis

### Tier A: Senior Level (75-89 points)
- Found 6-7 bugs with good explanations
- Solid debugging approach
- Good understanding of impact
- Professional documentation

### Tier B: Mid Level (60-74 points)
- Found 4-5 bugs with adequate explanations
- Basic systematic approach
- Some impact awareness
- Acceptable documentation

### Tier C: Junior Level (45-59 points)
- Found 2-3 bugs
- Inconsistent methodology
- Limited impact understanding
- Incomplete analysis

### Tier D: Needs Improvement (<45 points)
- Found 0-1 bugs
- No systematic approach
- Minimal understanding

---

## Detailed Bug Scoring

### Bug 1: Payment Race Condition (7 points)

**Discovery:**
- Identified race condition: 7pts
- Mentioned duplicate payment risk: Full credit
- Wrong cause: 0pts

**Root Cause Quality (up to 2.5pts):**
- Explains non-atomic check-then-set: 2.5pts
- Mentions race condition: 1.5pts
- Just says "concurrency issue": 0.5pts

**Example Evidence:**
```javascript
// Call twice concurrently
const [r1, r2] = await Promise.all([
  payment.processPayment('ORD-X', 100),
  payment.processPayment('ORD-X', 100)
]);
// Both return success - BUG!
```

---

### Bug 2: Floating Point (5 points)

**Discovery:**
- Identified floating point issue: 5pts
- Mentioned specific decimals (10.10): Full credit
- Vague "number comparison": 2pts

**Root Cause Quality (up to 2.5pts):**
- Explains IEEE 754 representation: 2.5pts
- Mentions precision issues: 1.5pts
- Just says "decimal problem": 0.5pts

---

### Bug 3: Case-Sensitive State (3 points)

**Discovery:**
- Found state comparison bug: 3pts
- Mentioned case sensitivity: Full credit
- Found but wrong reason: 1pt

**Root Cause Quality (up to 2.5pts):**
- Explains string comparison w/ examples: 2.5pts
- Mentions case sensitivity: 1.5pts
- Generic "string issue": 0.5pts

---

### Bug 4: for...in Loop (3 points)

**Discovery:**
- Identified for...in misuse: 3pts
- Explained enumerable properties: Full credit
- Just says "wrong loop": 1pt

**Root Cause Quality (up to 2.5pts):**
- Explains index as string + enumerable: 2.5pts
- Mentions for...in on array wrong: 1.5pts
- Says "loop problem": 0.5pts

---

### Bug 5: Reservation Leak on Failure (5 points)

**Discovery:**
- Found reservation not released: 5pts
- Traced through error path: Full credit
- Found but incomplete: 2pts

**Root Cause Quality (up to 2.5pts):**
- Explains resource leak in catch block: 2.5pts
- Mentions missing release call: 1.5pts
- Says "cleanup problem": 0.5pts

---

### Bug 6: Async forEach (5 points)

**Discovery:**
- Identified async in forEach: 5pts
- Explained promise not awaited: Full credit
- Found but vague: 2pts

**Root Cause Quality (up to 2.5pts):**
- Explains forEach doesn't await + timing: 2.5pts
- Mentions promise not waited: 1.5pts
- Says "async issue": 0.5pts

---

### Bug 7: Payment Failure Path (5 points)

**Discovery:**
- Found missing release on payment fail: 5pts
- Similar to Bug 5 but different path: Full credit
- Duplicate of Bug 5: 2pts

**Root Cause Quality (up to 2.5pts):**
- Explains specific failure path: 2.5pts
- Mentions resource not released: 1.5pts
- Generic "cleanup": 0.5pts

---

### Bug 8: Batch Concurrency (7 points)

**Discovery:**
- Found race in batch processing: 7pts
- Explained inventory over-commitment: Full credit
- Vague concurrency mention: 3pts

**Root Cause Quality (up to 2.5pts):**
- Explains parallel access to shared state: 2.5pts
- Mentions race condition: 1.5pts
- Says "concurrency problem": 0.5pts

---

### Bug 9: Discount Calculation (3 points)

**Discovery:**
- Found order of operations bug: 3pts
- Showed incorrect math: Full credit
- Found but wrong reason: 1pt

**Root Cause Quality (up to 2.5pts):**
- Explains exact calculation error: 2.5pts
- Mentions wrong formula: 1.5pts
- Says "math wrong": 0.5pts

---

## Benchmark Success Criteria

**Minimum Viable**: 60 points (Tier B)
- Demonstrates competent debugging skills
- Suitable for mid-level development tasks

**Production Ready**: 75 points (Tier A)
- Can handle complex production issues
- Suitable for senior developer role

**Expert Level**: 90 points (Tier S)
- Exceptional debugging capabilities
- Suitable for principal/staff level

---

## Time-Based Scoring Modifiers (Optional)

For timed benchmarks:

**Speed Bonus**:
- Completed in < 1 hour: +5 points
- Completed in 1-2 hours: +2 points
- Completed in 2-4 hours: 0 points
- Completed in > 4 hours: -2 points

**Quality Penalty**:
- Incomplete cleanup: -5 points
- False positives (non-bugs reported): -2 points each
- Code doesn't compile after changes: -10 points

---

## Notes for Evaluators

1. **Partial Credit Philosophy**: Award partial credit generously for demonstrating understanding, even if not perfect

2. **Bug Overlap**: Bugs 5 and 7 are similar (resource leaks). If agent finds one and mentions "similar pattern elsewhere," give 75% credit for the second

3. **Evidence Weight**: Actual debug output showing the bug is worth more than theoretical explanation

4. **Fix Direction**: Don't penalize if fix suggestion isn't optimal, as long as it would address the root cause

5. **Documentation Style**: Don't penalize for formatting preferences as long as information is clear

---

**Version**: 1.0  
**Last Updated**: 2025-10-14  
**Benchmark**: Order Processing System v1

