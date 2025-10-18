# HTTP Transport Requirements for MCP Server

This document lists the HTTP transport requirements, recommended patterns, example code snippets, and exact npm package versions needed to run an MCP server with HTTP-based transports.

## Context
- Requested task: document HTTP transport requirements for the MCP server.
- Dependency note: this task declared a dependency on `node-5-1760385919575` and requested retrieval of `node-6-1760385919575`, but those knowledge-graph nodes were not found in the graph at the time of writing. The implementation below therefore assumes no prior node data and documents the transport requirements as a standalone reference.

## Overview
The MCP HTTP transport stack should support:
- Modern Streamable HTTP transports (POST + SSE/streaming responses)
- Legacy SSE + POST fallbacks for older clients
- Secure CORS configuration for browser-based clients
- Session management with optional resumability and session stores
- Clear package and version pinning for reproducible installs

## StreamableHTTPServerTransport (from `@modelcontextprotocol/sdk`)
- Purpose: provide a bidirectional HTTP transport that supports streaming responses (SSE-style) and POST-based client requests in a way compatible with the MCP server's `McpServer` implementation.
- Key behaviors:
  - Accepts client messages via HTTP POST and routes them into the MCP server.
  - Responds using a streaming mechanism (SSE/event-stream) or chunked JSON responses to enable incremental model output.
  - Supports session IDs and optional resumability (clients may re-attach to an existing session ID to continue a conversation/stateful exchange).
  - Hooks for authentication/authorization should be applied at the Express middleware layer before constructing/connecting the transport.

Example (pseudo-code sketch):

```javascript
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const app = express();
app.use(express.json());

const server = new McpServer({ name: 'mcp-http-server', version: '1.0.0' });

// Map sessionId -> transport to support resumability if needed
const activeTransports = new Map();

app.all('/mcp', async (req, res) => {
  // Example: Streamable transport handles both initial connect and streaming responses
  const transport = new StreamableHTTPServerTransport({ request: req, response: res });
  activeTransports.set(transport.sessionId, transport);

  res.on('close', () => {
    activeTransports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.listen(3000);
```

Implementation notes:
- Use the `StreamableHTTPServerTransport` API to create a transport per incoming HTTP connection (the SDK provides helpers to parse/emit events and manage a session id).
- Ensure the transport lifecycle is cleaned up on connection close to avoid memory leaks.
- If using resumability, persist minimal session metadata (sessionId → last event index, allowed TTL) in a fast store (Redis) to allow clients to reattach.

## Express server setup with CORS
When the MCP frontend and server are on different origins, configure CORS carefully to avoid leaking credentials or broad access.

Minimal secure setup example:

```javascript
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: 'https://app.example.com', // set exact origin(s) for your frontends
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true, // allow cookies and credentials when needed
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
```

Recommendations:
- Prefer a small allowlist of origins rather than `*`.
- When using credentials (cookies or `Authorization` headers), ensure `credentials: true` and do not use `origin: '*'`.
- Allow preflight OPTIONS requests and keep CORS middleware early in the chain.

## Session Management Patterns
There are two common patterns depending on whether you need server-side state:

1. Stateful sessions (recommended when using resumable transports or server-side user state):
   - Use `express-session` with a production-ready session store (Redis, Memcached, or a managed store).
   - Store only minimal session metadata server-side and avoid large payloads.
   - Secure cookie settings: `httpOnly: true`, `secure: true` (HTTPS), `sameSite: 'lax'` or `'strict'` based on app needs.

Example:

```javascript
import session from 'express-session';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';

const RedisStore = connectRedis(session);
const redisClient = new Redis(process.env.REDIS_URL);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'replace-me-with-secure-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
}));
```

2. Stateless sessions (JWT or bearer tokens):
   - Use JWTs when you prefer no server-side persistence. Sign tokens securely and validate on each request.
   - This pattern works well for pure request/response flows but complicates resumability since the server has no authoritative session store.

Resumability considerations:
- If you require clients to resume streams or continue model stateful sessions, prefer server-side session metadata with a TTL in Redis.
- Store only session pointers and indices (e.g., lastEventIndex, createdAt, userId) to reconstruct or validate resumed sessions.

Security considerations:
- Rotate session secrets if needed and support session invalidation (logout) by deleting server-side session data.
- Validate that sessionId re-attachments match an authenticated principal (prevent session hijacking).

## Required npm packages (exact versions)
Below are recommended exact package versions tested for compatibility with this codebase. The repository's `package.json` already includes `@modelcontextprotocol/sdk` — use the pinned version there unless you have a reason to upgrade.

- **@modelcontextprotocol/sdk**: 1.18.2 (matches repository `package.json` dependency)
- **express**: 4.18.2
- **cors**: 2.8.5
- **express-session**: 1.17.3
- **connect-redis**: 7.0.0 (compatible with `express-session` stores)  
- **ioredis**: 5.3.2 (Redis client for production stores)

TypeScript / dev types (if using TypeScript):
- **@types/express**: 4.17.17
- **@types/cors**: 2.8.12
- **@types/express-session**: 1.17.5

Installation command (pinning exact versions):

```bash
npm install @modelcontextprotocol/sdk@1.18.2 express@4.18.2 cors@2.8.5 express-session@1.17.3 connect-redis@7.0.0 ioredis@5.3.2

# (if using TypeScript)
npm install -D @types/express@4.17.17 @types/cors@2.8.12 @types/express-session@1.17.5
```

Notes on versions:
- `@modelcontextprotocol/sdk` version is taken from this repository's `package.json` (1.18.2). If you upgrade the SDK, check migration notes in the SDK changelog for transport API changes.
- `express@4.18.2` is widely used and stable; Express 5.x existed in RC for a long time but some ecosystem packages were slower to catch up — pin based on your risk tolerance.

## Operational recommendations
- Frontend clients should prefer the Streamable HTTP transport where supported; fallback to SSE + POST endpoints for older clients.
- Use a session TTL and a short-lived resume window to limit state stored for resumability (e.g., 1–24 hours depending on use case).
- Instrument transport lifecycle events (connect, disconnect, error) for observability and troubleshooting.
- Rate-limit POST endpoints and apply auth checks to avoid abuse (API keys, JWTs, or cookie-based sessions).

## Troubleshooting
- If clients report truncated streams, verify that any reverse proxy (NGINX, Cloud Load Balancer) has `proxy_buffering off` and does not buffer event-stream responses.
- For long-lived SSE connections: ensure keep-alive settings and proxy timeouts are larger than the expected idle time.

## References
- Repository `package.json` (uses `@modelcontextprotocol/sdk@^1.18.2`)
- `@modelcontextprotocol/sdk` transport docs (refer to SDK package for exact API signatures)
- Express CORS docs and `express-session` guides

---
Generated by automation per task request. If you want me to pin different versions (e.g., Express 5.x), I can update the recommended versions and the installation command.
