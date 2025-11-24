[**mimir v1.0.0**](../README.md)

***

[mimir](../README.md) / api/chat-api

# api/chat-api

## Description

RAG-enhanced chat API with semantic search

Provides OpenAI-compatible chat completion endpoints with automatic
Graph-RAG semantic search integration. Queries are enriched with
relevant context from the Neo4j graph database before being sent
to the LLM.

**Features:**
- OpenAI-compatible `/v1/chat/completions` endpoint
- Automatic semantic search for relevant context
- Multi-provider LLM support (OpenAI, Anthropic, Ollama, etc.)
- Streaming and non-streaming responses
- Context injection from graph database

**Endpoints:**
- `POST /v1/chat/completions` - Chat completion with RAG (OpenAI-compatible)
- `POST /v1/embeddings` - Generate embeddings (OpenAI-compatible)
- `GET /v1/models` - List available LLM models (OpenAI-compatible)
- `GET /models` - List available LLM models (alias)
- `GET /api/preambles` - List available agent preambles
- `GET /api/preambles/:name` - Get specific preamble
- `GET /api/tools` - List available MCP tools
- `GET /api/models` - List models (legacy endpoint)

## Example

```typescript
// Chat with RAG context (OpenAI-compatible)
fetch('/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'What did we decide about auth?' }],
    stream: false
  })
});
```

## Since

1.0.0

## Functions

### createChatRouter()

> **createChatRouter**(`graphManager`): `Router`

Defined in: src/api/chat-api.ts:187

Create chat API router (OpenAI-compatible)

#### Parameters

##### graphManager

[`IGraphManager`](../types/IGraphManager.md#igraphmanager)

#### Returns

`Router`
