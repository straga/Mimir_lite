# Graph Data Schema & Missing Insights Analysis

**Version:** 1.0  
**Date:** 2025-10-17  
**Status:** Analysis Complete

---

## 📊 Executive Summary

This document analyzes the current graph data schema used in the task execution system, identifies gaps in data capture, and recommends enhancements for better observability, debugging, and performance analysis.

**Key Findings:**
- ✅ **Good Coverage**: Task metadata, QC verification, timing, and basic metrics
- ⚠️ **Missing**: Model tracking, tool usage details, file-level changes, cost tracking
- ❌ **Critical Gap**: No relationships/edges between entities (isolated nodes)

---

## 🗄️ Current Data Schema

### Task Node Properties (Currently Captured)

```typescript
interface TaskNode {
  // Identification
  id: string;                        // ✅ task-1.1, task-1.2, etc.
  taskId: string;                    // ✅ Duplicate of id
  title: string;                     // ✅ Human-readable title
  
  // Task Definition
  description: string;               // ✅ Full task prompt
  requirements: string;              // ✅ Same as description (duplicate?)
  workerRole: string;                // ✅ Worker agent role description
  qcRole: string;                    // ✅ QC agent role description
  verificationCriteria: string;      // ✅ QC verification checklist
  
  // Execution Metadata
  status: string;                    // ✅ pending | awaiting_qc | completed | failed
  outcome: string;                   // ✅ success | failure
  hasQcVerification: boolean;        // ✅ Whether QC is enabled
  maxRetries: number;                // ✅ Max retry attempts (default 2)
  attemptNumber?: number;            // ✅ Current attempt number
  finalAttempt?: number;             // ✅ Last attempt made
  
  // Timing
  startedAt: string;                 // ✅ ISO timestamp (start)
  completedAt?: string;              // ✅ ISO timestamp (end)
  lastUpdated: string;               // ✅ ISO timestamp (last update)
  duration?: number;                 // ✅ Milliseconds
  totalDuration?: number;            // ✅ Milliseconds (total across retries)
  workerDuration?: number;           // ✅ Milliseconds (worker execution time)
  
  // Worker Output
  workerOutput: string;              // ✅ Truncated to 50k chars
  workerTokens: string;              // ✅ "X input, Y output"
  workerToolCalls: number;           // ✅ Count of tool calls
  
  // QC Verification
  lastQcScore: number;               // ✅ 0-100
  lastQcPassed: boolean;             // ✅ true/false
  qcVerificationHistory: string;     // ✅ JSON array of QC attempts
  qcAttempt1?: string;               // ✅ JSON of first QC result
  qcAttempt2?: string;               // ✅ JSON of second QC result
  qcFailureReport?: string;          // ✅ Generated failure report
  
  // Context (Sparse)
  files?: string[];                  // ⚠️ Often empty
  dependencies?: string[];           // ⚠️ Often empty
  
  // Failure Handling
  failureReason?: string;            // ✅ Human-readable error message
}
```

---

## ❌ Missing Data Points (Critical)

### 1. **Model Tracking** ⚠️ HIGH PRIORITY
**What's Missing:**
- Which LLM model was used for each attempt (GPT-4.1, GPT-5, Claude Sonnet 4)
- Model parameters (temperature, maxTokens, streaming)
- Model-specific performance metrics

**Why It Matters:**
- Cannot compare model performance (GPT-5 vs GPT-4.1 vs Claude)
- Cannot identify model-specific failure patterns
- Cannot optimize model selection for task types

**Recommended Fields:**
```typescript
{
  workerModel: string;           // "gpt-5", "gpt-4.1", "claude-sonnet-4"
  workerTemperature: number;     // 0.0
  workerMaxTokens: number;       // 1000
  qcModel: string;               // Model used for QC
  qcTemperature: number;
  qcMaxTokens: number;
}
```

---

### 2. **Tool Usage Details** ⚠️ HIGH PRIORITY
**What's Missing:**
- Which specific tools were called (only have count)
- Tool call frequency distribution
- Tool call success/failure rates
- Tool execution times

**Why It Matters:**
- Cannot detect missing tool usage (e.g., worker made 0 tool calls = suspicious)
- Cannot identify inefficient tool patterns
- Cannot optimize tool selection/availability

