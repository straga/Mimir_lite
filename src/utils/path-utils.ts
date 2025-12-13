 /**
 * @fileoverview Cross-platform path utilities for workspace path translation
 * 
 * Handles path normalization between host systems (Windows/Mac/Linux) and
 * Docker container paths. Supports:
 * - Tilde (~) expansion to home directory
 * - Relative paths (../, ./)
 * - Windows drive letters (C:\, D:\)
 * - Unix absolute paths (/home/user)
 * - Consistent forward-slash normalization
 * 
 * @module utils/path-utils
 * @since 1.0.0
 */

import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';

/**
 * Normalize a path to Unix-style forward slashes
 * Converts Windows backslashes to forward slashes for consistency
 * 
 * @param filepath - Path to normalize
 * @returns Path with forward slashes
 * 
 * @example
 * ```ts
 * normalizeSlashes('C:\\Users\\john\\project') // => 'C:/Users/john/project'
 * normalizeSlashes('/home/user/project')       // => '/home/user/project'
 * ```
 */
/**
 * Normalize path slashes to forward slashes
 * @example normalizeSlashes('C:\\Users\\file') // => 'C:/Users/file'
 */
export function normalizeSlashes(filepath: string): string {
  return filepath.replace(/\\/g, '/');
}

/**
 * Expand tilde (~) to user's home directory
 * Handles both ~ and ~/ prefixes
 * 
 * @param filepath - Path that may start with ~
 * @returns Expanded path with home directory
 * 
 * @example
 * ```ts
 * expandTilde('~/Documents/file.txt')  // => '/Users/john/Documents/file.txt'
 * expandTilde('~')                      // => '/Users/john'
 * expandTilde('/absolute/path')         // => '/absolute/path'
 * ```
 */
/**
 * Expand tilde to home directory
 * @example expandTilde('~/src/project') // => '/Users/john/src/project'
 */
export function expandTilde(filepath: string): string {
  if (!filepath) return filepath;
  
  // Only expand if it starts with ~ or ~/
  if (filepath === '~') {
    return os.homedir();
  }
  
  if (filepath.startsWith('~/') || filepath.startsWith('~\\')) {
    return path.join(os.homedir(), filepath.slice(2));
  }
  
  return filepath;
}

/**
 * Normalize and resolve a path to its absolute form
 * 
 * Handles:
 * - Tilde expansion (~/)
 * - Relative paths (../, ./)
 * - Multiple slashes (//)
 * - Mixed slashes (\\ and /)
 * - Windows drive letters
 * 
 * @param filepath - Path to normalize
 * @param basePath - Optional base path for relative resolution (default: process.cwd())
 * @returns Absolute normalized path with forward slashes
 * 
 * @example
 * ```ts
 * normalizeAndResolve('~/project')           // => '/Users/john/project'
 * normalizeAndResolve('../other', '/home')   // => '/other'
 * normalizeAndResolve('C:\\Users\\file.txt') // => 'C:/Users/file.txt'
 * ```
 */
/**
 * Normalize and resolve path
 * @example normalizeAndResolve('~/project') // => '/Users/john/project'
 */
export function normalizeAndResolve(filepath: string, basePath?: string): string {
  if (!filepath) return filepath;
  
  // Step 1: Expand tilde
  let normalized = expandTilde(filepath);
  
  // Step 2: Normalize slashes to forward slashes
  normalized = normalizeSlashes(normalized);
  
  // Step 3: Check if this is already an absolute path
  // Windows absolute: starts with drive letter (C:/, D:/, etc.)
  // Unix absolute: starts with /
  const isWindowsAbsolute = /^[a-zA-Z]:\//.test(normalized);
  const isUnixAbsolute = normalized.startsWith('/');
  const isAbsolute = isWindowsAbsolute || isUnixAbsolute;
  
  // Step 4: Resolve to absolute path (only if not already absolute or if basePath provided)
  if (basePath) {
    normalized = path.resolve(basePath, normalized);
  } else if (!isAbsolute) {
    // Only resolve relative paths - don't resolve absolute paths as they'd get prefixed with cwd
    normalized = path.resolve(normalized);
  }
  // If already absolute, keep as-is
  
  // Step 5: Final slash normalization (resolve might add backslashes on Windows)
  normalized = normalizeSlashes(normalized);
  
  // Step 6: Remove trailing slashes (except for root)
  // Remove all trailing slashes, not just one
  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }
  
  // Step 7: Collapse multiple consecutive slashes into single slash
  normalized = normalized.replace(/\/\/+/g, '/');
  
  return normalized;
}

