/**
 * @fileoverview Workflow execution engine for orchestrated multi-agent task execution
 * 
 * This module provides the core workflow execution logic that coordinates task execution,
 * manages state, handles dependencies, integrates with Neo4j persistence, and provides
 * real-time SSE updates. Supports parallel execution with rate limiting, QC verification,
 * error handling, and deliverable capture.
 * 
 * @module api/orchestration/workflow-executor
 * @since 1.0.0
 */

import type { IGraphManager } from '../../types/index.js';
import { 
  executeTask, 
  generatePreamble, 
  type TaskDefinition, 
  type ExecutionResult 
} from '../../orchestrator/task-executor.js';
import {
  createExecutionNodeInNeo4j,
  persistTaskExecutionToNeo4j,
  updateExecutionNodeProgress,
  updateExecutionNodeInNeo4j,
} from './persistence.js';
import { sendSSEEvent, closeSSEConnections } from './sse.js';

/**
 * Deliverable file metadata
 */
export interface Deliverable {
  /** Filename without path */
  filename: string;
  /** File content as string */
  content: string;
  /** MIME type for proper handling */
  mimeType: string;
  /** Content size in bytes */
  size: number;
}

/**
 * Execution state for tracking workflow progress
 */
export interface ExecutionState {
  /** Unique execution identifier */
  executionId: string;
  /** Current execution status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  /** ID of currently executing task (null if none) */
  currentTaskId: string | null;
  /** Status map for all tasks in workflow */
  taskStatuses: Record<string, 'pending' | 'executing' | 'completed' | 'failed'>;
  /** Accumulated execution results */
  results: ExecutionResult[];
  /** Collected deliverable files */
  deliverables: Deliverable[];
  /** Workflow start timestamp */
  startTime: number;
  /** Workflow end timestamp (undefined while running) */
  endTime?: number;
  /** Error message if execution failed */
  error?: string;
  /** Cancellation flag set by user */
  cancelled?: boolean;
}

/**
 * Global execution state registry
 * Maps execution IDs to their current state
 */
export const executionStates = new Map<string, ExecutionState>();

/**
 * Extract deliverables from task execution results
 * 
 * Converts task outputs into deliverable files stored in memory.
 * Creates markdown files for each task's output.
 * 
 * @param results - Array of execution results from completed tasks
 * @param executionId - Unique execution identifier
 * @returns Array of deliverable files
 */
function extractDeliverablesFromResults(results: ExecutionResult[]): Deliverable[] {
  const deliverables: Deliverable[] = [];
  
  for (const result of results) {
    if (result.status === 'success' && result.output && result.output.trim()) {
      // Create a deliverable for each successful task output
      const filename = `${result.taskId}-output.md`;
      const content = `# Task Output: ${result.taskId}\n\n${result.output}`;
      
      deliverables.push({
        filename,
        content,
        mimeType: 'text/markdown',
        size: Buffer.byteLength(content, 'utf8'),
      });
    }
  }
  
  return deliverables;
}

/**
 * Group tasks by their parallel execution group
 * 
 * Tasks with the same parallelGroup number can execute simultaneously.
 * Tasks with null parallelGroup execute sequentially.
 * 
 * @param tasks - Array of task definitions to group
 * @returns Array of task groups where each group contains tasks that can run in parallel
 * 
 * @example
 * // Tasks: [
 * //   { id: 'task-0', parallelGroup: null },
 * //   { id: 'task-1.1', parallelGroup: 1 },
 * //   { id: 'task-1.2', parallelGroup: 1 },
 * //   { id: 'task-2', parallelGroup: null }
 * // ]
 * // Returns: [
 * //   [{ id: 'task-0' }],
 * //   [{ id: 'task-1.1' }, { id: 'task-1.2' }],
 * //   [{ id: 'task-2' }]
 * // ]
 * 
 * @since 1.0.0
 */
