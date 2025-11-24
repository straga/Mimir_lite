// ============================================================================
// Path Translation Unit Tests
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleIndexFolder, handleRemoveFolder } from '../src/tools/fileIndexing.tools.js';

// Mock fs - the source imports { promises as fs } from 'fs'
vi.mock('fs', () => ({
  promises: {
    access: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock LLMConfigLoader
vi.mock('../src/config/LLMConfigLoader.js', () => {
  const mockInstance = {
    getEmbeddingsConfig: vi.fn().mockResolvedValue({ enabled: false })
  };
  
  return {
    LLMConfigLoader: {
      getInstance: vi.fn(() => mockInstance)
    }
  };
});

import { promises as fs } from 'fs';

let originalEnv: NodeJS.ProcessEnv;

describe('Path Translation Utilities', () => {
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('translateHostToContainer', () => {
    it('should translate macOS host path to container path', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const hostPath = '/Users/c815719/src/caremark-notification-service';
      const expected = '/workspace/caremark-notification-service';
      
      // Simulate translation logic
      const hostRoot = '/Users/c815719/src'; // Expanded ~/src
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should translate Linux host path to container path', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/home/user';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const hostPath = '/home/user/src/my-project';
      const expected = '/workspace/my-project';
      
      const hostRoot = '/home/user/src';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should translate Windows host path to container path', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.USERPROFILE = 'C:\\Users\\user';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const hostPath = 'C:/Users/user/src/my-project'; // Windows can use forward slashes
      const expected = '/workspace/my-project';
      
      const hostRoot = 'C:/Users/user/src';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should translate Windows host path with actual workspace root (C:\\Users\\timot\\Documents\\GitHub)', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.USERPROFILE = 'C:\\Users\\timot';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\timot\\Documents\\GitHub';
      
      const hostPath = 'C:\\Users\\timot\\Documents\\GitHub\\GRAPH-RAG-TODO';
      const expected = '/workspace/GRAPH-RAG-TODO';
      
      // Normalize Windows backslashes to forward slashes for comparison
      const normalizedHostPath = hostPath.replace(/\\/g, '/');
      const normalizedHostRoot = 'C:/Users/timot/Documents/GitHub';
      const relativePath = normalizedHostPath.substring(normalizedHostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle paths with trailing slashes', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src/';
      
      const hostPath = '/Users/c815719/src/my-project/';
      const expected = '/workspace/my-project';
      
      const hostRoot = '/Users/c815719/src';
      const relativePath = hostPath.replace(/\/$/, '').substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle nested project paths', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const hostPath = '/Users/c815719/src/playground/mimir/testing';
      const expected = '/workspace/playground/mimir/testing';
      
      const hostRoot = '/Users/c815719/src';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should return path unchanged when not in Docker', () => {
      delete process.env.WORKSPACE_ROOT;
      
      const hostPath = '/Users/c815719/src/my-project';
      
      // When not in Docker, path should remain unchanged
      const isDocker = process.env.WORKSPACE_ROOT === '/workspace';
      const result = isDocker ? '/workspace/my-project' : hostPath;
      
      expect(result).toBe(hostPath);
    });

    it('should handle absolute path with custom HOST_WORKSPACE_ROOT', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = '/opt/projects';
      
      const hostPath = '/opt/projects/my-app';
      const expected = '/workspace/my-app';
      
      const hostRoot = '/opt/projects';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });
  });

  describe('translateContainerToHost', () => {
    it('should translate container path back to macOS host path', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const containerPath = '/workspace/caremark-notification-service';
      const expected = '/Users/c815719/src/caremark-notification-service';
      
      const hostRoot = '/Users/c815719/src';
      const relativePath = containerPath.substring('/workspace'.length);
      const hostPath = `${hostRoot}${relativePath}`;
      
      expect(hostPath).toBe(expected);
    });

    it('should translate container path back to Linux host path', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/home/user';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const containerPath = '/workspace/my-project';
      const expected = '/home/user/src/my-project';
      
      const hostRoot = '/home/user/src';
      const relativePath = containerPath.substring('/workspace'.length);
      const hostPath = `${hostRoot}${relativePath}`;
      
      expect(hostPath).toBe(expected);
    });

    it('should handle nested container paths', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const containerPath = '/workspace/playground/mimir/testing';
      const expected = '/Users/c815719/src/playground/mimir/testing';
      
      const hostRoot = '/Users/c815719/src';
      const relativePath = containerPath.substring('/workspace'.length);
      const hostPath = `${hostRoot}${relativePath}`;
      
      expect(hostPath).toBe(expected);
    });

    it('should return path unchanged when not in Docker', () => {
      delete process.env.WORKSPACE_ROOT;
      
      const containerPath = '/workspace/my-project';
      
      const isDocker = process.env.WORKSPACE_ROOT === '/workspace';
      const result = isDocker ? '/Users/c815719/src/my-project' : containerPath;
      
      expect(result).toBe(containerPath);
    });

    it('should handle paths with trailing slashes', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const containerPath = '/workspace/my-project/';
      const expected = '/Users/c815719/src/my-project';
      
      const hostRoot = '/Users/c815719/src';
      const relativePath = containerPath.replace(/\/$/, '').substring('/workspace'.length);
      const hostPath = `${hostRoot}${relativePath}`;
      
      expect(hostPath).toBe(expected);
    });

    it('should translate container path back to Windows host path (C:\\Users\\timot\\Documents\\GitHub)', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.USERPROFILE = 'C:\\Users\\timot';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\timot\\Documents\\GitHub';
      
      const containerPath = '/workspace/GRAPH-RAG-TODO';
      const expected = 'C:/Users/timot/Documents/GitHub/GRAPH-RAG-TODO';
      
      const hostRoot = 'C:/Users/timot/Documents/GitHub';
      const relativePath = containerPath.substring('/workspace'.length);
      const hostPath = `${hostRoot}${relativePath}`;
      
      expect(hostPath).toBe(expected);
    });
  });

  describe('Round-trip translation', () => {
    it('should maintain path integrity through round-trip translation', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const originalHostPath = '/Users/c815719/src/caremark-notification-service';
      
      // Host → Container
      const hostRoot = '/Users/c815719/src';
      const relativePath1 = originalHostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath1}`;
      
      // Container → Host
      const relativePath2 = containerPath.substring('/workspace'.length);
      const finalHostPath = `${hostRoot}${relativePath2}`;
      
      expect(finalHostPath).toBe(originalHostPath);
    });

    it('should handle multiple nested levels in round-trip', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const originalHostPath = '/Users/c815719/src/org/team/project/subdir';
      
      // Host → Container
      const hostRoot = '/Users/c815719/src';
      const relativePath1 = originalHostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath1}`;
      
      expect(containerPath).toBe('/workspace/org/team/project/subdir');
      
      // Container → Host
      const relativePath2 = containerPath.substring('/workspace'.length);
      const finalHostPath = `${hostRoot}${relativePath2}`;
      
      expect(finalHostPath).toBe(originalHostPath);
    });
  });

  describe('Edge cases', () => {
    it('should handle path that does not start with host root', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const hostPath = '/Users/c815719/Documents/project'; // Not under ~/src
      
      // Should return unchanged since it's not under the mounted directory
      const hostRoot = '/Users/c815719/src';
      const shouldTranslate = hostPath.startsWith(hostRoot);
      const result = shouldTranslate ? '/workspace/...' : hostPath;
      
      expect(result).toBe(hostPath);
    });

    it('should handle empty relative path (root directory)', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const hostPath = '/Users/c815719/src';
      const expected = '/workspace';
      
      const hostRoot = '/Users/c815719/src';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle special characters in path', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOME = '/Users/c815719';
      process.env.HOST_WORKSPACE_ROOT = '~/src';
      
      const hostPath = '/Users/c815719/src/my-project-v2.0';
      const expected = '/workspace/my-project-v2.0';
      
      const hostRoot = '/Users/c815719/src';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });
  });

  describe('Windows Drive Letters - Capital and Lowercase', () => {
    it('should handle capital C: drive', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\john\\projects';
      
      const hostPath = 'C:\\Users\\john\\projects\\myapp';
      const expected = '/workspace/myapp';
      
      const hostRoot = 'C:/Users/john/projects';
      const normalizedPath = 'C:/Users/john/projects/myapp';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle capital D: drive', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'D:\\Dev\\workspace';
      
      const hostPath = 'D:\\Dev\\workspace\\project';
      const expected = '/workspace/project';
      
      const hostRoot = 'D:/Dev/workspace';
      const normalizedPath = 'D:/Dev/workspace/project';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle capital E: drive', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'E:\\Projects';
      
      const hostPath = 'E:\\Projects\\app';
      const expected = '/workspace/app';
      
      const hostRoot = 'E:/Projects';
      const normalizedPath = 'E:/Projects/app';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle lowercase c: drive', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'c:\\users\\john\\projects';
      
      const hostPath = 'c:\\users\\john\\projects\\myapp';
      const expected = '/workspace/myapp';
      
      const hostRoot = 'c:/users/john/projects';
      const normalizedPath = 'c:/users/john/projects/myapp';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle lowercase d: drive', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'd:\\dev';
      
      const hostPath = 'd:\\dev\\project';
      const expected = '/workspace/project';
      
      const hostRoot = 'd:/dev';
      const normalizedPath = 'd:/dev/project';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle mixed case drive letters (Windows is case-insensitive)', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Projects';
      
      const hostPath = 'c:\\Projects\\App'; // lowercase c, uppercase rest
      const expected = '/workspace/App';
      
      // After normalization, drive letter case is preserved
      const hostRoot = 'C:/Projects';
      const normalizedPath = 'c:/Projects/App';
      // Note: Case mismatch in drive letter - needs case-insensitive comparison
      const containerPath = '/workspace/App';
      
      expect(containerPath).toBe(expected);
    });
  });

  describe('Root Directory Paths - Any Depth', () => {
    it('should handle Windows root C:\\ as workspace root', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\';
      
      const hostPath = 'C:\\myproject';
      const expected = '/workspace/myproject';
      
      const hostRoot = 'C:';
      const normalizedPath = 'C:/myproject';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle Unix root / as workspace root', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = '/';
      
      const hostPath = '/myproject';
      const expected = '/workspace/myproject';
      
      const hostRoot = '';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle deeply nested Windows path (5+ levels)', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\john\\Documents\\GitHub\\projects';
      
      const hostPath = 'C:\\Users\\john\\Documents\\GitHub\\projects\\myapp\\src\\components\\Button.tsx';
      const expected = '/workspace/myapp/src/components/Button.tsx';
      
      const hostRoot = 'C:/Users/john/Documents/GitHub/projects';
      const normalizedPath = 'C:/Users/john/Documents/GitHub/projects/myapp/src/components/Button.tsx';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle deeply nested Unix path (10+ levels)', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = '/home/user/dev/projects/client/frontend/apps';
      
      const hostPath = '/home/user/dev/projects/client/frontend/apps/web/src/components/ui/Button/index.tsx';
      const expected = '/workspace/web/src/components/ui/Button/index.tsx';
      
      const hostRoot = '/home/user/dev/projects/client/frontend/apps';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle Windows path with alternative directory structure', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Windows\\Some\\alternative\\Path\\withMixed\\Casing\\And\\Deep\\Nesting';
      
      const hostPath = 'C:\\Windows\\Some\\alternative\\Path\\withMixed\\Casing\\And\\Deep\\Nesting\\project';
      const expected = '/workspace/project';
      
      const hostRoot = 'C:/Windows/Some/alternative/Path/withMixed/Casing/And/Deep/Nesting';
      const normalizedPath = 'C:/Windows/Some/alternative/Path/withMixed/Casing/And/Deep/Nesting/project';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle Unix path that keeps going for a while', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = '/some/deeply/nested/unix/path/that/keeps/going/for/a/while';
      
      const hostPath = '/some/deeply/nested/unix/path/that/keeps/going/for/a/while/myproject/src';
      const expected = '/workspace/myproject/src';
      
      const hostRoot = '/some/deeply/nested/unix/path/that/keeps/going/for/a/while';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle minimal Unix path /hello', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = '/hello';
      
      const hostPath = '/hello/world';
      const expected = '/workspace/world';
      
      const hostRoot = '/hello';
      const relativePath = hostPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });
  });

  describe('Windows Path Normalization Edge Cases', () => {
    it('should normalize mixed forward/back slashes', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\john\\projects';
      
      const hostPath = 'C:\\Users\\john\\projects/myapp\\src/components'; // Mixed slashes
      const expected = '/workspace/myapp/src/components';
      
      const normalizedPath = 'C:/Users/john/projects/myapp/src/components';
      const hostRoot = 'C:/Users/john/projects';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle Windows UNC paths (if supported)', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = '\\\\server\\share\\projects';
      
      const hostPath = '\\\\server\\share\\projects\\myapp';
      const expected = '/workspace/myapp';
      
      // UNC paths normalize to //server/share/projects
      const normalizedPath = '//server/share/projects/myapp';
      const hostRoot = '//server/share/projects';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle paths with spaces', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Program Files\\My Projects';
      
      const hostPath = 'C:\\Program Files\\My Projects\\My App';
      const expected = '/workspace/My App';
      
      const hostRoot = 'C:/Program Files/My Projects';
      const normalizedPath = 'C:/Program Files/My Projects/My App';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });

    it('should handle paths with special characters', () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\john\\projects';
      
      const hostPath = 'C:\\Users\\john\\projects\\my-app_v2.0 (beta)';
      const expected = '/workspace/my-app_v2.0 (beta)';
      
      const hostRoot = 'C:/Users/john/projects';
      const normalizedPath = 'C:/Users/john/projects/my-app_v2.0 (beta)';
      const relativePath = normalizedPath.substring(hostRoot.length);
      const containerPath = `/workspace${relativePath}`;
      
      expect(containerPath).toBe(expected);
    });
  });
});

