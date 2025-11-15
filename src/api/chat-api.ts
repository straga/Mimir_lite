/**
 * @fileoverview Chat API for RAG-enhanced conversations
 * 
 * Provides chat completion endpoints with Graph-RAG semantic search,
 * similar to the mimir_rag_auto.py pipeline in Open WebUI.
 * 
 * @since 1.0.0
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import type { IGraphManager } from '../types/index.js';
import { handleVectorSearchNodes } from '../tools/vectorSearch.tools.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration for chat API
 */
interface ChatConfig {
  semanticSearchEnabled: boolean;
  semanticSearchLimit: number;
  minSimilarityThreshold: number;
  llmBackend: 'copilot' | 'ollama';
  copilotApiUrl: string;
  ollamaApiUrl: string;
  defaultModel: string;
  embeddingModel: string;
}

/**
 * Chat message structure
 */
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Chat completion request body
 */
interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ChatConfig = {
  semanticSearchEnabled: true,
  semanticSearchLimit: 10,
  minSimilarityThreshold: 0.55,
  llmBackend: 'copilot',
  copilotApiUrl: process.env.COPILOT_API_URL || 'http://copilot-api:4141/v1',
  ollamaApiUrl: process.env.OLLAMA_API_URL || 'http://host.docker.internal:11434',
  defaultModel: process.env.DEFAULT_MODEL || 'gpt-4.1',
  embeddingModel: process.env.EMBEDDING_MODEL || 'mxbai-embed-large',
};

/**
 * Load Claudette-Auto preamble
 */
async function loadClaudetteAutoPreamble(): Promise<string> {
  
  const preamblePaths = [
    path.join(process.cwd(), 'docs/agents/claudette-limerick.md'),
    path.join(__dirname, '../../docs/agents/claudette-limerick.md'),
  ];

  for (const preamblePath of preamblePaths) {
    try {
      const content = await fs.readFile(preamblePath, 'utf-8');
      console.log(`✅ Loaded Claudette-Auto preamble from ${preamblePath}`);
      return content;
    } catch (error) {
      // Try next path
    }
  }

  // Fallback preamble
  console.warn('⚠️  Using fallback Claudette-Auto preamble');
  return `# Claudette Agent v5.2.1

You are an autonomous AI assistant that helps users accomplish their goals by:
- Providing accurate, relevant information
- Breaking down complex tasks into manageable steps
- Using context from the knowledge base when available
- Being concise, clear, and helpful

Always prioritize user needs and provide practical solutions.`;
}

/**
 * Create chat API router (OpenAI-compatible)
 */
