# Model Selection Guide

**Version**: 2.0.0 (Dynamic Model Support)  
**Date**: 2025-11-19

## Overview

Mimir now uses **fully dynamic model selection** - model names are plain strings that pass through to your LLM provider without validation or mapping. The system trusts your provider's `/v1/models` endpoint to define what's available.

## How It Works

### 1. **Models Are Just Strings**

```typescript
// ✅ Any string is valid
const model = 'gpt-4.1';
const model = 'claude-sonnet-4';
const model = 'my-custom-model';
const model = 'grok-2';
```

**No validation occurs** - the model name is passed directly to your LLM provider. If the model doesn't exist, the provider will return an error.

### 2. **Model Selection Hierarchy**

Models are selected in this order (first match wins):

```
1. Explicitly passed model parameter
   ↓
2. Agent-specific environment variable (MIMIR_PM_MODEL, MIMIR_WORKER_MODEL, MIMIR_QC_MODEL)
   ↓
3. Default environment variable (MIMIR_DEFAULT_MODEL)
   ↓
4. Hardcoded fallback ('gpt-4.1')
```

**Example**:
```typescript
// If you call:
const client = new CopilotAgentClient({
  model: 'claude-sonnet-4',  // ← This is used
  agentType: 'pm'
});

// Even if you have:
// MIMIR_PM_MODEL=gpt-4o
// MIMIR_DEFAULT_MODEL=gpt-4.1
// The explicitly passed model takes precedence
```

## Configuration

### Environment Variables

| Variable | Scope | Default | Example |
|----------|-------|---------|---------|
| `MIMIR_DEFAULT_MODEL` | All agents | `gpt-4.1` | `claude-sonnet-4` |
| `MIMIR_PM_MODEL` | PM agent only | (uses default) | `gpt-4o` |
| `MIMIR_WORKER_MODEL` | Worker agents | (uses default) | `claude-3.5-sonnet` |
| `MIMIR_QC_MODEL` | QC agents | (uses default) | `gpt-4.1` |

### Setting Models

**Option 1: Environment Variables**
```bash
# Set default for all agents
export MIMIR_DEFAULT_MODEL=claude-sonnet-4

# Set per-agent overrides
export MIMIR_PM_MODEL=gpt-4o
export MIMIR_WORKER_MODEL=claude-3.5-sonnet
export MIMIR_QC_MODEL=gpt-4.1
```

**Option 2: Docker Compose**
```yaml
environment:
  - MIMIR_DEFAULT_MODEL=claude-sonnet-4
  - MIMIR_PM_MODEL=gpt-4o
  - MIMIR_WORKER_MODEL=claude-3.5-sonnet
  - MIMIR_QC_MODEL=gpt-4.1
```

**Option 3: Code**
```typescript
const client = new CopilotAgentClient({
  preamblePath: 'agent.md',
  model: 'claude-sonnet-4',  // Explicit model
  agentType: 'worker'
});
```

## Implementation Details

### LLM Client (`llm-client.ts`)

```typescript
public getModel(): string {
  if (!this.llm) {
    if (this.agentConfig.model) {
      return this.agentConfig.model;  // 1. Explicit model
    }
    // 2. Default from env var or fallback
    return process.env.MIMIR_DEFAULT_MODEL || "gpt-4.1";
  }
  return this.modelName;
}
```

### Chat API (`chat-api.ts`)

```typescript
const DEFAULT_CONFIG: ChatConfig = {
  // ... other config
  defaultModel: process.env.MIMIR_DEFAULT_MODEL || 'qwen3:4b',
};
```

### Orchestration API (`orchestration-api.ts`)

```typescript
const pmAgent = new CopilotAgentClient({
  preamblePath: pmPreamblePath,
  model: process.env.MIMIR_PM_MODEL || 
         process.env.MIMIR_DEFAULT_MODEL || 
         'gpt-4.1',
  agentType: 'pm',
});
```

## Discovering Available Models

### List Models from Endpoint

```bash
npm run list-models
```

**Output**:
```
📋 Fetching Available Models...

   Checking: http://localhost:9042/v1/models
   Timeout: 5 seconds

✅ Found 31 models from http://localhost:9042/v1:

AZURE OPENAI:
  - gpt-4.1
  - gpt-5
  - claude-sonnet-4
  - gemini-2.5-pro

💡 Current default: gpt-4.1
   Set via: export MIMIR_DEFAULT_MODEL=<model-name>
```

### Fetch Models Programmatically

```typescript
import { fetchAvailableModels } from './orchestrator/types.js';

const apiUrl = process.env.MIMIR_LLM_API || 'http://localhost:4141/v1';
const models = await fetchAvailableModels(apiUrl);

console.log('Available models:', models.map(m => m.id));
// ['gpt-4.1', 'gpt-4o', 'claude-sonnet-4', ...]
```

## Use Cases

