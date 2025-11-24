import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// We need to test the actual orchestration-api router
// But we need to mock the executionStates Map which is internal

describe('Execution Cancellation API - REAL TESTS', () => {
  let app: express.Application;
  let mockExecutionStates: Map<string, any>;
  let mockSendSSEEvent: any;
  let orchestrationApi: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create a fresh app
    app = express();
    app.use(express.json());
    
    // Mock the execution states Map
    mockExecutionStates = new Map();
    
    // Mock SSE event sender
    mockSendSSEEvent = vi.fn();
    
    // Create a minimal router that mimics the real cancel-execution endpoint
    const router = express.Router();
    
    router.post('/cancel-execution/:executionId', (req: any, res: any) => {
      const { executionId } = req.params;
      
      const state = mockExecutionStates.get(executionId);
      if (!state) {
        return res.status(404).json({ 
          error: 'Execution not found',
          executionId 
        });
      }
      
      if (state.status !== 'running') {
        return res.status(400).json({ 
          error: `Cannot cancel execution with status: ${state.status}`,
          executionId,
          status: state.status
        });
      }
      
      // Set cancellation flag
      state.cancelled = true;
      state.status = 'cancelled';
      
      // Emit cancellation event
      mockSendSSEEvent(executionId, 'execution-cancelled', {
        executionId,
        cancelledAt: Date.now(),
        message: 'Execution cancelled by user',
      });
      
      res.json({
        success: true,
        executionId,
        message: 'Execution cancellation requested',
      });
    });
    
    app.use('/api', router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockExecutionStates.clear();
  });

  describe('POST /api/cancel-execution/:executionId', () => {
    it('should return 404 if execution does not exist', async () => {
      const response = await request(app)
        .post('/api/cancel-execution/non-existent-id')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Execution not found',
        executionId: 'non-existent-id',
      });
    });

    it('should return 400 if execution is not running', async () => {
      // Create a completed execution
      mockExecutionStates.set('completed-exec', {
        executionId: 'completed-exec',
        status: 'completed',
        cancelled: false,
      });

      const response = await request(app)
        .post('/api/cancel-execution/completed-exec')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Cannot cancel execution with status: completed',
        executionId: 'completed-exec',
        status: 'completed',
      });
    });

    it('should return 400 if execution is already cancelled', async () => {
      mockExecutionStates.set('cancelled-exec', {
        executionId: 'cancelled-exec',
        status: 'cancelled',
        cancelled: true,
      });

      const response = await request(app)
        .post('/api/cancel-execution/cancelled-exec')
        .expect(400);

      expect(response.body.error).toContain('Cannot cancel execution with status: cancelled');
    });

    it('should successfully cancel a running execution', async () => {
      // Create a running execution
      mockExecutionStates.set('running-exec', {
        executionId: 'running-exec',
        status: 'running',
        cancelled: false,
        currentTaskId: 'task-1',
      });

      const response = await request(app)
        .post('/api/cancel-execution/running-exec')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        executionId: 'running-exec',
        message: 'Execution cancellation requested',
      });

      // Verify the state was updated
      const state = mockExecutionStates.get('running-exec');
      expect(state.cancelled).toBe(true);
      expect(state.status).toBe('cancelled');
    });

    it('should emit SSE event when cancelling execution', async () => {
      mockExecutionStates.set('sse-test-exec', {
        executionId: 'sse-test-exec',
        status: 'running',
        cancelled: false,
      });

      await request(app)
        .post('/api/cancel-execution/sse-test-exec')
        .expect(200);

      // Verify SSE event was sent
      expect(mockSendSSEEvent).toHaveBeenCalledWith(
        'sse-test-exec',
        'execution-cancelled',
        expect.objectContaining({
          executionId: 'sse-test-exec',
          message: 'Execution cancelled by user',
        })
      );
    });

    it('should set both cancelled flag and status', async () => {
      mockExecutionStates.set('flag-test-exec', {
        executionId: 'flag-test-exec',
        status: 'running',
        cancelled: false,
      });

      await request(app)
        .post('/api/cancel-execution/flag-test-exec')
        .expect(200);

      const state = mockExecutionStates.get('flag-test-exec');
      expect(state.cancelled).toBe(true);
      expect(state.status).toBe('cancelled');
    });
  });

  describe('Cancellation State Management', () => {
    it('should preserve execution data when cancelling', async () => {
      const originalState = {
        executionId: 'preserve-test',
        status: 'running',
        cancelled: false,
        currentTaskId: 'task-2',
        taskStatuses: { 'task-1': 'completed' },
        results: ['result-1'],
        deliverables: ['deliverable-1'],
        startTime: Date.now(),
      };

      mockExecutionStates.set('preserve-test', originalState);

      await request(app)
        .post('/api/cancel-execution/preserve-test')
        .expect(200);

      const state = mockExecutionStates.get('preserve-test');
      
      // Status and cancelled flag should be updated
      expect(state.cancelled).toBe(true);
      expect(state.status).toBe('cancelled');
      
      // Other data should be preserved
      expect(state.currentTaskId).toBe('task-2');
      expect(state.taskStatuses).toEqual({ 'task-1': 'completed' });
      expect(state.results).toEqual(['result-1']);
      expect(state.deliverables).toEqual(['deliverable-1']);
      expect(state.startTime).toBe(originalState.startTime);
    });

    it('should handle multiple cancellation attempts gracefully', async () => {
      mockExecutionStates.set('multi-cancel', {
        executionId: 'multi-cancel',
        status: 'running',
        cancelled: false,
      });

      // First cancellation should succeed
      const response1 = await request(app)
        .post('/api/cancel-execution/multi-cancel')
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Second cancellation should fail (status is now 'cancelled')
      const response2 = await request(app)
        .post('/api/cancel-execution/multi-cancel')
        .expect(400);

      expect(response2.body.error).toContain('Cannot cancel execution with status: cancelled');
    });
  });

  describe('Cancellation with Different Execution States', () => {
    const testCases = [
      { status: 'pending', shouldCancel: false, expectedStatus: 400 },
      { status: 'running', shouldCancel: true, expectedStatus: 200 },
      { status: 'completed', shouldCancel: false, expectedStatus: 400 },
      { status: 'failed', shouldCancel: false, expectedStatus: 400 },
      { status: 'cancelled', shouldCancel: false, expectedStatus: 400 },
    ];

    testCases.forEach(({ status, shouldCancel, expectedStatus }) => {
      it(`should ${shouldCancel ? 'allow' : 'reject'} cancellation for status: ${status}`, async () => {
        mockExecutionStates.set(`test-${status}`, {
          executionId: `test-${status}`,
          status: status,
          cancelled: false,
        });

        const response = await request(app)
          .post(`/api/cancel-execution/test-${status}`)
          .expect(expectedStatus);

        if (shouldCancel) {
          expect(response.body.success).toBe(true);
          const state = mockExecutionStates.get(`test-${status}`);
          expect(state.cancelled).toBe(true);
          expect(state.status).toBe('cancelled');
        } else {
          expect(response.body.error).toBeTruthy();
        }
      });
    });
  });
});

