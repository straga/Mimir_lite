# Enhanced SSE Phase Events

**Real-time execution progress with worker/QC phase tracking and QC failure details**

## 📡 Overview

The Mimir orchestration engine now emits **granular Server-Sent Events (SSE)** during workflow execution, providing real-time visibility into worker execution, QC verification, and failure analysis.

### Key Enhancements

1. **Phase-level events**: Separate events for worker execution and QC verification phases
2. **QC failure gap**: Detailed feedback, issues, and required fixes when QC fails
3. **VSCode notifications**: Real-time toast notifications in VSCode extension
4. **Retry tracking**: Attempt number and retry status in all events

---

## 📋 SSE Event Types

### 1. `execution-start`

Emitted when a workflow execution begins.

```typescript
{
  executionId: string;
  totalTasks: number;
  startTime: number;
}
```

**Example**:
```json
{
  "executionId": "exec-1763575847676",
  "totalTasks": 3,
  "startTime": 1699564800000
}
```

---

### 2. `task-start`

Emitted when a task begins execution (before worker starts).

```typescript
{
  taskId: string;
  taskTitle: string;
  progress: number;
  total: number;
  parallelGroup?: number;
}
```

**Example**:
```json
{
  "taskId": "task-1763572289122",
  "taskTitle": "Translate README to Mandarin",
  "progress": 1,
  "total": 3
}
```

---

### 3. `worker-start` 🆕

Emitted when the worker agent begins executing the task.

```typescript
{
  taskId: string;
  taskTitle: string;
  phase: 'worker';
  attemptNumber: number;
  isRetry: boolean;
  message: string;
}
```

**Example (first attempt)**:
```json
{
  "taskId": "task-1763572289122",
  "taskTitle": "Translate README to Mandarin",
  "phase": "worker",
  "attemptNumber": 1,
  "isRetry": false,
  "message": "🤖 Worker executing: Translate README to Mandarin"
}
```

**Example (retry)**:
```json
{
  "taskId": "task-1763572289122",
  "taskTitle": "Translate README to Mandarin",
  "phase": "worker",
  "attemptNumber": 2,
  "isRetry": true,
  "message": "🔄 Worker retrying (attempt 2/2)"
}
```

---

### 4. `worker-complete` 🆕

Emitted when the worker agent completes execution (before QC verification).

```typescript
{
  taskId: string;
  taskTitle: string;
  phase: 'worker';
  duration: number;     // milliseconds
  toolCalls: number;
  message: string;
}
```

**Example**:
```json
{
  "taskId": "task-1763572289122",
  "taskTitle": "Translate README to Mandarin",
  "phase": "worker",
  "duration": 15985,
  "toolCalls": 3,
  "message": "✅ Worker completed (16.0s, 3 tool calls)"
}
```

---

### 5. `qc-start` 🆕

Emitted when the QC agent begins verifying the worker's output.

```typescript
{
  taskId: string;
  taskTitle: string;
  phase: 'qc';
  attemptNumber: number;
  message: string;
}
```

**Example**:
```json
{
  "taskId": "task-1763572289122",
  "taskTitle": "Translate README to Mandarin",
  "phase": "qc",
  "attemptNumber": 1,
  "message": "🔍 QC verifying worker output (attempt 1/2)"
}
```

---

### 6. `qc-complete` 🆕

Emitted when QC verification completes (pass or fail).

#### QC Passed

```typescript
{
  taskId: string;
  taskTitle: string;
  phase: 'qc';
  passed: true;
  score: number;        // 0-100
  attemptNumber: number;
  message: string;
}
```

**Example**:
```json
{
  "taskId": "task-1763572289122",
  "taskTitle": "Translate README to Mandarin",
  "phase": "qc",
  "passed": true,
  "score": 95,
  "attemptNumber": 1,
  "message": "✅ QC passed (Score: 95/100, Attempt 1/2)"
}
```

#### QC Failed (with gap information) 🚨

```typescript
{
  taskId: string;
  taskTitle: string;
  phase: 'qc';
  passed: false;
  score: number;        // 0-100
  attemptNumber: number;
  message: string;
  gap: {                // 🆕 Detailed failure analysis
    feedback: string;
    issues: string[];
    requiredFixes: string[];
  };
}
```

**Example**:
```json
{
  "taskId": "task-1763572289122",
  "taskTitle": "Translate README to Mandarin",
  "phase": "qc",
  "passed": false,
  "score": 0,
  "attemptNumber": 2,
  "message": "❌ QC failed after 2 attempts (Final score: 0/100)",
  "gap": {
    "feedback": "The deliverable does not meet the requirements, as the README.md was not translated into simplified Mandarin Chinese. The output only contains an error message indicating the file was not found, with no translation provided.",
    "issues": [
      "Issue 1: README.md translation missing",
      "Gap: Required translated README.md not delivered",
      "Evidence: Output only contains error message, no translated content"
    ],
    "requiredFixes": [
      "Fix 1: Provide a complete translation of README.md into simplified Mandarin Chinese as required."
    ]
  }
}
```

---

### 7. `task-complete`

Emitted when a task completes successfully (after QC passes).

```typescript
{
  taskId: string;
  taskTitle: string;
  status: 'success';
  duration: number;
  progress: number;
  total: number;
}
```

---

### 8. `task-fail`

Emitted when a task fails (after max retries exhausted or critical error).

```typescript
{
  taskId: string;
  taskTitle: string;
  status: 'failure';
  error?: string;
  duration: number;
  progress: number;
  total: number;
}
```

---

### 9. `execution-complete`

