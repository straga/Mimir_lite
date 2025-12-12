/**
 * Mimir Lite - HTTP/MCP Server
 *
 * Minimal MCP server with:
 * - Neo4j graph database for memory/knowledge storage
 * - Vector search with embeddings
 * - File indexing and watching
 *
 * No LLM, no orchestration, no auth - just storage and search.
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'async_hooks';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { server, initializeGraphManager, allTools } from './index.js';
import { createMCPToolsRouter } from './api/mcp-tools-api.js';
import indexRouter from './api/index-api.js';
import nodesRouter from './api/nodes-api.js';
import { FileWatchManager } from './indexing/FileWatchManager.js';
import type { IGraphManager } from './types/index.js';
import { parsePathMappingsFromString } from './utils/path-utils.js';

// AsyncLocalStorage for per-request context (e.g., path mapping from headers)
export interface RequestContext {
  pathMapHeader?: string;
}
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get path mappings from current request context (header) or env
 */
export function getRequestPathMappings(): Array<[string, string]> | undefined {
  const ctx = requestContext.getStore();
  if (ctx?.pathMapHeader) {
    return parsePathMappingsFromString(ctx.pathMapHeader);
  }
  return undefined;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared session for MCP
let sharedTransport: any | null = null;
let isSessionInitialized = false;
const SHARED_SESSION_ID = 'shared-global-session';

async function startHttpServer() {
  console.log("🚀 Mimir Lite MCP Server starting...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Initialize GraphManager
  let graphManager: IGraphManager;
  try {
    graphManager = await initializeGraphManager();
    const stats = await graphManager.getStats();
    console.log(`✅ Connected to Neo4j`);
    console.log(`   Nodes: ${stats.nodeCount}`);
    console.log(`   Edges: ${stats.edgeCount}`);
    console.log(`   Types: ${JSON.stringify(stats.types)}`);

    // Get FileWatchManager instance
    const { fileWatchManager: indexWatchManager } = await import('./index.js');
    (globalThis as any).fileWatchManager = indexWatchManager;
    console.log(`✅ FileWatchManager initialized`);
  } catch (error: any) {
    console.error(`❌ Failed to initialize: ${error.message}`);
    process.exit(1);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 ${allTools.length} MCP tools available`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const app = express();

  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(cors({
    origin: '*',
    methods: ['POST', 'GET', 'DELETE', 'PATCH', 'PUT'],
    allowedHeaders: ['Content-Type', 'Accept', 'mcp-session-id', 'X-Mimir-Path-Map'],
    exposedHeaders: ['Mcp-Session-Id']
  }));

  // Mount API routes
  app.use('/api', createMCPToolsRouter(graphManager));
  app.use('/api', indexRouter);
  app.use('/api/nodes', nodesRouter);

  // MCP endpoint (SSE)
  app.get('/mcp', async (req, res) => {
    try {
      if (!sharedTransport) {
        sharedTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => SHARED_SESSION_ID,
          enableJsonResponse: true
        } as any);
        await (server as any).connect(sharedTransport);
      }
      await sharedTransport.handleRequest(req, res, null);
    } catch (error: any) {
      console.error('❌ MCP SSE error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // MCP endpoint (POST)
  app.post('/mcp', async (req, res) => {
    // Extract path mapping header for per-client path translation
    const pathMapHeader = req.headers['x-mimir-path-map'] as string | undefined;

    // Run request in AsyncLocalStorage context for path mapping
    await requestContext.run({ pathMapHeader }, async () => {
      try {
        let method = req.body?.method || 'unknown';

        if (!sharedTransport) {
          sharedTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => SHARED_SESSION_ID,
            enableJsonResponse: true
          } as any);
          await (server as any).connect(sharedTransport);
        }

        // Auto-initialize on first non-initialize request
        if (!isSessionInitialized && method !== 'initialize') {
          req.body.method = 'initialize';
          req.body.params = {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'http-auto-init', version: '1.0' }
          };
          method = 'initialize';
        }

        // Handle re-initialization
        if (isSessionInitialized && method === 'initialize') {
          res.setHeader('Mcp-Session-Id', SHARED_SESSION_ID);
          return res.json({
            jsonrpc: '2.0',
            id: req.body.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'Mimir-Lite', version: '1.0.0', sessionId: SHARED_SESSION_ID }
            }
          });
        }

        // Mark initialized after first initialize
        if (method === 'initialize') {
          res.setHeader('Mcp-Session-Id', SHARED_SESSION_ID);
          const originalEnd = res.end.bind(res);
          res.end = ((chunk?: any) => {
            isSessionInitialized = true;
            originalEnd(chunk);
          }) as any;
        }

        if (!req.headers['mcp-session-id']) {
          req.headers['mcp-session-id'] = SHARED_SESSION_ID;
        }
        res.setHeader('Mcp-Session-Id', SHARED_SESSION_ID);

        await sharedTransport.handleRequest(req, res, req.body);
      } catch (error: any) {
        console.error('❌ MCP POST error:', error.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', version: '1.0.0', tools: allTools.length });
  });

  // Request logging
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  const httpServer = app.listen(port, () => {
    console.log(`✅ HTTP server: http://localhost:${port}`);
    console.log(`✅ MCP endpoint: http://localhost:${port}/mcp`);
    console.log(`✅ Health check: http://localhost:${port}/health`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n${signal} - shutting down...`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startHttpServer().catch(error => {
  console.error('❌ Server failed to start:', error);
  process.exit(1);
});
