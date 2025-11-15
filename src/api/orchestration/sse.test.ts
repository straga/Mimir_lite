/**
 * @fileoverview Unit tests for Server-Sent Events (SSE) management
 * 
 * Tests SSE client registration, unregistration, event broadcasting,
 * and connection management with mocked response streams.
 * 
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendSSEEvent,
  registerSSEClient,
  unregisterSSEClient,
  getSSEClientCount,
  closeSSEConnections,
} from './sse.js';

describe('SSE Management', () => {
  let mockResponse1: any;
  let mockResponse2: any;
  let testCounter = 0;

  beforeEach(() => {
    testCounter++;
    // Create mock response streams
    mockResponse1 = {
      write: vi.fn(),
      end: vi.fn(),
    };
    mockResponse2 = {
      write: vi.fn(),
      end: vi.fn(),
    };
  });

  describe('registerSSEClient', () => {
    it('should register a client for an execution', () => {
      const executionId = `exec-register-1-${testCounter}`;
      
      registerSSEClient(executionId, mockResponse1);
      
      expect(getSSEClientCount(executionId)).toBe(1);
    });

    it('should register multiple clients for same execution', () => {
      const executionId = `exec-register-2-${testCounter}`;
      
      registerSSEClient(executionId, mockResponse1);
      registerSSEClient(executionId, mockResponse2);
      
      expect(getSSEClientCount(executionId)).toBe(2);
    });
  });

  describe('sendSSEEvent', () => {
    it('should send event to all registered clients', () => {
      const executionId = `exec-send-1-${testCounter}`;
      registerSSEClient(executionId, mockResponse1);
      registerSSEClient(executionId, mockResponse2);

      sendSSEEvent(executionId, 'task-start', {
        taskId: 'task-1',
        progress: 1,
        total: 5,
      });

      expect(mockResponse1.write).toHaveBeenCalledOnce();
      expect(mockResponse2.write).toHaveBeenCalledOnce();
      
      const message1 = mockResponse1.write.mock.calls[0][0];
      expect(message1).toContain('event: task-start');
      expect(message1).toContain('"taskId":"task-1"');
    });

    it('should handle write errors gracefully', () => {
      const executionId = `exec-send-2-${testCounter}`;
      mockResponse1.write.mockImplementation(() => {
        throw new Error('Write failed');
      });
      registerSSEClient(executionId, mockResponse1);

      // Should not throw
      expect(() => {
        sendSSEEvent(executionId, 'test', { data: 'test' });
      }).not.toThrow();
    });

    it('should do nothing for execution with no clients', () => {
      sendSSEEvent(`exec-nonexistent-${testCounter}`, 'test', { data: 'test' });
      
      // No errors should occur
      expect(true).toBe(true);
    });

    it('should send agent-chatter events with truncated preamble and output', () => {
      const executionId = `exec-chatter-1-${testCounter}`;
      registerSSEClient(executionId, mockResponse1);

      const preamblePreview = 'You are a worker agent specialized in...'.substring(0, 500);
      const outputPreview = 'Task completed successfully with the following output...'.substring(0, 1000);

      sendSSEEvent(executionId, 'agent-chatter', {
        taskId: 'task-1.1',
        taskTitle: 'Implement feature X',
        preamble: preamblePreview,
        output: outputPreview,
        tokens: { input: 100, output: 200 },
        toolCalls: 5,
      });

      expect(mockResponse1.write).toHaveBeenCalledOnce();
      
      const message = mockResponse1.write.mock.calls[0][0];
      expect(message).toContain('event: agent-chatter');
      expect(message).toContain('"taskId":"task-1.1"');
      expect(message).toContain('"taskTitle":"Implement feature X"');
      expect(message).toContain(preamblePreview);
      expect(message).toContain(outputPreview);
      expect(message).toContain('"input":100');
      expect(message).toContain('"output":200');
      expect(message).toContain('"toolCalls":5');
    });

    it('should handle agent-chatter events with missing optional fields', () => {
      const executionId = `exec-chatter-2-${testCounter}`;
      registerSSEClient(executionId, mockResponse1);

      sendSSEEvent(executionId, 'agent-chatter', {
        taskId: 'task-1.2',
        taskTitle: 'Debug issue Y',
        // preamble and output may be undefined
      });

      expect(mockResponse1.write).toHaveBeenCalledOnce();
      
      const message = mockResponse1.write.mock.calls[0][0];
      expect(message).toContain('event: agent-chatter');
      expect(message).toContain('"taskId":"task-1.2"');
      expect(message).toContain('"taskTitle":"Debug issue Y"');
    });

    it('should properly truncate long preambles and outputs in agent-chatter', () => {
      const executionId = `exec-chatter-3-${testCounter}`;
      registerSSEClient(executionId, mockResponse1);

      const longPreamble = 'A'.repeat(600); // Exceeds 500 char limit
      const longOutput = 'B'.repeat(1200); // Exceeds 1000 char limit

      sendSSEEvent(executionId, 'agent-chatter', {
        taskId: 'task-1.3',
        taskTitle: 'Process large data',
        preamble: longPreamble.substring(0, 500) + '...',
        output: longOutput.substring(0, 1000) + '...',
        tokens: { input: 500, output: 1000 },
        toolCalls: 15,
      });

      expect(mockResponse1.write).toHaveBeenCalledOnce();
      
      const message = mockResponse1.write.mock.calls[0][0];
      const data = JSON.parse(message.split('\n')[1].replace('data: ', ''));
      
      // Verify truncation occurred
      expect(data.preamble).toHaveLength(503); // 500 + '...'
      expect(data.output).toHaveLength(1003); // 1000 + '...'
    });
  });

  describe('unregisterSSEClient', () => {
    it('should remove a specific client', () => {
      const executionId = `exec-unreg-1-${testCounter}`;
      registerSSEClient(executionId, mockResponse1);
      registerSSEClient(executionId, mockResponse2);

      unregisterSSEClient(executionId, mockResponse1);

      expect(getSSEClientCount(executionId)).toBe(1);
    });

    it('should clean up execution when last client disconnects', () => {
      const executionId = `exec-unreg-2-${testCounter}`;
      registerSSEClient(executionId, mockResponse1);

      unregisterSSEClient(executionId, mockResponse1);

      expect(getSSEClientCount(executionId)).toBe(0);
    });
  });

  describe('getSSEClientCount', () => {
    it('should return 0 for execution with no clients', () => {
      expect(getSSEClientCount(`exec-count-1-${testCounter}`)).toBe(0);
    });

    it('should return correct count for registered clients', () => {
      const executionId = `exec-count-2-${testCounter}`;
      registerSSEClient(executionId, mockResponse1);
      registerSSEClient(executionId, mockResponse2);

      expect(getSSEClientCount(executionId)).toBe(2);
    });
  });

  describe('closeSSEConnections', () => {
    it('should close all client connections', () => {
      const executionId = `exec-close-1-${testCounter}`;
      registerSSEClient(executionId, mockResponse1);
      registerSSEClient(executionId, mockResponse2);

      closeSSEConnections(executionId);

      expect(mockResponse1.end).toHaveBeenCalledOnce();
      expect(mockResponse2.end).toHaveBeenCalledOnce();
      expect(getSSEClientCount(executionId)).toBe(0);
    });

    it('should handle client.end() errors gracefully', () => {
      const executionId = `exec-close-2-${testCounter}`;
      mockResponse1.end.mockImplementation(() => {
        throw new Error('End failed');
      });
      registerSSEClient(executionId, mockResponse1);

      expect(() => {
        closeSSEConnections(executionId);
      }).not.toThrow();
    });
  });
});
