# Agentic Debugging Benchmark

## 🎯 Purpose

Evaluate AI agent debugging capabilities on realistic, production-grade code with subtle, hard-to-find bugs.

---

## 📊 Benchmark Statistics

| Metric | Value |
|--------|-------|
| **Total Bugs** | 9 |
| **Lines of Code** | ~370 (system) + ~200 (tests) |
| **Test Coverage** | 100% (all tests pass) |
| **Bug Detection Rate** | 0% (tests don't find bugs) |
| **Difficulty Distribution** | Medium: 3, Hard: 4, Very Hard: 2 |
| **Estimated Time** | 2-4 hours |
| **Max Score** | 100 points |

---

## 🐛 Bug Categories

### Concurrency Issues (2 bugs - Very Hard)
- **Bug 1**: Race condition in payment duplicate check
- **Bug 8**: No concurrency control in batch processing

### Async/Promise Misuse (1 bug - Hard)
- **Bug 6**: Async operations in forEach don't await

### Resource Leaks (2 bugs - Hard)
- **Bug 5**: Reservation not released on order failure
- **Bug 7**: Inventory not released on payment failure

### Data Type Issues (1 bug - Hard)
- **Bug 2**: Floating point comparison errors

### Logic Errors (3 bugs - Medium)
- **Bug 3**: Case-sensitive state comparison
- **Bug 4**: for...in loop on array
- **Bug 9**: Incorrect discount calculation order

---

## 📁 Files

### Core System
- **`order-processor.ts`** (370 lines)
  - E-commerce order processing with inventory, payment, shipping
  - Contains 9 intentional bugs
  - Compiles without errors
  - Complex promise chains, shared state, calculations

### Test Suite
- **`order-processor.test.ts`** (200 lines)
  - 11 tests, all passing
  - Tests don't expose any bugs
  - Cover basic happy paths only
  - No concurrency, edge cases, or state verification

### Documentation
- **`README.md`** - Challenge instructions for AI agent
- **`BUGS_REFERENCE.md`** - Complete bug catalog (for validation only)
- **`SCORING_RUBRIC.md`** - Evaluation criteria (100 points)
- **`BENCHMARK_SUMMARY.md`** - This file

---

## 🎯 Success Criteria

An agent successfully completes the benchmark by:

1. **Identifying 6+ bugs** with correct root causes
2. **Providing specific line numbers** for each bug
3. **Explaining WHY each bug occurs** (not just symptoms)
4. **Describing trigger conditions** for reproduction
5. **Suggesting fix direction** without implementing
6. **Completing full cleanup** (no debug markers left)

---

## 🏆 Performance Tiers

| Tier | Score | Bugs Found | Description |
|------|-------|------------|-------------|
| **S** | 90-100 | 8-9 | Expert debugger, production-ready |
| **A** | 75-89 | 6-7 | Senior level, handles complex issues |
| **B** | 60-74 | 4-5 | Mid-level, competent debugger |
| **C** | 45-59 | 2-3 | Junior level, needs guidance |
| **D** | <45 | 0-1 | Needs significant improvement |

---

## 🔍 Why This Benchmark is Challenging

### 1. All Tests Pass
```bash
✓ 11 tests passing
```
Agent must recognize tests are insufficient, not trust green checkmarks.

### 2. Bugs Require Specific Conditions
- Concurrency (not tested)
- Edge case values (10.10 vs 10.00)
- Failure scenarios (exception paths)
- State verification (not just success/failure)

### 3. Misleading Code Patterns
- Code looks correct at first glance
- Bugs hidden in common patterns (forEach, Promise.all)
- Some bugs only appear under load

### 4. Interconnected Issues
- Multiple bugs can compound (Bug 5 + Bug 7)
- Some bugs mask others (Bug 6 makes Bug 2 less visible)

### 5. Real Production Scenarios
All bugs are based on actual issues found in e-commerce systems:
- Duplicate payment processing
- Inventory over-commitment
- Revenue loss from calculation errors
- Shipping promise failures

---

## 🧪 How to Use This Benchmark

### For AI Agent Testing:
1. Point agent to `testing/agentic/README.md`
2. Let agent read system and tests
3. Agent investigates and documents bugs
4. Evaluate using `SCORING_RUBRIC.md`
5. Validate against `BUGS_REFERENCE.md`

### For Human Developers (Training):
1. Read `README.md` for challenge
2. Try to find all 9 bugs
3. Compare findings with `BUGS_REFERENCE.md`
4. Learn debugging patterns

### For Benchmark Evolution:
1. Track success rates per bug
2. Identify bugs that are too easy/hard
3. Add new bugs based on real production issues
4. Adjust scoring based on agent capabilities

---

## 📈 Expected Agent Behavior

### Phase 1: Understanding (15-30 min)
- Read code thoroughly
- Understand workflow and data flow
- Identify complex areas
- Note test coverage gaps

### Phase 2: Hypothesis Generation (30-60 min)
- Think about edge cases
- Consider concurrency issues
- Look for async patterns
- Check error handling

### Phase 3: Investigation (60-120 min)
- Add strategic debug markers
- Test edge cases
- Force failure scenarios
- Verify state consistency
- Use filtered output (grep, head, tail)

### Phase 4: Documentation (30-45 min)
- Write clear root cause analysis
- Provide evidence (debug output)
- Explain production impact
- Suggest fix direction
- Clean up all markers

---

## 🎓 Learning Outcomes

After completing this benchmark, agents should demonstrate:

1. **Systematic Debugging**: Not just code reading, but active investigation
2. **Concurrency Awareness**: Understanding race conditions and shared state
3. **Async Pattern Mastery**: Knowing Promise.all, forEach, for...of differences
4. **Edge Case Thinking**: Testing unusual inputs and failure paths
5. **Production Mindset**: Considering real-world impact and scenarios
6. **Evidence-Based Analysis**: Using debug output to prove hypotheses
7. **Clean Coding**: Removing all temporary instrumentation

---

## 🔮 Future Enhancements

### v1.1 (Planned)
- Add distributed system bugs (network, timeouts)
- Include database race conditions
- Add memory leak scenarios

### v1.2 (Planned)
- Microservices communication bugs
- Event sourcing edge cases
- Cache invalidation issues

### v2.0 (Planned)
- Multiple interconnected services
- 15+ bugs across system
- Production telemetry simulation

---

## 📊 Benchmark Metadata

```json
{
  "name": "order-processing-debug-benchmark",
  "version": "1.0.0",
  "category": "debugging",
  "difficulty": "hard",
  "estimated_time_hours": 3,
  "language": "TypeScript",
  "framework": "Node.js",
  "test_framework": "Vitest",
  "bug_count": 9,
  "lines_of_code": 570,
  "test_count": 11,
  "test_pass_rate": "100%",
  "real_bug_detection_rate": "0%",
  "created": "2025-10-14",
  "maintainer": "CVS Health AI Team"
}
```

---

## 🏁 Quick Start

```bash
# Run tests (all pass, hiding bugs)
npm test testing/agentic/order-processor.test.ts

# Start debugging challenge
open testing/agentic/README.md

# Validate findings
cat testing/agentic/BUGS_REFERENCE.md

# Score results
cat testing/agentic/SCORING_RUBRIC.md
```

---

## ⚠️ Important Notes

1. **Do NOT share `BUGS_REFERENCE.md` with agents being tested**
2. **All tests pass by design** - that's the point
3. **Bugs are production-realistic** - not contrived examples
4. **Cleanup is mandatory** - agents must remove debug markers
5. **No code modification** - identify and document only

---

**Status**: ✅ Ready for Evaluation  
**Version**: 1.0  
**Last Updated**: 2025-10-14  
**Total Bugs**: 9 (Medium: 3, Hard: 4, Very Hard: 2)

