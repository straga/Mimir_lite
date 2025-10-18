# LLM Coding Agent Benchmark Test

## Instructions for Test Administrator

This benchmark measures coding agent performance on a medium-complexity engineering task. You can run this in two modes:

- **Mode A (Self-Report):** Use the combined prompt - agent implements task AND self-evaluates
- **Mode B (External Eval):** Use Task Prompt only, then evaluate with Scoring Prompt separately

**Recommended:** Mode B for unbiased results (prevents agents from gaming self-evaluation)

---

## TASK PROMPT (Use this for all agents)

```markdown
# Coding Task: Product Cache API Endpoint

Implement a simple REST API endpoint in Express.js that serves cached product data from an in-memory store.

## Requirements

Your endpoint should:
1. Fetch product data (simulated or static list - at least 5 products with id, name, price)
2. Cache the data in memory for performance
3. Return JSON responses with proper HTTP status codes
4. Handle errors gracefully (404, 500, etc.)
5. Include at least one example of cache invalidation or timeout mechanism
6. Follow Express.js best practices

## Deliverables

Provide:
- Complete, runnable Express.js code
- Brief explanation of your caching strategy (2-3 sentences)
- One example of how to test the endpoint (curl or similar)

## Constraints

- Use only Node.js built-in modules + Express.js
- No external caching libraries (Redis, etc.)
- Keep it production-ready but simple

Begin implementation now.
```

---

## SCORING PROMPT (Use after task completion for Mode B)

```markdown
# Benchmark Evaluation: Coding Agent Output Analysis

You are evaluating a coding agent's response to a medium-complexity Express.js task.

## Original Task
[Paste the Task Prompt above]

## Agent Output
[Paste the agent's complete response here]

## Evaluation Criteria

Analyze the output and provide scores (0-10 scale) for each dimension:

### 1. Code Quality and Correctness (Weight: 45%)

**Score: ___/10**

Criteria:
- ✅ Code is syntactically correct and runnable
- ✅ Implements all 5 requirements correctly
- ✅ Follows Express.js conventions and best practices
- ✅ Error handling is comprehensive
- ✅ Code is well-structured and maintainable
- ✅ Cache invalidation/timeout works as described

Deductions:
- -2 points: Missing any requirement
- -1 point: Syntax errors or non-runnable code
- -1 point: Poor error handling
- -0.5 points: Style/convention violations

**Justification:** [Explain score]

---

### 2. Token Efficiency (Weight: 35%)

**Score: ___/10**

First, measure:
- **Total tokens used:** [Prompt tokens] + [Output tokens] = ___
- **Lines of actual code:** ___ (exclude comments, explanations)
- **Code lines per 1K tokens:** ___ ÷ (Total tokens / 1000) = ___

Then calculate efficiency score using this scale:
- **30+ lines per 1K tokens:** 10/10 (excellent)
- **25-30 lines per 1K:** 9/10 (very good)
- **20-25 lines per 1K:** 8/10 (good)
- **15-20 lines per 1K:** 7/10 (acceptable)
- **10-15 lines per 1K:** 5/10 (verbose)
- **<10 lines per 1K:** 3/10 (extremely inefficient)

Additional considerations:
- +1 point: No unnecessary meta-commentary or preamble
- -1 point: Excessive explanatory text (>40% of output)
- -1 point: Redundant code or unnecessary abstractions

**Calculated Efficiency:** ___ lines per 1K tokens = ___/10 base score
**Adjustments:** ___
**Final Token Efficiency Score:** ___/10

**Justification:** [Explain score]

---

### 3. Explanatory Depth / Reasoning Clarity (Weight: 20%)

**Score: ___/10**

Criteria:
- ✅ Caching strategy is clearly explained
- ✅ Design decisions are justified
- ✅ Test example is provided and functional
- ✅ Code comments explain complex logic
- ✅ Output helps developer understand approach

Scoring guide:
- **9-10:** Excellent explanations, teaches concepts, anticipates questions
- **7-8:** Good clarity, covers key decisions, useful to readers
- **5-6:** Minimal but sufficient explanations, focused on code
- **3-4:** Sparse explanations, assumes too much knowledge
- **0-2:** No explanations or unhelpful commentary

**Justification:** [Explain score]

---

## Weighted Overall Score Calculation

```
Overall = (Code Quality × 0.45) + (Token Efficiency × 0.35) + (Explanatory Depth × 0.20)
        = (___/10 × 0.45) + (___/10 × 0.35) + (___/10 × 0.20)
        = ___/10
