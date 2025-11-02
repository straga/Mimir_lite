/**
 * Safe Tool Wrapper for Agents
 * 
 * Wraps all file-modifying tools with the isolation layer
 * Provides safe alternatives to direct filesystem operations
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { FileIsolationManager } from './file-isolation.js';

export class SafeToolWrapper {
  private isolation: FileIsolationManager;

  constructor(isolation: FileIsolationManager) {
    this.isolation = isolation;
  }

  /**
   * Create a safe read_file tool
   */
  createSafeReadFileTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: 'read_file_safe',
      description:
        'Read a file safely - respects isolation restrictions. Use this instead of read_file.',
      schema: z.object({
        filepath: z.string().describe('Path to file to read'),
      }),
      func: async ({ filepath }) => {
        try {
          const content = await this.isolation.readFile(filepath);
          return content;
        } catch (error: any) {
          return `Error reading file: ${error.message}`;
        }
      },
    });
  }

  /**
   * Create a safe write_file tool
   */
  createSafeWriteFileTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: 'write_file_safe',
      description:
        'Write a file safely - respects isolation restrictions. Use this instead of write_file.',
      schema: z.object({
        filepath: z.string().describe('Path to file to write'),
        content: z.string().describe('Content to write'),
      }),
      func: async ({ filepath, content }) => {
        try {
          await this.isolation.writeFile(filepath, content);
          return `File written successfully: ${filepath}`;
        } catch (error: any) {
          return `Error writing file: ${error.message}`;
        }
      },
    });
  }

  /**
   * Create a safe delete_file tool
   */
  createSafeDeleteFileTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: 'delete_file_safe',
      description:
        'Delete a file safely - respects isolation restrictions. Use this instead of delete_file.',
      schema: z.object({
        filepath: z.string().describe('Path to file to delete'),
      }),
      func: async ({ filepath }) => {
        try {
          await this.isolation.deleteFile(filepath);
          return `File deleted successfully: ${filepath}`;
        } catch (error: any) {
          return `Error deleting file: ${error.message}`;
        }
      },
    });
  }

  /**
   * Get all safe tools as a bundle
   */
  getSafeFileTools() {
    return {
      readFileSafe: this.createSafeReadFileTool(),
      writeFileSafe: this.createSafeWriteFileTool(),
      deleteFileSafe: this.createSafeDeleteFileTool(),
    };
  }
}

/**
 * Create wrapped tools with isolation
 */
export function createSafeTools(isolation: FileIsolationManager) {
  const wrapper = new SafeToolWrapper(isolation);
  return wrapper.getSafeFileTools();
}
