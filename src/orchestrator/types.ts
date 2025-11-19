/**
 * LLM Provider Types
 * 
 * Aliases:
 * - ollama, llama.cpp: Local LLM provider (Ollama or llama.cpp - interchangeable)
 * - copilot, openai: OpenAI-compatible endpoint (GitHub Copilot or OpenAI API)
 */
export enum LLMProvider {
  OLLAMA = 'ollama',
  COPILOT = 'copilot',
  OPENAI = 'openai',
}

/**
 * Normalize provider name to canonical value
 * Handles aliases:
 * - llama.cpp → openai (llama.cpp is OpenAI-compatible)
 * - copilot → openai
 */
export function normalizeProvider(providerName: string | LLMProvider | undefined): LLMProvider {
  if (!providerName) return LLMProvider.OPENAI; // Default
  
  const normalized = String(providerName).toLowerCase().trim();
  
  // Map aliases to canonical values
  switch (normalized) {
    case 'ollama':
      return LLMProvider.OLLAMA; // Native Ollama API (/api/chat)
    case 'llama.cpp':
    case 'openai':
    case 'copilot':
      return LLMProvider.OPENAI; // OpenAI-compatible APIs (/v1/chat/completions)
    default:
      // Try to match enum values
      if (Object.values(LLMProvider).includes(normalized as LLMProvider)) {
        return normalized as LLMProvider;
      }
      // Default fallback
      console.warn(`Unknown provider "${providerName}", defaulting to openai`);
      return LLMProvider.OPENAI;
  }
}

/**
 * Fetch available models from LLM provider endpoint
 * Queries the configured LLM provider's /v1/models endpoint for available models
 * 
 * @param apiUrl - Base URL of the LLM provider API (e.g., http://localhost:11434/v1)
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Promise of model list with id and owned_by fields
 * 
 * @example
 * const models = await fetchAvailableModels('http://copilot-api:4141/v1');
 * console.log(models.map(m => m.id));
 */
export async function fetchAvailableModels(
  apiUrl: string,
  timeoutMs: number = 5000
): Promise<Array<{ id: string; owned_by: string; object?: string }>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const modelsEndpoint = `${apiUrl}/models`;
    const response = await fetch(modelsEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch models from ${modelsEndpoint}: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json() as any;
    
    // Handle OpenAI-compatible response format
    if (data.data && Array.isArray(data.data)) {
      return data.data.filter((m: any) => m.id); // Filter valid models
    }
    
    // Fallback if response is directly an array
    if (Array.isArray(data)) {
      return data.filter((m: any) => m.id);
    }

    console.warn(`Unexpected response format from ${modelsEndpoint}:`, data);
    return [];
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn(`Timeout fetching models from ${apiUrl} (${timeoutMs}ms)`);
    } else {
      console.warn(`Error fetching models from ${apiUrl}:`, error);
    }
    return [];
  }
}
  