```

**Final Weighted Score: ___/10**

---

## Efficiency Metrics Summary

| Metric | Value |
|--------|-------|
| Total Tokens (Prompt + Output) | ___ |
| Lines of Code (actual) | ___ |
| Code Lines per 1K Tokens | ___ |
| Code Quality Score | ___/10 |
| Token Efficiency Score | ___/10 |
| Explanatory Depth Score | ___/10 |
| **Weighted Overall** | **___/10** |

---

## Qualitative Assessment

**Strengths:**
- [List 2-3 key strengths]

**Weaknesses:**
- [List 2-3 areas for improvement]

**Ideal Use Case:**
[Describe what type of developer or scenario this agent serves best]

**Comparison to Benchmark Agents:**
[If running comparative test, note which agent from the abstract this resembles most: Extensive/BeastMode/Auto/Condensed/Compact]

---

## Reproducibility Notes

**Model Used:** [e.g., GPT-4, Claude Sonnet, etc.]
**Temperature:** [e.g., 0.3]
**Date:** [YYYY-MM-DD]
**Evaluator:** [Name or "Automated"]
**Special Notes:** [Any context-specific factors]

---

End of evaluation.
```

---

## MODE A: COMBINED SELF-EVALUATION PROMPT (Alternative)

**⚠️ Warning:** Self-evaluation may introduce bias. Agents might inflate scores or miscount tokens.

```markdown
# Coding Task + Self-Evaluation: Product Cache API Endpoint

## Part 1: Implementation Task

Implement a simple REST API endpoint in Express.js that serves cached product data from an in-memory store.

### Requirements
Your endpoint should:
1. Fetch product data (simulated or static list - at least 5 products with id, name, price)
2. Cache the data in memory for performance
3. Return JSON responses with proper HTTP status codes
4. Handle errors gracefully (404, 500, etc.)
5. Include at least one example of cache invalidation or timeout mechanism
6. Follow Express.js best practices

### Deliverables
- Complete, runnable Express.js code
- Brief explanation of your caching strategy (2-3 sentences)
- One example of how to test the endpoint

**Constraints:** Use only Node.js built-in modules + Express.js. No external caching libraries.

---

## Part 2: Self-Evaluation (Complete AFTER implementation)

After completing Part 1, evaluate your own output using these metrics:

### Metrics to Calculate

1. **Total tokens used:**
   - Your system prompt tokens: ___
   - Your output tokens: ___
   - Total: ___

2. **Lines of actual code:** ___ (exclude blank lines, comments, explanations)

3. **Code lines per 1K tokens:** [Lines of code] ÷ ([Total tokens] / 1000) = ___

### Scores (0-10 scale)

**Code Quality Score: ___/10**
- Does your code implement all 5 requirements correctly?
- Is it syntactically correct and runnable?
- Does it follow Express.js best practices?
- Is error handling comprehensive?

**Token Efficiency Score: ___/10**
- Use this scale based on your calculated "code lines per 1K tokens":
  - 30+: 10/10
  - 25-30: 9/10
  - 20-25: 8/10
  - 15-20: 7/10
  - 10-15: 5/10
  - <10: 3/10

**Explanatory Depth Score: ___/10**
- Did you explain the caching strategy clearly?
- Are design decisions justified?
- Is the test example functional?
- Will a developer understand your approach?

**Weighted Overall Score:**
```
(Code Quality × 0.45) + (Token Efficiency × 0.35) + (Explanatory Depth × 0.20) = ___/10
```

### Summary Table

| Metric | Value |
|--------|-------|
| Total Tokens | ___ |
| Lines of Code | ___ |
| Code Lines per 1K Tokens | ___ |
| Code Quality | ___/10 |
| Token Efficiency | ___/10 |
| Explanatory Depth | ___/10 |
| **Weighted Overall** | **___/10** |

**Self-Assessment:** [1-2 sentences on what you did well and what could improve]

---

End of benchmark.
```

---

## Usage Instructions

### For Mode A (Self-Report):
1. Copy the "MODE A: COMBINED" prompt
2. Paste into your agent's chat
3. Agent completes task AND provides scores
4. Record results in comparison table

### For Mode B (External Eval) - **RECOMMENDED**:
1. Copy the "TASK PROMPT" only
2. Paste into agent's chat
3. Let agent complete implementation
4. Copy agent's full output
5. Use "SCORING PROMPT" with a separate evaluator (human or different LLM)
6. Record results in comparison table

### For Comparative Testing:
Run the same prompt across all agents, then compile results:

| Agent | Code Quality | Token Efficiency | Explanatory Depth | Weighted Overall |
|-------|--------------|------------------|-------------------|------------------|
| Agent A | ___ | ___ | ___ | ___ |
| Agent B | ___ | ___ | ___ | ___ |
| ... | ... | ... | ... | ... |

---

## Notes on Benchmark Design

**Why Express.js caching?**
- Medium complexity: not trivial, not overwhelming
- Tests multiple skills: API design, memory management, error handling
- Clear success criteria (5 requirements)
- Realistic production scenario

**Why these weights?**
- Code Quality (45%): Most critical - code must work correctly
- Token Efficiency (35%): Major factor in production costs and context limits
- Explanatory Depth (20%): Important but secondary to working code

**Limitations:**
- Single task may not represent full agent capabilities
- Token counting may vary by implementation
- Self-evaluation (Mode A) subject to bias
- Human judgment still required for "best practices" assessment

---

**Version:** 1.0  
**Created:** 2025-10-10  
**Compatible with:** GPT-4, Claude, other instruct-tuned models

