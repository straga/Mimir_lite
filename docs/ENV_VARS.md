# Mimir Environment Variables Reference

**Last Updated:** 2025-11-24  
**Version:** 2.1 (Unified API + Vision Intelligence)

## Overview

Mimir uses split configuration with base URLs and paths. This provides maximum flexibility while keeping configuration explicit and simple. No URL parsing or manipulation - just straightforward concatenation.

## Core Philosophy

- **Explicit over Implicit**: Base URL + paths (simple concatenation, no parsing)
- **Separation of Concerns**: LLM and embeddings configured independently
- **Provider Agnostic**: Works with Ollama, OpenAI, Copilot, or any OpenAI-compatible API
- **Flexible Paths**: Different providers can use different endpoint paths

---

## LLM API Configuration

### `MIMIR_LLM_API`
**Required**: Yes  
**Type**: String (Base URL)  
**Default**: `http://ollama:11434`

**Base URL of the LLM server (no paths).**

```bash
# Ollama
MIMIR_LLM_API=http://ollama:11434

# Copilot API
MIMIR_LLM_API=http://copilot-api:4141

# External OpenAI-compatible
MIMIR_LLM_API=http://host.docker.internal:8080

# OpenAI
MIMIR_LLM_API=https://api.openai.com
```

### `MIMIR_LLM_API_PATH`
**Required**: No  
**Type**: String (Path)  
**Default**: `/v1/chat/completions`

**Path to the chat completions endpoint.**

```bash
MIMIR_LLM_API_PATH=/v1/chat/completions
```

### `MIMIR_LLM_API_MODELS_PATH`
**Required**: No  
**Type**: String (Path)  
**Default**: `/v1/models`

**Path to the models list endpoint.**

```bash
MIMIR_LLM_API_MODELS_PATH=/v1/models
```

### `MIMIR_LLM_API_KEY`
**Required**: No (depends on provider)  
**Type**: String  
**Default**: `dummy-key`

**API key for authentication.**

```bash
# Local Ollama (no auth needed)
MIMIR_LLM_API_KEY=dummy-key

# OpenAI
MIMIR_LLM_API_KEY=sk-...

# Copilot
MIMIR_LLM_API_KEY=sk-copilot-...
```

---

## Embeddings API Configuration

### `MIMIR_EMBEDDINGS_API`
**Required**: Yes (if embeddings enabled)  
**Type**: String (Base URL)  
**Default**: `http://ollama:11434`

**Base URL of the embeddings server (no paths).**

```bash
# Ollama
MIMIR_EMBEDDINGS_API=http://ollama:11434

# Copilot API
MIMIR_EMBEDDINGS_API=http://copilot-api:4141

# OpenAI
MIMIR_EMBEDDINGS_API=https://api.openai.com
```

### `MIMIR_EMBEDDINGS_API_PATH`
**Required**: No  
**Type**: String (Path)  
**Default**: `/api/embeddings` (for Ollama)

**Path to the embeddings endpoint.**

```bash
# Ollama native format (default)
MIMIR_EMBEDDINGS_API_PATH=/api/embeddings

# OpenAI-compatible format
MIMIR_EMBEDDINGS_API_PATH=/v1/embeddings
```

### `MIMIR_EMBEDDINGS_API_MODELS_PATH`
**Required**: No  
**Type**: String (Path)  
**Default**: `/api/tags` (for Ollama)

**Path to the models list endpoint for embeddings.**

```bash
# Ollama native format
MIMIR_EMBEDDINGS_API_MODELS_PATH=/api/tags

# OpenAI-compatible format
MIMIR_EMBEDDINGS_API_MODELS_PATH=/v1/models
```

### `MIMIR_EMBEDDINGS_API_KEY`
**Required**: No (depends on provider)  
**Type**: String  
**Default**: `dummy-key`

**API key for embeddings authentication.**

```bash
MIMIR_EMBEDDINGS_API_KEY=dummy-key
```

---

## Provider and Model Configuration

### `MIMIR_DEFAULT_PROVIDER`
**Type**: String  
**Default**: `copilot`  
**Options**: `copilot` | `ollama` | `openai`

**Default provider for model discovery.**

### `MIMIR_DEFAULT_MODEL`
**Type**: String  
**Default**: `gpt-4.1`

**Default model name.**