Emitted when the entire workflow execution finishes.

```typescript
{
  executionId: string;
  status: 'completed' | 'failed' | 'cancelled';
  successful: number;
  failed: number;
  cancelled?: number;
  completed: number;
  total: number;
  totalDuration: number;
  deliverables: Array<{ filename: string; size: number }>;
}
```

---

## 🔔 VSCode Extension Notifications

The VSCode Studio extension displays real-time notifications for phase events:

### Worker Phase

| Event | Notification Type | Message |
|-------|------------------|---------|
| `worker-start` | ℹ️ Information | `🤖 Worker executing: [Task Title]` |
| `worker-start` (retry) | ℹ️ Information | `🔄 Worker retrying (attempt X/Y)` |
| `worker-complete` | ℹ️ Information | `✅ Worker completed (X.Xs, Y tool calls)` |

### QC Phase

| Event | Notification Type | Message |
|-------|------------------|---------|
| `qc-start` | ℹ️ Information | `🔍 QC verifying: [Task Title]` |
| `qc-complete` (passed) | ℹ️ Information | `✅ QC passed: [Task Title] (Score: X/100)` |
| `qc-complete` (failed) | ⚠️ Warning | `❌ QC failed: [Task Title] (Score: X/100)` + Gap details |

### QC Failure Notification Example

```
⚠️ QC failed: Translate README to Mandarin (Score: 0/100)

📋 Issues:
- Issue 1: README.md translation missing
- Gap: Required translated README.md not delivered
- Evidence: Output only contains error message, no translated content

🔧 Required fixes:
- Fix 1: Provide a complete translation of README.md into simplified Mandarin Chinese as required.
```

---

## 🔧 Implementation

### Backend (Task Executor)

The `executeTask` function in `src/orchestrator/task-executor.ts` now accepts:

```typescript
export async function executeTask(
  task: TaskDefinition,
  preambleContent: string,
  qcPreambleContent?: string,
  executionId?: string,                         // 🆕
  sendSSE?: (event: string, data: any) => void  // 🆕
): Promise<ExecutionResult>
```

SSE events are sent at key execution phases:

1. **Worker execution start** (line ~1576)
2. **Worker execution complete** (line ~1638)
3. **QC verification start** (line ~1769)
4. **QC verification complete (pass)** (line ~1857)
5. **QC verification complete (fail)** (line ~1930)

### Frontend (VSCode Extension)

The `_handleSSEEvent` method in `vscode-extension/src/studioPanel.ts` processes phase events and displays notifications:

```typescript
case 'worker-start':
  vscode.window.showInformationMessage(data.message);
  break;

case 'qc-complete':
  if (data.passed) {
    vscode.window.showInformationMessage(data.message);
  } else {
    const gapSummary = data.gap ? 
      `\n\n📋 Issues:\n${data.gap.issues.join('\n')}\n\n🔧 Required fixes:\n${data.gap.requiredFixes.join('\n')}` : '';
    vscode.window.showWarningMessage(data.message + gapSummary);
  }
  break;
```

---

## 📊 Example Execution Flow

For a task with 2 retry attempts:

```
1. execution-start
   └─> executionId: exec-XXX, totalTasks: 3

2. task-start
   └─> taskId: task-1, progress: 1/3

3. worker-start (Attempt 1)
   └─> phase: worker, attemptNumber: 1, isRetry: false
   
4. worker-complete
   └─> phase: worker, duration: 15985ms, toolCalls: 3

5. qc-start (Attempt 1)
   └─> phase: qc, attemptNumber: 1

6. qc-complete (FAILED)
   └─> passed: false, score: 35, gap: { feedback, issues, requiredFixes }

7. worker-start (Attempt 2 - Retry)
   └─> phase: worker, attemptNumber: 2, isRetry: true

8. worker-complete
   └─> phase: worker, duration: 12340ms, toolCalls: 2

9. qc-start (Attempt 2)
   └─> phase: qc, attemptNumber: 2

10. qc-complete (PASSED)
    └─> passed: true, score: 95, attemptNumber: 2

11. task-complete
    └─> status: success, duration: 28325ms

12. execution-complete
    └─> status: completed, successful: 3, failed: 0
```

---

## 🚀 Benefits

1. **Real-time visibility**: See exactly which phase (worker/QC) is executing
2. **Retry transparency**: Track retry attempts and understand why retries were needed
3. **QC failure analysis**: Immediate access to issues and required fixes when QC fails
4. **Better debugging**: Detailed execution flow for troubleshooting
5. **User experience**: Non-blocking notifications keep users informed without interrupting work

---

## 🔍 Debugging

### View SSE Events in Browser

The web Studio UI logs SSE events to the browser console:

```javascript
// Open DevTools Console in browser
// Filter by: "SSE event:"
```

### View SSE Events in VSCode

The VSCode extension logs SSE events to the Extension Host output:

```
View → Output → Extension Host
```

### Test SSE Connection

```bash
# Manually connect to SSE stream
curl -N http://localhost:9042/api/execution-stream/exec-1763575847676
```

---

## 📝 Related Documentation

- [Workflow Management](./WORKFLOW_MANAGEMENT.md) - Studio workflow save/load/execute
- [Orchestration UI Guide](../ORCHESTRATION_UI_GUIDE.md) - Studio UI overview
- [Task Executor](../../src/orchestrator/task-executor.ts) - Core execution logic
- [SSE Implementation](../../src/api/orchestration/sse.ts) - SSE server utilities

---

**Version**: 1.1.0  
**Last Updated**: 2025-11-19  
**Author**: Mimir Team
