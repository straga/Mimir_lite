// ============================================================================
// Unified Types Export
// ============================================================================

// Graph types
export type {
  Node,
  Edge,
  NodeType,
  EdgeType,
  ClearType,
  SearchOptions,
  BatchDeleteResult,
  GraphStats,
  Subgraph
} from './graph.types.js';

export {
  todoToNodeProperties,
  nodeToTodo
} from './graph.types.js';

// Graph manager interface
export type { IGraphManager } from './IGraphManager.js';

// Watch config types
export type {
  WatchConfig,
  WatchConfigInput,
  WatchFolderResponse,
  IndexFolderResponse,
  ListWatchedFoldersResponse
} from './watchConfig.types.js';