/**
 * Get the host workspace root from environment with expansion
 * 
 * Resolves HOST_WORKSPACE_ROOT with:
 * - Tilde expansion
 * - Relative path resolution
 * - Absolute path normalization
 * 
 * @returns Normalized absolute path to host workspace root
 * 
 * @example
 * ```ts
 * // With HOST_WORKSPACE_ROOT=~/src
 * getHostWorkspaceRoot() // => '/Users/john/src'
 * 
 * // With HOST_WORKSPACE_ROOT=C:\Users\john\Documents
 * getHostWorkspaceRoot() // => 'C:/Users/john/Documents'
 * ```
 */
/**
 * Check if we're running inside a Docker container
 * 
 * @returns true if running in Docker, false otherwise
 */
/**
 * Check if running in Docker container
 * @example if (isRunningInDocker()) console.log('In Docker');
 */
export function isRunningInDocker(): boolean {
  // Check for common Docker indicators
  // 1. /.dockerenv file exists (most reliable)
  // 2. WORKSPACE_ROOT environment variable is set (our Docker convention)
  
  try {
    // Check for .dockerenv file
    if (fsSync.existsSync('/.dockerenv')) {
      return true;
    }
  } catch (e) {
    // Ignore errors
  }
  
  // Check if WORKSPACE_ROOT is set (our Docker convention)
  // When running locally, this should NOT be set
  if (process.env.WORKSPACE_ROOT) {
    return true;
  }
  
  return false;
}

/**
 * Get host workspace root path
 * @example const root = getHostWorkspaceRoot(); // => '/Users/john/src'
 */
export function getHostWorkspaceRoot(): string {
  const hostRoot = process.env.HOST_WORKSPACE_ROOT;
  
  // If not set, use default ~/src
  if (!hostRoot) {
    const defaultRoot = normalizeAndResolve('~/src');
    console.log(`🏠 Host workspace root (default): ${defaultRoot}`);
    return defaultRoot;
  }
  
  // When running in Docker with tilde in HOST_WORKSPACE_ROOT:
  // Docker Compose already expanded ~ in the volume mount, so we just need to expand it here too
  // Note: /proc/mounts doesn't work on Docker Desktop (shows VM paths like /run/host_mark)
  if (isRunningInDocker() && hostRoot.startsWith('~')) {
    // Expand tilde manually (can't use os.homedir() in Docker - it returns container's home)
    // Standard Unix tilde expansion: ~ -> /home/username or /Users/username
    // Since we're in Docker, we need to infer the actual home directory from the env var itself
    // The user likely set HOST_WORKSPACE_ROOT=~/src in .env, which means their home + /src
    
    // CRITICAL: Just use the value as-is and let file queries match against it
    // Files are stored with host paths, and queries should use the same format
    // console.log(`🏠 Host workspace root (Docker with tilde): keeping as ${hostRoot} for path matching`);
    return normalizeSlashes(hostRoot);
  }
  
  // When running in Docker without tilde, use as-is
  if (isRunningInDocker()) {
    const normalized = normalizeSlashes(hostRoot);
    // console.log(`🏠 Host workspace root (Docker): ${hostRoot} -> ${normalized}`);
    return normalized;
  }
  
  // When running locally (not in Docker), expand tilde and resolve normally
  const normalizedRoot = normalizeAndResolve(hostRoot);
  // console.log(`🏠 Host workspace root (local): ${hostRoot} -> ${normalizedRoot}`);
  return normalizedRoot;
}

