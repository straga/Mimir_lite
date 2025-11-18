# Preamble Length & Model Size Research Summary

**Research Period:** November 2025  
**Repository:** Mimir / Claudette Agent Framework  
**Primary Question:** How should agent preambles (system prompts) be optimized for different model sizes?

---

## 🎯 Executive Summary

### Key Discovery: Model Size Determines Optimal Preamble Strategy

**The "Goldilocks Zone" for Preambles:**
- **<2B models:** Need MAXIMUM structure (checklists, examples, explicit stop conditions) - 79% success rate
- **3-4B models:** Need CONCRETE, technology-specific examples - abstraction causes -17% regression
- **6-7B+ models:** BENEFIT from abstraction and generic patterns - +38% improvement

**Critical Finding:** One-size-fits-all preambles DON'T work. Smaller models aren't just "worse at following instructions" - they process instructions DIFFERENTLY.

---

## 📚 Research Documents

1. **CLAUDETTE_QUANTIZED_RESEARCH_SUMMARY.md** - Optimization techniques based on academic research
2. **2025-11-03_ABSTRACT_PREAMBLE_ANALYSIS.md** - Technology-agnostic vs specific examples (Run 3 vs Run 4)
3. **2025-11-03_TINY_VS_MINI_ANALYSIS.md** - Minimal vs structured preambles on loop-prone models
4. **2025-11-03_TEST_RUN_1_ANALYSIS.md** - Baseline vs preamble effects across 1.5B-14B models

---

## 🔬 Major Findings

### Finding 1: Preamble Length Optimization by Model Size

**Source:** CLAUDETTE_QUANTIZED_RESEARCH_SUMMARY.md

#### Optimization Techniques Applied:

1. **Shorter Sentences (32% reduction)**
   - Original: "Only terminate your turn when you are sure the problem is solved and all TODO items are checked off." (19 words)
   - Optimized: "Work until the problem is completely solved and all TODO items are checked." (13 words)
   - **Best for:** 1.8B-7B models with shorter attention spans

2. **Front-Load Critical Instructions**
   - Critical autonomy rules moved to first 150 tokens (vs 300+ originally)
   - **Why:** Models pay most attention to early tokens (first 100-200 tokens have highest influence)
   - **Best for:** ALL model sizes, especially <4B

3. **Consistent Formatting**
   - Standardized checklists to `- [ ]` format
   - Flattened hierarchy (max 2 levels: `##` and `###`)
   - **Why:** Reduces cognitive load, improves pattern recognition
   - **Best for:** <7B models

4. **Explicit Over Implicit**
   - Removed: "you should probably", "it's a good idea to"
   - Used: "Check", "Create", "Use", "Execute"
   - **Best for:** ALL model sizes

5. **Flattened Logic Hierarchy**
   - Original: 3-4 nested levels
   - Optimized: Maximum 2 levels
   - **Why:** Smaller models struggle with deeply nested conditions
   - **Best for:** <7B models

**Research Sources:**
- Qwen GitHub Repository (official documentation)
- HuggingFace Chat Templating Docs
- LIMA Paper (arXiv:2305.11206) - "Less Is More for Alignment"
- Gemini Paper (arXiv:2312.11805) - Nano model optimization

---

### Finding 2: Technology-Agnostic vs Specific Examples

**Source:** 2025-11-03_ABSTRACT_PREAMBLE_ANALYSIS.md

**Test Setup:**
- Run 3: Jest/JavaScript-specific examples
- Run 4: Generic pseudo-code examples
- Models: 1.5B-6.7B

**Results by Model Size:**

#### 6-7B Models: HUGE WIN from Abstraction (+38%)

**deepseek-coder:6.7b**
- Run 3 (Jest-specific): 69/100
- Run 4 (Abstract): 95/100
- **Improvement: +26 pts (+38%)**

**Why abstraction helped:**
- Generic pseudo-code freed model from framework constraints
- Model focused on LOGIC (what to test) vs SYNTAX (how Jest does it)
- Could generalize patterns and apply correctly
- Run 3: Wrote `// Repeat the above tests...` (placeholders)
- Run 4: Generated 20 complete, distinct test cases