### 1. **Single Model for Everything**
```bash
export MIMIR_DEFAULT_MODEL=gpt-4o
```
All agents use `gpt-4o`.

### 2. **Different Models Per Agent Type**
```bash
export MIMIR_PM_MODEL=gpt-4o           # PM: planning, complex
export MIMIR_WORKER_MODEL=gpt-4o-mini  # Workers: execution
export MIMIR_QC_MODEL=gpt-4.1          # QC: validation
```

### 3. **Provider-Specific Models**

**Ollama**:
```bash
export MIMIR_DEFAULT_PROVIDER=ollama
export MIMIR_LLM_API=http://localhost:11434
export MIMIR_DEFAULT_MODEL=qwen2.5-coder:14b
```

**GitHub Copilot**:
```bash
export MIMIR_DEFAULT_PROVIDER=openai
export MIMIR_LLM_API=http://localhost:4141/v1
export MIMIR_DEFAULT_MODEL=gpt-4.1
```

**OpenAI Direct**:
```bash
export MIMIR_DEFAULT_PROVIDER=openai
export MIMIR_LLM_API=https://api.openai.com/v1
export MIMIR_LLM_API_KEY=sk-...
export MIMIR_DEFAULT_MODEL=gpt-4-turbo
```

### 4. **Custom/Fine-Tuned Models**

```bash
# Any model name your provider supports
export MIMIR_DEFAULT_MODEL=my-custom-fine-tuned-model
export MIMIR_DEFAULT_MODEL=ft:gpt-4-0613:company::abcd1234
```

## Error Handling

### What Happens If Model Doesn't Exist?

The LLM provider will return an error:

**Ollama**:
```json
{
  "error": "model 'invalid-model' not found"
}
```

**OpenAI-compatible**:
```json
{
  "error": {
    "message": "The model 'invalid-model' does not exist",
    "type": "invalid_request_error"
  }
}
```

**No client-side validation occurs** - errors come from the provider.

### Debugging Model Issues

**1. List available models**:
```bash
npm run list-models
```

**2. Check what model is being used**:
```bash
echo $MIMIR_DEFAULT_MODEL
echo $MIMIR_PM_MODEL
echo $MIMIR_WORKER_MODEL
echo $MIMIR_QC_MODEL
```

**3. Test model directly with curl**:
```bash
curl http://localhost:4141/v1/models
```

**4. Check provider logs** for model-not-found errors.

## Migration from Old Enum System

### Before (v1.x)

```typescript
import { CopilotModel } from './types.js';

const client = new CopilotAgentClient({
  model: CopilotModel.GPT_4_1,  // ❌ No longer exists
});
```

### After (v2.0)

```typescript
const client = new CopilotAgentClient({
  model: 'gpt-4.1',  // ✅ Plain string
  // or
  model: process.env.MIMIR_DEFAULT_MODEL,  // ✅ From env
  // or just omit - falls back to env var
});
```

## Benefits

### ✅ **Provider Agnostic**
Works with:
- GitHub Copilot API
- Ollama
- OpenAI
- Azure OpenAI
- Any OpenAI-compatible endpoint (llama.cpp, vLLM, etc.)

### ✅ **Future-Proof**
- New models? Just use them (no code update)
- Provider adds models? Available immediately
- Custom models? Supported out of the box

### ✅ **Flexible Configuration**
- Change models via env vars (no recompilation)
- Different models per agent type
- Different models per deployment environment

### ✅ **No Maintenance Burden**
- No enum to update when models are released
- No hardcoded model mappings
- No version-specific constants

## FAQ

**Q: How do I know which models are available?**  
A: Run `npm run list-models` to fetch from your provider's endpoint.

**Q: What if I misspell a model name?**  
A: The LLM provider will return an error. Check logs and verify the model name.

**Q: Can I use different providers for different agents?**  
A: Not currently per-agent, but you can change the global provider via `MIMIR_DEFAULT_PROVIDER`.

**Q: Do model names need to match exactly?**  
A: Yes! They're passed through as-is. If your provider calls it `gpt-4o`, use `gpt-4o` (not `gpt4o`).

**Q: What about model aliases?**  
A: Some providers support aliases (e.g., `gpt-4.1` → `gpt-4o-2024-11-20`). Check your provider docs.

**Q: Can I validate models before using them?**  
A: Not built-in, but you could fetch available models and check:
```typescript
const available = await fetchAvailableModels(apiUrl);
const modelExists = available.some(m => m.id === myModel);
```

## Summary

**Model Selection Is Now**:
- ✅ String-based (no enum)
- ✅ Env var driven (no hardcoding)
- ✅ Provider-defined (no validation)
- ✅ Pass-through (no mapping)

**Hierarchy**:
```
Explicit parameter > Agent env var > Default env var > 'gpt-4.1'
```

**Discovery**:
```bash
npm run list-models  # Shows what's actually available
```

Simple, flexible, future-proof! 🚀