**Recommended Fields:**
```typescript
{
  toolCallDetails: Array<{
    tool: string;              // "read_file", "write", "run_terminal_cmd"
    timestamp: string;
    durationMs: number;
    success: boolean;
    error?: string;
  }>;
  toolCallSummary: {
    read_file: number;
    write: number;
    run_terminal_cmd: number;
    // ... etc
  };
}
```

**Detection Heuristics:**
- 0 tool calls + "success" = likely hallucination
- 0 `read_file` calls = worker didn't verify context
- 0 `run_terminal_cmd` with "tests passed" claim = suspicious

---

### 3. **File-Level Change Tracking** ⚠️ MEDIUM PRIORITY
**What's Missing:**
- Which files were actually modified/created/deleted
- Line count changes per file
- Diff size estimates
- File type distribution

**Why It Matters:**
- Cannot verify worker claims ("I modified X files")
- Cannot detect scope creep (changed more files than requested)
- Cannot quantify work output

**Recommended Fields:**
```typescript
{
  fileChanges: Array<{
    path: string;
    changeType: "created" | "modified" | "deleted";
    linesAdded: number;
    linesRemoved: number;
    sizeBytes: number;
    timestamp: string;
  }>;
  fileChangeSummary: {
    created: number;
    modified: number;
    deleted: number;
    totalLinesChanged: number;
  };
}
```

---

### 4. **Context Size Tracking** ⚠️ MEDIUM PRIORITY
**What's Missing:**
- Prompt token count for each attempt
- Context growth between retries
- Pre-fetch vs runtime context ratio

**Why It Matters:**
- Detect context explosion early (like the 623k token error!)
- Optimize context management
- Identify retry bloat

**Recommended Fields:**
```typescript
{
  contextMetrics: {
    attempt1PromptTokens: number;
    attempt2PromptTokens: number;
    contextGrowthRatio: number;    // attempt2 / attempt1
    preFetchTokens: number;
    runtimeContextTokens: number;
  };
}
```

**Alert Thresholds:**
- contextGrowthRatio > 2.0 = warning (context bloat)
- contextGrowthRatio > 5.0 = critical (exponential growth)
- promptTokens > 100k = approaching limit

---

### 5. **Error & Recovery Details** ⚠️ MEDIUM PRIORITY
**What's Missing:**
- Structured error taxonomy
- Stack traces for exceptions
- Recovery actions attempted
- Error patterns across attempts

**Why It Matters:**
- Better debugging (structured data > text)
- Pattern detection in failures
- Automated recovery strategies

**Recommended Fields:**
```typescript
{
  errors: Array<{
    attemptNumber: number;
    errorType: "tool_call_failed" | "timeout" | "token_limit" | "qc_failed" | "exception";
    errorCode?: string;
    errorMessage: string;
    stackTrace?: string;
    recoveryAttempted: boolean;
    recoveryStrategy?: string;
  }>;
}
```

---

### 6. **QC Reasoning Trace** 🔍 LOW PRIORITY
**What's Missing:**
- Which verification criteria were checked
- Which criteria passed/failed
- Reasoning process for score

**Why It Matters:**
- Understand QC decision-making
- Improve verification criteria
- Detect QC hallucinations

**Recommended Fields:**
```typescript
{
  qcReasoningTrace: {
    criteriaChecked: string[];
    criteriaPassed: string[];
    criteriaFailed: string[];
    scoreBreakdown: {
      completeness: number;      // 0-25
      correctness: number;        // 0-25
      testCoverage: number;       // 0-25
      documentation: number;      // 0-25
    };
  };
}
```

---

### 7. **Cost Estimation** 💰 LOW PRIORITY
**What's Missing:**
- Estimated API cost per task
- Cost per attempt
- Cost breakdown by model

**Why It Matters:**
- Budget tracking
- Cost optimization
- ROI analysis

**Recommended Fields:**
```typescript
{
  costEstimate: {
    workerCostUSD: number;
    qcCostUSD: number;
    totalCostUSD: number;
    costPerAttempt: number[];
  };
}
```

**Pricing (as of 2025):**
- GPT-5: $0.01 per 1k input tokens, $0.03 per 1k output
- GPT-4.1: $0.0025 per 1k input, $0.01 per 1k output
- Claude Sonnet 4: $0.003 per 1k input, $0.015 per 1k output

---

## 🔗 Missing Relationships (CRITICAL GAP!)

