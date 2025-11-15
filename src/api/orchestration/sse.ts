/**
 * @fileoverview Server-Sent Events (SSE) management for real-time execution updates
 * 
 * This module provides SSE functionality for streaming real-time execution progress
 * to connected frontend clients. Supports event broadcasting, client management,
 * and graceful error handling for disconnected clients.
 * 
 * @module api/orchestration/sse
 * @since 1.0.0
 */

/**
 * Map of execution IDs to arrays of SSE response streams
 * Each execution can have multiple connected clients receiving updates
 */
const sseClients = new Map<string, any[]>();

/**
 * Send Server-Sent Events (SSE) to all connected clients for a specific execution
 * 
 * Broadcasts real-time execution progress events to connected frontend clients
 * using the SSE protocol. Handles client write failures gracefully to prevent
 * one failed client from affecting others.
 * 
 * @param executionId - Unique identifier for the execution session
 * @param event - Event type name (e.g., 'task-start', 'task-complete', 'execution-complete')
 * @param data - Payload data to send to clients (will be JSON stringified)
 * 
 * @example
 * // Example 1: Notify clients that task execution started
 * sendSSEEvent('exec-1234567890', 'task-start', {
 *   taskId: 'task-1',
 *   taskTitle: 'Validate Environment',
 *   progress: 1,
 *   total: 5
 * });
 * 
 * @example
 * // Example 2: Send task completion with results
 * sendSSEEvent('exec-1234567890', 'task-complete', {
 *   taskId: 'task-2',
 *   status: 'success',
 *   duration: 15000,
 *   progress: 2,
 *   total: 5
 * });
 * 
 * @example
 * // Example 3: Notify all clients of execution completion
 * sendSSEEvent('exec-1234567890', 'execution-complete', {
 *   executionId: 'exec-1234567890',
 *   status: 'completed',
 *   successful: 5,
 *   failed: 0,
 *   totalDuration: 120000
 * });
 * 
 * @since 1.0.0
 */
export function sendSSEEvent(executionId: string, event: string, data: any): void {
  const clients = sseClients.get(executionId) || [];
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  clients.forEach((client) => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Failed to send SSE event:', error);
    }
  });
}

/**
 * Register a new SSE client for an execution
 * 
 * Adds a response stream to the list of clients receiving real-time updates
 * for a specific execution. Multiple clients can be registered for the same
 * execution ID.
 * 
 * @param executionId - Unique identifier for the execution session
 * @param responseStream - Express response object configured for SSE streaming
 * 
 * @example
 * // Example: Register client when they connect to SSE endpoint
 * app.get('/api/executions/:executionId/events', (req, res) => {
 *   res.setHeader('Content-Type', 'text/event-stream');
 *   res.setHeader('Cache-Control', 'no-cache');
 *   res.setHeader('Connection', 'keep-alive');
 *   
 *   registerSSEClient(req.params.executionId, res);
 *   
 *   req.on('close', () => {
 *     unregisterSSEClient(req.params.executionId, res);
 *   });
 * });
 * 
 * @since 1.0.0
 */
export function registerSSEClient(executionId: string, responseStream: any): void {
  const clients = sseClients.get(executionId) || [];
  clients.push(responseStream);
  sseClients.set(executionId, clients);
  console.log(`📡 SSE client registered for execution: ${executionId} (${clients.length} total clients)`);
}

/**
 * Unregister an SSE client from an execution
 * 
 * Removes a response stream from the list of clients for an execution.
 * Automatically cleans up empty client lists to prevent memory leaks.
 * 
 * @param executionId - Unique identifier for the execution session
 * @param responseStream - Express response object to remove
 * 
 * @example
 * // Example: Unregister client when they disconnect
 * req.on('close', () => {
 *   unregisterSSEClient(executionId, res);
 *   console.log('Client disconnected from SSE stream');
 * });
 * 
 * @since 1.0.0
 */
export function unregisterSSEClient(executionId: string, responseStream: any): void {
  const clients = sseClients.get(executionId) || [];
  const filteredClients = clients.filter(client => client !== responseStream);
  
  if (filteredClients.length === 0) {
    sseClients.delete(executionId);
    console.log(`📡 All SSE clients disconnected for execution: ${executionId}`);
  } else {
    sseClients.set(executionId, filteredClients);
    console.log(`📡 SSE client unregistered for execution: ${executionId} (${filteredClients.length} remaining)`);
  }
}

/**
 * Get count of connected SSE clients for an execution
 * 
 * @param executionId - Unique identifier for the execution session
 * @returns Number of active SSE client connections
 * 
 * @example
 * // Example: Check if any clients are listening
 * const clientCount = getSSEClientCount('exec-1234567890');
 * if (clientCount > 0) {
 *   sendSSEEvent('exec-1234567890', 'status-update', { message: 'Processing...' });
 * }
 * 
 * @since 1.0.0
 */
export function getSSEClientCount(executionId: string): number {
  return (sseClients.get(executionId) || []).length;
}

/**
 * Close all SSE connections for an execution
 * 
 * Ends all active SSE streams for an execution and removes them from the registry.
 * Use this when an execution completes to clean up resources and notify clients.
 * 
 * @param executionId - Unique identifier for the execution session
 * 
 * @example
 * // Example: Close all connections when execution completes
 * try {
 *   sendSSEEvent(executionId, 'execution-complete', { status: 'completed' });
 *   await new Promise(resolve => setTimeout(resolve, 100)); // Let final events flush
 *   closeSSEConnections(executionId);
 * } catch (error) {
 *   console.error('Error closing SSE connections:', error);
 * }
 * 
 * @since 1.0.0
 */
export function closeSSEConnections(executionId: string): void {
  const clients = sseClients.get(executionId) || [];
  clients.forEach(client => {
    try {
      client.end();
    } catch (error) {
      console.error(`Failed to close SSE client for ${executionId}:`, error);
    }
  });
  sseClients.delete(executionId);
  console.log(`📡 Closed ${clients.length} SSE connections for execution: ${executionId}`);
}
