/**
 * @fileoverview Cancellation Token Pattern for Workflow Execution
 * 
 * Provides a robust cancellation mechanism that propagates through all
 * async operations in the workflow execution pipeline. Supports:
 * - Cooperative cancellation checks
 * - AbortSignal for fetch/async operations
 * - Cleanup callbacks for resource management
 * - Subprocess termination
 * 
 * @module orchestrator/cancellation
 * @since 1.1.0
 */

/**
 * Error thrown when an operation is cancelled
 */
export class CancellationError extends Error {
  public readonly executionId: string;
  
  constructor(executionId: string) {
    super(`Execution ${executionId} was cancelled`);
    this.name = 'CancellationError';
    this.executionId = executionId;
  }
}

/**
 * Cancellation token interface for checking cancellation state
 * and registering cleanup callbacks
 */
export interface CancellationToken {
  /** Unique execution ID this token belongs to */
  readonly executionId: string;
  
  /** Check if cancellation was requested */
  readonly isCancelled: boolean;
  
  /** AbortSignal for fetch/async operations */
  readonly signal: AbortSignal;
  
  /** 
   * Throws CancellationError if cancelled
   * Call this at checkpoints in your code
   */
  throwIfCancelled(): void;
  
  /** 
   * Register a cleanup callback to run on cancellation
   * Useful for killing subprocesses, closing connections, etc.
   * @returns Unsubscribe function
   */
  onCancel(callback: () => void): () => void;
}

/**
 * Factory for creating and managing cancellation tokens
 */
export class CancellationTokenSource {
  private readonly abortController: AbortController;
  private readonly callbacks: Set<() => void> = new Set();
  private _isCancelled = false;
  private readonly _executionId: string;
  
  constructor(executionId: string) {
    this._executionId = executionId;
    this.abortController = new AbortController();
  }
  
  /**
   * Get the cancellation token for this source
   */
  get token(): CancellationToken {
    const self = this;
    return {
      executionId: self._executionId,
      get isCancelled() { return self._isCancelled; },
      get signal() { return self.abortController.signal; },
      throwIfCancelled() {
        if (self._isCancelled) {
          throw new CancellationError(self._executionId);
        }
      },
      onCancel(callback: () => void) {
        self.callbacks.add(callback);
        // If already cancelled, call immediately
        if (self._isCancelled) {
          try { callback(); } catch (e) { /* ignore */ }
        }
        // Return unsubscribe function
        return () => self.callbacks.delete(callback);
      },
    };
  }
  
  /**
   * Check if this source has been cancelled
   */
  get isCancelled(): boolean {
    return this._isCancelled;
  }
  
  /**
   * Cancel the token, triggering all callbacks and aborting the signal
   */
  cancel(): void {
    if (this._isCancelled) return; // Already cancelled
    
    console.log(`⛔ Cancellation triggered for execution ${this._executionId}`);
    this._isCancelled = true;
    
    // Abort all fetch operations
    this.abortController.abort();
    
    // Run all cleanup callbacks
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error(`Error in cancellation callback for ${this._executionId}:`, error);
      }
    });
  }
  
  /**
   * Dispose of this source (cleanup)
   */
  dispose(): void {
    this.callbacks.clear();
  }
}

/**
 * Global registry of active cancellation sources
 */
const cancellationSources = new Map<string, CancellationTokenSource>();

/**
 * Create a new cancellation token for an execution
 * 
 * @param executionId - Unique execution identifier
 * @returns CancellationToken for the execution
 */
export function createCancellationToken(executionId: string): CancellationToken {
  // Clean up any existing source for this ID
  const existing = cancellationSources.get(executionId);
  if (existing) {
    existing.dispose();
  }
  
  const source = new CancellationTokenSource(executionId);
  cancellationSources.set(executionId, source);
  return source.token;
}

/**
 * Get an existing cancellation token for an execution
 * 
 * @param executionId - Unique execution identifier
 * @returns CancellationToken or undefined if not found
 */
export function getCancellationToken(executionId: string): CancellationToken | undefined {
  return cancellationSources.get(executionId)?.token;
}

/**
 * Cancel an execution by its ID
 * 
 * @param executionId - Unique execution identifier
 * @returns true if cancellation was triggered, false if not found
 */
export function cancelExecution(executionId: string): boolean {
  const source = cancellationSources.get(executionId);
  if (source) {
    source.cancel();
    return true;
  }
  return false;
}

/**
 * Check if an execution is cancelled
 * 
 * @param executionId - Unique execution identifier
 * @returns true if cancelled, false otherwise
 */
export function isExecutionCancelled(executionId: string): boolean {
  return cancellationSources.get(executionId)?.isCancelled ?? false;
}

/**
 * Clean up a cancellation source after execution completes
 * 
 * @param executionId - Unique execution identifier
 */
export function cleanupCancellationToken(executionId: string): void {
  const source = cancellationSources.get(executionId);
  if (source) {
    source.dispose();
    cancellationSources.delete(executionId);
  }
}

/**
 * Helper to wrap async operations with cancellation support
 * 
 * @param token - Cancellation token to check
 * @param operation - Async operation to run
 * @param checkpointName - Name for logging if cancelled
 * @returns Result of the operation
 * @throws CancellationError if cancelled
 */
export async function withCancellation<T>(
  token: CancellationToken,
  operation: () => Promise<T>,
  checkpointName?: string
): Promise<T> {
  token.throwIfCancelled();
  
  try {
    const result = await operation();
    token.throwIfCancelled();
    return result;
  } catch (error) {
    // Re-throw cancellation errors
    if (error instanceof CancellationError) {
      throw error;
    }
    // Check if abort signal triggered
    if (token.isCancelled) {
      throw new CancellationError(token.executionId);
    }
    throw error;
  }
}
