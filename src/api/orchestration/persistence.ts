/**
 * @fileoverview Neo4j persistence operations for orchestration execution tracking
 * 
 * This module provides all database operations for storing and retrieving
 * orchestration execution telemetry in Neo4j. It handles creation and updates
 * of execution nodes, task execution nodes, and their relationships.
 * 
 * @module api/orchestration/persistence
 * @since 1.0.0
 */

import neo4j from 'neo4j-driver';
import type { IGraphManager } from '../../types/index.js';
import type { ExecutionResult, TaskDefinition } from '../../orchestrator/task-executor.js';

/**
 * Persist task execution result to Neo4j with unique composite ID
 * 
 * Creates a task_execution node in Neo4j with comprehensive telemetry including
 * tokens, QC verification results, duration, and output. Links the task to its
 * parent execution node and creates a FAILED_TASK relationship if the task failed.
 * This ensures all execution history is permanently stored for audit and analysis.
 * 
 * @param graphManager - Neo4j graph manager instance for database operations
 * @param executionId - Parent execution identifier (e.g., 'exec-1763134573643')
 * @param taskId - Task identifier from the plan (e.g., 'task-1.1', 'task-2')
 * @param result - Execution result containing status, output, tokens, and QC data
 * @param task - Original task definition with title, roles, and verification criteria
 * @returns Unique task execution node ID in format `${executionId}-${taskId}`
 * @throws {Error} If Neo4j session creation or query execution fails
 * 
 * @example
 * // Example 1: Persist successful task with QC validation
 * const result = {
 *   taskId: 'task-1',
 *   status: 'success',
 *   output: '✅ Environment validated successfully',
 *   duration: 5000,
 *   tokens: { input: 1000, output: 500 },
 *   toolCalls: 3,
 *   qcVerification: { passed: true, score: 95, feedback: 'All checks passed' }
 * };
 * const nodeId = await persistTaskExecutionToNeo4j(
 *   graphManager,
 *   'exec-1763134573643',
 *   'task-1',
 *   result,
 *   taskDefinition
 * );
 * // Returns: 'exec-1763134573643-task-1'
 * 
 * @example
 * // Example 2: Persist failed task with error details
 * const failedResult = {
 *   taskId: 'task-2',
 *   status: 'failure',
 *   error: 'Timeout waiting for API response',
 *   duration: 30000,
 *   tokens: { input: 800, output: 100 },
 *   qcVerification: { 
 *     passed: false, 
 *     score: 45, 
 *     issues: ['Incomplete data', 'Missing validation'],
 *     requiredFixes: ['Retry with timeout handling', 'Add error recovery']
 *   }
 * };
 * await persistTaskExecutionToNeo4j(
 *   graphManager,
 *   'exec-1763134573643',
 *   'task-2',
 *   failedResult,
 *   taskDef
 * );
 * // Creates FAILED_TASK relationship for quick failure queries
 * 
 * @example
 * // Example 3: Persist task with retry attempt tracking
 * const retryResult = {
 *   taskId: 'task-3',
 *   status: 'success',
 *   output: 'Completed on second attempt',
 *   duration: 8000,
 *   attemptNumber: 2,
 *   tokens: { input: 1200, output: 600 },
 *   toolCalls: 5
 * };
 * const nodeId = await persistTaskExecutionToNeo4j(
 *   graphManager,
 *   'exec-1763134573643',
 *   'task-3',
 *   retryResult,
 *   taskDefinition
 * );
 * // Stores attemptNumber for tracking retries
 * 
 * @since 1.0.0
 */