function groupTasksByParallelGroup(tasks: TaskDefinition[]): TaskDefinition[][] {
  const groups: TaskDefinition[][] = [];
  const parallelGroupMap = new Map<number, TaskDefinition[]>();
  
  for (const task of tasks) {
    if (task.parallelGroup === null || task.parallelGroup === undefined) {
      // Sequential task - gets its own group
      groups.push([task]);
    } else {
      // Parallel task - group with others in same parallelGroup
      if (!parallelGroupMap.has(task.parallelGroup)) {
        parallelGroupMap.set(task.parallelGroup, []);
      }
      parallelGroupMap.get(task.parallelGroup)!.push(task);
    }
  }
  
  // Insert parallel groups in order
  const sortedGroups = Array.from(parallelGroupMap.entries())
    .sort(([a], [b]) => a - b);
  
  for (const [groupNum, groupTasks] of sortedGroups) {
    // Find insertion point based on task order
    const firstTaskIndex = tasks.indexOf(groupTasks[0]);
    let insertIndex = 0;
    
    // Count how many groups should come before this one
    for (let i = 0; i < firstTaskIndex; i++) {
      if (tasks[i].parallelGroup === null || tasks[i].parallelGroup === undefined) {
        insertIndex++;
      }
    }
    
    groups.splice(insertIndex, 0, groupTasks);
  }
  
  return groups;
}

/**
 * Execute a group of tasks in parallel with rate limiting
 * 
 * Executes all tasks in the group simultaneously using Promise.all().
 * The rate limiter ensures concurrent requests respect API limits.
 * Collects all results and updates execution state for each task.
 * 
 * @param taskGroup - Array of tasks to execute in parallel
 * @param rolePreambles - Map of agent role descriptions to generated preamble content
 * @param qcRolePreambles - Map of QC role descriptions to generated preamble content
 * @param executionId - Unique execution identifier for SSE events and state tracking
 * @param graphManager - Neo4j graph manager for persistence
 * @param outputDir - Directory for storing task artifacts
 * @param totalTasks - Total number of tasks in workflow (for progress calculation)
 * @param completedTasks - Number of tasks completed before this group
 * @returns Array of execution results for all tasks in group
 * 
 * @since 1.0.0
 */