```bash
# Examples
MIMIR_DEFAULT_MODEL=gpt-4.1
MIMIR_DEFAULT_MODEL=qwen2.5-coder:14b
MIMIR_DEFAULT_MODEL=gpt-4-turbo
```

### `MIMIR_CONTEXT_WINDOW`
**Type**: Number  
**Default**: `128000`

**Maximum context window size in tokens.**

---

## Embeddings Configuration

### `MIMIR_EMBEDDINGS_ENABLED`
**Type**: Boolean  
**Default**: `true`

### `MIMIR_EMBEDDINGS_PROVIDER`
**Type**: String  
**Default**: `ollama`  
**Options**: `ollama` | `openai` | `copilot` | `llama.cpp`

### `MIMIR_EMBEDDINGS_MODEL`
**Type**: String  
**Default**: Architecture-dependent
- **ARM64**: `mxbai-embed-large`
- **AMD64**: `text-embedding-3-small`

### `MIMIR_EMBEDDINGS_DIMENSIONS`
**Type**: Number  
**Default**: Architecture-dependent
- **ARM64**: `1024`
- **AMD64**: `1536`

### `MIMIR_EMBEDDINGS_CHUNK_SIZE`
**Type**: Number  
**Default**: `512`

### `MIMIR_EMBEDDINGS_CHUNK_OVERLAP`
**Type**: Number  
**Default**: `50`

---

## Image/Vision Configuration

### Overview

Mimir supports **Vision-Language (VL) models** for indexing images by generating text descriptions, which are then embedded alongside text content. This enables semantic search across both text and images.

**Architecture:**
```
Image File → llama.cpp (qwen2.5-vl) → Text Description → 
nomic-embed-text (embed description) → Neo4j (vector + description)
```

### `MIMIR_EMBEDDINGS_IMAGES`
**Type**: Boolean  
**Default**: `false`  
**⚠️ Security**: Disabled by default (requires explicit opt-in)

**Enable image indexing and embeddings.**

```bash
MIMIR_EMBEDDINGS_IMAGES=true   # Enable
MIMIR_EMBEDDINGS_IMAGES=false  # Disable (default)
```

**Why disabled by default?**
- Image processing is resource-intensive (2-8GB RAM for VL models)
- Prevents accidental indexing of personal/sensitive images
- Requires separate VL model server setup

### `MIMIR_EMBEDDINGS_IMAGES_DESCRIBE_MODE`
**Type**: Boolean  
**Default**: `true`

**Use VL model to generate text descriptions (recommended).**

```bash
MIMIR_EMBEDDINGS_IMAGES_DESCRIBE_MODE=true   # VL description mode
MIMIR_EMBEDDINGS_IMAGES_DESCRIBE_MODE=false  # Direct image embedding (not supported)
```

**Note:** Direct image embedding is not supported. Always use `true` for VL description mode.

---

## Vision-Language Model Configuration

### `MIMIR_EMBEDDINGS_VL_PROVIDER`
**Type**: String  
**Default**: `llama.cpp`  
**Options**: `llama.cpp` | `ollama`

**VL model provider.**

```bash
MIMIR_EMBEDDINGS_VL_PROVIDER=llama.cpp
```

### `MIMIR_EMBEDDINGS_VL_API`
**Type**: String (Base URL)  
**Default**: `http://llama-vl-server:8080`

**Base URL of the VL server.**

```bash
# Docker internal
MIMIR_EMBEDDINGS_VL_API=http://llama-vl-server:8080

# External VL server
MIMIR_EMBEDDINGS_VL_API=http://host.docker.internal:8081
```

### `MIMIR_EMBEDDINGS_VL_API_PATH`
**Type**: String (Path)  
**Default**: `/v1/chat/completions`

**Path to VL chat completions endpoint (OpenAI-compatible).**

### `MIMIR_EMBEDDINGS_VL_API_KEY`
**Type**: String  
**Default**: `dummy-key`

**API key for VL server (not required for local llama.cpp).**

### `MIMIR_EMBEDDINGS_VL_MODEL`
**Type**: String  
**Default**: `qwen2.5-vl`

**VL model name.**

