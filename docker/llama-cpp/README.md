# llama.cpp Docker Images

This directory contains Dockerfiles and scripts to build llama.cpp server for **multiple platforms and use cases**.

## Available Images

### 1. ARM64 - Embeddings (Apple Silicon)
- **Image:** `timothyswt/llama-cpp-server-arm64:latest`
- **Use Case:** Text embeddings for semantic search (Mac M1/M2/M3)
- **Models:** nomic-embed-text (768d), mxbai-embed-large (1024d)
- **Files:** `Dockerfile`, `Dockerfile.mxbai`

### 2. AMD64 - Embeddings (Windows/Linux x86_64)
- **Image:** `timothyswt/llama-cpp-server-amd64-mxbai:latest`
- **Use Case:** Text embeddings for semantic search (Windows/Linux PC)
- **Models:** mxbai-embed-large (1024d)
- **Files:** `Dockerfile.mxbai` (build with `--platform linux/amd64`)

### 3. AMD64 - Vision Models (Windows/Linux x86_64) ⭐ NEW
- **Image:** `timothyswt/llama-cpp-server-amd64-vision:latest`
- **Use Case:** Image understanding and multimodal AI (Windows/Linux PC)
- **Models:** Llama 3.2 Vision (11B/90B), Qwen2.5-VL (2B/7B)
- **Files:** `Dockerfile.amd64-vision`
- **Docs:** `BUILD_AMD64_VISION.md`
- **Build Script:** `scripts/build-llama-cpp-vision-amd64.ps1`

## Why Custom Builds?

The official `ghcr.io/ggml-org/llama.cpp:server` image claims multi-arch support but actually only provides AMD64. These custom builds provide:
- **Native ARM64** for Apple Silicon Macs (no emulation overhead)
- **Native AMD64** with vision capabilities for Windows/Linux
- **Embedded models** - no external downloads required

---

## Quick Start - Embeddings (ARM64)

### Using Pre-built Image

```bash
docker pull timothyswt/llama-cpp-server-arm64:latest
docker run -p 11434:8080 -v ./models:/models timothyswt/llama-cpp-server-arm64:latest
```

### Building Locally

```bash
# Build the image
./scripts/build-llama-cpp.sh

# Or manually:
docker build -t timothyswt/llama-cpp-server-arm64:latest -f docker/llama-cpp/Dockerfile .
```

## Features

- **Native ARM64**: Built specifically for Apple Silicon
- **OpenAI-Compatible API**: Drop-in replacement for Ollama
- **Embeddings Support**: Mean pooling for semantic search
- **Lightweight**: ~200MB runtime image
- **No GPU Required**: Optimized for CPU inference

## Usage with Mimir

The `docker-compose.yml` automatically uses this image for the `llama-server` service:

```yaml
llama-server:
  image: timothyswt/llama-cpp-server-arm64:latest
  ports:
    - "11434:8080"
  volumes:
    - ollama_models:/models
```

## API Endpoints

- **Health**: `GET /health`
- **Embeddings**: `POST /v1/embeddings`
- **Models**: `GET /v1/models`

Compatible with Ollama API format.

## Model Management

### Download Models

Models can be in GGUF format (same as Ollama). Place them in the `/models` directory:

```bash
# If you have Ollama models already:
cp -r ~/.ollama/models ./data/ollama/models

# Or download directly:
curl -L https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q8_0.gguf \
  -o ./data/ollama/models/nomic-embed-text.gguf
```

### Specify Model in docker-compose.yml

Uncomment and set the model path in the `command` section:

```yaml
command:
  - "--model"
  - "/models/nomic-embed-text.gguf"
  - "--alias"
  - "nomic-embed-text"
```

## Performance

ARM64 build performance:
- **Embeddings**: ~50-100ms per request (768-dim)
- **Memory**: ~200MB base + model size
- **CPU**: Utilizes all cores efficiently

## Publishing Updates

```bash
# Build and push new version
./scripts/build-llama-cpp.sh 1.0.1

# Or manually:
docker push timothyswt/llama-cpp-server-arm64:1.0.1
docker push timothyswt/llama-cpp-server-arm64:latest
```

## Troubleshooting

### Image Not Found
```bash
docker pull timothyswt/llama-cpp-server-arm64:latest
```

### Health Check Fails
Wait 30 seconds for server startup, or check logs:
```bash
docker logs llama_server
```

### Model Not Loading
Verify model path and format (must be GGUF):
```bash
docker exec llama_server ls -la /models
```

## Architecture

```
┌─────────────────────────────────┐
│   Docker Container (ARM64)      │
│                                 │
│  ┌──────────────────────────┐   │
│  │  llama-server binary     │   │
│  │  (compiled from source)  │   │
│  └──────────────────────────┘   │
│            ↓                    │
│  ┌──────────────────────────┐   │
│  │   OpenAI-compatible API  │   │
│  │   Port: 8080             │   │
│  └──────────────────────────┘   │
│            ↓                    │
│  ┌──────────────────────────┐   │
│  │   /models (volume)       │   │
│  │   GGUF model files       │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
         ↓
    Port 11434 (external)
         ↓
   Mimir Server
```

## Quick Reference - Vision Models (AMD64)

### Build Vision Image for Windows

```powershell
# Build with Llama 3.2 Vision models (11B + 90B)
.\scripts\build-llama-cpp-vision-amd64.ps1 -ModelType llama32

# Or build with Qwen2.5-VL models (2B + 7B)
.\scripts\build-llama-cpp-vision-amd64.ps1 -ModelType qwen25
```

### Enable Vision in docker-compose.amd64.yml

```yaml
# Uncomment one or both vision services
llama-server-vision-2b:   # Port 8081 - Faster, lower memory
llama-server-vision-7b:   # Port 8082 - Higher quality
```

### Test Vision API

```powershell
curl http://localhost:8081/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{
    "model": "vision-2b",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
      ]
    }]
  }'
```

See `BUILD_AMD64_VISION.md` for complete documentation.

## References

- [llama.cpp GitHub](https://github.com/ggerganov/llama.cpp)
- [GGUF Format](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [OpenAI Embeddings API](https://platform.openai.com/docs/api-reference/embeddings)
- [Llama 3.2 Vision](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD_VISION.md)
- [Qwen2.5-VL](https://github.com/QwenLM/Qwen2.5-VL)
