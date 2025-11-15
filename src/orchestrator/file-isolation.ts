/**
 * File Isolation Layer for Agent Testing
 * 
 * Provides multiple strategies to prevent agents from accidentally modifying the repository:
 * 1. Virtual filesystem mode (in-memory, all operations logged)
 * 2. Folder whitelist mode (restrict to specific directories)
 * 3. Read-only mode (allow reads, block all writes)
 */

import fs from 'fs/promises';
import path from 'path';

export type IsolationMode = 'virtual' | 'restricted' | 'readonly' | 'disabled';

interface FileOperation {
  timestamp: Date;
  operation: 'read' | 'write' | 'delete' | 'command';
  path: string;
  allowed: boolean;
  reason?: string;
  content?: string; // For writes
  result?: string; // For commands
}

interface VirtualFile {
  path: string;
  content: string;
  created: Date;
  modified: Date;
}

/**
 * Sandboxed filesystem for testing agents
 */
export class FileIsolationManager {
  private mode: IsolationMode;
  private virtualFS: Map<string, VirtualFile> = new Map();
  private operations: FileOperation[] = [];
  private allowedDirs: Set<string> = new Set();
  private blockedPatterns: RegExp[] = [
    /node_modules/,
    /\.git/,
    /dist|build/,
    /\.env/,
  ];

  constructor(
    mode: IsolationMode = 'virtual',
    allowedDirs: string[] = []
  ) {
    this.mode = mode;
    this.allowedDirs = new Set(allowedDirs.map(d => path.resolve(d)));
    console.log(`📦 File Isolation: ${mode}${allowedDirs.length > 0 ? ` (${allowedDirs.length} allowed dirs)` : ''}`);
  }