/**
 * Translate host path to container path
 * 
 * Maps paths from the host filesystem to the Docker container's workspace directory.
 * Uses WORKSPACE_ROOT environment variable (defaults to /workspace).
 * 
 * Handles:
 * - Absolute host paths (when HOST_WORKSPACE_ROOT is absolute)
 * - Relative paths (always supported)
 * - Tilde paths in input (expanded if possible)
 * - Already-translated container paths (idempotent)
 * 
 * Environment Variables:
 * - WORKSPACE_ROOT: Container workspace path (default: /workspace)
 * - HOST_WORKSPACE_ROOT: Host-side workspace path to translate from
 * - HOST_HOME: Host's home directory (for expanding ~ in HOST_WORKSPACE_ROOT)
 * 
 * Tilde Expansion:
 * If HOST_WORKSPACE_ROOT contains ~ (e.g., ~/src), the function will:
 * 1. Try to expand using HOST_HOME if available (recommended)
 * 2. Log a warning and return the path unchanged if HOST_HOME is not set
 * 
 * Pass HOST_HOME to Docker: docker run -e HOST_HOME=$HOME ...
 * 
 * Works with ANY depth of nesting:
 * - C:\ or / (root)
 * - C:\Windows\Some\Deep\Nested\Path
 * - /some/deeply/nested/unix/path
 * 
 * @param hostPath - Path on the host system
 * @returns Path inside the container (WORKSPACE_ROOT/...)
 * 
 * @example
 * ```ts
 * // WORKSPACE_ROOT=/workspace, HOST_WORKSPACE_ROOT=/Users/john/src
 * translateHostToContainer('/Users/john/src/project')  // => '/workspace/project'
 * translateHostToContainer('C:\\Users\\john\\project') // => '/workspace/project' (Windows)
 * translateHostToContainer('/workspace/project')       // => '/workspace/project' (idempotent)
 * 
 * // WORKSPACE_ROOT=/mnt/data, HOST_WORKSPACE_ROOT=/Users/john/src
 * translateHostToContainer('/Users/john/src/project')  // => '/mnt/data/project'
 * 
 * // HOST_WORKSPACE_ROOT=~/src with HOST_HOME=/Users/john (tilde expansion)
 * translateHostToContainer('/Users/john/src/project')  // => '/workspace/project'
 * 
 * // HOST_WORKSPACE_ROOT=~/src without HOST_HOME (cannot expand, returns path unchanged)
 * translateHostToContainer('/Users/john/src/project')  // => '/Users/john/src/project' (with warning)
 * ```
 */
/**
 * Normalize path for storage - NO translation, just normalization
 *
 * SIMPLIFIED: Store paths as the filesystem sees them.
 * - Local Mac: stores /Users/dev/...
 * - Docker: stores /workspace/...
 *
 * Translation happens ONLY at query time via X-Mimir-Path-Map header.
 *
 * @example translateHostToContainer('/Users/john/src/project') // => '/Users/john/src/project' (normalized)
 * @example translateHostToContainer('~/src/project') // => '/Users/john/src/project' (tilde expanded)
 */
export function translateHostToContainer(hostPath: string): string {
  if (!hostPath) return hostPath;

  // Just normalize - no translation
  // Expands tilde, resolves relative paths, normalizes slashes
  return normalizeAndResolve(hostPath);
}

/**
 * Normalize container path - NO translation, just normalization
 *
 * SIMPLIFIED: No more complex host/container translation.
 * Just normalizes slashes for consistency.
 *
 * @example translateContainerToHost('/workspace/project') // => '/workspace/project'
 */
export function translateContainerToHost(containerPath: string): string {
  if (!containerPath) return containerPath;
  return normalizeSlashes(containerPath);
}

/**
 * Validate that a path exists on the filesystem
 * 
 * @param filepath - Path to validate
 * @returns true if path exists, false otherwise
 */
export async function pathExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize a user-provided path
 * 
 * Performs security checks and normalization:
 * - Rejects empty/null paths
 * - Expands tilde and resolves relative paths
 * - Normalizes to absolute path
 * - Does NOT check if path exists (use pathExists for that)
 * 
 * @param userPath - User-provided path
 * @param allowRelative - Whether to allow relative paths (default: true)
 * @returns Sanitized absolute path
 * @throws Error if path is invalid or fails security checks
 * 
 * @example
 * ```ts
 * validateAndSanitizePath('~/project')     // => '/Users/john/project'
 * validateAndSanitizePath('../other')      // => '/absolute/path/to/other'
 * validateAndSanitizePath('')              // throws Error
 * ```
 */
/**
 * Validate and sanitize user-provided path
 * @example validateAndSanitizePath('~/project') // => '/Users/john/project'
 */
export function validateAndSanitizePath(userPath: string, allowRelative: boolean = true): string {
  // Check for empty/null
  if (!userPath || typeof userPath !== 'string') {
    throw new Error('Path parameter is required and must be a string');
  }

  // Normalize and resolve
  const resolved = normalizeAndResolve(userPath);

  // Security check: ensure the original path doesn't contain suspicious patterns
  // after resolution (e.g., null bytes, control characters)
  // Check for ASCII control characters (0-31) without using regex to avoid linter warnings
  for (let i = 0; i < userPath.length; i++) {
    const charCode = userPath.charCodeAt(i);
    if (charCode >= 0 && charCode <= 31) {
      throw new Error('Path contains invalid control characters');
    }
  }

  return resolved;
}

// ============================================================================
// Path Mapping for Remote Server Scenarios
// ============================================================================