export async function persistTaskExecutionToNeo4j(
  graphManager: IGraphManager,
  executionId: string,
  taskId: string,
  result: ExecutionResult,
  task: TaskDefinition
): Promise<string> {
  const taskExecutionId = `${executionId}-${taskId}`;
  
  const driver = graphManager.getDriver();
  const session = driver.session();
  
  try {
    await session.run(`
      MERGE (te:Node {id: $taskExecutionId})
      SET te.type = 'task_execution',
          te.executionId = $executionId,
          te.taskId = $taskId,
          te.taskTitle = $taskTitle,
          te.status = $status,
          te.output = $output,
          te.error = $error,
          te.duration = $duration,
          te.agentRoleDescription = $agentRole,
          te.qcRoleDescription = $qcRole,
          te.prompt = $prompt,
          te.tokensInput = $tokensInput,
          te.tokensOutput = $tokensOutput,
          te.tokensTotal = $tokensTotal,
          te.toolCalls = $toolCalls,
          te.attemptNumber = $attemptNumber,
          te.qcPassed = $qcPassed,
          te.qcScore = $qcScore,
          te.qcFeedback = $qcFeedback,
          te.qcIssues = $qcIssues,
          te.qcRequiredFixes = $qcRequiredFixes,
          te.timestamp = datetime($timestamp),
          te.updated = datetime($timestamp)
      
      WITH te
      
      // Link to orchestration execution (primary relationship)
      MATCH (exec:Node {id: $executionId, type: 'orchestration_execution'})
      MERGE (exec)-[:HAS_TASK_EXECUTION]->(te)
      
      // If task failed, create a direct FAILED_TASK relationship for easy querying
      WITH te, exec
      FOREACH (ignoreMe IN CASE WHEN te.status = 'failure' THEN [1] ELSE [] END |
        MERGE (exec)-[:FAILED_TASK]->(te)
      )
      
      // Also link to orchestration plan if it exists
      WITH te
      OPTIONAL MATCH (plan:Node {id: $planId, type: 'orchestration_plan'})
      WHERE plan IS NOT NULL
      MERGE (plan)-[:HAS_EXECUTION]->(te)
      
      RETURN te.id as nodeId
    `, {
      taskExecutionId,
      executionId,
      taskId,
      taskTitle: task.title || taskId,
      status: result.status,
      output: result.output || '',
      error: result.error || null,
      duration: neo4j.int(result.duration),
      agentRole: task.agentRoleDescription || '',
      qcRole: task.qcRole || null,
      prompt: result.prompt || null,
      tokensInput: neo4j.int(result.tokens?.input || 0),
      tokensOutput: neo4j.int(result.tokens?.output || 0),
      tokensTotal: neo4j.int((result.tokens?.input || 0) + (result.tokens?.output || 0)),
      toolCalls: neo4j.int(result.toolCalls || 0),
      attemptNumber: neo4j.int(result.attemptNumber || 1),
      qcPassed: result.qcVerification?.passed || false,
      qcScore: neo4j.int(result.qcVerification?.score || 0),
      qcFeedback: result.qcVerification?.feedback || null,
      qcIssues: result.qcVerification?.issues ? result.qcVerification.issues.join('\n') : null,
      qcRequiredFixes: result.qcVerification?.requiredFixes ? result.qcVerification.requiredFixes.join('\n') : null,
      timestamp: new Date().toISOString(),
      planId: executionId,
    });
    
    console.log(`💾 Persisted task execution: ${taskExecutionId}`);
    return taskExecutionId;
  } catch (error) {
    console.error(`⚠️  Failed to persist task execution ${taskExecutionId}:`, error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Create initial execution node in Neo4j at workflow start
 * 
 * Initializes a central orchestration_execution node that serves as the root
 * for all task executions in a workflow. Sets initial metrics to zero and
 * status to 'running'. Links to the orchestration_plan if one exists.
 * This node is updated incrementally as tasks complete.
 * 
 * @param graphManager - Neo4j graph manager instance for database operations
 * @param executionId - Unique execution identifier (timestamp-based)
 * @param planId - Associated orchestration plan identifier
 * @param totalTasks - Total number of tasks in the workflow
 * @param startTime - Unix timestamp in milliseconds when execution started
 * @throws {Error} If Neo4j session creation or query execution fails
 * 
 * @example
 * // Example 1: Create execution node for new 5-task workflow
 * await createExecutionNodeInNeo4j(
 *   graphManager,
 *   'exec-1763134573643',
 *   'plan-kolache-recipe',
 *   5,
 *   Date.now()
 * );
 * // Creates node with status='running', tasksTotal=5, all counters at 0
 * 
 * @example
 * // Example 2: Create execution node with explicit timestamp
 * const workflowStart = Date.now();
 * await createExecutionNodeInNeo4j(
 *   graphManager,
 *   `exec-${workflowStart}`,
 *   `plan-${workflowStart}`,
 *   12,
 *   workflowStart
 * );
 * // Links to plan-{timestamp} if it exists in the graph
 * 
 * @example
 * // Example 3: Create execution node in production with error handling
 * try {
 *   await createExecutionNodeInNeo4j(
 *     graphManager,
 *     executionId,
 *     planId,
 *     taskCount,
 *     Date.now()
 *   );
 *   console.log(`✅ Execution ${executionId} tracking initialized`);
 * } catch (error) {
 *   console.error('Failed to create execution node:', error);
 *   // Workflow continues even if persistence fails
 * }
 * 
 * @since 1.0.0
 */
export async function createExecutionNodeInNeo4j(
  graphManager: IGraphManager,
  executionId: string,
  planId: string,
  totalTasks: number,
  startTime: number
): Promise<void> {
  const driver = graphManager.getDriver();
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (exec:Node {id: $executionId})
      SET exec.type = 'orchestration_execution',
          exec.planId = $planId,
          exec.status = 'running',
          exec.startTime = datetime($startTime),
          exec.endTime = null,
          exec.duration = 0,
          exec.tasksTotal = $tasksTotal,
          exec.tasksSuccessful = 0,
          exec.tasksFailed = 0,
          exec.tokensInput = 0,
          exec.tokensOutput = 0,
          exec.tokensTotal = 0,
          exec.toolCalls = 0,
          exec.created = datetime(),
          exec.updated = datetime()
      
      WITH exec
      
      // Link to orchestration plan
      OPTIONAL MATCH (plan:Node {id: $planId, type: 'orchestration_plan'})
      WHERE plan IS NOT NULL
      MERGE (exec)-[:EXECUTES_PLAN]->(plan)
      
      RETURN exec.id as nodeId
    `, {
      executionId,
      planId,
      startTime: new Date(startTime).toISOString(),
      tasksTotal: neo4j.int(totalTasks),
    });
    
    console.log(`💾 Created execution node: ${executionId}`);
  } catch (error) {
    console.error(`⚠️  Failed to create execution node:`, error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Update execution node incrementally after each task completes
 * 
 * Provides real-time progress tracking by updating the orchestration_execution
 * node immediately after each task finishes. Aggregates tokens, tool calls, and
 * task counts. Marks the execution as 'failed' instantly if any task fails,
 * allowing for immediate error detection without waiting for workflow completion.
 * 
 * @param graphManager - Neo4j graph manager instance for database operations
 * @param executionId - Execution identifier to update (e.g., 'exec-1763134573643')
 * @param taskResult - Just-completed task's execution result with tokens and status
 * @param tasksFailed - Current count of failed tasks (including this one if failed)
 * @param tasksSuccessful - Current count of successful tasks
 * @throws {Error} If Neo4j session creation or query execution fails (logged but not re-thrown)
 * 
 * @example
 * // Example 1: Update after successful task completion
 * const taskResult = {
 *   taskId: 'task-1',
 *   status: 'success',
 *   duration: 5000,
 *   tokens: { input: 1000, output: 500 },
 *   toolCalls: 3
 * };
 * await updateExecutionNodeProgress(
 *   graphManager,
 *   'exec-1763134573643',
 *   taskResult,
 *   0,  // tasksFailed
 *   1   // tasksSuccessful
 * );
 * // Execution node: status='running', successful=1, failed=0, tokens aggregated
 * 
 * @example
 * // Example 2: Update after task failure (immediate status change)
 * const failedResult = {
 *   taskId: 'task-2',
 *   status: 'failure',
 *   error: 'API timeout',
 *   duration: 30000,
 *   tokens: { input: 800, output: 50 },
 *   toolCalls: 1
 * };
 * await updateExecutionNodeProgress(
 *   graphManager,
 *   'exec-1763134573643',
 *   failedResult,
 *   1,  // tasksFailed (incremented)
 *   1   // tasksSuccessful (unchanged)
 * );
 * // Execution node: status='failed', successful=1, failed=1
 * // Console: "⚠️  Execution node marked as FAILED after task task-2"
 * 
 * @example
 * // Example 3: Aggregate tokens across multiple tasks
 * const results = [
 *   { tokens: { input: 1000, output: 500 }, status: 'success', toolCalls: 3 },
 *   { tokens: { input: 1200, output: 600 }, status: 'success', toolCalls: 5 },
 *   { tokens: { input: 900, output: 400 }, status: 'success', toolCalls: 2 }
 * ];
 * for (let i = 0; i < results.length; i++) {
 *   await updateExecutionNodeProgress(
 *     graphManager,
 *     executionId,
 *     results[i],
 *     0,
 *     i + 1
 *   );
 * }
 * // Final: tokensInput=3100, tokensOutput=1500, tokensTotal=4600, toolCalls=10
 * 
 * @since 1.0.0
 */
export async function updateExecutionNodeProgress(
  graphManager: IGraphManager,
  executionId: string,
  taskResult: ExecutionResult,
  tasksFailed: number,
  tasksSuccessful: number
): Promise<void> {
  const driver = graphManager.getDriver();
  const session = driver.session();
  
  try {
    const currentStatus = taskResult.status === 'failure' ? 'failed' : 'running';
    
    await session.run(`
      MATCH (exec:Node {id: $executionId, type: 'orchestration_execution'})
      SET exec.status = $status,
          exec.tasksSuccessful = $successful,
          exec.tasksFailed = $failed,
          exec.tokensInput = exec.tokensInput + $tokensInput,
          exec.tokensOutput = exec.tokensOutput + $tokensOutput,
          exec.tokensTotal = exec.tokensTotal + $tokensTotal,
          exec.toolCalls = exec.toolCalls + $toolCalls,
          exec.updated = datetime()
      RETURN exec.id as nodeId
    `, {
      executionId,
      status: currentStatus,
      successful: neo4j.int(tasksSuccessful),
      failed: neo4j.int(tasksFailed),
      tokensInput: neo4j.int(taskResult.tokens?.input || 0),
      tokensOutput: neo4j.int(taskResult.tokens?.output || 0),
      tokensTotal: neo4j.int((taskResult.tokens?.input || 0) + (taskResult.tokens?.output || 0)),
      toolCalls: neo4j.int(taskResult.toolCalls || 0),
    });
    
    if (taskResult.status === 'failure') {
      console.log(`⚠️  Execution node marked as FAILED after task ${taskResult.taskId}`);
    }
  } catch (error) {
    console.error(`⚠️  Failed to update execution progress:`, error);
  } finally {
    await session.close();
  }
}

/**
 * Finalize execution node with completion summary at workflow end
 * 
 * Updates the orchestration_execution node with final status, end time, and
 * total duration. This is called once at the end of workflow execution after
 * all tasks have completed (or been cancelled). Note that task counts and token
 * aggregates are already up-to-date from incremental updates.
 * 
 * @param graphManager - Neo4j graph manager instance for database operations
 * @param executionId - Execution identifier to finalize (e.g., 'exec-1763134573643')
 * @param results - Array of all task execution results from the workflow
 * @param endTime - Unix timestamp in milliseconds when execution ended
 * @param cancelled - Whether execution was manually cancelled (default: false)
 * @throws {Error} If Neo4j session creation or query execution fails
 * 
 * @example
 * // Example 1: Finalize successful workflow with all tasks passed
 * const results = [
 *   { taskId: 'task-1', status: 'success', duration: 5000 },
 *   { taskId: 'task-2', status: 'success', duration: 8000 },
 *   { taskId: 'task-3', status: 'success', duration: 3000 }
 * ];
 * await updateExecutionNodeInNeo4j(
 *   graphManager,
 *   'exec-1763134573643',
 *   results,
 *   Date.now(),
 *   false
 * );
 * // Execution node: status='completed', endTime=now, duration=16000ms
 * 
 * @example
 * // Example 2: Finalize workflow with failures
 * const mixedResults = [
 *   { taskId: 'task-1', status: 'success', duration: 5000 },
 *   { taskId: 'task-2', status: 'failure', error: 'Timeout', duration: 30000 },
 *   { taskId: 'task-3', status: 'success', duration: 3000 }
 * ];
 * await updateExecutionNodeInNeo4j(
 *   graphManager,
 *   'exec-1763134573643',
 *   mixedResults,
 *   Date.now(),
 *   false
 * );
 * // Execution node: status='failed' (any failure marks entire execution failed)
 * 
 * @example
 * // Example 3: Finalize cancelled workflow
 * const partialResults = [
 *   { taskId: 'task-1', status: 'success', duration: 5000 },
 *   { taskId: 'task-2', status: 'success', duration: 8000 }
 * ];
 * await updateExecutionNodeInNeo4j(
 *   graphManager,
 *   'exec-1763134573643',
 *   partialResults,
 *   Date.now(),
 *   true  // cancelled=true
 * );
 * // Execution node: status='cancelled', endTime=now
 * // Console: "💾 Execution node finalized: exec-1763134573643 (status: cancelled)"
 * 
 * @since 1.0.0
 */
export async function updateExecutionNodeInNeo4j(
  graphManager: IGraphManager,
  executionId: string,
  results: ExecutionResult[],
  endTime: number,
  cancelled: boolean = false
): Promise<void> {
  const driver = graphManager.getDriver();
  const session = driver.session();
  
  try {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failure').length;
    
    const finalStatus = cancelled ? 'cancelled' : (failed > 0 ? 'failed' : 'completed');
    
    await session.run(`
      MATCH (exec:Node {id: $executionId, type: 'orchestration_execution'})
      SET exec.status = $status,
          exec.endTime = datetime($endTime),
          exec.duration = duration.between(exec.startTime, datetime($endTime)).milliseconds,
          exec.updated = datetime()
      RETURN exec.id as nodeId
    `, {
      executionId,
      status: finalStatus,
      endTime: new Date(endTime).toISOString(),
    });
    
    console.log(`💾 Execution node finalized: ${executionId} (status: ${finalStatus})`);
  } catch (error) {
    console.error(`⚠️  Failed to finalize execution node:`, error);
    throw error;
  } finally {
    await session.close();
  }
}
