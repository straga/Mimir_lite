/**
 * @fileoverview Unit tests for Neo4j persistence operations
 * 
 * Tests the orchestration execution tracking persistence layer,
 * including task execution persistence, execution node management,
 * and progress tracking with mocked Neo4j operations.
 * 
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  persistTaskExecutionToNeo4j,
  createExecutionNodeInNeo4j,
  updateExecutionNodeProgress,
  updateExecutionNodeInNeo4j,
} from './persistence.js';
import type { IGraphManager } from '../../types/index.js';
import type { ExecutionResult, TaskDefinition } from '../../orchestrator/task-executor.js';

describe('Orchestration Persistence', () => {
  let mockGraphManager: IGraphManager;
  let mockSession: any;
  let mockDriver: any;

  beforeEach(() => {
    // Create mock session
    mockSession = {
      run: vi.fn().mockResolvedValue({
        records: [],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock driver
    mockDriver = {
      session: vi.fn().mockReturnValue(mockSession),
    };

    // Create mock graph manager
    mockGraphManager = {
      getDriver: vi.fn().mockReturnValue(mockDriver),
    } as any;
  });

  describe('persistTaskExecutionToNeo4j', () => {
    it('should persist successful task execution with QC data', async () => {
      const executionId = 'exec-1234567890';
      const taskId = 'task-1';
      const result: ExecutionResult = {
        taskId: 'task-1',
        status: 'success',
        output: '✅ Task completed successfully',
        duration: 5000,
        preamblePath: '/path/to/preamble.md',
        tokens: { input: 1000, output: 500 },
        toolCalls: 3,
        qcVerification: {
          passed: true,
          score: 95,
          feedback: 'All checks passed',
          issues: [],
          requiredFixes: [],
        },
      };
      const task: TaskDefinition = {
        id: 'task-1',
        title: 'Test Task',
        agentRoleDescription: 'Test Worker',
        recommendedModel: 'gpt-4',
        prompt: 'Do test',
        dependencies: [],
        estimatedDuration: '5 min',
        qcRole: 'Test QC',
        maxRetries: 2,
      };

      const nodeId = await persistTaskExecutionToNeo4j(
        mockGraphManager,
        executionId,
        taskId,
        result,
        task
      );

      expect(nodeId).toBe('exec-1234567890-task-1');
      expect(mockSession.run).toHaveBeenCalledOnce();
      expect(mockSession.close).toHaveBeenCalledOnce();
    });

    it('should persist failed task with error details', async () => {
      const result: ExecutionResult = {
        taskId: 'task-2',
        status: 'failure',
        output: '',
        error: 'API timeout after 30s',
        duration: 30000,
        preamblePath: '/path/to/preamble.md',
        tokens: { input: 800, output: 50 },
        toolCalls: 1,
      };
      const task: TaskDefinition = {
        id: 'task-2',
        title: 'Failed Task',
        agentRoleDescription: 'Test Worker',
        recommendedModel: 'gpt-4',
        prompt: 'Do test',
        dependencies: [],
        estimatedDuration: '5 min',
        maxRetries: 2,
      };

      await persistTaskExecutionToNeo4j(
        mockGraphManager,
        'exec-123',
        'task-2',
        result,
        task
      );

      const callArgs = mockSession.run.mock.calls[0][1];
      expect(callArgs.status).toBe('failure');
      expect(callArgs.error).toBe('API timeout after 30s');
    });

    it('should handle session errors gracefully', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Neo4j connection failed'));

      const result: ExecutionResult = {
        taskId: 'task-1',
        status: 'success',
        output: 'Test',
        duration: 1000,
        preamblePath: '/test.md',
      };
      const task: TaskDefinition = {
        id: 'task-1',
        title: 'Test',
        agentRoleDescription: 'Worker',
        recommendedModel: 'gpt-4',
        prompt: 'Test',
        dependencies: [],
        estimatedDuration: '1 min',
        maxRetries: 2,
      };

      await expect(
        persistTaskExecutionToNeo4j(mockGraphManager, 'exec-1', 'task-1', result, task)
      ).rejects.toThrow('Neo4j connection failed');

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('createExecutionNodeInNeo4j', () => {
    it('should create execution node with initial values', async () => {
      const executionId = 'exec-1234567890';
      const planId = 'plan-1234567890';
      const totalTasks = 5;
      const startTime = Date.now();

      await createExecutionNodeInNeo4j(
        mockGraphManager,
        executionId,
        planId,
        totalTasks,
        startTime
      );

      expect(mockSession.run).toHaveBeenCalledOnce();
      const callArgs = mockSession.run.mock.calls[0][1];
      expect(callArgs.executionId).toBe(executionId);
      expect(callArgs.planId).toBe(planId);
      expect(callArgs.tasksTotal.toNumber()).toBe(5);
    });

    it('should throw error on session failure', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        createExecutionNodeInNeo4j(mockGraphManager, 'exec-1', 'plan-1', 3, Date.now())
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateExecutionNodeProgress', () => {
    it('should update progress after successful task', async () => {
      const result: ExecutionResult = {
        taskId: 'task-1',
        status: 'success',
        output: 'Done',
        duration: 5000,
        preamblePath: '/test.md',
        tokens: { input: 1000, output: 500 },
        toolCalls: 3,
      };

      await updateExecutionNodeProgress(
        mockGraphManager,
        'exec-123',
        result,
        0,  // tasksFailed
        1   // tasksSuccessful
      );

      const callArgs = mockSession.run.mock.calls[0][1];
      expect(callArgs.status).toBe('running');
      expect(callArgs.successful.toNumber()).toBe(1);
      expect(callArgs.failed.toNumber()).toBe(0);
    });

    it('should mark execution as failed when task fails', async () => {
      const result: ExecutionResult = {
        taskId: 'task-2',
        status: 'failure',
        output: '',
        error: 'Failed',
        duration: 1000,
        preamblePath: '/test.md',
      };

      await updateExecutionNodeProgress(
        mockGraphManager,
        'exec-123',
        result,
        1,  // tasksFailed
        1   // tasksSuccessful
      );

      const callArgs = mockSession.run.mock.calls[0][1];
      expect(callArgs.status).toBe('failed');
    });

    it('should not throw on session errors', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Update failed'));

      const result: ExecutionResult = {
        taskId: 'task-1',
        status: 'success',
        output: 'Done',
        duration: 1000,
        preamblePath: '/test.md',
      };

      // Should not throw
      await expect(
        updateExecutionNodeProgress(mockGraphManager, 'exec-1', result, 0, 1)
      ).resolves.toBeUndefined();
    });
  });

  describe('updateExecutionNodeInNeo4j', () => {
    it('should finalize execution with completed status', async () => {
      const results: ExecutionResult[] = [
        {
          taskId: 'task-1',
          status: 'success',
          output: 'Done',
          duration: 5000,
          preamblePath: '/test.md',
        },
        {
          taskId: 'task-2',
          status: 'success',
          output: 'Done',
          duration: 3000,
          preamblePath: '/test.md',
        },
      ];

      await updateExecutionNodeInNeo4j(
        mockGraphManager,
        'exec-123',
        results,
        Date.now(),
        false
      );

      const callArgs = mockSession.run.mock.calls[0][1];
      expect(callArgs.status).toBe('completed');
    });

    it('should finalize execution with failed status when tasks failed', async () => {
      const results: ExecutionResult[] = [
        {
          taskId: 'task-1',
          status: 'success',
          output: 'Done',
          duration: 5000,
          preamblePath: '/test.md',
        },
        {
          taskId: 'task-2',
          status: 'failure',
          output: '',
          error: 'Failed',
          duration: 1000,
          preamblePath: '/test.md',
        },
      ];

      await updateExecutionNodeInNeo4j(
        mockGraphManager,
        'exec-123',
        results,
        Date.now(),
        false
      );

      const callArgs = mockSession.run.mock.calls[0][1];
      expect(callArgs.status).toBe('failed');
    });

    it('should finalize execution with cancelled status', async () => {
      const results: ExecutionResult[] = [
        {
          taskId: 'task-1',
          status: 'success',
          output: 'Done',
          duration: 5000,
          preamblePath: '/test.md',
        },
      ];

      await updateExecutionNodeInNeo4j(
        mockGraphManager,
        'exec-123',
        results,
        Date.now(),
        true  // cancelled
      );

      const callArgs = mockSession.run.mock.calls[0][1];
      expect(callArgs.status).toBe('cancelled');
    });
  });
});