**Conclusion:** 6-7B models UNDERSTAND abstractions and can apply them creatively.

---

#### 3-4B Models: REGRESSION from Abstraction (-17%)

**phi4-mini:3.8b**
- Run 3 (Jest-specific): 65/100
- Run 4 (Abstract): 54/100
- **Regression: -11 pts (-17%)**

**Why abstraction hurt:**
- Model interpreted abstract syntax as "here's a template, you fill it in"
- Without concrete Jest syntax to copy, defaulted to outlines
- Test coverage dropped from 20/25 to 13/25
- Run 4 output: `// Similar tests for password validation // ... (test cases for password)`

**Conclusion:** 3-4B models NEED concrete, technology-specific examples. Abstract syntax = permission to use placeholders.

---

#### 1-2B Models: PERFECTLY STABLE (0% change)

**qwen2.5-coder:1.5b-base**
- Run 3: 79/100
- Run 4: 79/100
- **Change: 0 pts (100% consistent)**

**Why stable:**
- Model relies on structure more than content
- Abstract vs concrete made no difference
- SUCCESS FACTOR: Structured checklist format in both versions

**Conclusion:** <2B models care about STRUCTURE > CONTENT.

---

### Finding 3: Structured vs Minimal Preambles (Critical)

**Source:** 2025-11-03_TINY_VS_MINI_ANALYSIS.md

**Test Setup:**
- Claudette-Tiny: 69 lines, minimal instructions, "OUTPUT_COMPLETE" stop signal
- Claudette-Mini: 152 lines, structured checklists, explicit examples
- Models: 1.5B-6.7B

**Overall Results:**
- Mini: 71/100 average
- Tiny: 45/100 average
- **Mini wins by +58%**

---

#### Critical Case: Loop-Prone Model (qwen2.5-coder:1.5b-base)

**Tiny Preamble: 24/100, 1,176 tokens, 9.0s**
- ❌ Ignored "OUTPUT_COMPLETE" stop signal completely
- ❌ Fell into infinite repetition loop
- ❌ Generated same 2 test cases 6+ times
- ❌ Only covered validateEmail (missed 75% of requirements)

**Mini Preamble: 79/100, 872 tokens, 6.2s**
- ✅ Covered ALL 4 validation methods
- ✅ Generated 13 distinct test cases
- ✅ Stopped naturally after completing task
- ✅ **32% FASTER despite being MORE structured**
- ✅ **26% FEWER tokens generated**

**Why Mini Won:**