  /**
   * Check if path is allowed based on current mode
   */
  private isPathAllowed(filepath: string, operation: 'read' | 'write' | 'delete'): { allowed: boolean; reason?: string } {
    const resolved = path.resolve(filepath);

    // Check blocked patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(resolved)) {
        return {
          allowed: false,
          reason: `Path matches blocked pattern: ${pattern}`,
        };
      }
    }

    if (this.mode === 'virtual') {
      // Virtual mode allows everything (logged in memory)
      return { allowed: true };
    }

    if (this.mode === 'readonly') {
      // Readonly mode blocks all writes
      if (operation !== 'read') {
        return {
          allowed: false,
          reason: `Readonly mode: ${operation} operations blocked`,
        };
      }
      return { allowed: true };
    }

    if (this.mode === 'restricted') {
      // Restricted mode checks against whitelist
      if (this.allowedDirs.size === 0) {
        return {
          allowed: false,
          reason: 'Restricted mode: no allowed directories configured',
        };
      }

      const isAllowed = Array.from(this.allowedDirs).some(dir =>
        resolved.startsWith(dir) || resolved.startsWith(dir + path.sep)
      );

      if (!isAllowed && operation !== 'read') {
        return {
          allowed: false,
          reason: `Restricted mode: path not in allowed directories`,
        };
      }

      return { allowed: true };
    }

    // Disabled mode allows everything
    return { allowed: true };
  }

  /**
   * Log a file operation
   */
  private logOperation(
    operation: FileOperation['operation'],
    filepath: string,
    allowed: boolean,
    reason?: string,
    content?: string
  ): void {
    this.operations.push({
      timestamp: new Date(),
      operation,
      path: filepath,
      allowed,
      reason,
      content,
    });
  }

  /**
   * Read file (respects isolation mode)
   */
  async readFile(filepath: string): Promise<string> {
    const check = this.isPathAllowed(filepath, 'read');

    if (this.mode === 'virtual') {
      // Check virtual filesystem first
      if (this.virtualFS.has(filepath)) {
        const vfile = this.virtualFS.get(filepath)!;
        this.logOperation('read', filepath, true, 'Virtual FS');
        return vfile.content;
      }
      // Fall through to real filesystem
    }

    if (!check.allowed) {
      this.logOperation('read', filepath, false, check.reason);
      throw new Error(`File read blocked: ${check.reason}`);
    }

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      this.logOperation('read', filepath, true);
      return content;
    } catch (error: any) {
      this.logOperation('read', filepath, false, `FS Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Write file (respects isolation mode)
   */
  async writeFile(filepath: string, content: string): Promise<void> {
    const check = this.isPathAllowed(filepath, 'write');

    if (!check.allowed) {
      this.logOperation('write', filepath, false, check.reason, content);
      throw new Error(`File write blocked: ${check.reason}`);
    }

    if (this.mode === 'virtual') {
      // Store in virtual filesystem
      this.virtualFS.set(filepath, {
        path: filepath,
        content,
        created: new Date(),
        modified: new Date(),
      });
      this.logOperation('write', filepath, true, 'Virtual FS', content);
      return;
    }

    try {
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, content, 'utf-8');
      this.logOperation('write', filepath, true, 'Real FS', content);
    } catch (error: any) {
      this.logOperation('write', filepath, false, `FS Error: ${error.message}`, content);
      throw error;
    }
  }

  /**
   * Delete file (respects isolation mode)
   */
  async deleteFile(filepath: string): Promise<void> {
    const check = this.isPathAllowed(filepath, 'delete');

    if (!check.allowed) {
      this.logOperation('delete', filepath, false, check.reason);
      throw new Error(`File delete blocked: ${check.reason}`);
    }

    if (this.mode === 'virtual') {
      // Remove from virtual filesystem
      this.virtualFS.delete(filepath);
      this.logOperation('delete', filepath, true, 'Virtual FS');
      return;
    }

    try {
      await fs.unlink(filepath);
      this.logOperation('delete', filepath, true, 'Real FS');
    } catch (error: any) {
      this.logOperation('delete', filepath, false, `FS Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get operations log
   */
  getOperations(): FileOperation[] {
    return [...this.operations];
  }

  /**
   * Get operations summary
   */
  getSummary(): {
    totalOperations: number;
    reads: number;
    writes: number;
    deletes: number;
    blocked: number;
    virtualFiles: number;
  } {
    return {
      totalOperations: this.operations.length,
      reads: this.operations.filter(op => op.operation === 'read').length,
      writes: this.operations.filter(op => op.operation === 'write').length,
      deletes: this.operations.filter(op => op.operation === 'delete').length,
      blocked: this.operations.filter(op => !op.allowed).length,
      virtualFiles: this.virtualFS.size,
    };
  }

  /**
   * Generate detailed operations log (Markdown format)
   */
  generateOperationsLog(): string {
    const summary = this.getSummary();
    let log = `# File Operations Log\n\n`;
    log += `**Mode:** ${this.mode}\n`;
    log += `**Total Operations:** ${summary.totalOperations}\n`;
    log += `- Reads: ${summary.reads}\n`;
    log += `- Writes: ${summary.writes}\n`;
    log += `- Deletes: ${summary.deletes}\n`;
    log += `- Blocked: ${summary.blocked}\n`;
    log += `- Virtual Files in Memory: ${summary.virtualFiles}\n\n`;

    if (this.operations.length === 0) {
      log += `No operations recorded.\n`;
      return log;
    }

    log += `## Operations Timeline\n\n`;
    log += `| Time | Operation | Path | Status | Reason |\n`;
    log += `|------|-----------|------|--------|--------|\n`;

    for (const op of this.operations) {
      const time = op.timestamp.toISOString().split('T')[1];
      const status = op.allowed ? '✅ Allowed' : '🚫 Blocked';
      const reason = op.reason || '-';
      log += `| ${time} | ${op.operation} | ${op.path} | ${status} | ${reason} |\n`;
    }

    // List virtual files
    if (this.virtualFS.size > 0) {
      log += `\n## Virtual Files in Memory\n\n`;
      for (const [path, file] of this.virtualFS) {
        const lines = file.content.split('\n').length;
        log += `- \`${path}\` (${lines} lines, ${file.content.length} bytes)\n`;
      }
    }

    // List blocked operations
    const blocked = this.operations.filter(op => !op.allowed);
    if (blocked.length > 0) {
      log += `\n## Blocked Operations\n\n`;
      for (const op of blocked) {
        log += `- **${op.operation}** \`${op.path}\`: ${op.reason}\n`;
      }
    }

    return log;
  }

  /**
   * Get virtual file content
   */
  getVirtualFile(filepath: string): VirtualFile | undefined {
    return this.virtualFS.get(filepath);
  }

  /**
   * Export all virtual files as JSON
   */
  exportVirtualFiles(): Record<string, string> {
    const exported: Record<string, string> = {};
    for (const [path, file] of this.virtualFS) {
      exported[path] = file.content;
    }
    return exported;
  }

  /**
   * Save virtual files to disk (after testing)
   */
  async saveVirtualFiles(outputDir: string): Promise<void> {
    for (const [filepath, file] of this.virtualFS) {
      const outputPath = path.join(outputDir, path.relative(process.cwd(), filepath));
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, file.content, 'utf-8');
    }
  }

  /**
   * Clear all virtual files and operations (for next test)
   */
  reset(): void {
    this.virtualFS.clear();
    this.operations = [];
  }
}

/**
 * Create isolated filesystem for testing
 */
export function createFileIsolation(
  mode: IsolationMode = 'virtual',
  allowedDirs?: string[]
): FileIsolationManager {
  return new FileIsolationManager(mode, allowedDirs);
}
