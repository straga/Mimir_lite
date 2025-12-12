/**
 * @file src/config/embeddings-config.ts
 * @description Simple embeddings configuration from environment variables
 *
 * Mimir-lite: No LLM orchestration, just embeddings for vector search
 */

export interface EmbeddingsConfig {
  enabled: boolean;
  provider: string;
  model: string;
  dimensions: number;
  baseUrl: string;
  apiPath: string;
  apiKey: string;
}

/**
 * Get embeddings configuration from environment variables
 */
export function getEmbeddingsConfig(): EmbeddingsConfig {
  return {
    enabled: process.env.MIMIR_EMBEDDINGS_ENABLED === 'true',
    provider: process.env.MIMIR_EMBEDDINGS_PROVIDER || 'ollama',
    model: process.env.MIMIR_EMBEDDINGS_MODEL || 'nomic-embed-text',
    dimensions: parseInt(process.env.MIMIR_EMBEDDINGS_DIMENSIONS || '768', 10),
    baseUrl: process.env.MIMIR_EMBEDDINGS_API || 'http://localhost:11434',
    apiPath: process.env.MIMIR_EMBEDDINGS_API_PATH || '/api/embeddings',
    apiKey: process.env.MIMIR_EMBEDDINGS_API_KEY || 'dummy-key',
  };
}

/**
 * Check if embeddings are enabled
 */
export function isEmbeddingsEnabled(): boolean {
  return process.env.MIMIR_EMBEDDINGS_ENABLED === 'true';
}