Currently, all task nodes are **isolated** in the graph. No edges/relationships exist!

### Recommended Relationships

#### 1. **Task Dependencies**
```cypher
(task-1.1) -[:DEPENDS_ON]-> (task-1.2)
(task-2.1) -[:DEPENDS_ON]-> (task-1.1)
```
**Benefit:** Detect blocking issues, optimize parallel execution

#### 2. **File Modifications**
```cypher
(task-1.1) -[:MODIFIES]-> (file:src/app.component.ts)
(task-1.1) -[:CREATES]-> (file:src/cache.service.ts)
(task-1.1) -[:DELETES]-> (file:src/old-service.ts)
```
**Benefit:** Track file evolution, detect conflicts

#### 3. **Agent Execution**
```cypher
(task-1.1) -[:EXECUTED_BY {attempt: 1}]-> (agent:worker-cc6acead)
(task-1.1) -[:VERIFIED_BY {attempt: 1}]-> (agent:worker-40fd9eb3)
```
**Benefit:** Agent performance tracking, reuse optimization

#### 4. **QC Verification Chain**
```cypher
(qc-result-1.1-attempt1) -[:VERIFIES]-> (worker-output-1.1-attempt1)
(qc-result-1.1-attempt2) -[:VERIFIES]-> (worker-output-1.1-attempt2)
```
**Benefit:** Audit trail, QC effectiveness analysis

#### 5. **Issue/Fix Relationships**
```cypher
(task-1.1) -[:FIXES]-> (issue:jest-config-exclusion)
(task-1.2) -[:ADDRESSES]-> (requirement:translation-caching)
```
**Benefit:** Requirements traceability, impact analysis

---

## 📈 Data Completeness Score (Current)

| Category               | Score | Notes                                    |
|------------------------|-------|------------------------------------------|
| Task Identification    | ✅ 95% | title, id, description present          |
| Execution Metadata     | ✅ 90% | status, timing, attempts tracked        |
| Worker Output          | ✅ 85% | output, tokens, tool count captured     |
| QC Verification        | ✅ 80% | scores, history, feedback stored        |
| Context & Dependencies | ⚠️ 30% | files/deps often empty or missing       |
| Tool Usage Details     | ❌ 10% | only count, no specifics                |
| Model Tracking         | ❌ 0%  | not captured at all                     |
| File Changes           | ❌ 0%  | not captured at all                     |
| Cost Tracking          | ❌ 0%  | not captured at all                     |
| Relationships/Edges    | ❌ 0%  | no edges created                        |

**Overall Completeness: 39%** (4/10 categories well-covered)

---

## 🎯 Implementation Priorities

### Phase 1: Critical Gaps (Week 1)
1. ✅ Add `workerModel`, `qcModel`, `modelParameters` fields
2. ✅ Capture `toolCallDetails` array (which tools were called)
3. ✅ Track `contextMetrics` (prompt token counts per attempt)
4. ✅ Create task dependency edges (`DEPENDS_ON`)

### Phase 2: High-Value (Week 2)
5. ✅ Track `fileChanges` array (created/modified/deleted files)
6. ✅ Implement file modification edges (`MODIFIES`, `CREATES`, `DELETES`)
7. ✅ Add structured `errors` array with error taxonomy
8. ✅ Create agent execution edges (`EXECUTED_BY`, `VERIFIED_BY`)

### Phase 3: Enhanced Observability (Week 3)
9. ✅ Add `qcReasoningTrace` with criteria breakdown
10. ✅ Implement `costEstimate` calculations
11. ✅ Create QC verification chain edges (`VERIFIES`)
12. ✅ Add issue/requirement traceability edges (`FIXES`, `ADDRESSES`)

---

## 📋 Example: Enhanced Task Node