/**
 * Parse path mappings from string (from HTTP header X-Mimir-Path-Map)
 *
 * Supports two formats:
 * 1. Array (recommended): ["/workspace/docs=/Users/dev/docs", "/workspace/src=/Users/dev/src"]
 * 2. Simple: "/workspace/docs=/Users/dev/docs,/workspace/src=/Users/dev/src"
 *
 * Array format is best for JSON config files - each mapping on its own line.
 *
 * @example
 * // Array format (recommended - readable in JSON config)
 * "X-Mimir-Path-Map": [
 *   "/workspace/docs=/Users/dev/docs",
 *   "/workspace/src=/Users/dev/src"
 * ]
 *
 * // Simple format (single line)
 * "X-Mimir-Path-Map": "/workspace/docs=/Users/dev/docs"
 */
export function parsePathMappingsFromString(pathMapStr: string | undefined | null): Array<[string, string]> {
  if (!pathMapStr || pathMapStr.trim() === '') {
    return [];
  }

  const trimmed = pathMapStr.trim();

  // Detect JSON array format: ["from=to", "from2=to2"]
  if (trimmed.startsWith('[')) {
    try {
      const jsonArr = JSON.parse(trimmed);
      if (!Array.isArray(jsonArr)) {
        console.error('X-Mimir-Path-Map: expected array but got:', typeof jsonArr);
        return [];
      }

      const mappings: Array<[string, string]> = [];
      for (const item of jsonArr) {
        if (typeof item !== 'string') continue;

        const eqIndex = item.indexOf('=');
        if (eqIndex === -1) continue;

        const from = normalizeSlashes(item.substring(0, eqIndex).trim());
        const to = normalizeSlashes(item.substring(eqIndex + 1).trim());

        if (from && to) {
          mappings.push([from, to]);
        }
      }

      return mappings;
    } catch (e) {
      console.error('Failed to parse X-Mimir-Path-Map as JSON array:', e);
      return [];
    }
  }

  // Simple format: from1=to1,from2=to2
  const mappings: Array<[string, string]> = [];
  const pairs = trimmed.split(',');

  for (const pair of pairs) {
    const pairTrimmed = pair.trim();
    if (!pairTrimmed) continue;

    const eqIndex = pairTrimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const from = normalizeSlashes(pairTrimmed.substring(0, eqIndex).trim());
    const to = normalizeSlashes(pairTrimmed.substring(eqIndex + 1).trim());

    if (from && to) {
      mappings.push([from, to]);
    }
  }

  return mappings;
}

/**
 * Apply path mappings to a single path
 *
 * Used for translating server paths to client paths in MCP responses.
 * Mappings come from HTTP header X-Mimir-Path-Map.
 * If no mappings or path doesn't match, returns path unchanged.
 *
 * @param filepath - Path to translate (e.g., from Neo4j)
 * @param mappings - Mappings from header (parsed by parsePathMappingsFromString)
 * @returns Translated path (or original if no mapping matches)
 *
 * @example
 * const mappings = [['/data/projects', '/Users/dev/projects']];
 * applyPathMapping('/data/projects/myapp/file.py', mappings)
 * // => '/Users/dev/projects/myapp/file.py'
 */
export function applyPathMapping(filepath: string, mappings?: Array<[string, string]>): string {
  if (!filepath) return filepath;
  if (!mappings || mappings.length === 0) return filepath;

  const normalizedPath = normalizeSlashes(filepath);

  // Try each mapping in order
  for (const [from, to] of mappings) {
    if (normalizedPath.startsWith(from)) {
      // Replace prefix
      const result = to + normalizedPath.substring(from.length);
      return result;
    }
  }

  // No mapping matched
  return filepath;
}

/**
 * Apply path mappings to all path fields in an object (recursive)
 *
 * Looks for common path field names: path, file_path, filePath, location
 *
 * @param obj - Object to process (modified in place for arrays/objects)
 * @param mappings - Optional explicit mappings (from header), if not provided uses env
 * @returns Processed object with mapped paths
 */
export function applyPathMappingToResult(obj: any, mappings?: Array<[string, string]>): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // String - might be a path, but we only map known fields
  if (typeof obj === 'string') {
    return obj;
  }

  // Array - process each element
  if (Array.isArray(obj)) {
    return obj.map(item => applyPathMappingToResult(item, mappings));
  }

  // Object - process known path fields and recurse
  if (typeof obj === 'object') {
    const pathFields = ['path', 'file_path', 'filePath', 'location', 'source_path', 'sourcePath'];

    for (const key of Object.keys(obj)) {
      if (pathFields.includes(key) && typeof obj[key] === 'string') {
        obj[key] = applyPathMapping(obj[key], mappings);
      } else if (typeof obj[key] === 'object') {
        obj[key] = applyPathMappingToResult(obj[key], mappings);
      }
    }

    return obj;
  }

  return obj;
}