async function executeTaskGroup(
  taskGroup: TaskDefinition[],
  rolePreambles: Map<string, string>,
  qcRolePreambles: Map<string, string>,
  executionId: string,
  graphManager: IGraphManager,
  totalTasks: number,
  completedTasks: number
): Promise<ExecutionResult[]> {
  const state = executionStates.get(executionId);
  
  if (taskGroup.length === 1) {
    // Single task - execute normally
    const task = taskGroup[0];
    const preambleContent = rolePreambles.get(task.agentRoleDescription);
    const qcPreambleContent = task.qcRole ? qcRolePreambles.get(task.qcRole) : undefined;
    
    if (!preambleContent) {
      throw new Error(`No preamble content found for role: ${task.agentRoleDescription}`);
    }
    
    console.log(`\n📦 Task ${completedTasks + 1}/${totalTasks}: Executing ${task.id}`);
    
    // Update state and emit task-start event
    if (state) {
      state.currentTaskId = task.id;
      state.taskStatuses[task.id] = 'executing';
    }
    sendSSEEvent(executionId, 'task-start', {
      taskId: task.id,
      taskTitle: task.title,
      progress: completedTasks + 1,
      total: totalTasks,
    });
    
    const result = await executeTask(task, preambleContent, qcPreambleContent);
    
    // Persist and update state
    try {
      const taskExecutionId = await persistTaskExecutionToNeo4j(
        graphManager,
        executionId,
        task.id,
        result,
        task
      );
      result.graphNodeId = taskExecutionId;
    } catch (persistError: any) {
      console.error(`⚠️  Failed to persist task ${task.id} to Neo4j:`, persistError.message);
    }
    
    if (state) {
      state.taskStatuses[task.id] = result.status === 'success' ? 'completed' : 'failed';
      state.results.push(result);
    }
    
    sendSSEEvent(executionId, result.status === 'success' ? 'task-complete' : 'task-fail', {
      taskId: task.id,
      taskTitle: task.title,
      status: result.status,
      duration: result.duration,
      progress: completedTasks + 1,
      total: totalTasks,
    });
    
    // Send agent chatter for browser console logging
    if (result.preamblePreview || result.outputPreview) {
      sendSSEEvent(executionId, 'agent-chatter', {
        taskId: task.id,
        taskTitle: task.title,
        preamble: result.preamblePreview,
        output: result.outputPreview,
        tokens: result.tokens,
        toolCalls: result.toolCalls,
      });
    }
    
    return [result];
  }
  
  // Multiple tasks - execute in parallel
  console.log(`\n🔀 Parallel Group (${taskGroup.length} tasks): Executing [${taskGroup.map(t => t.id).join(', ')}]`);
  
  // Emit start events for all tasks in group
  for (let i = 0; i < taskGroup.length; i++) {
    const task = taskGroup[i];
    if (state) {
      state.taskStatuses[task.id] = 'executing';
    }
    sendSSEEvent(executionId, 'task-start', {
      taskId: task.id,
      taskTitle: task.title,
      progress: completedTasks + i + 1,
      total: totalTasks,
      parallelGroup: task.parallelGroup,
    });
  }
  
  // Execute all tasks in parallel - rate limiter handles concurrency
  const taskPromises = taskGroup.map(async (task, index) => {
    const preambleContent = rolePreambles.get(task.agentRoleDescription);
    const qcPreambleContent = task.qcRole ? qcRolePreambles.get(task.qcRole) : undefined;
    
    if (!preambleContent) {
      throw new Error(`No preamble content found for role: ${task.agentRoleDescription}`);
    }
    
    console.log(`   ⚡ Starting ${task.id} (parallel)`);
    
    try {
      const result = await executeTask(task, preambleContent, qcPreambleContent);
      
      // Persist to Neo4j
      try {
        const taskExecutionId = await persistTaskExecutionToNeo4j(
          graphManager,
          executionId,
          task.id,
          result,
          task
        );
        result.graphNodeId = taskExecutionId;
      } catch (persistError: any) {
        console.error(`⚠️  Failed to persist task ${task.id} to Neo4j:`, persistError.message);
      }
      
      // Update state
      if (state) {
        state.taskStatuses[task.id] = result.status === 'success' ? 'completed' : 'failed';
        state.results.push(result);
      }
      
      // Emit completion event
      sendSSEEvent(executionId, result.status === 'success' ? 'task-complete' : 'task-fail', {
        taskId: task.id,
        taskTitle: task.title,
        status: result.status,
        duration: result.duration,
        progress: completedTasks + index + 1,
        total: totalTasks,
        parallelGroup: task.parallelGroup,
      });
      
      // Send agent chatter for browser console logging
      if (result.preamblePreview || result.outputPreview) {
        sendSSEEvent(executionId, 'agent-chatter', {
          taskId: task.id,
          taskTitle: task.title,
          preamble: result.preamblePreview,
          output: result.outputPreview,
          tokens: result.tokens,
          toolCalls: result.toolCalls,
        });
      }
      
      console.log(`   ✅ Completed ${task.id} (${result.status})`);
      
      return result;
    } catch (error: any) {
      console.error(`   ❌ Failed ${task.id}:`, error.message);
      throw error;
    }
  });
  
  // Wait for all parallel tasks to complete
  const results = await Promise.all(taskPromises);
  
  console.log(`✅ Parallel group completed: ${results.filter(r => r.status === 'success').length}/${results.length} successful`);
  
  return results;
}

