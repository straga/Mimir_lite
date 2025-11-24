/**
 * Mimir API Performance Benchmark Suite
 * 
 * Benchmarks Neo4j operations through both:
 * 1. MCP Tools (Model Context Protocol)
 * 2. HTTP REST API endpoints
 * 
 * Measures the overhead of Mimir's abstraction layers compared to direct Neo4j access.
 * 
 * Prerequisites:
 * - Mimir server running on http://localhost:9042
 * - Neo4j with test data from mimir-performance.bench.ts (1000 BenchmarkNode nodes)
 * 
 * Run with: npm run bench:api
 */

import { describe, bench, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MIMIR_API_URL = process.env.MIMIR_API_URL || 'http://localhost:9042';
const RESULTS_DIR = path.join(__dirname, 'results');

let mcpSessionId: string | null = null;

// Helper to initialize MCP session
async function initializeMCP() {
  const response = await fetch(`${MIMIR_API_URL}/mcp`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'mimir-benchmark',
          version: '1.0.0'
        }
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`MCP initialization failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  // Extract session ID from response headers or body
  const sessionHeader = response.headers.get('x-session-id');
  if (sessionHeader) {
    mcpSessionId = sessionHeader;
  }
  
  console.log('✅ MCP session initialized');
  return result;
}

// Helper to call MCP tools
async function callMCPTool(toolName: string, params: any) {
  const headers: any = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (mcpSessionId) {
    headers['x-session-id'] = mcpSessionId;
  }
  
  const response = await fetch(`${MIMIR_API_URL}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MCP call failed (${response.status}): ${errorText}`);
  }
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(`MCP tool error: ${result.error.message || JSON.stringify(result.error)}`);
  }
  
  return result;
}

// Helper to call HTTP REST API
async function callAPI(endpoint: string, method: string = 'GET', body?: any) {
  const response = await fetch(`${MIMIR_API_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`HTTP API call failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Setup
beforeAll(async () => {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  
  try {
    await fetch(`${MIMIR_API_URL}/health`);
    console.log('✅ Mimir server is running at', MIMIR_API_URL);
  } catch (error) {
    throw new Error(`❌ Mimir server not running at ${MIMIR_API_URL}`);
  }
  
  // Initialize MCP session
  try {
    await initializeMCP();
  } catch (error) {
    console.warn('⚠️  MCP initialization failed, MCP benchmarks will be skipped:', error);
  }
  
  console.log('ℹ️  Using existing Neo4j test data (1000 BenchmarkNode nodes)');
}, 30000);

afterAll(async () => {
  console.log('✅ Benchmark complete');
}, 30000);

// ============================================================================
// 1. MCP TOOL BENCHMARKS
// ============================================================================

describe('MCP Tools Performance', () => {
  bench('memory_node query (list 100 nodes)', async () => {
    try {
      await callMCPTool('memory_node', {
        operation: 'query',
        type: 'BenchmarkNode',
        filters: {}
      });
    } catch (error) {
      // Skip if MCP not initialized
      if (!mcpSessionId) return;
      throw error;
    }
  }, { iterations: 100 });

  bench('memory_node get by ID', async () => {
    try {
      await callMCPTool('memory_node', {
        operation: 'get',
        id: 'bench-500'
      });
    } catch (error) {
      if (!mcpSessionId) return;
      throw error;
    }
  }, { iterations: 200 });

  bench('vector_search_nodes (top 10)', async () => {
    try {
      await callMCPTool('vector_search_nodes', {
        query: 'test content search',
        types: ['BenchmarkNode'],
        limit: 10,
        min_similarity: 0.5
      });
    } catch (error) {
      if (!mcpSessionId) return;
      throw error;
    }
  }, { iterations: 100 });

  bench('vector_search_nodes (top 25)', async () => {
    try {
      await callMCPTool('vector_search_nodes', {
        query: 'benchmark test query',
        types: ['BenchmarkNode'],
        limit: 25,
        min_similarity: 0.5
      });
    } catch (error) {
      if (!mcpSessionId) return;
      throw error;
    }
  }, { iterations: 100 });

  bench('memory_edge get neighbors', async () => {
    try {
      await callMCPTool('memory_edge', {
        operation: 'neighbors',
        node_id: 'bench-100',
        depth: 1
      });
    } catch (error) {
      if (!mcpSessionId) return;
      throw error;
    }
  }, { iterations: 200 });
});

// ============================================================================
// 2. HTTP REST API BENCHMARKS
// ============================================================================

describe('HTTP REST API Performance', () => {
  bench('GET /api/nodes/types (list node types)', async () => {
    await callAPI('/api/nodes/types');
  }, { iterations: 200, time: 10000 });

  bench('GET /api/nodes/:id (single node)', async () => {
    // Use a known benchmark node ID
    await callAPI('/api/nodes/bench-500');
  }, { iterations: 500, time: 10000 });

  bench('POST /api/nodes (create node)', async () => {
    const result = await callAPI('/api/nodes', 'POST', {
      type: 'custom',
      properties: {
        temp: true,
        timestamp: Date.now()
      }
    });
    
    // Cleanup
    if (result.node?.id) {
      await callAPI(`/api/nodes/${result.node.id}`, 'DELETE');
    }
  }, { iterations: 50, time: 10000 });

  bench('GET /api/nodes/types/:type (list by type)', async () => {
    await callAPI('/api/nodes/types/BenchmarkNode');
  }, { iterations: 200, time: 10000 });
});

// ============================================================================
// 3. COMPARISON: MCP vs HTTP
// ============================================================================

describe('MCP vs HTTP Comparison', () => {
  bench('[MCP] Query 10 nodes', async () => {
    try {
      await callMCPTool('memory_node', {
        operation: 'query',
        type: 'BenchmarkNode',
        filters: {}
      });
    } catch (error) {
      if (!mcpSessionId) return;
      throw error;
    }
  }, { iterations: 200, time: 10000 });

  bench('[HTTP] Query nodes by type', async () => {
    await callAPI('/api/nodes/types/BenchmarkNode');
  }, { iterations: 200, time: 10000 });
});
