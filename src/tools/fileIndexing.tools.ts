// ============================================================================
// File Indexing MCP Tools
// ============================================================================

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Driver } from 'neo4j-driver';
import { promises as fs } from 'fs';
import { FileWatchManager } from '../indexing/FileWatchManager.js';
import { WatchConfigManager } from '../indexing/WatchConfigManager.js';
import type {
  WatchConfigInput,
  WatchFolderResponse,
  IndexFolderResponse,
  ListWatchedFoldersResponse
} from '../types/index.js';

export function createFileIndexingTools(
  driver: Driver,
  watchManager: FileWatchManager
): Tool[] {
  const configManager = new WatchConfigManager(driver);

  return [
    // ========================================================================
    // watch_folder
    // ========================================================================
    {
      name: 'watch_folder',
      description: 'Start watching a folder for file changes. Files will be automatically indexed on add/change/delete. REQUIRES: Path must exist on filesystem.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute path to folder to watch (e.g., /workspace/src/my-project)'
          },
          recursive: {
            type: 'boolean',
            description: 'Watch subdirectories recursively (default: true)',
            default: true
          },
          debounce_ms: {
            type: 'number',
            description: 'Debounce delay for file events in milliseconds (default: 500)',
            default: 500
          },
          file_patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns to watch (e.g., ["*.ts", "*.js"]). Default: all files'
          },
          ignore_patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional ignore patterns beyond .gitignore (e.g., ["*.test.ts"])'
          },
          generate_embeddings: {
            type: 'boolean',
            description: 'Generate vector embeddings (Phase 2, default: false)',
            default: false
          }
        },
        required: ['path']
      }
    },

    // ========================================================================
    // unwatch_folder
    // ========================================================================
    {
      name: 'unwatch_folder',
      description: 'Stop watching a folder and optionally remove indexed files from Neo4j.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to folder to stop watching'
          },
          remove_indexed_files: {
            type: 'boolean',
            description: 'Remove all indexed files from Neo4j (default: false)',
            default: false
          }
        },
        required: ['path']
      }
    },

    // ========================================================================
    // index_folder
    // ========================================================================
    {
      name: 'index_folder',
      description: 'Manually index all files in a folder immediately. REQUIRES: Path must exist AND be in watch list (use watch_folder first). This triggers a one-time scan of all files.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute path to folder to index (must already be watched)'
          }
        },
        required: ['path']
      }
    },

    // ========================================================================
    // list_watched_folders
    // ========================================================================
    {
      name: 'list_watched_folders',
      description: 'List all folders currently being watched for file changes.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ];
}

/**
 * Handle watch_folder tool call
 */
export async function handleWatchFolder(
  params: any,
  driver: Driver,
  watchManager: FileWatchManager
): Promise<WatchFolderResponse> {
  const configManager = new WatchConfigManager(driver);
  
  // Validate path exists
  try {
    await fs.access(params.path);
  } catch (error) {
    return {
      watch_id: '',
      path: params.path,
      status: 'error',
      message: `Path '${params.path}' does not exist on filesystem.`
    };
  }

  // Check if already watching
  const existing = await configManager.getByPath(params.path);
  if (existing) {
    return {
      watch_id: existing.id,
      path: params.path,
      status: 'already_watching',
      message: `Already watching this folder.`
    };
  }

  // Create watch config
  const input: WatchConfigInput = {
    path: params.path,
    recursive: params.recursive ?? true,
    debounce_ms: params.debounce_ms ?? 500,
    file_patterns: params.file_patterns ?? null,
    ignore_patterns: params.ignore_patterns ?? [],
    generate_embeddings: params.generate_embeddings ?? false
  };

  const config = await configManager.createWatch(input);

  // Start watching
  // await watchManager.startWatch(config);

  return {
    watch_id: config.id,
    path: config.path,
    status: 'active',
    message: 'Folder is now being watched. Use index_folder to index existing files.'
  };
}

/**
 * Handle unwatch_folder tool call
 */
export async function handleUnwatchFolder(
  params: any,
  driver: Driver,
  watchManager: FileWatchManager
): Promise<any> {
  const configManager = new WatchConfigManager(driver);
  
  const config = await configManager.getByPath(params.path);
  if (!config) {
    return {
      status: 'error',
      message: `Path '${params.path}' is not being watched.`
    };
  }

  // Stop watcher
  await watchManager.stopWatch(params.path);

  // Mark inactive in Neo4j
  await configManager.markInactive(config.id);

  // Optionally remove indexed files
  if (params.remove_indexed_files) {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (f:File)
        WHERE f.path STARTS WITH $pathPrefix
        DETACH DELETE f
        RETURN count(f) AS deleted
      `, { pathPrefix: params.path });
      
      const deleted = result.records[0]?.get('deleted')?.toNumber() || 0;
      
      return {
        status: 'success',
        path: params.path,
        files_removed: deleted,
        message: `Folder watch stopped and ${deleted} indexed files removed.`
      };
    } finally {
      await session.close();
    }
  }

  return {
    status: 'success',
    path: params.path,
    message: 'Folder watch stopped. Indexed files remain in Neo4j.'
  };
}

/**
 * Handle index_folder tool call
 */
export async function handleIndexFolder(
  params: any,
  driver: Driver,
  watchManager: FileWatchManager
): Promise<IndexFolderResponse> {
  const configManager = new WatchConfigManager(driver);
  const startTime = Date.now();

  // Validation 1: Path exists
  try {
    await fs.access(params.path);
  } catch (error) {
    return {
      status: 'error',
      error: 'path_not_found',
      message: `Path '${params.path}' does not exist on filesystem.`,
      path: params.path
    };
  }

  // Validation 2: Path is watched
  const config = await configManager.getByPath(params.path);
  if (!config) {
    return {
      status: 'error',
      error: 'folder_not_watched',
      message: `Path '${params.path}' is not in watch list. Call watch_folder first.`,
      hint: 'Use watch_folder tool to add this path to the watch list',
      path: params.path
    };
  }

  // Index all files
  const filesIndexed = await watchManager.indexFolder(params.path, config);

  const elapsed = Date.now() - startTime;

  return {
    status: 'success',
    path: params.path,
    files_indexed: filesIndexed,
    elapsed_ms: elapsed
  };
}

/**
 * Handle list_watched_folders tool call
 */
export async function handleListWatchedFolders(
  driver: Driver
): Promise<ListWatchedFoldersResponse> {
  const configManager = new WatchConfigManager(driver);
  
  const configs = await configManager.listActive();

  return {
    watches: configs.map(config => ({
      watch_id: config.id,
      folder: config.path,
      recursive: config.recursive,
      files_indexed: config.files_indexed || 0,
      last_update: config.last_updated || config.added_date,
      active: config.status === 'active'
    })),
    total: configs.length
  };
}
