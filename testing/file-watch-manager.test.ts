import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileWatchManager } from '../src/indexing/FileWatchManager.js';
import { GitignoreHandler } from '../src/indexing/GitignoreHandler.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('FileWatchManager - walkDirectory', () => {
  let testRoot: string;
  let gitignoreHandler: GitignoreHandler;

  beforeEach(async () => {
    testRoot = path.join(__dirname, '..', 'test-temp-' + Date.now());
    await fs.mkdir(testRoot, { recursive: true });
    gitignoreHandler = new GitignoreHandler();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Gitignore respect in nested directories', () => {
    it('should ignore node_modules at any depth', async () => {
      // Create test structure:
      // test-root/
      //   src/
      //     index.ts
      //     utils.ts
      //   node_modules/
      //     package/
      //       index.js
      //   nested/
      //     node_modules/
      //       another/
      //         file.js
      //     valid.ts

      await fs.mkdir(path.join(testRoot, 'src'), { recursive: true });
      await fs.mkdir(path.join(testRoot, 'node_modules/package'), { recursive: true });
      await fs.mkdir(path.join(testRoot, 'nested/node_modules/another'), { recursive: true });
      
      await fs.writeFile(path.join(testRoot, 'src/index.ts'), 'export const foo = 1;');
      await fs.writeFile(path.join(testRoot, 'src/utils.ts'), 'export const bar = 2;');
      await fs.writeFile(path.join(testRoot, 'node_modules/package/index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(testRoot, 'nested/node_modules/another/file.js'), 'module.exports = {};');
      await fs.writeFile(path.join(testRoot, 'nested/valid.ts'), 'export const baz = 3;');

      // Load gitignore (it has default patterns including node_modules)
      await gitignoreHandler.loadIgnoreFile(testRoot);

      // Use reflection to access private walkDirectory method
      const manager = new FileWatchManager(null as any);
      const walkDirectory = (manager as any).walkDirectory.bind(manager);

      const files = await walkDirectory(
        testRoot,
        gitignoreHandler,
        ['*.ts', '*.js'],
        true
      );

      // Verify results
      expect(files).toHaveLength(3);
      expect(files).toContain(path.join(testRoot, 'src/index.ts'));
      expect(files).toContain(path.join(testRoot, 'src/utils.ts'));
      expect(files).toContain(path.join(testRoot, 'nested/valid.ts'));
      
      // Ensure node_modules files are NOT included
      expect(files).not.toContain(path.join(testRoot, 'node_modules/package/index.js'));
      expect(files).not.toContain(path.join(testRoot, 'nested/node_modules/another/file.js'));
    });

    it('should ignore build directory at any depth', async () => {
      // Create test structure:
      // test-root/
      //   src/
      //     component.ts
      //   build/
      //     output.js
      //   nested/
      //     build/
      //       compiled.js
      //     source.ts

      await fs.mkdir(path.join(testRoot, 'src'), { recursive: true });
      await fs.mkdir(path.join(testRoot, 'build'), { recursive: true });
      await fs.mkdir(path.join(testRoot, 'nested/build'), { recursive: true });
      
      await fs.writeFile(path.join(testRoot, 'src/component.ts'), 'export class Component {}');
      await fs.writeFile(path.join(testRoot, 'build/output.js'), 'var x = 1;');
      await fs.writeFile(path.join(testRoot, 'nested/build/compiled.js'), 'var y = 2;');
      await fs.writeFile(path.join(testRoot, 'nested/source.ts'), 'export const z = 3;');

      await gitignoreHandler.loadIgnoreFile(testRoot);

      const manager = new FileWatchManager(null as any);
      const walkDirectory = (manager as any).walkDirectory.bind(manager);

      const files = await walkDirectory(
        testRoot,
        gitignoreHandler,
        ['*.ts', '*.js'],
        true
      );

      expect(files).toHaveLength(2);
      expect(files).toContain(path.join(testRoot, 'src/component.ts'));
      expect(files).toContain(path.join(testRoot, 'nested/source.ts'));
      expect(files).not.toContain(path.join(testRoot, 'build/output.js'));
      expect(files).not.toContain(path.join(testRoot, 'nested/build/compiled.js'));
    });

    it('should respect custom .gitignore patterns in nested directories', async () => {
      // Create test structure with custom patterns
      // test-root/
      //   src/
      //     index.ts
      //     temp.ts
      //   nested/
      //     deep/
      //       temp.ts
      //       valid.ts

      await fs.mkdir(path.join(testRoot, 'src'), { recursive: true });
      await fs.mkdir(path.join(testRoot, 'nested/deep'), { recursive: true });
      
      await fs.writeFile(path.join(testRoot, 'src/index.ts'), 'export const a = 1;');
      await fs.writeFile(path.join(testRoot, 'src/temp.ts'), 'export const temp = 1;');
      await fs.writeFile(path.join(testRoot, 'nested/deep/temp.ts'), 'export const temp = 2;');
      await fs.writeFile(path.join(testRoot, 'nested/deep/valid.ts'), 'export const b = 2;');

      // Create a .gitignore with custom pattern
      await fs.writeFile(path.join(testRoot, '.gitignore'), 'temp.ts\n');
      await gitignoreHandler.loadIgnoreFile(testRoot);

      const manager = new FileWatchManager(null as any);
      const walkDirectory = (manager as any).walkDirectory.bind(manager);

      const files = await walkDirectory(
        testRoot,
        gitignoreHandler,
        ['*.ts'],
        true
      );

      expect(files).toHaveLength(2);
      expect(files).toContain(path.join(testRoot, 'src/index.ts'));
      expect(files).toContain(path.join(testRoot, 'nested/deep/valid.ts'));
      expect(files).not.toContain(path.join(testRoot, 'src/temp.ts'));
      expect(files).not.toContain(path.join(testRoot, 'nested/deep/temp.ts'));
    });

    it('should handle deeply nested structures correctly', async () => {
      // Create deeply nested structure
      // test-root/
      //   level1/
      //     level2/
      //       level3/
      //         node_modules/
      //           package/
      //             deep.js
      //         valid.ts

      const deepPath = path.join(testRoot, 'level1/level2/level3');
      await fs.mkdir(path.join(deepPath, 'node_modules/package'), { recursive: true });
      
      await fs.writeFile(path.join(deepPath, 'node_modules/package/deep.js'), 'module.exports = {};');
      await fs.writeFile(path.join(deepPath, 'valid.ts'), 'export const deep = true;');
      await fs.writeFile(path.join(testRoot, 'level1/level2/mid.ts'), 'export const mid = true;');

      await gitignoreHandler.loadIgnoreFile(testRoot);

      const manager = new FileWatchManager(null as any);
      const walkDirectory = (manager as any).walkDirectory.bind(manager);

      const files = await walkDirectory(
        testRoot,
        gitignoreHandler,
        ['*.ts', '*.js'],
        true
      );

      expect(files).toHaveLength(2);
      expect(files).toContain(path.join(deepPath, 'valid.ts'));
      expect(files).toContain(path.join(testRoot, 'level1/level2/mid.ts'));
      expect(files).not.toContain(path.join(deepPath, 'node_modules/package/deep.js'));
    });
  });

  describe('File pattern matching', () => {
    it('should only include files matching patterns', async () => {
      await fs.mkdir(path.join(testRoot, 'src'), { recursive: true });
      
      await fs.writeFile(path.join(testRoot, 'src/index.ts'), 'ts file');
      await fs.writeFile(path.join(testRoot, 'src/data.json'), 'json file');
      await fs.writeFile(path.join(testRoot, 'src/README.md'), 'md file');
      await fs.writeFile(path.join(testRoot, 'src/script.js'), 'js file');

      await gitignoreHandler.loadIgnoreFile(testRoot);

      const manager = new FileWatchManager(null as any);
      const walkDirectory = (manager as any).walkDirectory.bind(manager);

      const files = await walkDirectory(
        testRoot,
        gitignoreHandler,
        ['*.ts', '*.js'], // Only TypeScript and JavaScript
        true
      );

      expect(files).toHaveLength(2);
      expect(files).toContain(path.join(testRoot, 'src/index.ts'));
      expect(files).toContain(path.join(testRoot, 'src/script.js'));
      expect(files).not.toContain(path.join(testRoot, 'src/data.json'));
      expect(files).not.toContain(path.join(testRoot, 'src/README.md'));
    });

    it('should include all files when patterns is null', async () => {
      await fs.mkdir(path.join(testRoot, 'src'), { recursive: true });
      
      await fs.writeFile(path.join(testRoot, 'src/index.ts'), 'ts file');
      await fs.writeFile(path.join(testRoot, 'src/data.json'), 'json file');
      await fs.writeFile(path.join(testRoot, 'src/README.md'), 'md file');

      await gitignoreHandler.loadIgnoreFile(testRoot);

      const manager = new FileWatchManager(null as any);
      const walkDirectory = (manager as any).walkDirectory.bind(manager);

      const files = await walkDirectory(
        testRoot,
        gitignoreHandler,
        null, // No pattern filter
        true
      );

      expect(files.length).toBeGreaterThanOrEqual(3);
      expect(files).toContain(path.join(testRoot, 'src/index.ts'));
      expect(files).toContain(path.join(testRoot, 'src/data.json'));
      expect(files).toContain(path.join(testRoot, 'src/README.md'));
    });
  });

  describe('Recursive option', () => {
    it('should not traverse subdirectories when recursive is false', async () => {
      await fs.mkdir(path.join(testRoot, 'src'), { recursive: true });
      
      await fs.writeFile(path.join(testRoot, 'root.ts'), 'root file');
      await fs.writeFile(path.join(testRoot, 'src/nested.ts'), 'nested file');

      await gitignoreHandler.loadIgnoreFile(testRoot);

      const manager = new FileWatchManager(null as any);
      const walkDirectory = (manager as any).walkDirectory.bind(manager);

      const files = await walkDirectory(
        testRoot,
        gitignoreHandler,
        ['*.ts'],
        false // Not recursive
      );

      expect(files).toHaveLength(1);
      expect(files).toContain(path.join(testRoot, 'root.ts'));
      expect(files).not.toContain(path.join(testRoot, 'src/nested.ts'));
    });

    it('should traverse all subdirectories when recursive is true', async () => {
      await fs.mkdir(path.join(testRoot, 'src/utils'), { recursive: true });
      
      await fs.writeFile(path.join(testRoot, 'root.ts'), 'root');
      await fs.writeFile(path.join(testRoot, 'src/index.ts'), 'src');
      await fs.writeFile(path.join(testRoot, 'src/utils/helper.ts'), 'utils');

      await gitignoreHandler.loadIgnoreFile(testRoot);

      const manager = new FileWatchManager(null as any);
      const walkDirectory = (manager as any).walkDirectory.bind(manager);

      const files = await walkDirectory(
        testRoot,
        gitignoreHandler,
        ['*.ts'],
        true // Recursive
      );

      expect(files).toHaveLength(3);
      expect(files).toContain(path.join(testRoot, 'root.ts'));
      expect(files).toContain(path.join(testRoot, 'src/index.ts'));
      expect(files).toContain(path.join(testRoot, 'src/utils/helper.ts'));
    });
  });
});
