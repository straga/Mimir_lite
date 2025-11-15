/**
 * @fileoverview Unit tests for orchestration API endpoints
 * 
 * Tests the zip download endpoint and other orchestration API functionality
 * with mocked dependencies.
 * 
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock archiver before importing the module
let mockArchiveInstance: any;

vi.mock('archiver', () => {
  mockArchiveInstance = {
    pipe: vi.fn(function(this: any, res: any) {
      // Simulate immediate completion
      setTimeout(() => res.end?.(), 0);
      return this;
    }),
    append: vi.fn(),
    finalize: vi.fn().mockResolvedValue(undefined),
    pointer: vi.fn().mockReturnValue(1024),
  };
  
  return {
    default: vi.fn(() => mockArchiveInstance),
  };
});

describe('Orchestration API - Zip Download Endpoint', () => {
  let app: express.Application;
  let mockExecutionStates: Map<string, any>;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset mock archive instance
    if (mockArchiveInstance) {
      mockArchiveInstance.pipe.mockClear?.();
      mockArchiveInstance.append.mockClear?.();
      mockArchiveInstance.finalize.mockClear?.();
    }
    
    // Create a minimal express app with just the zip download endpoint
    app = express();
    app.use(express.json());
    
    // Mock execution states
    mockExecutionStates = new Map();
    
    // Define the endpoint inline for testing
    app.get('/api/deliverables/:executionId/download', async (req: any, res: any) => {
      try {
        const { executionId } = req.params;
        const state = mockExecutionStates.get(executionId);

        if (!state) {
          return res.status(404).json({
            error: 'Execution not found',
            executionId,
          });
        }

        if (state.deliverables.length === 0) {
          return res.status(404).json({
            error: 'No deliverables found for this execution',
            executionId,
          });
        }

        // Dynamically import archiver
        const archiver = (await import('archiver')).default;
        const archive = archiver('zip', {
          zlib: { level: 9 },
        });

        // Set response headers for zip download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="execution-${executionId}-deliverables.zip"`);

        // Pipe archive to response
        archive.pipe(res);

        // Add all deliverable files to the archive
        for (const deliverable of state.deliverables) {
          if (deliverable.content) {
            archive.append(deliverable.content, { name: deliverable.filename });
          }
        }

        // Finalize the archive
        await archive.finalize();
      } catch (error) {
        console.error('Error creating deliverables zip:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to create deliverables archive',
            details: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });
  });

  describe('GET /api/deliverables/:executionId/download', () => {
    it('should return 404 when execution is not found', async () => {
      const response = await request(app)
        .get('/api/deliverables/nonexistent-exec/download')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Execution not found',
        executionId: 'nonexistent-exec',
      });
    });

    it('should return 404 when execution has no deliverables', async () => {
      const executionId = 'exec-empty-123';
      mockExecutionStates.set(executionId, {
        executionId,
        deliverables: [],
      });

      const response = await request(app)
        .get(`/api/deliverables/${executionId}/download`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'No deliverables found for this execution',
        executionId,
      });
    });

    it('should create and stream a zip archive with deliverables', async () => {
      const executionId = 'exec-success-456';
      mockExecutionStates.set(executionId, {
        executionId,
        deliverables: [
          { filename: 'output.md', content: '# Test Output\n\nHello world!', mimeType: 'text/markdown', size: 100 },
          { filename: 'data.json', content: '{"test": true}', mimeType: 'application/json', size: 50 },
        ],
      });

      const response = await request(app)
        .get(`/api/deliverables/${executionId}/download`)
        .expect(200);

      // Verify headers
      expect(response.headers['content-type']).toBe('application/zip');
      expect(response.headers['content-disposition']).toBe(`attachment; filename="execution-${executionId}-deliverables.zip"`);

      // Verify archiver was called correctly
      const archiver = (await import('archiver')).default;
      expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
      expect(mockArchiveInstance.pipe).toHaveBeenCalled();
      expect(mockArchiveInstance.append).toHaveBeenCalledTimes(2);
      expect(mockArchiveInstance.append).toHaveBeenCalledWith('# Test Output\n\nHello world!', { name: 'output.md' });
      expect(mockArchiveInstance.append).toHaveBeenCalledWith('{"test": true}', { name: 'data.json' });
      expect(mockArchiveInstance.finalize).toHaveBeenCalled();
    });

    it('should skip deliverables without content', async () => {
      const executionId = 'exec-partial-789';
      mockExecutionStates.set(executionId, {
        executionId,
        deliverables: [
          { filename: 'output.md', content: '# Test', mimeType: 'text/markdown', size: 10 },
          { filename: 'empty.txt', content: null, mimeType: 'text/plain', size: 0 }, // No content
          { filename: 'data.json', content: '{}', mimeType: 'application/json', size: 2 },
        ],
      });

      await request(app)
        .get(`/api/deliverables/${executionId}/download`)
        .expect(200);

      // Should only append 2 files (skipping the one without content)
      expect(mockArchiveInstance.append).toHaveBeenCalledTimes(2);
      expect(mockArchiveInstance.append).toHaveBeenCalledWith('# Test', { name: 'output.md' });
      expect(mockArchiveInstance.append).toHaveBeenCalledWith('{}', { name: 'data.json' });
    });

    it('should handle archiver errors gracefully', async () => {
      const executionId = 'exec-error-999';
      mockExecutionStates.set(executionId, {
        executionId,
        deliverables: [
          { filename: 'test.md', content: '# Test', mimeType: 'text/markdown', size: 10 },
        ],
      });

      // Mock archiver to throw an error
      const archiverModule = await import('archiver');
      const mockArchiver = vi.mocked(archiverModule.default);
      mockArchiver.mockImplementationOnce(() => {
        throw new Error('Archiver initialization failed');
      });

      const response = await request(app)
        .get(`/api/deliverables/${executionId}/download`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to create deliverables archive',
        details: 'Archiver initialization failed',
      });
    });
  });
});