```json
{
  "id": "task-1.1",
  "title": "Implement translation caching",
  "status": "completed",
  "outcome": "success",
  
  // NEW: Model tracking
  "workerModel": "gpt-5",
  "workerTemperature": 0.0,
  "workerMaxTokens": -1,
  "qcModel": "gpt-5",
  "qcMaxTokens": 1000,
  
  // NEW: Context metrics
  "contextMetrics": {
    "attempt1PromptTokens": 7611,
    "attempt2PromptTokens": 15000,
    "contextGrowthRatio": 1.97,
    "preFetchTokens": 3000,
    "runtimeContextTokens": 12000
  },
  
  // NEW: Tool call details
  "toolCallDetails": [
    {"tool": "read_file", "timestamp": "...", "durationMs": 120, "success": true},
    {"tool": "write", "timestamp": "...", "durationMs": 85, "success": true},
    {"tool": "run_terminal_cmd", "timestamp": "...", "durationMs": 2500, "success": true}
  ],
  "toolCallSummary": {
    "read_file": 15,
    "write": 8,
    "run_terminal_cmd": 16,
    "grep": 1
  },
  
  // NEW: File changes
  "fileChanges": [
    {
      "path": "src/app/components/examples/examples.component.ts",
      "changeType": "modified",
      "linesAdded": 45,
      "linesRemoved": 12,
      "sizeBytes": 3420
    },
    {
      "path": "src/app/services/translation-cache.service.ts",
      "changeType": "created",
      "linesAdded": 120,
      "linesRemoved": 0,
      "sizeBytes": 4800
    }
  ],
  
  // NEW: Cost estimate
  "costEstimate": {
    "workerCostUSD": 0.15,
    "qcCostUSD": 0.03,
    "totalCostUSD": 0.18
  },
  
  // Existing fields...
  "workerOutput": "...",
  "qcVerificationHistory": "[...]"
}
```

---

## 🚀 Benefits of Enhanced Schema

### 1. **Better Debugging**
- Identify root cause faster (model? tools? context?)
- Reproduce failures with exact parameters

### 2. **Performance Optimization**
- Compare models (GPT-5 vs GPT-4.1 success rates)
- Identify expensive operations (tool calls, token usage)
- Optimize context management

### 3. **Cost Tracking**
- Budget per project/task
- ROI analysis (cost vs value)
- Model cost comparison

### 4. **Automated Insights**
- Detect hallucinations (0 tool calls + "success")
- Alert on context bloat (>2x growth)
- Flag suspicious patterns

### 5. **Requirements Traceability**
- Track which tasks address which requirements
- Impact analysis for changes
- Audit compliance

---

## 📊 Sample Queries (With Enhanced Schema)

### Query 1: Find tasks that hallucinated (0 tool calls but claimed success)
```cypher
MATCH (t:Task)
WHERE t.workerToolCalls = 0 AND t.outcome = 'success'
RETURN t.taskId, t.title, t.workerOutput
```

### Query 2: Compare model performance
```cypher
MATCH (t:Task)
WHERE t.workerModel IN ['gpt-5', 'gpt-4.1']
RETURN t.workerModel, 
       AVG(t.lastQcScore) as avgScore,
       AVG(t.totalDuration) as avgDuration,
       COUNT(*) as taskCount
GROUP BY t.workerModel
```

### Query 3: Find files most frequently modified
```cypher
MATCH (t:Task)-[:MODIFIES]->(f:File)
RETURN f.path, COUNT(*) as modificationCount
ORDER BY modificationCount DESC
LIMIT 10
```

### Query 4: Identify context bloat patterns
```cypher
MATCH (t:Task)
WHERE t.contextMetrics.contextGrowthRatio > 2.0
RETURN t.taskId, 
       t.contextMetrics.attempt1PromptTokens,
       t.contextMetrics.attempt2PromptTokens,
       t.contextMetrics.contextGrowthRatio
ORDER BY contextGrowthRatio DESC
```

### Query 5: Calculate total project cost
```cypher
MATCH (t:Task)
RETURN SUM(t.costEstimate.totalCostUSD) as totalProjectCost
```

---

## ✅ Action Items

1. **Update `storeTaskResultInGraph()` function** to capture:
   - Model parameters
   - Tool call details
   - Context metrics
   - File changes
   - Cost estimates

2. **Create relationship helper functions**:
   - `linkTaskDependency(task1, task2)`
   - `linkTaskToFile(task, file, changeType)`
   - `linkTaskToAgent(task, agent, role)`

3. **Add validation rules**:
   - Warn if `workerToolCalls === 0`
   - Alert if `contextGrowthRatio > 2.0`
   - Flag if `fileChanges.length === 0` for "implementation" tasks

4. **Create dashboard queries**:
   - Model performance comparison
   - Cost breakdown by task type
   - Context bloat detection
   - Tool usage patterns

---

**Last Updated:** 2025-10-17  
**Next Review:** After Phase 1 implementation  
**Owner:** Mimir Development Team