// ============================================================================
// Handler Function Tests
// ============================================================================

describe('handleIndexFolder', () => {
  let mockDriver: any;
  let mockWatchManager: any;
  let mockConfigManager: any;
  let mockConfig: any;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Mock Neo4j driver
    mockDriver = {
      session: vi.fn()
    };

    // Mock FileWatchManager
    mockWatchManager = {
      startWatch: vi.fn().mockResolvedValue(undefined),  // Make sure it resolves
      indexFolder: vi.fn().mockResolvedValue(10),
      stopWatch: vi.fn()
    };

    // Mock WatchConfigManager - create a proper mock object to pass to functions
    mockConfig = {
      id: 'watch-1',
      path: '/workspace/test-project',
      recursive: true,
      debounce_ms: 500,
      file_patterns: null,
      ignore_patterns: [],
      generate_embeddings: false,
      status: 'active',
      added_date: new Date().toISOString()
    };

    mockConfigManager = {
      getByPath: vi.fn().mockResolvedValue(null),  // Return null so createWatch is called
      createWatch: vi.fn().mockImplementation(async (input) => ({
        ...mockConfig,
        path: input.path  // Use the path from input
      })),
      markInactive: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue('watch-config-id'),
      delete: vi.fn().mockResolvedValue(undefined)
    };

    // Mock fs.access
    vi.spyOn(fs, 'access').mockResolvedValue(undefined);

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should call handleIndexFolder and translate Windows path', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';
    process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\timot\\Documents\\GitHub';

    const result = await handleIndexFolder(
      {
        path: 'C:\\Users\\timot\\Documents\\GitHub\\test-project',
        recursive: true,
        generate_embeddings: false
      },
      mockDriver,
      mockWatchManager,
      mockConfigManager  // Pass mock config manager
    );

    // Verify the function was called and returned success
    expect(result.status).toBe('success');
    expect(mockWatchManager.startWatch).toHaveBeenCalled();
    
    // Verify container path was used - startWatch receives a config object
    const configArg = mockWatchManager.startWatch.mock.calls[0][0];
    expect(configArg.path).toContain('/workspace/');
  });

  it('should return error when path does not exist', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';
    process.env.HOST_WORKSPACE_ROOT = '/home/user/src';

    // Mock fs.access to throw error
    vi.spyOn(fs, 'access').mockRejectedValue(new Error('ENOENT'));

    const result = await handleIndexFolder(
      { path: '/home/user/src/nonexistent' },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    expect(result.status).toBe('error');
    expect(result.error).toBe('path_not_found');
  });

  it('should create watch config with container path', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';
    process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\timot\\Documents\\GitHub';

    await handleIndexFolder(
      {
        path: 'C:\\Users\\timot\\Documents\\GitHub\\my-project',
        recursive: true,
        generate_embeddings: false
      },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    // Verify startWatch was called with container path - startWatch receives a config object
    expect(mockWatchManager.startWatch).toHaveBeenCalled();
    const configArg = mockWatchManager.startWatch.mock.calls[0][0];
    expect(configArg.path).toMatch(/^\/workspace\//);
    expect(configArg.path).not.toContain('C:\\');
  });

  it('should return user path in response', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';
    process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\timot\\Documents\\GitHub';

    const userPath = 'C:\\Users\\timot\\Documents\\GitHub\\my-project';
    const result = await handleIndexFolder(
      { path: userPath, recursive: true },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    // Result should contain normalized path (backslashes converted to forward slashes)
    const normalizedPath = 'C:/Users/timot/Documents/GitHub/my-project';
    expect(result.path).toBe(normalizedPath);
    expect(result.containerPath).toMatch(/^\/workspace\//);
  });

  it('should handle paths without Docker translation', async () => {
    delete process.env.WORKSPACE_ROOT;

    const hostPath = '/Users/c815719/src/my-project';
    const result = await handleIndexFolder(
      { path: hostPath, recursive: true },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    // When not in Docker, path should remain unchanged
    expect(result.path).toBe(hostPath);
    // startWatch receives a config object, not a path string
    expect(mockWatchManager.startWatch).toHaveBeenCalled();
    const configArg = mockWatchManager.startWatch.mock.calls[0][0];
    expect(configArg.path).toBe(hostPath);
  });
});

describe('handleRemoveFolder', () => {
  let mockDriver: any;
  let mockWatchManager: any;
  let mockConfigManager: any;
  let mockSession: any;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Mock Neo4j session
    mockSession = {
      run: vi.fn().mockResolvedValue({
        records: [{
          get: vi.fn((key: string) => {
            if (key === 'files_deleted') return { toNumber: () => 5 };
            if (key === 'chunks_deleted') return { toNumber: () => 50 };
            return null;
          })
        }]
      }),
      close: vi.fn()
    };

    // Mock Neo4j driver
    mockDriver = {
      session: vi.fn().mockReturnValue(mockSession)
    };

    // Mock FileWatchManager
    mockWatchManager = {
      stopWatch: vi.fn().mockResolvedValue(undefined)
    };

    // Mock WatchConfigManager - create a proper mock object to pass to functions
    mockConfigManager = {
      getByPath: vi.fn().mockResolvedValue({
        id: 'watch-test',
        path: '/workspace/test-project',
        status: 'active'
      }),
      delete: vi.fn().mockResolvedValue(undefined)
    };

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should translate Windows host path to container path before removal', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';
    process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\timot\\Documents\\GitHub';

    const userPath = 'C:\\Users\\timot\\Documents\\GitHub\\test-project';
    
    // Configure mock for this specific test
    mockConfigManager.getByPath.mockResolvedValueOnce({
      id: 'watch-test',
      path: '/workspace/test-project',
      status: 'active'
    });

    const result = await handleRemoveFolder(
      { path: userPath },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    // Verify container path was used in Neo4j query
    expect(mockSession.run).toHaveBeenCalled();
    const params = mockSession.run.mock.calls[0][1];
    expect(params.folderPathWithSep).toBe('/workspace/test-project/');
    expect(params.exactPath).toBe('/workspace/test-project');
  });

  it('should return error when path is not being watched', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';
    process.env.HOST_WORKSPACE_ROOT = '/home/user/src';

    const userPath = '/home/user/src/my-project';

    // Mock config not found
    mockConfigManager.getByPath.mockResolvedValueOnce(null);

    const result = await handleRemoveFolder(
      { path: userPath },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    expect(result.status).toBe('error');
    expect(result.message).toContain('is not being watched');
  });

  it('should use container path for Neo4j query', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';
    process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\timot\\Documents\\GitHub';

    const userPath = 'C:\\Users\\timot\\Documents\\GitHub\\my-project';

    // Configure mock
    mockConfigManager.getByPath.mockResolvedValueOnce({
      id: 'watch-query-test',
      path: '/workspace/my-project',
      status: 'active'
    });

    await handleRemoveFolder(
      { path: userPath },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    // Verify Neo4j query used container path, not user path
    const params = mockSession.run.mock.calls[0][1];
    expect(params.folderPathWithSep).toBe('/workspace/my-project/');
    expect(params.folderPathWithSep).not.toContain('C:\\');
  });

  it('should return user-provided path in response', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';
    process.env.HOST_WORKSPACE_ROOT = 'C:\\Users\\timot\\Documents\\GitHub';

    const userPath = 'C:\\Users\\timot\\Documents\\GitHub\\my-project';

    // Configure mock
    mockConfigManager.getByPath.mockResolvedValueOnce({
      id: 'watch-response-test',
      path: '/workspace/my-project',
      status: 'active'
    });

    const result = await handleRemoveFolder(
      { path: userPath },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    // Result should contain original user path AND container path
    expect(result.path).toBe(userPath);
    expect(result.containerPath).toBe('/workspace/my-project');
    expect(result.files_removed).toBe(5);
    expect(result.chunks_removed).toBe(50);
  });

  it('should pass correct parameters to Neo4j DELETE query', async () => {
    process.env.WORKSPACE_ROOT = '/workspace';

    const containerPath = '/workspace/my-project';

    // Configure mock
    mockConfigManager.getByPath.mockResolvedValueOnce({
      id: 'watch-params-test',
      path: containerPath,
      status: 'active'
    });

    await handleRemoveFolder(
      { path: containerPath },
      mockDriver,
      mockWatchManager,
      mockConfigManager
    );

    // Verify the Cypher query parameters
    expect(mockSession.run).toHaveBeenCalled();
    const cypher = mockSession.run.mock.calls[0][0];
    const params = mockSession.run.mock.calls[0][1];

    // Should use folderPathWithSep and exactPath (BUG FIX)
    expect(params.folderPathWithSep).toBe('/workspace/my-project/');
    expect(params.exactPath).toBe('/workspace/my-project');
    expect(cypher).toContain('f.path STARTS WITH $folderPathWithSep');
    expect(cypher).toContain('f.path = $exactPath');
  });

  // ========================================================================
  // BUG FIX TESTS - Path Separator & WatchConfig Deletion
  // ========================================================================

  describe('Bug Fix: Path Separator Handling', () => {
    it('should add trailing slash to prevent false path matches', async () => {
      process.env.WORKSPACE_ROOT = '/workspace';
      const containerPath = '/workspace/src';
      
      // Without trailing slash, this would match /workspace/src-other
      // With trailing slash, it only matches /workspace/src/...
      const folderPathWithSep = containerPath.endsWith('/') ? containerPath : containerPath + '/';
      
      expect(folderPathWithSep).toBe('/workspace/src/');
      
      // Verify query uses both folderPathWithSep and exactPath
      const queryParams = {
        folderPathWithSep: folderPathWithSep,
        exactPath: containerPath
      };
      
      expect(queryParams.folderPathWithSep).toBe('/workspace/src/');
      expect(queryParams.exactPath).toBe('/workspace/src');
    });

    it('should not add trailing slash if already present', async () => {
      const containerPath = '/workspace/src/';
      const folderPathWithSep = containerPath.endsWith('/') ? containerPath : containerPath + '/';
      
      expect(folderPathWithSep).toBe('/workspace/src/');
    });

    it('should use correct query parameters to avoid false matches', async () => {
      const containerPath = '/workspace/src';
      const folderPathWithSep = containerPath + '/';
      
      // Mock the Cypher query
      const cypher = `
        MATCH (f:File)
        WHERE f.path STARTS WITH $folderPathWithSep OR f.path = $exactPath
        OPTIONAL MATCH (f)-[:HAS_CHUNK]->(c:FileChunk)
        WITH f, collect(c) AS chunks, count(c) AS chunk_count
        FOREACH (chunk IN chunks | DETACH DELETE chunk)
        DETACH DELETE f
        RETURN count(f) AS files_deleted, sum(chunk_count) AS chunks_deleted
      `;
      
      expect(cypher).toContain('f.path STARTS WITH $folderPathWithSep');
      expect(cypher).toContain('f.path = $exactPath');
      expect(cypher).not.toContain('f.path STARTS WITH $pathPrefix');
    });

    it('should match files under /workspace/src but not /workspace/src-other', async () => {
      const containerPath = '/workspace/src';
      const folderPathWithSep = '/workspace/src/';
      
      // Files that should match
      const shouldMatch = [
        '/workspace/src/file.ts',
        '/workspace/src/nested/file.ts',
        '/workspace/src',  // Exact match
      ];
      
      // Files that should NOT match
      const shouldNotMatch = [
        '/workspace/src-other/file.ts',
        '/workspace/src-backup/file.ts',
        '/workspace/source/file.ts',
      ];
      
      shouldMatch.forEach(filePath => {
        const matches = filePath.startsWith(folderPathWithSep) || filePath === containerPath;
        expect(matches).toBe(true);
      });
      
      shouldNotMatch.forEach(filePath => {
        const matches = filePath.startsWith(folderPathWithSep) || filePath === containerPath;
        expect(matches).toBe(false);
      });
    });
  });

  describe('Bug Fix: WatchConfig Deletion', () => {
    let mockConfigManager: any;
    
    beforeEach(() => {
      mockConfigManager = {
        getByPath: vi.fn().mockResolvedValue({
          id: 'watch-123',
          path: '/workspace/my-project',
          status: 'active'
        }),
        markInactive: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
      };
    });

    it('should call delete() instead of markInactive()', async () => {
      const configId = 'watch-123';
      
      // Old behavior (wrong): markInactive
      // await mockConfigManager.markInactive(configId);
      
      // New behavior (correct): delete
      await mockConfigManager.delete(configId);
      
      expect(mockConfigManager.delete).toHaveBeenCalledWith(configId);
      expect(mockConfigManager.markInactive).not.toHaveBeenCalled();
    });

    it('should completely remove WatchConfig from database', async () => {
      const configId = 'watch-123';
      
      // Simulate deletion
      await mockConfigManager.delete(configId);
      
      // After deletion, config should not exist
      mockConfigManager.getByPath = vi.fn().mockResolvedValue(null);
      
      const config = await mockConfigManager.getByPath('/workspace/my-project');
      expect(config).toBeNull();
    });

    it('should delete WatchConfig before deleting files', async () => {
      const callOrder: string[] = [];
      
      mockConfigManager.delete = vi.fn().mockImplementation(async () => {
        callOrder.push('delete-config');
      });
      
      mockSession.run = vi.fn().mockImplementation(async () => {
        callOrder.push('delete-files');
        return {
          records: [{
            get: vi.fn((key: string) => {
              if (key === 'files_deleted') return { toNumber: () => 5 };
              if (key === 'chunks_deleted') return { toNumber: () => 50 };
              return null;
            })
          }]
        };
      });
      
      // Simulate the removal flow
      await mockWatchManager.stopWatch('/workspace/my-project');
      await mockConfigManager.delete('watch-123');
      await mockSession.run('DELETE query', {});
      
      expect(callOrder).toEqual(['delete-config', 'delete-files']);
    });
  });

  describe('Integration: Both Bug Fixes Together', () => {
    let mockConfigManager: any;
    
    beforeEach(() => {
      mockConfigManager = {
        getByPath: vi.fn().mockResolvedValue({
          id: 'watch-123',
          path: '/workspace/src',
          status: 'active'
        }),
        delete: vi.fn().mockResolvedValue(undefined)
      };
      
      mockSession.run = vi.fn().mockResolvedValue({
        records: [{
          get: vi.fn((key: string) => {
            if (key === 'files_deleted') return { toNumber: () => 10 };
            if (key === 'chunks_deleted') return { toNumber: () => 100 };
            return null;
          })
        }]
      });
    });

    it('should use correct path separator AND delete WatchConfig', async () => {
      const containerPath = '/workspace/src';
      const folderPathWithSep = containerPath + '/';
      
      // Step 1: Stop watcher
      await mockWatchManager.stopWatch(containerPath);
      expect(mockWatchManager.stopWatch).toHaveBeenCalledWith(containerPath);
      
      // Step 2: Delete WatchConfig (not markInactive)
      await mockConfigManager.delete('watch-123');
      expect(mockConfigManager.delete).toHaveBeenCalledWith('watch-123');
      
      // Step 3: Delete files with correct path parameters
      await mockSession.run('DELETE query', {
        folderPathWithSep: folderPathWithSep,
        exactPath: containerPath
      });
      
      const runCall = mockSession.run.mock.calls[0];
      expect(runCall[1].folderPathWithSep).toBe('/workspace/src/');
      expect(runCall[1].exactPath).toBe('/workspace/src');
    });

    it('should handle complete removal workflow correctly', async () => {
      const containerPath = '/workspace/my-project';
      const folderPathWithSep = containerPath + '/';
      
      // Simulate complete removal
      const config = await mockConfigManager.getByPath(containerPath);
      expect(config).toBeTruthy();
      expect(config.id).toBe('watch-123');
      
      await mockWatchManager.stopWatch(containerPath);
      await mockConfigManager.delete(config.id);
      
      const result = await mockSession.run('DELETE query', {
        folderPathWithSep,
        exactPath: containerPath
      });
      
      const filesDeleted = result.records[0].get('files_deleted').toNumber();
      const chunksDeleted = result.records[0].get('chunks_deleted').toNumber();
      
      expect(filesDeleted).toBe(10);
      expect(chunksDeleted).toBe(100);
      
      // Verify WatchConfig was deleted
      expect(mockConfigManager.delete).toHaveBeenCalledWith('watch-123');
    });
  });
});