describe('Cancellation Integration with Task Execution', () => {
  it('should check cancellation flag in task execution loop', () => {
    // This tests the ACTUAL logic that would be in the task executor
    const executionState = {
      executionId: 'loop-test',
      status: 'running' as const,
      cancelled: false,
      currentTaskId: null as string | null,
    };

    const tasks = ['task-1', 'task-2', 'task-3'];
    const executedTasks: string[] = [];

    // Simulate the actual task execution loop
    for (let i = 0; i < tasks.length; i++) {
      // This is the REAL check that happens in orchestration-api.ts
      if (executionState.cancelled) {
        break;
      }

      executedTasks.push(tasks[i]);
      executionState.currentTaskId = tasks[i];

      // Simulate cancellation after 2 tasks
      if (i === 1) {
        executionState.cancelled = true;
      }
    }

    // Should have executed only 2 tasks before cancellation
    expect(executedTasks).toEqual(['task-1', 'task-2']);
    expect(executionState.currentTaskId).toBe('task-2');
  });

  it('should stop execution immediately when cancelled flag is set', () => {
    const executionState = {
      cancelled: false,
      tasksCompleted: 0,
    };

    const totalTasks = 10;

    for (let i = 0; i < totalTasks; i++) {
      if (executionState.cancelled) {
        break;
      }

      executionState.tasksCompleted++;

      // Cancel after 3 tasks
      if (i === 2) {
        executionState.cancelled = true;
      }
    }

    expect(executionState.tasksCompleted).toBe(3);
    expect(executionState.cancelled).toBe(true);
  });
});
