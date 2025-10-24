# Output Format Template

**Purpose:** Standard output formats for different agent types  
**Usage:** Ensures consistent, parseable output across all agents

---

## Worker Output Format

```markdown
# Task Completion Report: [Task ID]

## Executive Summary
**Status:** ✅ COMPLETE / ⚠️ PARTIAL / ❌ FAILED  
**Completed By:** [Worker Role]  
**Duration:** [Time taken]  
**Tool Calls:** [Number of tools used]

## Work Completed

### Deliverable 1: [Name]
**Status:** ✅ Complete  
**Files Modified:**
- `path/to/file1` - [What changed]
- `path/to/file2` - [What changed]

**Verification:**
<verification>
Verified with: `tool_name()`
Result: [Evidence of completion]
</verification>

### Deliverable 2: [Name]
**Status:** ✅ Complete  
**Files Modified:**
- `path/to/file3` - [What changed]

**Verification:**
<verification>
Verified with: `tool_name()`
Result: [Evidence of completion]
</verification>

## Success Criteria Met

- [✅] Criterion 1: [Evidence]
- [✅] Criterion 2: [Evidence]
- [✅] Criterion 3: [Evidence]

## Evidence Summary

**Files Changed:** [N] files
**Tests Added/Modified:** [N] tests
**Tests Passing:** [N/N] (100%)
**Linting:** ✅ No errors
**Build:** ✅ Successful

## Verification Commands

```bash
# Commands to verify this work:
command1
command2
```

## Notes
[Any important observations, decisions, or context]
```

---

## QC Output Format

```markdown
# QC Verification Report: [Task ID]

## Verification Summary
**Result:** ✅ PASS / ❌ FAIL  
**Score:** [0-100] / 100  
**Verified By:** [QC Role]  
**Duration:** [Time taken]

## Criteria Verification

### Criterion 1: [Description]
**Status:** ✅ PASS / ❌ FAIL  
**Evidence:** [Tool output]  
**Score:** [Points] / [Max Points]

### Criterion 2: [Description]
**Status:** ✅ PASS / ❌ FAIL  
**Evidence:** [Tool output]  
**Score:** [Points] / [Max Points]

## Issues Found

[If FAIL:]

### Issue 1: [Title]
**Severity:** Critical / Major / Minor  
**Location:** [File:Line or Command]  
**Evidence:** [What was found]  
**Required Fix:** [Specific action]

## Recommendation
✅ PASS - Proceed to next task  
❌ FAIL - Worker must retry with corrections
```

---

## PM Output Format

```markdown
# Task Decomposition Plan

## Project Overview
**Goal:** [High-level objective]  
**Complexity:** [Simple / Medium / Complex]  
**Estimated Duration:** [Total time]

## Task Graph

**Task ID:** task-0
**Title:** Environment Validation
**Description:** [Pre-flight checks]
**Dependencies:** None
**Estimated Duration:** [Time]
**Estimated Tool Calls:** [Number]

---

**Task ID:** task-1.1
**Title:** [Task name]
**Description:** [What needs to be done]
**Agent Role Description:** [Short role description for Agentinator]
**QC Role Description:** [Short QC role for Agentinator]
**Dependencies:** task-0
**Estimated Duration:** [Time]
**Estimated Tool Calls:** [Number]

**Success Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Verification Criteria:**
- Verify X with tool Y
- Check Z with command W

**Max Retries:** 2

---

[Repeat for all tasks...]
```

---

## Agentinator Output Format

```markdown
# Generated Agent Preamble

**Generated For:** [Task ID]  
**Agent Type:** Worker / QC  
**Role:** [Specific role from PM]  
**Generated:** [Timestamp]

---

[Complete preamble following worker-template.md or qc-template.md structure with all <TO BE DEFINED> sections filled in]
```

---

## QC Failure Report Format

```markdown
# QC Failure Analysis: [Task ID]

## Failure Summary
**Task:** [Task ID and title]  
**Attempts:** [N] / [Max]  
**Final Score:** [Score] / 100  
**Status:** ❌ FAILED after [N] attempts

## Root Cause Analysis

### Primary Issues
1. [Issue 1] - [Why it caused failure]
2. [Issue 2] - [Why it caused failure]

### Pattern Analysis
[Common patterns in failures across attempts]

## Recommended Corrections

### Priority 1 (Critical):
- [Specific fix needed]
- [Expected outcome]

### Priority 2 (Major):
- [Specific fix needed]
- [Expected outcome]

## Suggested Next Steps
[Actionable recommendations for PM or future workers]
```

---

## Circuit Breaker Analysis Format

```markdown
# Circuit Breaker Analysis: [Task ID]

## Trigger Summary
**Triggered At:** [Tool call count / Message count]  
**Limit:** [Configured limit]  
**Task:** [Task ID]  
**Agent:** [Worker / QC]

## Execution Analysis

**Tool Calls:** [Count]  
**Messages:** [Count]  
**Duration:** [Time]  
**Last 10 Actions:**
1. [Action]
2. [Action]
...

## Root Cause Diagnosis

**Likely Cause:** [Loop / Stuck / Too Complex / Other]  
**Evidence:** [Pattern observed]

## Recommendations

### Immediate:
- [Action to take now]

### Long-term:
- [How to prevent in future]

## Task Disposition
- [ ] Retry with modified approach
- [ ] Split into smaller tasks
- [ ] Mark as failed (too complex)
```

---

## Final Report Format

```markdown
# Final Execution Report

**Generated:** [Timestamp]  
**Total Tasks:** [N]  
**Duration:** [Total time]

## Executive Summary

**Success Rate:** [N/M] ([Percentage]%)  
**Total Tool Calls:** [Count]  
**Total Duration:** [Time]

## Task Results

### ✅ Successful Tasks ([N])

#### Task 1.1: [Title]
**Status:** ✅ PASS  
**Duration:** [Time]  
**QC Score:** [Score]/100  
**Summary:** [Brief description]

### ❌ Failed Tasks ([N])

#### Task 1.2: [Title]
**Status:** ❌ FAIL  
**Duration:** [Time]  
**Attempts:** [N]/[Max]  
**Final Score:** [Score]/100  
**Reason:** [Why it failed]

## Aggregate Metrics

**Performance:**
- Average task duration: [Time]
- Average tool calls per task: [Count]
- QC pass rate: [Percentage]%

**Quality:**
- Average QC score: [Score]/100
- First-attempt success: [Percentage]%
- Retry success rate: [Percentage]%

## Recommendations

[Strategic insights for future improvements]

## Detailed Reports

[Links to individual task reports in graph]
- Task 1.1: [Graph node ID]
- Task 1.2: [Graph node ID]
```

---

**Version:** 2.0.0  
**Status:** ✅ Complete
