// ============================================================================
// Watch Configuration Types
// ============================================================================

export interface WatchConfig {
  id: string;
  path: string;
  recursive: boolean;
  debounce_ms: number;
  file_patterns: string[] | null;
  ignore_patterns: string[];
  generate_embeddings: boolean;
  status: 'active' | 'inactive';
  added_date: string;
  last_indexed?: string;
  last_updated?: string;
  files_indexed?: number;
  error?: string;
}

export interface WatchConfigInput {
  path: string;
  recursive?: boolean;
  debounce_ms?: number;
  file_patterns?: string[] | null;
  ignore_patterns?: string[];
  generate_embeddings?: boolean;
}

export interface WatchFolderResponse {
  watch_id: string;
  path: string;
  status: string;
  message: string;
}

export interface IndexFolderResponse {
  status: 'success' | 'error';
  path?: string;
  files_indexed?: number;
  elapsed_ms?: number;
  error?: string;
  message?: string;
  hint?: string;
}

export interface ListWatchedFoldersResponse {
  watches: Array<{
    watch_id: string;
    folder: string;
    recursive: boolean;
    files_indexed: number;
    last_update: string;
    active: boolean;
  }>;
  total: number;
}