/**
 * Execute workflow from Task Canvas JSON format
 * 
 * Main orchestration function that converts UI task definitions into executable
 * workflows, manages task execution with dependencies, persists telemetry to Neo4j,
 * captures deliverables, and provides real-time SSE updates to connected clients.
 * Handles QC verification loops and collects all artifacts into a downloadable bundle.
 * 
 * @param uiTasks - Array of task objects from Task Canvas UI with id, title, prompt, dependencies
 * @param outputDir - Absolute path to directory for storing deliverables and execution artifacts
 * @param executionId - Unique execution identifier (timestamp-based, e.g., 'exec-1763134573643')
 * @param graphManager - Neo4j graph manager instance for persistent storage
 * @returns Array of execution results for all tasks with status, tokens, and QC data
 * @throws {Error} If task execution fails critically or Neo4j operations fail
 * 
 * @example
 * // Example 1: Execute simple 3-task workflow
 * const tasks = [
 *   { id: 'task-1', title: 'Research topic', prompt: 'Research X', agentRoleDescription: 'Researcher' },
 *   { id: 'task-2', title: 'Write draft', prompt: 'Write about X', dependencies: ['task-1'] },
 *   { id: 'task-3', title: 'Review', prompt: 'Review draft', dependencies: ['task-2'] }
 * ];
 * const results = await executeWorkflowFromJSON(
 *   tasks,
 *   '/Users/user/mimir/deliverables/exec-1234567890',
 *   'exec-1234567890',
 *   graphManager
 * );
 * // Returns: [{ taskId: 'task-1', status: 'success', ... }, ...]
 * // Creates: execution node, task_execution nodes, deliverable files
 * 
 * @example
 * // Example 2: Execute workflow with parallel tasks
 * const parallelTasks = [
 *   { id: 'task-1', title: 'Setup', prompt: 'Initialize project' },
 *   { id: 'task-2.1', title: 'Feature A', prompt: 'Implement A', dependencies: ['task-1'] },
 *   { id: 'task-2.2', title: 'Feature B', prompt: 'Implement B', dependencies: ['task-1'] },
 *   { id: 'task-3', title: 'Integration', prompt: 'Combine A and B', dependencies: ['task-2.1', 'task-2.2'] }
 * ];
 * const results = await executeWorkflowFromJSON(
 *   parallelTasks,
 *   '/deliverables/exec-1763134573643',
 *   'exec-1763134573643',
 *   graphManager
 * );
 * // task-2.1 and task-2.2 execute in parallel after task-1 completes
 * // task-3 waits for both parallel tasks to complete
 * 
 * @example
 * // Example 3: Execute workflow with QC verification
 * const tasksWithQC = [
 *   {
 *     id: 'task-1',
 *     title: 'Generate report',
 *     prompt: 'Create quarterly report',
 *     agentRoleDescription: 'Report writer',
 *     qcAgentRoleDescription: 'Quality auditor',
 *     verificationCriteria: ['Accuracy', 'Completeness', 'Formatting']
 *   }
 * ];
 * const results = await executeWorkflowFromJSON(
 *   tasksWithQC,
 *   '/deliverables/exec-1763134573643',
 *   'exec-1763134573643',
 *   graphManager
 * );
 * // Worker generates report → QC validates → retry if failed → persist results
 * // Final result includes qcVerification with score, feedback, issues
 * 
 * @since 1.0.0
 */
