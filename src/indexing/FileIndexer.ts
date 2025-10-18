// ============================================================================
// FileIndexer - Index files into Neo4j
// Phase 1: Basic file indexing with content
// Phase 2: Parse and extract functions/classes (future)
// ============================================================================

import { Driver } from 'neo4j-driver';
import { promises as fs } from 'fs';
import path from 'path';

export interface IndexResult {
  file_node_id: string;
  path: string;
  size_bytes: number;
}

export class FileIndexer {
  constructor(private driver: Driver) {}

  /**
   * Index a single file
   */
  async indexFile(filePath: string, rootPath: string): Promise<IndexResult> {
    const session = this.driver.session();
    
    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(rootPath, filePath);
      const extension = path.extname(filePath);
      const language = this.detectLanguage(filePath);
      
      // Create File node in Neo4j
      const result = await session.run(`
        MERGE (f:File {path: $path})
        SET 
          f.absolute_path = $absolute_path,
          f.name = $name,
          f.extension = $extension,
          f.content = $content,
          f.language = $language,
          f.size_bytes = $size_bytes,
          f.line_count = $line_count,
          f.last_modified = $last_modified,
          f.indexed_date = datetime()
        RETURN f.path AS path, f.size_bytes AS size_bytes, id(f) AS node_id
      `, {
        path: relativePath,
        absolute_path: filePath,
        name: path.basename(filePath),
        extension: extension,
        content: content,
        language: language,
        size_bytes: stats.size,
        line_count: content.split('\n').length,
        last_modified: stats.mtime.toISOString()
      });
      
      const record = result.records[0];
      
      return {
        file_node_id: `file-${record.get('node_id')}`,
        path: record.get('path'),
        size_bytes: record.get('size_bytes')
      };
      
    } catch (error: any) {
      // Skip binary files or files that can't be read as UTF-8
      if (error.code === 'ERR_INVALID_ARG_TYPE' || error.message?.includes('invalid')) {
        console.warn(`⚠️  Skipping binary file: ${filePath}`);
        throw new Error('Binary file');
      }
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sql': 'sql'
    };
    return languageMap[ext] || 'generic';
  }

  /**
   * Delete file node from Neo4j
   */
  async deleteFile(relativePath: string): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.run(`
        MATCH (f:File {path: $path})
        DETACH DELETE f
      `, { path: relativePath });
      
    } finally {
      await session.close();
    }
  }

  /**
   * Update file content (for file changes)
   */
  async updateFile(filePath: string, rootPath: string): Promise<void> {
    // Just re-index the file
    await this.indexFile(filePath, rootPath);
  }
}