1. **Structure Prevents Loops**
   - Mini: Explicit checklist with numbered steps
   - Tiny: Abstract "stop after block 5" (model doesn't track what "block 5" is)

2. **Concrete Examples Work as Guards**
   - Mini: Shows exact pattern to follow
   - Tiny: Assumes model can track abstract constraints

3. **Loop Prevention Requires Structure, Not Brevity**
   - Shorter preamble ≠ less cognitive load
   - Shorter preamble = no guardrails = falls into pattern completion loops

**Counterintuitive Finding:** Mini preamble (152 lines) completed FASTER than Tiny (69 lines) for loop-prone models.

---

### Finding 4: Preamble Effects Across All Model Sizes

**Source:** 2025-11-03_TEST_RUN_1_ANALYSIS.md

**Test Setup:** 6 models (1.5B-14B), baseline vs claudette-mini v2.1.0

**Results:**

| Model Size | Baseline | Preamble | Δ | Status |
|------------|----------|----------|---|--------|
| **14B** (phi4) | 99/100 | 98/100 | -1 | ✅ Stable (already perfect) |
| **6.7B** (deepseek-coder) | 35/100 | 94/100 | **+59** | ✅ HUGE WIN |
| **4B** (gemma3) | 95/100 | 83/100 | **-12** | ⚠️ Regression (too good) |
| **3.8B** (phi4-mini) | 57/100 | 66/100 | +9 | ✅ Small Win |
| **1.5B** (qwen2.5-coder) | 15/100 | 78/100 | **+63** | ✅ HUGE WIN |
| **1.5B** (deepcoder) | 43/100 | 24/100 | **-19** | 🔴 Collapse |

---

#### The "Goldilocks Zone" Pattern:

**High Performers (>90 baseline):** Preamble adds noise
- Already know best practices
- Extra instructions interfere with natural flow
- **Recommendation:** Minimal preamble or none

**Mid-Range (35-80 baseline):** Preamble provides maximum benefit
- Need guidance but capable of following it
- +9 to +63 point improvements
- **Recommendation:** Structured preamble with examples

**Very Small + Weak (<50 baseline, <2B):** Risk of collapse
- Can't handle preamble complexity
- May trigger circuit breakers (infinite loops)
- **Recommendation:** MAXIMUM structure with explicit stop conditions

---

## 🎓 Academic Research Applied

### LIMA Paper (arXiv:2305.11206)
**"Less Is More for Alignment"**

**Key Finding:** Small amounts of high-quality, well-structured data > large volumes
**Application:** Quality > quantity for instructions
- Focus on clarity and structure, not length
- Each instruction must be actionable

### Gemini Paper (arXiv:2312.11805)
**Multi-size Model Family**

**Key Finding:** Nano models optimized for "memory-constrained use-cases"
**Application:** Smaller models need different optimization strategies
- Not just "scaled down" versions
- Require fundamentally different prompting approaches

### Qwen Documentation
**Official Model Research**

**Key Finding:** "Qwen-1.8B trained with diverse system prompts"
**Application:** Small models CAN follow complex instructions IF properly formatted
- Shorter attention spans require front-loading
- Consistent formatting critical

---

## 📋 Practical Recommendations

### For <2B Models (1.5B-1.8B):
- ✅ **USE:** Maximum structure (checklists, numbered steps)
- ✅ **USE:** Explicit examples showing exact format
- ✅ **USE:** Front-load critical instructions (first 100 tokens)
- ✅ **USE:** Concrete technology-specific examples
- ❌ **AVOID:** Abstract "stop conditions" (model won't track)
- ❌ **AVOID:** Nested logic (max 2 levels)
- ❌ **AVOID:** Implicit language ("you should", "probably")

**Example Structure:**
```markdown
## Task Checklist
1. [ ] Read requirements
2. [ ] Write function X
3. [ ] Write test Y
4. [ ] Verify output

## Example (exactly this format):
test_suite "UserValidator":
  test "validates email format":
    expect(validateEmail("valid@email.com")).toBe(true)
```

---

### For 3-4B Models:
- ✅ **USE:** Concrete, technology-specific examples (Jest, not pseudo-code)
- ✅ **USE:** Structured sections with clear headings
- ✅ **USE:** Shorter sentences (13-15 words max)
- ✅ **USE:** Explicit imperatives ("Check", "Create", "Use")
- ❌ **AVOID:** Abstract patterns or generic pseudo-code
- ❌ **AVOID:** Assumption model can generalize from patterns

**Example Structure:**
```markdown
## Writing Tests
Create tests using Jest syntax:

// Example - Copy this format:
describe('UserValidator', () => {
  it('validates email format', () => {
    expect(validateEmail("test@example.com")).toBe(true);
  });
});
```

---

### For 6-7B+ Models:
- ✅ **USE:** Abstract patterns and generic pseudo-code
- ✅ **USE:** Technology-agnostic examples
- ✅ **USE:** Conceptual explanations (WHY, not just HOW)
- ✅ **ALLOW:** Longer, more complex sentences
- ✅ **ALLOW:** Nested logic (up to 3 levels)
- ❌ **AVOID:** Over-specification (adds noise)

**Example Structure:**
```markdown
## Test Strategy
Design comprehensive test coverage:

Pattern:
test_suite "ComponentName":
  test "behavior description":
    // arrange: setup
    // act: execute
    // assert: verify

Apply this pattern to all validation methods.
```

---

### For 10B+ Models:
- ✅ **USE:** Minimal preamble (they already know best practices)
- ✅ **USE:** High-level goals and constraints
- ✅ **ALLOW:** Model to determine implementation details
- ❌ **AVOID:** Over-instruction (causes regression)

**Example Structure:**
```markdown
## Goal
Create comprehensive test suite for user validation with:
- Edge cases
- Error handling
- Async validation

Use best practices for the given framework.
```

---

## 🧪 Testing Methodology

**Benchmark Task:** User validation system
- Requirements: 12+ distinct test cases
- Complexity: Async validation, multi-field validation, error messages
- Scoring: 0-100 across 5 categories (Problem Analysis, Completeness, Coverage, Quality, Strategy)

**Models Tested:**
- 1.5B: qwen2.5-coder:1.5b-base, deepcoder:1.5b
- 3.8B: phi4-mini:3.8b
- 4B: gemma3:4b
- 6.7B: deepseek-coder:6.7b
- 14B: phi4:14b

**Preamble Versions:**
- **Baseline:** No instructions
- **Tiny:** 69 lines, minimal structure
- **Mini v2.1.0:** 152 lines, Jest-specific, structured checklists
- **Mini v2.2.0:** Technology-agnostic examples

---

## 📊 Key Metrics

### Average Improvements by Size:
- **<2B models:** +63 pts with structured preamble (Mini)
- **3-4B models:** +9 pts with concrete examples
- **6-7B models:** +59 pts with ANY preamble, +26 pts extra with abstraction
- **>10B models:** -1 to -12 pts with preamble (noise)

### Speed Findings:
- **Structured preamble FASTER than minimal for loop-prone models** (6.2s vs 9.0s)
- **Reason:** Prevents infinite loops (generate fewer total tokens)
- **Counterintuitive:** More structure = faster execution for <2B models

### Token Efficiency:
- **Mini preamble:** 872 tokens average
- **Tiny preamble:** 1,176 tokens average
- **Difference:** 26% fewer tokens with MORE structure

---

## 🚨 Critical Warnings

### Circuit Breaker Triggers:
- **deepcoder:1.5b + claudette-mini:** Hit 5000 token limit
- **Cause:** Infinite repetition loop (same test case 50+ times)
- **Solution:** Add explicit stop conditions with structured checklists

### When Preambles Hurt:
1. **Model already >90 baseline:** Preamble adds noise, causes regression
2. **Abstract syntax on 3-4B models:** Interpreted as "fill in placeholder"
3. **Minimal structure on <2B models:** Falls into pattern completion loops

---

## 🔮 Future Research

### Unanswered Questions:
1. **Optimal preamble length curve:** Exact relationship between model size and ideal preamble length
2. **Architecture differences:** Do decoder-only vs encoder-decoder models need different strategies?
3. **Quantization effects:** Does 7B-Int4 behave like 4B or 7B?
4. **Domain-specific optimization:** Different strategies for code vs text vs math?

### Proposed Tests:
1. **Gradient testing:** Test every B from 1B to 14B to find exact inflection points
2. **Quantization comparison:** Same model at FP16, Int8, Int4 to isolate quantization effects
3. **Multi-domain benchmarks:** Code, creative writing, math, reasoning across all sizes

---

## 📚 References

### Internal Documents:
- `docs/research/CLAUDETTE_QUANTIZED_RESEARCH_SUMMARY.md`
- `docs/results/2025-11-03_ABSTRACT_PREAMBLE_ANALYSIS.md`
- `docs/results/2025-11-03_TINY_VS_MINI_ANALYSIS.md`
- `docs/results/2025-11-03_TEST_RUN_1_ANALYSIS.md`

### Academic Papers:
- LIMA Paper (arXiv:2305.11206): "Less Is More for Alignment"
- Gemini Paper (arXiv:2312.11805): Multi-size model family optimization
- Qwen GitHub Repository: Official performance benchmarks and system prompt research

### External Resources:
- HuggingFace Chat Templating Guide
- Ollama Model Documentation
- Neo4j Vector Index Configuration

---

## 💡 TL;DR

**The One Rule:**
> **Model size determines instruction complexity tolerance. Smaller models need MORE structure, not LESS content.**

**Quick Reference:**
- **<2B:** Max structure + concrete examples + explicit stops = 79/100
- **3-4B:** Concrete examples + no abstraction = 65/100
- **6-7B:** Abstract patterns + structured guidance = 95/100
- **>10B:** Minimal guidance + trust model = 98/100

**Counterintuitive Truth:**
> **Longer, more structured preambles are FASTER for small models because they prevent infinite loops.**