export async function executeWorkflowFromJSON(
  uiTasks: any[],
  executionId: string,
  graphManager: IGraphManager
): Promise<ExecutionResult[]> {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 WORKFLOW EXECUTOR (JSON MODE)');
  console.log('='.repeat(80));
  console.log(`📄 Execution ID: ${executionId}`);
  console.log(`💾 Storage: Neo4j (no file system access)\n`);

  // Initialize execution state
  const initialTaskStatuses: Record<string, 'pending' | 'executing' | 'completed' | 'failed'> = {};
  uiTasks.forEach(task => {
    initialTaskStatuses[task.id] = 'pending';
  });

  executionStates.set(executionId, {
    executionId,
    status: 'running',
    currentTaskId: null,
    taskStatuses: initialTaskStatuses,
    results: [],
    deliverables: [],
    startTime: Date.now(),
  });

  // Emit execution start event
  sendSSEEvent(executionId, 'execution-start', {
    executionId,
    totalTasks: uiTasks.length,
    startTime: Date.now(),
  });

  // Convert UI tasks to TaskDefinition format
  const taskDefinitions: TaskDefinition[] = uiTasks.map(task => ({
    id: task.id,
    title: task.title || task.id,
    agentRoleDescription: task.agentRoleDescription,
    recommendedModel: task.recommendedModel || 'gpt-4.1',
    prompt: task.prompt,
    dependencies: task.dependencies || [],
    estimatedDuration: task.estimatedDuration || '30 min',
    parallelGroup: task.parallelGroup,
    qcRole: task.qcAgentRoleDescription,
    verificationCriteria: task.verificationCriteria ? task.verificationCriteria.join('\n') : undefined,
    maxRetries: task.maxRetries || 2,
    estimatedToolCalls: task.estimatedToolCalls,
  }));

  console.log(`📋 Converted ${taskDefinitions.length} UI tasks to TaskDefinition format\n`);

  // Create execution node in Neo4j at the start
  console.log('-'.repeat(80));
  console.log('STEP 0: Create Execution Node in Neo4j');
  console.log('-'.repeat(80) + '\n');
  
  const executionStartTime = Date.now();
  try {
    await createExecutionNodeInNeo4j(
      graphManager,
      executionId,
      executionId,
      taskDefinitions.length,
      executionStartTime
    );
    console.log(`✅ Execution node created: ${executionId}\n`);
  } catch (error: any) {
    console.error(`⚠️  Failed to create execution node:`, error.message);
  }

  // Generate preambles for each unique role
  console.log('-'.repeat(80));
  console.log('STEP 1: Generate Agent Preambles (Worker + QC)');
  console.log('-'.repeat(80) + '\n');

  const rolePreambles = new Map<string, string>();
  const qcRolePreambles = new Map<string, string>();

  // Group tasks by worker role
  const roleMap = new Map<string, TaskDefinition[]>();
  for (const task of taskDefinitions) {
    const existing = roleMap.get(task.agentRoleDescription) || [];
    existing.push(task);
    roleMap.set(task.agentRoleDescription, existing);
  }

  // Generate worker preambles
  console.log('📝 Generating Worker Preambles...\n');
  for (const [role, roleTasks] of roleMap.entries()) {
    console.log(`   Worker (${roleTasks.length} tasks): ${role.substring(0, 60)}...`);
    const preambleContent = await generatePreamble(role, '', roleTasks[0], false);
    rolePreambles.set(role, preambleContent);
  }

  // Group tasks by QC role
  const qcRoleMap = new Map<string, TaskDefinition[]>();
  for (const task of taskDefinitions) {
    if (task.qcRole) {
      const qcExisting = qcRoleMap.get(task.qcRole) || [];
      qcExisting.push(task);
      qcRoleMap.set(task.qcRole, qcExisting);
    }
  }

  // Generate QC preambles
  console.log('\n📝 Generating QC Preambles...\n');
  for (const [qcRole, qcTasks] of qcRoleMap.entries()) {
    console.log(`   QC (${qcTasks.length} tasks): ${qcRole.substring(0, 60)}...`);
    const qcPreambleContent = await generatePreamble(qcRole, '', qcTasks[0], true);
    qcRolePreambles.set(qcRole, qcPreambleContent);
  }

  console.log(`\n✅ Generated ${rolePreambles.size} worker preambles`);
  console.log(`✅ Generated ${qcRolePreambles.size} QC preambles\n`);

  // Group tasks by parallel execution groups
  const taskGroups = groupTasksByParallelGroup(taskDefinitions);
  console.log(`📋 Grouped ${taskDefinitions.length} tasks into ${taskGroups.length} parallel groups.\n`);

  // Execute tasks with parallel groups
  console.log('-'.repeat(80));
  console.log('STEP 2: Execute Tasks (Parallel + Serial Execution with Rate Limiting)');
  console.log('-'.repeat(80) + '\n');

  const results: ExecutionResult[] = [];
  let hasFailure = false;
  
  for (let i = 0; i < taskGroups.length; i++) {
    const taskGroup = taskGroups[i];
    const state = executionStates.get(executionId);
    
    // Check for cancellation
    if (state?.cancelled) {
      console.log(`\n⛔ Execution ${executionId} was cancelled - stopping`);
      break;
    }
    
    // Check for previous failures
    if (hasFailure) {
      console.log(`\n⛔ Skipping remaining groups due to previous failure`);
      break;
    }
    
    try {
      const groupResults = await executeTaskGroup(
        taskGroup,
        rolePreambles,
        qcRolePreambles,
        executionId,
        graphManager,
        taskDefinitions.length,
        results.length
      );
      
      results.push(...groupResults);
      
      // Check if any task in the group failed
      if (groupResults.some(r => r.status === 'failure')) {
        hasFailure = true;
        console.error(`\n⛔ Task group ${i + 1} had failures, stopping execution`);
      }
      
      // Update execution node progress after each group
      const currentSuccessful = results.filter(r => r.status === 'success').length;
      const currentFailed = results.filter(r => r.status === 'failure').length;
      try {
        // Use the last result from the group for the progress update
        await updateExecutionNodeProgress(
          graphManager,
          executionId,
          groupResults[groupResults.length - 1],
          currentFailed,
          currentSuccessful
        );
      } catch (progressError: any) {
        console.error(`⚠️  Failed to update execution progress:`, progressError.message);
      }
      
    } catch (error: any) {
      console.error(`\n❌ Task group ${i + 1} execution error: ${error.message}`);
      
      // Mark all tasks in group as failed
      for (const task of taskGroup) {
        if (state) {
          state.taskStatuses[task.id] = 'failed';
        }
        sendSSEEvent(executionId, 'task-fail', {
          taskId: task.id,
          taskTitle: task.title,
          error: error.message,
          progress: results.length + 1,
          total: taskDefinitions.length,
        });
      }
      
      hasFailure = true;
      break;
    }
  }

  // Generate execution summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failure').length;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);
  
  console.log(`\n✅ Successful: ${successful}/${taskDefinitions.length}`);
  console.log(`❌ Failed: ${failed}/${taskDefinitions.length}`);
  console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s\n`);
  
  results.forEach((result, i) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${i + 1}. ${result.taskId} (${(result.duration / 1000).toFixed(2)}s)`);
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Finalize execution state
  const finalState = executionStates.get(executionId);
  const wasCancelled = finalState?.cancelled || false;
  const completionStatus = wasCancelled ? 'cancelled' : (failed > 0 ? 'failed' : 'completed');
  
  if (finalState) {
    if (!wasCancelled) {
      finalState.status = failed > 0 ? 'failed' : 'completed';
    }
    finalState.endTime = Date.now();
    finalState.currentTaskId = null;
    
    // Collect deliverables from task outputs
    console.log('📦 Collecting deliverables from task outputs...');
    const deliverables = extractDeliverablesFromResults(results);
    finalState.deliverables = deliverables;
    console.log(`✅ Collected ${deliverables.length} deliverable(s)`);
  }
  
  // Update execution node in Neo4j
  if (finalState) {
    try {
      await updateExecutionNodeInNeo4j(
        graphManager,
        executionId,
        results,
        finalState.endTime || Date.now(),
        wasCancelled
      );
    } catch (persistError: any) {
      console.error(`⚠️  Failed to update execution node in Neo4j:`, persistError.message);
    }
  }
  
  // Emit completion event
  const completionEvent = wasCancelled ? 'execution-cancelled' : 'execution-complete';
  sendSSEEvent(executionId, completionEvent, {
    executionId,
    status: completionStatus,
    successful,
    failed,
    cancelled: wasCancelled,
    completed: results.length,
    total: taskDefinitions.length,
    totalDuration,
    deliverables: finalState?.deliverables.map(d => ({
      filename: d.filename,
      size: d.size,
      mimeType: d.mimeType,
    })) || [],
    results: results.map(r => ({
      taskId: r.taskId,
      status: r.status,
      duration: r.duration,
    })),
  });
  
  // Close SSE connections after brief delay to ensure final event is delivered
  setTimeout(() => {
    closeSSEConnections(executionId);
    console.log(`🔌 Closed SSE connections for execution ${executionId}`);
  }, 1000);
  
  return results;
}

/**
 * TODO: Implement Neo4j-based error reporting, execution summaries, and deliverable storage
 * 
 * All workflow artifacts should be stored as nodes in Neo4j:
 * - Error reports → execution node properties
 * - Execution summaries → execution node properties
 * - Deliverables → linked File/FileChunk nodes
 * 
 * This removes the need for file system access and Docker volume permissions.
 * All data can be retrieved via the REST API by querying Neo4j.
 */