export function createChatRouter(graphManager: IGraphManager): express.Router {
  const router = express.Router();
  const config = { ...DEFAULT_CONFIG };
  let claudettePreamble = '';

  // Load preamble on startup
  loadClaudetteAutoPreamble().then(preamble => {
    claudettePreamble = preamble;
  });

  /**
   * POST /v1/chat/completions
   * OpenAI-compatible RAG-enhanced chat completion with streaming
   */
  router.post('/v1/chat/completions', async (req: any, res: any) => {
    try {
      const body: ChatCompletionRequest = req.body;
      const { messages, stream = true } = body;

      if (!messages || messages.length === 0) {
        return res.status(400).json({ error: 'No messages provided' });
      }

      // Get the latest user message
      const userMessage = messages[messages.length - 1]?.content || '';
      
      if (!userMessage) {
        return res.status(400).json({ error: 'No user message found' });
      }

      console.log(`\n💬 Chat request: ${userMessage.substring(0, 100)}...`);

      // Get model from request or use default
      // Note: Do NOT split on '.' as gpt-4.1 is a version number, not a provider prefix
      let selectedModel = body.model || config.defaultModel;
      
      // Only clean up if it has a provider prefix (e.g., 'mimir:model-name')
      if (selectedModel.startsWith('mimir:')) {
        selectedModel = selectedModel.replace('mimir:', '');
      }
      
      console.log(`📋 Using model: ${selectedModel}`);

      // Set up SSE if streaming
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      // Helper to send OpenAI-compatible SSE chunks
      const sendChunk = (content: string, finish_reason: string | null = null) => {
        if (stream) {
          const chunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: selectedModel,
            choices: [
              {
                index: 0,
                delta: finish_reason ? {} : { content },
                finish_reason,
              },
            ],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      };

      // Send initial status (as comment for debugging)
      if (stream) {
        res.write(`: 🔍 Retrieving relevant context...\n\n`);
      }

      // Perform semantic search if enabled
      let relevantContext = '';
      let contextCount = 0;

      if (config.semanticSearchEnabled) {
        try {
          console.log(`🔍 Performing semantic search for: "${userMessage.substring(0, 100)}..."`);
          console.log(`   Min similarity: ${config.minSimilarityThreshold}, Limit: ${config.semanticSearchLimit}`);
          
          // Use vector search tool
          const searchResult = await handleVectorSearchNodes(
            {
              query: userMessage,
              types: undefined, // search all types
              limit: config.semanticSearchLimit,
              min_similarity: config.minSimilarityThreshold
            },
            graphManager.getDriver()
          );

          if (searchResult && searchResult.results && searchResult.results.length > 0) {
            const searchResults = searchResult.results;
            contextCount = searchResults.length;
            console.log(`✅ Found ${contextCount} relevant documents:`, 
              searchResults.map((r: any) => `${r.title || r.id} (${r.similarity?.toFixed(3) || 'N/A'})`)
            );

            // Format context
            const contextParts: string[] = [];
            for (const result of searchResults) {
              const sourceLabel = result.type === 'memory' ? 'Memory' : 'File';
              const quality = result.similarity >= 0.90 ? '🔥 Excellent' :
                             result.similarity >= 0.80 ? '✅ High' :
                             result.similarity >= 0.75 ? '📊 Good' : '📉 Moderate';

              // Get the actual content - try multiple fields
              const contentText = result.chunk_text || result.content || result.content_preview || result.description || 'No content available';
              
              // Include absolute path if available (for agent to access files directly)
              const locationInfo = result.absolute_path ? `\n**Path:** ${result.absolute_path}` : 
                                   result.path ? `\n**Path:** ${result.path}` : '';

              contextParts.push(
                `**${sourceLabel}:** ${result.title || result.id}${locationInfo}\n` +
                `**Quality:** ${quality} (score: ${result.similarity.toFixed(3)})\n` +
                `**Content:**\n\`\`\`\n${contentText}\n\`\`\`\n\n---\n\n`
              );
            }

            relevantContext = contextParts.join('');
            if (stream) {
              res.write(`: ✅ Found ${contextCount} relevant document(s)\n\n`);
            }
          } else {
            console.log('ℹ️ No relevant context found');
            if (stream) {
              res.write(`: ℹ️ No relevant context found\n\n`);
            }
          }
        } catch (searchError: any) {
          console.error('⚠️ Semantic search failed:', searchError);
          if (stream) {
            res.write(`: ⚠️ Search failed: ${searchError.message}\n\n`);
          }
        }
      }

      // Build context section
      let contextSection = '';
      if (relevantContext) {
        console.log(`📝 Context length: ${relevantContext.length} characters`);
        console.log(`📝 Context preview (first 500 chars):\n${relevantContext.substring(0, 500)}...`);
        contextSection = `

## RELEVANT CONTEXT FROM KNOWLEDGE BASE

The following context was retrieved from the Mimir knowledge base based on semantic similarity to your request:

${relevantContext}

---

`;
      } else {
        console.log('⚠️ No context to inject - relevantContext is empty');
      }

      // Construct enriched prompt
      const enrichedPrompt = `${claudettePreamble}

---

## USER REQUEST

<user_request>
${userMessage}
</user_request>
${contextSection}
---

Please address the user's request using the provided context and your capabilities.`;

      console.log(`📋 Enriched prompt length: ${enrichedPrompt.length} characters`);
      console.log(`📋 Context section included: ${contextSection.length > 0 ? 'YES' : 'NO'}`);

      // Send processing status
      const backendName = config.llmBackend === 'ollama' ? 'Ollama' : 'Copilot API';
      if (stream) {
        res.write(`: 🤖 Processing with ${selectedModel} (${backendName})...\n\n`);
      }

      // Call LLM
      console.log(`🤖 Calling ${backendName} with model: ${selectedModel}`);
      
      if (config.llmBackend === 'ollama') {
        await streamOllamaResponse(enrichedPrompt, selectedModel, res, stream, sendChunk);
      } else {
        await streamCopilotResponse(enrichedPrompt, selectedModel, res, stream, sendChunk);
      }

      // Send completion status
      if (stream) {
        res.write(`: ✅ Response complete\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }

    } catch (error: any) {
      console.error('❌ Chat completion error:', error);
      
      if (res.headersSent) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({
          error: 'Chat completion failed',
          details: error.message,
        });
      }
    }
  });

  /**
   * POST /v1/embeddings
   * OpenAI-compatible embeddings endpoint (proxies to Ollama)
   */
  router.post('/v1/embeddings', async (req: any, res: any) => {
    try {
      const { input, model = config.embeddingModel } = req.body;

      if (!input) {
        return res.status(400).json({
          error: {
            message: 'Input is required',
            type: 'invalid_request_error',
            param: 'input',
            code: null,
          },
        });
      }

      console.log(`🔢 Embeddings request for model: ${model}`);

      // Normalize input to array
      const inputs = Array.isArray(input) ? input : [input];

      // Call Ollama for embeddings
      const ollamaUrl = `${config.ollamaApiUrl}/api/embeddings`;
      const embeddings: number[][] = [];

      for (const text of inputs) {
        const response = await fetch(ollamaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt: text,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ollama embeddings error: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as any;
        embeddings.push(data.embedding);
      }

      // Return OpenAI-compatible response
      res.json({
        object: 'list',
        data: embeddings.map((embedding, index) => ({
          object: 'embedding',
          embedding,
          index,
        })),
        model,
        usage: {
          prompt_tokens: inputs.reduce((sum: number, text: string) => sum + text.length / 4, 0), // Rough estimate
          total_tokens: inputs.reduce((sum: number, text: string) => sum + text.length / 4, 0),
        },
      });

      console.log(`✅ Embeddings generated: ${embeddings.length} vectors`);
    } catch (error: any) {
      console.error('❌ Embeddings error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to generate embeddings',
          type: 'api_error',
          param: null,
          code: null,
        },
      });
    }
  });

  /**
   * Shared handler for models endpoints
   * Proxies to configured chat provider for both /models and /v1/models
   */
  const handleModelsRequest = async (req: any, res: any) => {
    try {
      // Proxy to configured chat provider's models endpoint
      const providerUrl = config.copilotApiUrl.replace('/v1', ''); // Remove /v1 suffix if present
      const modelsUrl = `${providerUrl}/models`;
      
      console.log(`🔗 Proxying ${req.path} request to chat provider: ${modelsUrl}`);
      
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Provider returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('❌ Error fetching models from chat provider:', error.message);
      // Fallback to static models list
      res.json({
        object: 'list',
        data: [
          {
            id: config.defaultModel,
            object: 'model',
            created: Date.now(),
            owned_by: 'mimir',
          },
          {
            id: config.embeddingModel,
            object: 'model',
            created: Date.now(),
            owned_by: 'mimir',
          },
        ],
      });
    }
  };

  /**
   * GET /v1/models
   * OpenAI-compatible models list - proxies to configured chat provider
   */
  router.get('/v1/models', handleModelsRequest);

  /**
   * GET /models
   * Models list - proxies to configured chat provider (same as /v1/models)
   */
  router.get('/models', handleModelsRequest);

  return router;
}

/**
 * Stream response from Copilot API (OpenAI-compatible format)
 */
async function streamCopilotResponse(
  prompt: string,
  model: string,
  res: any,
  stream: boolean,
  sendChunk: (content: string, finish_reason: string | null) => void
) {
  const config = DEFAULT_CONFIG;
  const url = `${config.copilotApiUrl}/chat/completions`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-copilot-dummy',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.7,
      max_tokens: 128000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Copilot API error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error('No response body from Copilot API');
  }

  // Stream SSE response in OpenAI-compatible format
  const reader = response.body;
  let buffer = '';

  for await (const chunk of reader as any) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          sendChunk('', 'stop');
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            sendChunk(content, null);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

/**
 * Stream response from Ollama (converted to OpenAI-compatible format)
 */
async function streamOllamaResponse(
  prompt: string,
  model: string,
  res: any,
  stream: boolean,
  sendChunk: (content: string, finish_reason: string | null) => void
) {
  const config = DEFAULT_CONFIG;
  const url = `${config.ollamaApiUrl}/api/chat`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      options: {
        temperature: 0.7,
        num_predict: 128000,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error('No response body from Ollama');
  }

  // Stream JSONL response, converting to OpenAI-compatible format
  const reader = response.body;
  let buffer = '';

  for await (const chunk of reader as any) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line);
        const content = parsed.message?.content;
        if (content) {
          sendChunk(content, null);
        }
        if (parsed.done) {
          sendChunk('', 'stop');
          break;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}
