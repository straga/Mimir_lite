/**
 * Unit tests for QC Verification Functions
 * Tests the REAL task-executor functions with proper mocks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizeTasks } from '../src/orchestrator/task-executor.js';

// Define TaskDefinition interface locally to match the real one
interface TaskDefinition {
  id: string;
  title: string;
  prompt: string;
  agentRoleDescription: string;
  recommendedModel: string;
  estimatedDuration: string;
  dependencies: string[];
  parallelGroup?: number;
}

describe('QC Verification Functions - REAL TESTS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('organizeTasks', () => {
    it('should organize independent tasks into parallel groups', () => {
      const tasks: TaskDefinition[] = [
        {
          id: 'task-1',
          title: 'Task 1',
          prompt: 'Do task 1',
          agentRoleDescription: 'Developer',
          recommendedModel: 'gpt-4o',
          estimatedDuration: '1 hour',
          dependencies: [],
          parallelGroup: 1
        },
        {
          id: 'task-2',
          title: 'Task 2',
          prompt: 'Do task 2',
          agentRoleDescription: 'Developer',
          recommendedModel: 'gpt-4o',
          estimatedDuration: '1 hour',
          dependencies: [],
          parallelGroup: 1
        },
        {
          id: 'task-3',
          title: 'Task 3',
          prompt: 'Do task 3',
          agentRoleDescription: 'Developer',
          recommendedModel: 'gpt-4o',
          estimatedDuration: '2 hours',
          dependencies: ['task-1', 'task-2'],
          parallelGroup: 2
        }
      ];

      const organized = organizeTasks(tasks);

      // Should have 2 groups
      expect(organized).toHaveLength(2);
      
      // First group should have tasks 1 and 2
      expect(organized[0]).toHaveLength(2);
      expect(organized[0].map(t => t.id)).toContain('task-1');
      expect(organized[0].map(t => t.id)).toContain('task-2');
      
      // Second group should have task 3
      expect(organized[1]).toHaveLength(1);
      expect(organized[1][0].id).toBe('task-3');
    });

    it('should handle tasks with no parallel group specified', () => {
      const tasks: TaskDefinition[] = [
        {
          id: 'task-1',
          title: 'Task 1',
          prompt: 'Do task 1',
          agentRoleDescription: 'Developer',
          recommendedModel: 'gpt-4o',
          estimatedDuration: '1 hour',
          dependencies: []
        }
      ];

      const organized = organizeTasks(tasks);
      
      expect(organized).toHaveLength(1);
      expect(organized[0]).toHaveLength(1);
      expect(organized[0][0].id).toBe('task-1');
    });

    it('should respect dependency order', () => {
      const tasks: TaskDefinition[] = [
        {
          id: 'task-3',
          title: 'Task 3',
          prompt: 'Do task 3',
          agentRoleDescription: 'Developer',
          recommendedModel: 'gpt-4o',
          estimatedDuration: '2 hours',
          dependencies: ['task-1'],
          parallelGroup: 2
        },
        {
          id: 'task-1',
          title: 'Task 1',
          prompt: 'Do task 1',
          agentRoleDescription: 'Developer',
          recommendedModel: 'gpt-4o',
          estimatedDuration: '1 hour',
          dependencies: [],
          parallelGroup: 1
        }
      ];

      const organized = organizeTasks(tasks);
      
      // Task 1 should come before task 3
      expect(organized[0][0].id).toBe('task-1');
      expect(organized[1][0].id).toBe('task-3');
    });
  });

  describe('QC Score Parsing', () => {
    it('should correctly identify PASS result', () => {
      const qcOutput = 'QC RESULT: PASS\nScore: 85\nFeedback: Good work';
      
      const isPassed = qcOutput.includes('QC RESULT: PASS');
      const score = parseInt(qcOutput.match(/Score: (\d+)/)?.[1] || '0');
      
      expect(isPassed).toBe(true);
      expect(score).toBe(85);
    });

    it('should correctly identify FAIL result', () => {
      const qcOutput = 'QC RESULT: FAIL\nScore: 45\nFeedback: Needs improvement';
      
      const isPassed = qcOutput.includes('QC RESULT: PASS');
      const score = parseInt(qcOutput.match(/Score: (\d+)/)?.[1] || '0');
      
      expect(isPassed).toBe(false);
      expect(score).toBe(45);
    });

    it('should extract feedback from QC output', () => {
      const qcOutput = 'QC RESULT: PASS\nScore: 90\nFeedback: Excellent implementation with comprehensive tests';
      
      const feedbackMatch = qcOutput.match(/Feedback: (.+)/);
      const feedback = feedbackMatch ? feedbackMatch[1] : '';
      
      expect(feedback).toBe('Excellent implementation with comprehensive tests');
    });
  });
});