```bash
# Recommended models
MIMIR_EMBEDDINGS_VL_MODEL=qwen2.5-vl-2b  # 2B parameters (~2GB RAM)
MIMIR_EMBEDDINGS_VL_MODEL=qwen2.5-vl-7b  # 7B parameters (~6GB RAM) ⭐ Best balance
MIMIR_EMBEDDINGS_VL_MODEL=qwen2.5-vl     # Generic name
```

### `MIMIR_EMBEDDINGS_VL_CONTEXT_SIZE`
**Type**: Number  
**Default**: `131072` (128K tokens)

**Maximum context window for VL model.**

```bash
MIMIR_EMBEDDINGS_VL_CONTEXT_SIZE=32768   # 32K tokens (2B model)
MIMIR_EMBEDDINGS_VL_CONTEXT_SIZE=131072  # 128K tokens (7B/72B models)
```

### `MIMIR_EMBEDDINGS_VL_MAX_TOKENS`
**Type**: Number  
**Default**: `2048`

**Maximum tokens to generate for image descriptions.**

```bash
MIMIR_EMBEDDINGS_VL_MAX_TOKENS=512   # Brief descriptions
MIMIR_EMBEDDINGS_VL_MAX_TOKENS=2048  # Detailed descriptions (recommended)
MIMIR_EMBEDDINGS_VL_MAX_TOKENS=4096  # Very detailed descriptions
```

### `MIMIR_EMBEDDINGS_VL_TEMPERATURE`
**Type**: Number (0.0-1.0)  
**Default**: `0.7`

**Sampling temperature for VL generation.**

```bash
MIMIR_EMBEDDINGS_VL_TEMPERATURE=0.0  # Deterministic (factual)
MIMIR_EMBEDDINGS_VL_TEMPERATURE=0.7  # Balanced (recommended)
MIMIR_EMBEDDINGS_VL_TEMPERATURE=1.0  # Creative (more varied)
```

### `MIMIR_EMBEDDINGS_VL_DIMENSIONS`
**Type**: Number  
**Default**: Falls back to `MIMIR_EMBEDDINGS_DIMENSIONS`

**Embedding dimensions for VL descriptions (falls back to text embedding dimensions).**

---

## Image Processing Configuration

### `MIMIR_IMAGE_MAX_PIXELS`
**Type**: Number  
**Default**: `3211264` (~1792×1792 pixels, 3.2 MP)

**Maximum pixel count for images before auto-resizing.**

**Qwen2.5-VL native limit**: 3,211,264 pixels

```bash
MIMIR_IMAGE_MAX_PIXELS=3211264  # Qwen2.5-VL limit (recommended)
MIMIR_IMAGE_MAX_PIXELS=2073600  # Full HD limit (1920×1080)
```

**Supported Image Sizes:**
- ✅ **1920×1080 (Full HD)** = 2.07 MP → No resize needed
- ✅ **1792×1792 (Square)** = 3.21 MP → No resize needed
- ⚠️ **2560×1440 (2K)** = 3.69 MP → Auto-resized to fit
- ⚠️ **3840×2160 (4K)** = 8.29 MP → Auto-resized to fit

### `MIMIR_IMAGE_TARGET_SIZE`
**Type**: Number (pixels)  
**Default**: `1536`

**Target dimension for longest edge when resizing.**

```bash
MIMIR_IMAGE_TARGET_SIZE=1024  # Conservative
MIMIR_IMAGE_TARGET_SIZE=1536  # Recommended (preserves detail)
MIMIR_IMAGE_TARGET_SIZE=2048  # Maximum detail (slower processing)
```

**Example resizing:**
- Input: 3840×2160 (4K) → Output: 1536×864 (aspect ratio preserved)
- Input: 2560×1440 (2K) → Output: 1536×864

### `MIMIR_IMAGE_RESIZE_QUALITY`
**Type**: Number (1-100)  
**Default**: `90`

**JPEG quality after resizing (higher = better quality, larger file).**

```bash
MIMIR_IMAGE_RESIZE_QUALITY=80  # Good quality
MIMIR_IMAGE_RESIZE_QUALITY=90  # Excellent quality (recommended)
MIMIR_IMAGE_RESIZE_QUALITY=95  # Maximum quality
```

---

## Database Configuration

### `NEO4J_URI`
**Default**: `bolt://neo4j_db:7687`

### `NEO4J_USER`
**Default**: `neo4j`

