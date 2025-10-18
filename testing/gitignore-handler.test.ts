import { describe, it, expect, beforeEach } from 'vitest';
import { GitignoreHandler } from '../src/indexing/GitignoreHandler.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('GitignoreHandler', () => {
  let handler: GitignoreHandler;
  let testRoot: string;

  beforeEach(() => {
    handler = new GitignoreHandler();
    testRoot = path.join(__dirname, '..');
  });

  describe('Default ignore patterns', () => {
    it('should ignore node_modules by default', () => {
      const filePath = path.join(testRoot, 'node_modules/@babel/types/lib/builders/generated/lowercase.js');
      const shouldIgnore = handler.shouldIgnore(filePath, testRoot);
      
      expect(shouldIgnore).toBe(true);
    });

    it('should ignore .git directory by default', () => {
      const filePath = path.join(testRoot, '.git/config');
      const shouldIgnore = handler.shouldIgnore(filePath, testRoot);
      
      expect(shouldIgnore).toBe(true);
    });

    it('should ignore build directory by default', () => {
      const filePath = path.join(testRoot, 'build/index.js');
      const shouldIgnore = handler.shouldIgnore(filePath, testRoot);
      
      expect(shouldIgnore).toBe(true);
    });

    it('should NOT ignore source files', () => {
      const filePath = path.join(testRoot, 'src/index.ts');
      const shouldIgnore = handler.shouldIgnore(filePath, testRoot);
      
      expect(shouldIgnore).toBe(false);
    });

    it('should NOT ignore README files', () => {
      const filePath = path.join(testRoot, 'README.md');
      const shouldIgnore = handler.shouldIgnore(filePath, testRoot);
      
      expect(shouldIgnore).toBe(false);
    });
  });

  describe('Custom patterns', () => {
    it('should respect custom ignore patterns', () => {
      handler.addPatterns(['*.test.ts', 'temp/**']);
      
      const testFile = path.join(testRoot, 'src/example.test.ts');
      const tempFile = path.join(testRoot, 'temp/data.json');
      const regularFile = path.join(testRoot, 'src/index.ts');
      
      expect(handler.shouldIgnore(testFile, testRoot)).toBe(true);
      expect(handler.shouldIgnore(tempFile, testRoot)).toBe(true);
      expect(handler.shouldIgnore(regularFile, testRoot)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty relative paths', () => {
      const rootPath = testRoot;
      const shouldIgnore = handler.shouldIgnore(rootPath, testRoot);
      
      expect(shouldIgnore).toBe(false);
    });

    it('should handle paths with ./ prefix', () => {
      const filePath = path.join(testRoot, './src/index.ts');
      const shouldIgnore = handler.shouldIgnore(filePath, testRoot);
      
      expect(shouldIgnore).toBe(false);
    });

    it('should handle nested node_modules', () => {
      const filePath = path.join(testRoot, 'node_modules/package/node_modules/nested/index.js');
      const shouldIgnore = handler.shouldIgnore(filePath, testRoot);
      
      expect(shouldIgnore).toBe(true);
    });
  });

  describe('Real .gitignore file', () => {
    it('should load and respect actual .gitignore file', async () => {
      const gitignorePath = path.join(testRoot, '.gitignore');
      
      // Check if .gitignore exists
      try {
        await fs.access(gitignorePath);
      } catch (error) {
        console.log('No .gitignore file found, skipping test');
        return;
      }

      // Load the actual .gitignore
      await handler.loadIgnoreFile(testRoot);

      // Test common patterns from typical .gitignore
      const testCases = [
        { path: 'node_modules/test/file.js', shouldIgnore: true },
        { path: 'build/output.js', shouldIgnore: true },
        { path: 'dist/bundle.js', shouldIgnore: true },
        { path: '.env', shouldIgnore: true },
        { path: 'src/index.ts', shouldIgnore: false },
        { path: 'README.md', shouldIgnore: false }
      ];

      for (const testCase of testCases) {
        const fullPath = path.join(testRoot, testCase.path);
        const result = handler.shouldIgnore(fullPath, testRoot);
        
        expect(result).toBe(testCase.shouldIgnore);
      }
    });
  });

  describe('filterPaths', () => {
    it('should filter out ignored paths', () => {
      const paths = [
        path.join(testRoot, 'src/index.ts'),
        path.join(testRoot, 'node_modules/package/index.js'),
        path.join(testRoot, 'README.md'),
        path.join(testRoot, 'build/output.js'),
        path.join(testRoot, 'src/utils.ts')
      ];

      const filtered = handler.filterPaths(paths, testRoot);

      expect(filtered).toHaveLength(3);
      expect(filtered).toContain(path.join(testRoot, 'src/index.ts'));
      expect(filtered).toContain(path.join(testRoot, 'README.md'));
      expect(filtered).toContain(path.join(testRoot, 'src/utils.ts'));
      expect(filtered).not.toContain(path.join(testRoot, 'node_modules/package/index.js'));
      expect(filtered).not.toContain(path.join(testRoot, 'build/output.js'));
    });
  });
});