### `NEO4J_PASSWORD`
**Default**: `password`

---

## Server Configuration

### `PORT`
**Default**: `3000`

### `NODE_ENV`
**Default**: `production`

---

## Workspace Configuration

### `WORKSPACE_ROOT`
**Default**: `/workspace`

**Container's internal workspace path.** All file operations inside the container use this path.

### `HOST_WORKSPACE_ROOT`
**Required**: Yes (for file operations)  
**Type**: String (absolute or tilde path)  
**Example**: `~/src`, `/Users/john/code`, or `C:\Users\you\code`

**Host machine's workspace directory.** This is automatically mounted to `WORKSPACE_ROOT` in the container.

**Tilde Expansion Support:**
- ✅ **Automatic**: `~/src` is expanded using `HOST_HOME` (passed from host's `$HOME`)
- ✅ **Cross-Platform**: Works on macOS, Linux, and Windows (WSL)
- ⚠️ **Requires**: `HOST_HOME` must be set (automatically injected by docker-compose)

### `HOST_HOME`
**Required**: No (automatically set by docker-compose)  
**Type**: String (absolute path)  
**Default**: `${HOME}` (from host environment)  
**Example**: `/Users/john`, `/home/user`, `C:\Users\you`

**Host machine's home directory for expanding tilde (`~`) in `HOST_WORKSPACE_ROOT`.**

**Purpose:**
- Enables automatic tilde expansion in Docker containers
- Without this, `~/src` cannot be resolved (container's home ≠ host's home)

**Behavior:**
- ✅ **If set**: `HOST_WORKSPACE_ROOT=~/src` → expands to `/Users/john/src`
- ⚠️ **If missing**: Warning logged with helpful solutions, path translation disabled

**Docker Compose automatically sets this:**
```yaml
environment:
  - HOST_HOME=${HOME}  # Passes host's home to container
```

**Manual Override (if needed):**
```bash
HOST_HOME=/Users/john docker compose up
```

---

## Feature Flags

### `MIMIR_AUTO_INDEX_DOCS`
**Type**: Boolean  
**Default**: `true`

**Auto-index documentation on startup.**

### `MIMIR_ENABLE_ECKO`
**Type**: Boolean  
**Default**: `false`

**Enable Ecko orchestration mode.**

### `MIMIR_FEATURE_PM_MODEL_SUGGESTIONS`
**Type**: Boolean  
**Default**: `false`

**Enable PM model suggestions feature.**

---

## Agent Execution Configuration

### `MIMIR_AGENT_RECURSION_LIMIT`
**Type**: Integer  
**Default**: `100`

**Maximum number of steps (tool calls + responses) an agent can take before stopping.**

Controls how many iterations the LangGraph agent can execute before hitting the recursion limit. Each step typically includes:
- Agent thinking/reasoning
- Tool call execution
- Tool response processing

**When to adjust:**
- **Increase (150-200)**: For complex multi-step tasks requiring many tool calls
- **Decrease (50-75)**: To save costs or prevent runaway agents
- **Keep default (100)**: Suitable for most GPT-4.1 tasks

**Error handling:**
If the limit is reached, the UI will display a user-friendly message:
> "I'm sorry, but this task is too complex for me to complete in one go. Please try breaking it down into smaller, more focused subtasks."

**Cost implications:**
Higher limits allow more tool calls but consume more tokens. Monitor your usage when increasing this value.

**Example values:**
```bash
# Conservative (cost-saving)
MIMIR_AGENT_RECURSION_LIMIT=50

# Default (recommended for GPT-4.1)
MIMIR_AGENT_RECURSION_LIMIT=100

# Complex tasks (research, multi-file refactoring)
MIMIR_AGENT_RECURSION_LIMIT=150

# Very complex tasks (full system analysis)
MIMIR_AGENT_RECURSION_LIMIT=200
```

**Note:** This is separate from the circuit breaker limit (MAX_TOOL_CALLS), which is set by the PM agent based on task complexity estimates.

---

## Quick Start Configurations

### Local Ollama Setup
```bash
# LLM
MIMIR_LLM_API=http://ollama:11434
MIMIR_LLM_API_PATH=/v1/chat/completions
MIMIR_LLM_API_MODELS_PATH=/v1/models
MIMIR_LLM_API_KEY=dummy-key

# Embeddings
MIMIR_EMBEDDINGS_API=http://ollama:11434
MIMIR_EMBEDDINGS_API_PATH=/api/embeddings
MIMIR_EMBEDDINGS_API_MODELS_PATH=/api/tags
MIMIR_EMBEDDINGS_API_KEY=dummy-key
MIMIR_EMBEDDINGS_PROVIDER=ollama
MIMIR_EMBEDDINGS_MODEL=mxbai-embed-large
MIMIR_EMBEDDINGS_DIMENSIONS=1024

# Provider
MIMIR_DEFAULT_PROVIDER=ollama
MIMIR_DEFAULT_MODEL=qwen2.5-coder:14b
```

### OpenAI Setup
```bash
# LLM
MIMIR_LLM_API=https://api.openai.com
MIMIR_LLM_API_PATH=/v1/chat/completions
MIMIR_LLM_API_MODELS_PATH=/v1/models
MIMIR_LLM_API_KEY=sk-...

# Embeddings
MIMIR_EMBEDDINGS_API=https://api.openai.com
MIMIR_EMBEDDINGS_API_PATH=/v1/embeddings
MIMIR_EMBEDDINGS_API_MODELS_PATH=/v1/models
MIMIR_EMBEDDINGS_API_KEY=sk-...
MIMIR_EMBEDDINGS_PROVIDER=openai
MIMIR_EMBEDDINGS_MODEL=text-embedding-3-small
MIMIR_EMBEDDINGS_DIMENSIONS=1536

# Provider
MIMIR_DEFAULT_PROVIDER=openai
MIMIR_DEFAULT_MODEL=gpt-4-turbo
```

### Hybrid Setup (Ollama LLM + OpenAI Embeddings)
```bash
# LLM (Local Ollama)
MIMIR_LLM_API=http://ollama:11434
MIMIR_LLM_API_PATH=/v1/chat/completions
MIMIR_LLM_API_MODELS_PATH=/v1/models
MIMIR_LLM_API_KEY=dummy-key

# Embeddings (Cloud OpenAI)
MIMIR_EMBEDDINGS_API=https://api.openai.com
MIMIR_EMBEDDINGS_API_PATH=/v1/embeddings
MIMIR_EMBEDDINGS_API_MODELS_PATH=/v1/models
MIMIR_EMBEDDINGS_API_KEY=sk-...
MIMIR_EMBEDDINGS_PROVIDER=openai
MIMIR_EMBEDDINGS_MODEL=text-embedding-3-small
MIMIR_EMBEDDINGS_DIMENSIONS=1536

# Provider
MIMIR_DEFAULT_PROVIDER=ollama
MIMIR_DEFAULT_MODEL=qwen2.5-coder:14b
```

### Vision-Language Setup (Image Indexing)

**Prerequisites:**
1. Uncomment `llama-vl-server` service in `docker-compose.yml`
2. Choose model size: 2B (faster, 2GB RAM) or 7B (best quality, 6GB RAM)

```bash
# LLM
MIMIR_LLM_API=http://ollama:11434
MIMIR_LLM_API_PATH=/v1/chat/completions
MIMIR_LLM_API_KEY=dummy-key

# Text Embeddings
MIMIR_EMBEDDINGS_API=http://ollama:11434
MIMIR_EMBEDDINGS_API_PATH=/api/embeddings
MIMIR_EMBEDDINGS_PROVIDER=ollama
MIMIR_EMBEDDINGS_MODEL=mxbai-embed-large
MIMIR_EMBEDDINGS_DIMENSIONS=1024

# Image Embeddings (Enable)
MIMIR_EMBEDDINGS_IMAGES=true
MIMIR_EMBEDDINGS_IMAGES_DESCRIBE_MODE=true

# Vision-Language Model (Qwen2.5-VL 7B)
MIMIR_EMBEDDINGS_VL_PROVIDER=llama.cpp
MIMIR_EMBEDDINGS_VL_API=http://llama-vl-server:8080
MIMIR_EMBEDDINGS_VL_API_PATH=/v1/chat/completions
MIMIR_EMBEDDINGS_VL_API_KEY=dummy-key
MIMIR_EMBEDDINGS_VL_MODEL=qwen2.5-vl-7b
MIMIR_EMBEDDINGS_VL_CONTEXT_SIZE=131072  # 128K tokens
MIMIR_EMBEDDINGS_VL_MAX_TOKENS=2048      # Detailed descriptions
MIMIR_EMBEDDINGS_VL_TEMPERATURE=0.7      # Balanced

# Image Processing
MIMIR_IMAGE_MAX_PIXELS=3211264    # Qwen2.5-VL limit (3.2 MP)
MIMIR_IMAGE_TARGET_SIZE=1536      # Resize target (longest edge)
MIMIR_IMAGE_RESIZE_QUALITY=90     # JPEG quality

# Provider
MIMIR_DEFAULT_PROVIDER=ollama
MIMIR_DEFAULT_MODEL=qwen2.5-coder:14b
```

**For 2B model (less RAM):** Change to `MIMIR_EMBEDDINGS_VL_MODEL=qwen2.5-vl-2b` and `MIMIR_EMBEDDINGS_VL_CONTEXT_SIZE=32768`

**See also:** [Qwen VL Setup Guide](./configuration/QWEN_VL_SETUP.md)

---

## Migration from v1.x

### Removed Variables
- ❌ `LLM_API_URL` → Use `MIMIR_LLM_API`
- ❌ `OLLAMA_BASE_URL` → Use `MIMIR_LLM_API` or `MIMIR_EMBEDDINGS_API`
- ❌ `COPILOT_BASE_URL` → Use `MIMIR_LLM_API`
- ❌ `OPENAI_BASE_URL` → Use `MIMIR_LLM_API`
- ❌ `OPENAI_API_KEY` → Use `MIMIR_LLM_API_KEY` or `MIMIR_EMBEDDINGS_API_KEY`
- ❌ `FILE_WATCH_POLLING` → Removed (unused)
- ❌ `FILE_WATCH_INTERVAL` → Removed (unused)

### Migration Example
```bash
# OLD (v1.x)
OLLAMA_BASE_URL=http://ollama:11434
COPILOT_BASE_URL=http://copilot-api:4141/v1

# NEW (v2.0) - For Ollama
MIMIR_LLM_API=http://ollama:11434
MIMIR_LLM_API_PATH=/v1/chat/completions
MIMIR_LLM_API_MODELS_PATH=/v1/models
MIMIR_LLM_API_KEY=dummy-key

MIMIR_EMBEDDINGS_API=http://ollama:11434
MIMIR_EMBEDDINGS_API_PATH=/api/embeddings
MIMIR_EMBEDDINGS_API_MODELS_PATH=/api/tags
MIMIR_EMBEDDINGS_API_KEY=dummy-key
```

---

## Troubleshooting

### 404 Error on Embeddings
**Problem**: `404 page not found` when generating embeddings

**Solution**: Check that `MIMIR_EMBEDDINGS_API_PATH` is set correctly:
- **Ollama native** (default): `MIMIR_EMBEDDINGS_API_PATH=/api/embeddings`
- **OpenAI-compatible**: `MIMIR_EMBEDDINGS_API_PATH=/v1/embeddings`

### 400 Invalid Input on Embeddings
**Problem**: `invalid input` error from Ollama embeddings

**Solution**: You're using Ollama with OpenAI-compatible path. Switch to native:
```bash
MIMIR_EMBEDDINGS_API_PATH=/api/embeddings
MIMIR_EMBEDDINGS_API_MODELS_PATH=/api/tags
```

### Model Not Found
**Problem**: LLM returns "model not supported"

**Solution**: 
1. Verify model exists: `curl http://localhost:11434/v1/models`
2. Update `MIMIR_DEFAULT_MODEL` to match available model

### Authentication Errors
**Problem**: 401 Unauthorized

**Solution**: Set correct API key in `MIMIR_LLM_API_KEY` or `MIMIR_EMBEDDINGS_API_KEY`

---

## See Also

- [LLM Provider Guide](./guides/LLM_PROVIDER_GUIDE.md)
- [Pipeline Configuration](./guides/PIPELINE_CONFIGURATION.md)
- [Docker Compose Examples](../docker-compose.yml)
- [Qwen VL Setup Guide](./configuration/QWEN_VL_SETUP.md) - Vision-Language models
- [Metadata Enriched Embeddings](./guides/METADATA_ENRICHED_EMBEDDINGS.md) - Image indexing details
